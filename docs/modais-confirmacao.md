# Modal de confirmação do jogo

O jogo não usa `confirm()`, `alert()` nem `prompt()` nativos. Toda confirmação passa pelo modal próprio, que segue o tema (Noite de jogo) e funciona igual em desktop e mobile.

## Peças

| Arquivo | Papel |
|---|---|
| `src/stores/ui.ts` | Estado `confirmDialog` e as ações `askConfirm` e `resolveConfirm` |
| `src/components/ui/ConfirmDialog.vue` | O modal. Montado uma vez em `App.vue` |
| `src/components/ui/BaseModal.vue` | Casca reutilizada (fundo escurecido, `Teleport` para o body, fecha ao clicar fora) |

## Como usar

`askConfirm` devolve uma `Promise<boolean>`: `true` se a pessoa confirmar, `false` se cancelar, fechar clicando fora ou apertar Esc.

```ts
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()

async function resetCareer() {
  const ok = await ui.askConfirm({
    title: 'Reiniciar carreira?',
    message: 'Todo o progresso atual será apagado. Essa ação não pode ser desfeita.',
    confirmLabel: 'Reiniciar',
    danger: true
  })
  if (!ok) return
  // ...segue a ação
}
```

A função que chama precisa ser `async` (ou usar `.then`). Em handlers de template, como `@click="resetCareer"`, a Promise devolvida é ignorada sem problema.

## Opções (`ConfirmOptions`)

| Campo | Padrão | Descrição |
|---|---|---|
| `title` | obrigatório | Título curto, em forma de pergunta |
| `message` | obrigatório | Explica o que muda e se dá para desfazer |
| `confirmLabel` | `Confirmar` | Texto do botão de confirmar. Prefira um verbo da ação ("Reiniciar", "Trocar formação") |
| `cancelLabel` | `Cancelar` | Texto do botão de cancelar |
| `danger` | `false` | Ação destrutiva: ícone de alerta e botão vermelho. Sem isso, ícone de pergunta e botão verde |

## Comportamento

- **Teclado:** Esc cancela e Enter confirma.
- **Fechar fora:** clicar no fundo escurecido conta como cancelar.
- **Uma por vez:** abrir um segundo modal enquanto outro está aberto resolve o primeiro como `false`.
- **Mobile:** os botões empilham, com o de cancelar embaixo.

## Onde é usado hoje

- `useSeason.ts`: `resetCareer` (reiniciar carreira, com `danger`).
- `useSquad.ts`: `autoPickBestFormation` (confirma a troca de formação, mostrando o ganho de OVER).

## Convenções

- Use o modal só para ações difíceis de desfazer ou que mudam muita coisa de uma vez. Para avisos e resultados, use `ui.showToast`.
- Marque `danger: true` quando a ação apaga dados ou gasta dinheiro sem volta.
- Novos modais com conteúdo próprio (listas, formulários) devem ser montados sobre `BaseModal`, como `LoanMarketModal` e `PlayerDetails`.
