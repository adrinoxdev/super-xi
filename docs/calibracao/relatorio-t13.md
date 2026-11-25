# Relatório T13: calibração com a Copa dos Continentes

Data: 2026-11-25. Branch `feature/copa-dos-continentes`. Nenhuma constante de jogo foi alterada.

Comando: `node docs/calibracao/calib-carreira.mjs 20 curva,tipicoRot:240,forteRot:80,fracoRot:80,maximoRot:120,tipico,tipicoD,forte,fraco,caroFraco,investidor --check`

Resultado: **`CHECK OK: todos os alvos atingidos`** (exit 0). Nenhuma falha, 0 erros, 0 NaN.

## Mudança no script

`calib-carreira.mjs`: `'mundial'` entra no `pickComp` (depois do continental, antes da Supercopa); métricas informativas por política
(linha `[política] mundial:` no console e `summary.<política>.mundial` no JSON): edições, edições na A, classificado por porta
(ouro/sede/ranking), prêmio médio por edição e por classificado, jogos a mais por edição, taxa de classificação nas edições em que está na A,
e os pontos do Ranking Condor no início de cada edição (`pts`).

## B e k_max

| | Baseline T0 | T13 |
|---|---|---|
| B (saldo do maximoRot na A) | -788.520 | **-821.990** |

A diferença (-33 mil) é ruído: apesar do prêmio extra, o Mundial adiciona em média 3,67 jogos a mais por edição (folha cheia, bilheteria menor)
e o saldo do elenco máximo depende das vendas forçadas (347 em 120 temporadas). O teto de 400 mil foi atendido com folga de 1,2 mi.

`k_max = 4 × (400.000 − (−821.990)) / 690.000 = 7,08` (com o prêmio médio medido de 384 mil por edição, o fator seria ainda maior, cerca de 12,7).
O prêmio de 1,5 mi do campeão (k = 1) está longe do teto. Sem risco de a tabela recomendada quebrar o `--check`; não há motivo para a tabela de 1 mi.

## Taxa do forte classificado (corte de 16, alvo do plano 70% a 85%)

| Medição | Edições na A | Classificado | Taxa | Portas |
|---|---|---|---|---|
| forteRot:80 (OVER 78 na A, rotação D-C-B-A) | 20 | 7 | **35%** | ranking 7 |
| forteRot:160 (nova rodada só para a distribuição) | 40 | 15 | **37,5%** | ranking 15 |
| forte (progressivo; chega a OVER 86 e é campeão da A todo ano) | 4 | 3 | 75% (amostra de 4) | ouro 3 |

**Fora do alvo.** O forte rotativo fica abaixo de 70%. Distribuição dos pontos do ciclo (40 edições):
mínimo 6, mediana 13, máximo 26. Percentual de edições com pontos maiores ou iguais ao corte:

| Corte | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 16 (atual) |
|---|---|---|---|---|---|---|---|---|
| Classificado | 87,5% | 82,5% | 77,5% | **75%** | 65% | 50% | 45% | 37,5% |

Ressalva: o forteRot passa só 1 temporada em 4 na A (ele roda D, C, B, A), então só 1 temporada do ciclo rende pontos da Série A. Um forte fixo
na A somaria mais; o `forte` progressivo (3 de 4) mostra isso, mas com amostra de 4 edições. A estimativa do plano (cerca de 80%) pressupunha o forte
na A o ciclo todo; no rotativo, o número é o piso.

**Proposta (não aplicada):** `RANKING_CONTINENTAL.cutoff` de 16 para **11** (forte rotativo em 75%, no meio do alvo; 10 dá 77,5%, 12 dá 65%).
Antes de decidir, medir o efeito do novo corte no elenco máximo (hoje 66,7% de classificação, só pela porta do ranking) e no típico (0% hoje); essas distribuições de pontos não foram coletadas nesta rodada.
Se o corte de 16 ficar, o aviso do plano (seção 11, risco 4: forte fora de 70% a 85%) está confirmado.

## Prêmio médio por edição (todas as edições, classificado ou não)

| Perfil | Edições | Classificado | Prêmio/edição | Prêmio/classificado | Estimativa do plano | Jogos a mais/edição |
|---|---|---|---|---|---|---|
| Elenco máximo (maximoRot) | 30 | 20 (66,7%, ranking) | **384 mil** | 577 mil | ~690 mil | 3,67 |
| Forte rotativo (forteRot:160) | 40 | 15 (37,5%) | **206 mil** (228 mil no :80) | 548 mil | ~165 mil | 1,98 |
| Forte progressivo (forte) | 5 | 3 | 300 mil | 500 mil | ~165 mil | 2,6 |
| Típico (tipicoRot) | 60 | 0 | **0** | 0 | ~5 mil | 0 |
| Fraco (fracoRot) | 20 | 0 | 0 | 0 | 0 | 0 |
| caroFraco (OVER 81 na A) | 5 | 4 (ouro) | 782 mil | 978 mil | n/a | 5,2 |

- O elenco máximo fica **abaixo** do estimado (384 mil contra 690 mil) por dois motivos: classificação de 66,7% (e não ~100%) e eliminação mais cedo do que a curva sugeria (ele entra só pelo ranking e, no rotativo, com o ciclo D-C-B-A).
- O forte fica **acima** do estimado (206 mil contra 165 mil), embora classifique menos do que o plano supunha: quando entra, rende 548 mil contra 205 mil estimados.
- O típico não classifica nunca (0 em 60 edições); o estimado era 5%.
- Saldo do maximoRot na A: **-821.990, abaixo de +400 mil.** OK.

## Escada de prêmios

Nenhuma violação. Pela configuração (`PRIZES`), cada fase do Mundial paga mais que a equivalente das outras copas (campeão 1,5 mi total contra Taça 330 mil, continental
cerca de 400 mil, Recopa 60 mil, Supercopa 40 mil), e a escada entre séries não foi tocada. O `--check` não tem teste de escada; a verificação foi só por leitura das constantes.

## Efeitos nas demais métricas (informativo)

- tipicoRot (240 temporadas): saldo A 340.612 (baseline 338.588), D 45.390, C 135.159, B 150.205, 0 vendas forçadas, caixa mínimo 897 mil. Sem efeito do Mundial.
- Curva (3.000 jogos): 0 → 41,8%, +15 → 63,1%, -15 → 22,1%, +30 → 79,5%. Dentro dos alvos.

## Propostas (resumo)

1. **Cutoff do ranking: 16 para 11** (forte rotativo de 37,5% para 75%). A decidir pelo dono; a T13 não aplica.
2. Prêmios: sem ajuste. B e k_max mostram folga ampla (k_max 7,08); a tabela recomendada (1,5 mi) pode ficar.
3. Observação para o dono: o elenco máximo entra só pelo ranking e classifica em 66,7%; um corte menor tende a subir essa taxa e o prêmio/edição (não medido). O teto de 400 mil tem folga: k_max 7,08.

## Ressalvas

- O `--check` completo leva cerca de 32 minutos (curva 4,5 min, tipicoRot 11 min, maximoRot 5,5 min), bem acima dos "6+ min" do plano.
- Amostras pequenas: forte progressivo e caroFraco têm 4 e 5 edições. Os valores do forteRot:160 (40 edições) têm incerteza de cerca de ±15 pontos percentuais.
