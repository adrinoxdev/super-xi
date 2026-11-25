# Corte do Ranking Condor: medição com perfis presos à Série A

Data: 2026-11-25. Script: `docs/calibracao/calib-carreira.mjs` (perfis novos: `forteA`, OVER do time 77 = `TYP[1] + 6`, na A o tempo todo; `tipicoA`, que já existia, OVER 71). Fluxo real do jogo, Condor de Ouro normal (o `startNewSeason` real faz a vaga; o perfil não reinicia o continental depois da 1ª temporada). 60 temporadas por perfil, 15 edições cada. `RANKING_CONTINENTAL.cutoff` segue 16 (nada em `src/` foi alterado).

## Resultado com corte 16

| Perfil | Edições | Classificado | Portas ouro/sede/ranking | Pontos do ranking (min / mediana / max) |
|---|---|---|---|---|
| forteA (77) | 15 | 15 (100%) | 8 / 0 / 7 | 22 / 41 / 55 |
| tipicoA (71) | 15 | 12 (80%) | 4 / 0 / 8 | 1 / 19 / 42 |

Pontos por edição (ordenados). forteA: 22, 28, 29, 33, 34, 39, 40, 41, 44, 44, 44, 47, 48, 49, 55. tipicoA: 1, 15, 15, 16, 17, 18, 19, 19, 22, 30, 30, 32, 32, 34, 42.

## Tabela por corte (% de edições com pontos >= corte)

| Corte | forteA | tipicoA |
|---|---|---|
| 11 | 100% | 93,3% |
| 12 | 100% | 93,3% |
| 14 | 100% | 93,3% |
| 16 | 100% | 80,0% |
| 18 | 100% | 66,7% |

(Mede só pontos; as vagas por Ouro e sede entram além disso, então o total classificado é >= ao da tabela. Com corte 16, tipicoA tem 4 Ouro + 8 ranking = 12 de 15.)

## Leitura

- Critério do Opus (forteA 70-85%, tipicoA até ~10%) **não foi atingido**: com 16 o forteA fica em 100% e o tipicoA em 80%. O erro é para cima nos dois, ou seja, 16 é frouxo, não apertado. Descer para 11 ou 14 piora; a hipótese de "baixar" fica descartada.
- Os pontos do tipicoA na A durante o ciclo todo (mediana 19) são muito maiores que os cerca de 9 (±4) da tabela do plano. Pelo desenho, o típico na A com OVER 71 não deveria vir perto disso. Possíveis causas a investigar (não investigadas aqui): o OVER 71 do perfil, mantido a cada partida, é forte frente ao pool real da A; Taça e Supercopa pontuam; a Ouro vem com frequência (4 de 15).
- Ressalva: a 1ª edição (temporada 4) só tem 3 temporadas de registro e a Ouro não existe na temporada 1; o valor 1 do tipicoA é essa edição. Sem ela o tipicoA sobe (mínimo 15).

## Conclusão e recomendação (não aplicada)

Manter 16 **não** satisfaz o critério. Para o tipicoA ficar perto de 10% seria preciso um corte acima de 30 (ele tem 30, 30, 32, 32, 34, 42), o que deixaria o forteA com cerca de 87% (13 de 15 >= 30; 2 ficam abaixo) e ainda reprovaria o critério superior de 85%. Ou seja, pelo corte sozinho a janela é estreita: algo entre 30 e 33 seria o candidato, mas com 15 edições o intervalo de erro é grande. Propõe-se: (1) não mexer em 16 agora sem decisão do dono; (2) se o desenho quer o típico quase fora, o caminho é rever os **pontos** (Taça, Supercopa, Ouro) ou o OVER dos perfis, não só o corte; (3) repetir com 40+ edições se o corte candidato for >= 30. Esta medição foi feita com uma só amostra por perfil.
