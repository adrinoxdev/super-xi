# Linha de base T0 da calibração

Data: 2026-11-25. Código: `develop` em `e0dde7b` (versão 1.2.0), sem sobreposição.

Comando: `node docs/calibracao/calib-carreira.mjs 20 curva,tipicoRot:240,forteRot:80,fracoRot:80,maximoRot:120,tipico,tipicoD,forte,fraco,caroFraco,investidor --check`

Resultado: `CHECK OK: todos os alvos atingidos` (exit 0).

## Conserto do script

- Imports atualizados para os caminhos novos de `src/` (commit `f673638`).
- A curva não chamava `startLiveMatch`. Com os cartões ao vivo (`d6631b3`), as expulsões ficavam acumuladas em
  `matchCards` ao longo das 3.000 partidas de cada ponto, e a curva ficava parada em cerca de 7% para qualquer
  diferença de OVER. Agora cada partida da curva começa com `startLiveMatch`. A carreira já chamava e não mudou.

## Curva (3.000 jogos por ponto, % de vitórias)

| Diferença | -30 | -15 | 0 | +15 | +30 |
|---|---|---|---|---|---|
| Usuário | 10,8 | 20,9 | 43,3 | 65,0 | 80,6 |

## tipicoRot (240 temporadas, 60 por série)

| Série | Saldo médio | Sem prêmio | Vitórias |
|---|---|---|---|
| D | 53.976 | 11.363 | 43,8% |
| C | 123.984 | 26.811 | 44,1% |
| B | 180.439 | 35.273 | 43,9% |
| A | 338.588 | 42.088 | 44,3% |

Caixa mínimo acima de R$ 1 milhão (saldo neutro), 0 vendas forçadas.

## Elenco máximo (maximoRot, 120 temporadas)

- **B (saldo do maximoRot na Série A): −788.520 por temporada**, com 68,0% de vitórias.
- As outras séries: D −753 mil (82,5%), C −647 mil (80,8%), B −595 mil (75,7%).
- Teto do `--check` (A abaixo de 400 mil) atendido.
- 372 vendas forçadas em 120 temporadas. O `setOver` devolve OVER 88 a quem fica depois de cada venda, então a
  receita dessas vendas entra no saldo de forma artificial. Sem ela, a perda na A seria maior (sem prêmio −3,35 mi,
  prêmios +0,69 mi).

## k_max (plano da fase 8, seção 7.3)

`k_max = 4 × (400 mil − B) / 690 mil = 4 × 1.188.520 / 690.000 ≈ 6,9`

Muito acima do 3,7 calculado com B = −240 mil. O prêmio de 1,5 mi do Mundial fica longe do teto.
