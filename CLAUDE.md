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
git merge --no-ff feature/<nome>     # mensagem: Merge branch 'feature/<nome>' into develop
git push origin develop
```

5. Apagar a branch da frente depois do merge.

O merge **não altera a versão do jogo** (ver abaixo). Merge da `develop` para dentro de uma frente (para trazer novidades) também é permitido.

## Versão

A versão mora em `package.json` (`version`) e aparece no rodapé da sidebar. Hoje é `1.0.0`: ainda não houve versão oficial, então a numeração recomeçou do zero em `1.0.0` (antes era `4.0.x`).

- **A versão do jogo nunca muda por conta própria. Sempre perguntar ao dono do produto antes de alterá-la** (número do fim, do meio ou do começo).
- Merge de `feature/*`, `fix/*`, `docs/*` ou `chore/*` **não** sobe a versão automaticamente. A versão fica onde está até o dono pedir.
- Quando o dono autorizar a mudança, ela vira um commit próprio (`chore(version): <nova versao>`) ou entra no commit de merge, conforme ele indicar. A branch da frente nunca mexe na versão, assim duas frentes paralelas não conflitam em `package.json`.
- Antes de qualquer lançamento (`develop` → `master`), perguntar se a versão deve mudar e qual será.

## Lançamento (develop → master)

Só acontece com pedido explícito do dono do produto, depois de a `develop` estar ajustada.

```bash
git checkout develop && git pull
npm run build                                   # tem que passar
git checkout master && git pull
git merge --no-ff develop -m "release: <versao>"
git push origin master
git checkout develop
git merge --no-ff master -m "Merge branch 'master' into develop (lancamento <versao>)"
git push origin develop
```

O `--no-ff` cria um commit de merge que existe só na `master`. O último merge (da `master` de volta na `develop`) traz esse commit para a `develop`: não muda nenhum arquivo, só deixa os dois históricos coincidindo. Sem ele, `git log develop..master` fica com os commits de lançamento. Tag de versão (`v<versao>`) é opcional e só vale se o dono do produto pedir.

## Hotfix

1. `git checkout master && git checkout -b hotfix/<nome>`.
2. Corrigir, rodar `npm run build`.
3. Merge `--no-ff` na `master` e push.
4. Merge `--no-ff` da `master` de volta na `develop`, para a correção não se perder no próximo lançamento.

## O que não fazer

- Commit ou push direto na `master`.
- Fast-forward ao integrar uma frente na `develop` (o merge explícito é o registro da entrega).
- Alterar a versão do jogo (`package.json`) sem perguntar antes ao dono do produto, inclusive dentro da branch da frente.
- `push --force` na `develop` ou na `master`.
