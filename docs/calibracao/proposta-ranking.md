# Proposta: nova tabela do Ranking Condor (não aplicada)

Data: 2026-11-25. Nada em `src/` foi alterado. Base: nova rodada do fluxo real (`calib-carreira.mjs` copiado para fora do repo, só com a gravação de cada `SeasonEcoRecord` por temporada), 164 temporadas por perfil = **40 edições** (temporadas 8 a 164; a edição 4 fica de fora porque só tem 3 temporadas e não tem Ouro na 1ª). Perfis: `forteA` (OVER 77, preso à A), `tipicoA` (OVER 71, preso à A), `forteRot` (OVER 78, roda D-C-B-A) e `tipicoRot`. As tabelas candidatas foram recalculadas sobre esses mesmos registros (os pontos não mudam o que acontece em campo, só a soma), então a estimativa é exata para esta amostra.

Critério: `forteA` classificado em 70% a 85% das edições e `tipicoA` em até ~10%. "Classificado" = campeão da Ouro no ciclo **ou** pontos >= corte (a sede não apareceu em nenhuma edição).

## 1. O que a amostra mostra (frequência por temporada, 164 temporadas)

| Origem | forteA | tipicoA | forteRot | tipicoRot |
|---|---|---|---|---|
| Temporadas na A | 164 | 164 | 41 | 41 |
| Campeão da A | 86 (52%) | 22 (13%) | 38 | 13 |
| 2º a 4º | 59 (36%) | 52 (32%) | 2 | 13 |
| 5º e 6º | 9 | 18 | 1 | 6 |
| Ouro: grupos/quartas/semi/vice/campeão | 44/33/24/19/24 | 26/26/10/9/3 | 0 | 0 |
| Prata (qualquer fase) | 13 | 31 | 32 | 7 |
| Taça: campeão/vice | 57/31 | 31/33 | 55/31 | 27/22 |
| Supercopa / Recopa | 68 / 18 | 31 / 2 | 90 / 7 | 20 / 0 |
| Taça ou Supercopa ganhas fora da A | 0 | 0 | 57 / 58 | 29 / 11 |

Pontos médios por ciclo e por origem com a **tabela atual**:

| Perfil | Ouro | Prata | Série A | Taça | Supercopa | Recopa | Total (min/mediana/max) |
|---|---|---|---|---|---|---|---|
| forteA | 19,5 | 1,1 | 11,4 | 4,9 | 1,7 | 0,4 | 14 / 39 / 54 |
| tipicoA | 7,9 | 1,7 | 5,1 | 3,1 | 0,8 | 0,05 | 3 / 19 / 34 |
| forteRot | 0 | 2,5 | 3,8 | 4,8 | 2,2 | 0,2 | 5 / 14 / 23 |
| tipicoRot | 0 | 0,3 | 2,0 | 2,6 | 0,5 | 0 | 0 / 5 / 11 |

Leituras:

1. **Porta da Ouro é fixa:** forteA ganha a Ouro em 18 das 40 edições (45%) e tipicoA em 3 (7,5%). Nenhuma tabela mexe nisso. Logo o ranking tem de pôr o forteA em 10 a 16 das 22 edições restantes e o tipicoA em no máximo 1 das 37 restantes.
2. **O tipicoA pontua por participação:** com top 4 em 45% das temporadas, ele joga a Ouro quase todo ano e soma 2 só por entrar, mais a Prata em 19%. Essa é a maior parte dos 7,9 + 1,7. O que separa o forte do típico é o **título da A** (52% contra 13%) e as fases finais da Ouro, que a tabela atual paga pouco (título da A vale 4, só 2 a mais que 2º a 4º).
3. **O corte 16 é que está fora:** com a tabela atual em 40 edições, o corte 34 já daria forteA 80% e tipicoA 10%, mas a janela que cumpre o critério é estreita (32 a 37, 6 valores). A troca da tabela serve para alargar essa janela (12 valores) e pagar o desempenho em vez da presença.
4. **O tipicoA (OVER 71) não é "típico":** ganha a A em 13% e fica no top 4 em 45% (o plano supunha 5% e 20%). Ele é o perfil de referência pedido, mas a medição trata um clube bom da A como "típico".

