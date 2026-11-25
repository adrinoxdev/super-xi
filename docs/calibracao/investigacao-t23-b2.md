# Investigação: T23 b2 intermitente

## Sintoma

`node docs/calibracao/t23-atletas.mjs` falhava em cerca de metade das execuções na asserção b2
("valor e salário seguem o OVER após evoluir").

## Causa (falha do teste, não do jogo)

O bloco (b) faz `p.potential = 96` em todo o elenco **sem recalcular o valor**. `valueForPlayer`
depende do potencial (fator `1 + VALUE.potStep * min(potMaxGap, potential - overall)`,
`src/utils/player/generatePlayer.ts:42`). O jogo só chama `refreshPlayerEconomy` quando o jogador
sobe de OVER (`src/composables/useMatchSimulation.ts:1349`), o que está certo. Quem não sobe nos
30 jogos (sorteio por `Math.random`, `useMatchSimulation.ts:1344`) fica com o valor calculado
para o potencial antigo, e a asserção acusa diferença.

## Evidência (10 execuções de diagnóstico)

- 5 de 10 execuções com violação, de 1 a 2 jogadores cada.
- Antes da mudança de potencial: 0 jogadores fora da fórmula em todas as execuções.
- Em todos os violadores: OVER inicial = OVER final (não evoluíram), salário correto, só o
  valor menor que `valueForPlayer` (ex.: RW 28 anos OVER 51: value 25000, esperado 35500;
  GK 30 anos OVER 54: 42500 contra 57000). Nenhum emprestado; contratos de 2 a 4 anos.
- São jogadores de OVER 50 a 54 e 27 a 31 anos (fator de idade baixo), os de menor chance de
  evoluir.

## Correção

No teste, depois de mudar o potencial, chamar `GP.refreshPlayerEconomy(p)`, deixando o estado
inicial coerente como o jogo deixaria. A asserção b2 continua igual e continua pegando quem
evolui sem recalcular. Resultado: 20 execuções seguidas com `T23 OK`.

Não há defasagem real no jogo: o único caminho que muda OVER na evolução recalcula valor e
salário. Nenhum arquivo de `src/` foi alterado.
