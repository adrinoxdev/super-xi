# Relatório: Ranking Condor com a tabela nova (corte 38)

Tabela aplicada em `RANKING_CONTINENTAL` (Ouro 0/3/6/9/12; Prata 0/0/1/2/4; Série A 8/2/0; Taça 3/1; Supercopa 1; Recopa 1; corte 38). Medição: `calib-carreira.mjs 164 forteA,tipicoA,forteRot,tipicoRot`, 41 edições por perfil. Dados brutos: `calib-ranking-novo.json`.

## Classificação e portas

| Perfil | Edições | Classificado | % | Ouro | Sede | Ranking |
|---|---|---|---|---|---|---|
| forteA | 41 | 34 | 82,9% | 23 | 2 | 9 |
| tipicoA | 41 | 10 | 24,4% | 5 | 2 | 3 |
| forteRot | 41 | 0 | 0% | 0 | 0 | 0 |
| tipicoRot | 41 | 0 | 0% | 0 | 0 | 0 |

## Pontos do ciclo (mín / mediana / máx) e % >= corte

| Perfil | mín | mediana | máx | >=34 | >=36 | >=38 | >=40 | >=42 |
|---|---|---|---|---|---|---|---|---|
| forteA | 18 | 46 | 71 | 87,8% | 82,9% | 80,5% | 75,6% | 61,0% |
| tipicoA | 0 | 20 | 43 | 12,2% | 12,2% | 9,8% | 7,3% | 2,4% |
| forteRot | 7 | 15 | 25 | 0% | 0% | 0% | 0% | 0% |
| tipicoRot | 0 | 3 | 14 | 0% | 0% | 0% | 0% | 0% |

## Leitura

- forteA 82,9%: dentro de 70% a 85%. Não precisa mexer no corte.
- tipicoA 24,4%: acima de ~10%. A causa não é o ranking (só 3 pelo ranking, 9,8% >= 38): são 5 pela Ouro e 2 pela sede, que a tabela não afeta. A proposta previa 7,5% pela Ouro e nenhuma pela sede; esta amostra (outra semente) deu mais.
- Subir o corte para 40 ou 42 tira no máximo 1 a 2 edições do tipicoA e derruba o forteA (de 82,9% para cerca de 78% e 65%). Não resolve; o excesso vem das portas Ouro e sede.
- Rotativos: 0%, como previsto.