## 2. Tabela proposta (só constantes; a regra fica como está)

| Competição | Participação | Quartas | Semi | Vice | Campeão |
|---|---|---|---|---|---|
| Condor de Ouro | **0** (era 2) | **3** (era 4) | 6 | **9** (era 8) | 12 |
| Condor de Prata | **0** (era 1) | **0** (era 2) | **1** (era 3) | **2** (era 4) | **4** (era 6) |
| Série A | 5º e 6º: **0** (era 1) | 2º a 4º: 2 | | | **8** (era 4) |
| Taça Cacique | | | | 1 | 3 |
| Supercopa, Recopa | | | | | 1 cada |

**Corte: 38** (era 16).

Valores exatos para a T de medição (`src/config/competitions.ts`):

```ts
export const RANKING_CONTINENTAL = {
  ouro: { groups: 0, qf: 3, sf: 6, runnerUp: 9, champion: 12 },
  prata: { groups: 0, qf: 0, sf: 1, runnerUp: 2, champion: 4 },
  serieA: { champion: 8, top4: 2, top6: 0 },
  cup: { champion: 3, runnerUp: 1 },
  recopa: 1,
  supercup: 1,
  cutoff: 38
}
```

`ecoPoints` e `userMundialEntry` em `rankingCondor.ts` não mudam. **Não** proponho a regra "Taça e Supercopa só valem na A": com corte 38 ela é desnecessária, porque fora da A o máximo possível por temporada é 3 + 1 = 4, ou 16 num ciclo inteiro, menos da metade do corte. Um clube da B ou da C dominante não classifica sem ter jogado a A. Também não proponho peso por recência: ele não separa os dois perfis, que ficam presos à A o ciclo todo, e complicaria o painel.

## 3. Estimativa por perfil (conta a partir da distribuição observada)

Pontos esperados por temporada com a tabela nova, a partir das frequências da seção 1:

- **forteA:** Série A (86·8 + 59·2)/164 = 4,91; Ouro (33·3 + 24·6 + 19·9 + 24·12)/164 = 4,28; Taça (57·3 + 31)/164 = 1,23; Supercopa 68/164 = 0,41; Recopa 0,11; Prata 0,12. Total **11,1 por temporada, cerca de 44 por ciclo** (observado: mediana 44, de 16 a 68).
- **tipicoA:** Série A (22·8 + 52·2)/164 = 1,71; Ouro (26·3 + 10·6 + 9·9 + 3·12)/164 = 1,55; Taça (31·3 + 33)/164 = 0,77; Supercopa 0,19; Prata 0,13; Recopa 0,01. Total **4,4 por temporada, cerca de 17 por ciclo** (observado: mediana 19, de 1 a 39).
- A distância entre as medianas sobe de 20 pontos (39 contra 19) para 25 (44 contra 19), e a cauda alta do tipicoA (29, 29, 29, 39; o 39 é ciclo com Ouro campeã, que já entra pela porta da Ouro) fica abaixo de 38.

Pontos por edição com a tabela nova (ordenados). forteA: 16, 18, 22, 24, 27, 28, 28, 31, 35, 36, 36, 39, 40, 40, 40, 41, 41, 41, 41, 43, 44, 45, 46, 47, 47, 48, 49, 51, 51, 52, 55, 56, 57, 58, 58, 58, 62, 65, 66, 68. tipicoA: 1, 5, 6, 6, 7, 8, 8, 8, 12, 13, 13, 14, 14, 14, 14, 16, 16, 16, 17, 17, 19, 19, 19, 19, 20, 20, 20, 20, 21, 22, 23, 23, 24, 25, 25, 25, 29, 29, 29, 39.

Taxa de classificação (Ouro + ranking) por corte, 40 edições:

| Corte | forteA atual | forteA nova | tipicoA atual | tipicoA nova |
|---|---|---|---|---|
| 16 | 97,5% | 100% | 72,5% | 62,5% |
| 30 | 85% | 82,5% | 12,5% | 10% |
| 34 | 80% | 82,5% | 10% | 10% |
| 36 | 72,5% | 80% | 7,5% | 10% |
| **38** | 62,5% | **77,5%** (Ouro 18 + ranking 13) | 7,5% | **10%** (Ouro 3 + ranking 1) |
| 40 | 55% | 75% | 7,5% | 7,5% |

