# Fluxo de Git (Super XI)

Segue o fluxo do `elphantcrm-v3` (git flow enxuto), adaptado ao Super XI. `master` é produção; todo o trabalho acontece a partir da `develop`.

## Branches

| Branch | Papel |
|---|---|
| `master` | Produção. Só recebe o que já passou pelos ajustes na `develop`. Nada é commitado direto nela. |
| `develop` | Integração e ajustes. É o tronco de onde saem e para onde voltam as frentes de trabalho. |
| `feature/<nome>` | Funcionalidade nova. Sai da `develop` e volta para ela. |
| `fix/<nome>` | Correção de bug. Sai da `develop` e volta para ela. |
| `docs/<nome>`, `chore/<nome>` | Documentação e manutenção. Mesmo caminho das anteriores. |
| `hotfix/<nome>` | Correção urgente em produção. Sai da `master`. |

O prefixo de tipo é o vocabulário do git flow. O nome depois da barra é curto e em kebab-case (`feature/historico-de-partidas`).

## Dia a dia

1. Criar a frente a partir da `develop`: `git checkout develop && git checkout -b feature/<nome>`.
2. Commitar em passos pequenos, no padrão `tipo(escopo): mensagem` (ex.: `feat(partida): ...`, `fix(elenco): ...`).
3. Antes de integrar, rodar `npm run build` (`vue-tsc` + `vite build`). É o único portão de qualidade do projeto.
4. Integrar na `develop` com merge explícito, nunca com fast-forward:

```bash
git checkout develop
git merge --no-ff --no-commit feature/<nome>
# subir a versão em package.json (ver abaixo), se a frente for feature/ ou fix/
git add package.json
git commit --no-edit        # mensagem: Merge branch 'feature/<nome>' into develop
git push origin develop
```

5. Apagar a branch da frente depois do merge.

Merge da `develop` para dentro de uma frente (para trazer novidades) é permitido e não conta para a versão.

## Versão

A versão mora em `package.json` (`version`) e aparece no rodapé da sidebar. Hoje é `1.0.0`: ainda não houve versão oficial, então a numeração recomeçou do zero em `1.0.0` (antes era `4.0.x`).

- **O último número sobe 1 a cada merge de `feature/*` ou `fix/*` na `develop`** (`1.0.0` vira `1.0.1`, depois `1.0.2`...).
- **Quem faz o merge sobe a versão, dentro do próprio commit de merge.** A branch da frente nunca mexe na versão, assim duas frentes paralelas não conflitam em `package.json`.
- Merge de `docs/*` e `chore/*` não sobe a versão (não muda o produto).
- Merge repetido da mesma branch sobe de novo: cada merge é uma entrega. Um merge, um incremento.
- Se o merge já foi commitado sem o incremento e ainda não foi enviado, usar `git commit --amend` com o `package.json` atualizado. Se já foi enviado, um commit `chore(version): 1.0.N` logo em seguida.
- Mudar o número do meio (`1.1.0`) ou do primeiro (`2.0.0`) é decisão do dono do produto, nunca automática.

Conferir a contagem: o último número deve bater com o número de merges de `feature/` e `fix/` na `develop` desde a versão `1.0.0` (commit de merge `cd1f10b`, que já não conta):

```bash
git log --first-parent --merges --format='%s' cd1f10b..develop | grep -cE "^Merge branch '(feature|fix)/"
```

## Lançamento (develop → master)

Só acontece com pedido explícito do dono do produto, depois de a `develop` estar ajustada.

```bash
git checkout develop && git pull
npm run build                                   # tem que passar
git checkout master && git pull
git merge --no-ff develop -m "release: <versao>"
git push origin master
git checkout develop
```

Tag de versão (`v<versao>`) é opcional e só vale se o dono do produto pedir. Depois do lançamento, `master` e `develop` ficam iguais.

## Hotfix

1. `git checkout master && git checkout -b hotfix/<nome>`.
2. Corrigir, rodar `npm run build`.
3. Merge `--no-ff` na `master` e push.
4. Merge `--no-ff` da `master` de volta na `develop`, para a correção não se perder no próximo lançamento.

## O que não fazer

- Commit ou push direto na `master`.
- Fast-forward ao integrar uma frente na `develop` (o merge explícito é o registro da entrega).
- Subir a versão dentro da branch da frente.
- `push --force` na `develop` ou na `master`.