Com a tabela nova, todo corte de 30 a 41 cumpre o critério (antes, só de 32 a 37). O 38 fica perto do meio do alvo do forteA e com folga para os dois lados. Rotativos: com qualquer corte acima de 23 (as duas tabelas), `forteRot` e `tipicoRot` classificam em 0% pelo ranking. O maior ciclo do forteRot vale 23 nas duas tabelas (mediana 14, ou 16 na nova).

## 4. O que NÃO muda

- Prêmios da Copa dos Continentes, vagas por confederação (32), Opção C e a ordem Ouro, depois sede, depois ranking, sem duplicação (`mundialField.ts`).
- Vaga direta do campeão da Ouro; vaga da sede (campeão da A, depois Taça, depois vice); preenchimento das vagas de ranking da IA por OVER (não usa pontos).
- `ecoPoints`, `rankingPoints`, `userMundialEntry`, o ciclo `MUNDIAL_EVERY = 4`, `ECO_RECORDS_MAX`, os registros no save (nenhuma migração: só a soma muda).
- Os textos de `ECOSYSTEM_LINKS` continuam certos ("todas as fases", "campeão e vice", "1º a 6º"). Dois pequenos ajustes de texto: Prata e Série A 5º/6º passam a valer 0 em algumas fases, e a tabela do plano (2.2) e o painel do ranking, se mostrarem os números, precisam refletir a nova tabela.

## 5. Riscos

1. **Rotativo fora pela porta do ranking.** Quem sobe e desce não passa de ~23 pontos (1 temporada na A por ciclo e nenhuma Ouro), e nenhuma tabela cumpre "tipicoA ≤ 10%" sem tirar o rotativo, porque o melhor ciclo dele fica abaixo da cauda do tipicoA (25 a 29). Já hoje, com corte 16, ele classifica em só 32,5%. Para ele sobram a porta da Ouro (exige A antes) e a da sede. É uma escolha de desenho do dono: a vaga de ranking fica como prêmio da elite estável da A.
2. **Amostra:** uma carreira por perfil, 40 edições. O erro padrão de 77,5% com n = 40 é de ±6,6 pontos percentuais (IC 95% de cerca de 64% a 91%). O tipicoA fica em 10% por **uma** edição de ranking: um ou dois ciclos fortes a mais e ele passa de 10%. A T de medição deve usar 40+ edições, de preferência 2 sementes por perfil.
3. **Piso do tipicoA = 7,5% pela Ouro**, intocável pela tabela; a margem para o ranking é de ~1 edição em 40.
4. **Perfil "típico" forte demais** (13% de títulos da A): se o dono quiser o típico do plano (5% de títulos), a tabela nova o deixa ainda mais longe do corte (sem risco), mas o forteA também deve ser revisto.
5. **Corte alto no painel:** 38 pontos parece muito para o jogador. O painel deve mostrar a tabela nova, para não parecer inalcançável (um título da A vale 8, uma Ouro campeã vale 12).
6. **Clube recém-promovido** (2 temporadas na A no ciclo): soma cerca de metade do forteA (cerca de 20) e não classifica no 1º ciclo. É coerente com "jogar a A no ciclo", mas mais duro que a estimativa do plano (22% com corte 16).

## 6. Instrução para a T de medição (Sonnet)

1. Aplicar o bloco da seção 2 em `src/config/competitions.ts` (só `RANKING_CONTINENTAL`) numa branch de medição ou via `--overlay`.
2. Rodar `node docs/calibracao/calib-carreira.mjs 164 forteA,tipicoA,forteRot` (40 edições cada; se der tempo, repetir com outra semente).
3. Pronto quando: forteA entre 70% e 85%, tipicoA até 10% (ou 12,5% com justificativa de ruído), nenhum classificado pelo ranking sem temporada na A no ciclo (conferir no JSON pelas divisões das 4 temporadas anteriores a cada edição; no forteRot, ranking deve dar 0). Registrar portas ouro/sede/ranking e min/mediana/max dos pontos.
4. Se o forteA ficar acima de 85%: corte 40. Se ficar abaixo de 70%: corte 36. Não mexer nos pesos sem nova proposta.
