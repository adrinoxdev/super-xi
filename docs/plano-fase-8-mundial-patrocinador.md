# Plano da Fase 8: Copa dos Continentes e o ecossistema de competições

Só planejamento: nenhum arquivo de `src/`, nem o `package.json`, foi alterado. Origem: `_origem/roadmap_de_evolu_o_handoff_completo.md` (Fase 8, item 8.1). **Versão-alvo: 1.3.0.** O commit `chore(version): 1.3.0` só sai quando o dono pedir o lançamento; as branches de frente nunca mexem no `package.json`.

**Decisões do dono até a revisão 4:**
- 32 clubes (8 grupos de 4, oitavas, quartas, semis, final e 3º lugar), a cada 4 temporadas.
- Nome "Copa dos Continentes".
- Campo neutro para todos.
- Opção C do ecossistema, condicionada a tudo estar ligado: seção 3, Mapa de ligações, e a tarefa T11.
- Ranking Condor, desde que coerente: corte revalidado na seção 2.3.
- Prêmio maior: seção 7.
- Faixas de OVER aprovadas.
- Supercopa e Recopa com campeões de verdade: obrigatório (T10).
- Nomes refeitos em 3 universos (seção 10).
- Patrocinador Master fora da Fase 8 (seção 13, backlog).
- Aprovados: aviso no save antigo, testes versionados em `docs/calibracao/` e asserção das 17 chaves do t23 numa `chore`.

## 0. Como o código está hoje (verificado)

- **Mundial:** não existe nada em `src/`.
- **Finais de jogo único** (`src/stores/modules/competitions/finals.ts`): a vaga da Supercopa (`wonLeagueTitle || wonCup`, qualquer série) e a da Recopa (`wonContinental`, Ouro ou Prata) nascem na virada, em `useSeason.startNewSeason`. O rival é sorteado (`LEAGUE_CLUBS_POOL[1]` na Supercopa, `CONTINENTAL_RIVALS` na Recopa), sem ligação com quem ganhou a outra competição. A disputa é na temporada seguinte.
- **Continental:** `tier` `'libertadores'` (Condor de Ouro: top 4 da A) ou `'sulamericana'` (Condor de Prata: 5º e 6º da A ou campeão da Taça Cacique, **de qualquer série**). A Ouro tem prioridade sobre a Prata (`if/else if` em `startNewSeason`), então já não há vaga dupla. São 4 grupos de 4 em ida e volta, depois quartas, semi, 3º e final. O estado só existe com o usuário classificado. O pódio vai para `club.podiumArchive` (máximo de 12).
- **Taça Cacique:** chave de 16 todo ano, com pódio, então o campeão da Taça é sempre conhecido.
- **Liga:** só a série do usuário é simulada. O campeão da A só é conhecido quando o usuário está nela.
- **Grupos:** `src/stores/modules/competitions/groups.ts` tem `sortGroup`, `GROUP_SCHEDULE` (3 rodadas de turno único) e `applyGroupMatch`, puros mas tipados em `ContinentalTeam`.
- **Motor de chave:** `createBracket` monta árvores em potência de 2 com 3º lugar; uma chave de 16 serve sem mudança estrutural. `simulateMatchScore` sempre dá `HOME_ADVANTAGE` ao mandante; o jogo neutro pede um parâmetro.
- **Troféus:** `recordTrophy('title', ...)` grava "Campeão da Copa Condor de Ouro", "...de Prata", "Campeão da Taça Cacique", títulos de série e das finais.
- **Save:** 24 chaves de topo hoje (a h6 do `t23-atletas.mjs`, que espera 17, está desatualizada).
- **Calibração quebrada:** `calib-carreira.mjs` importa caminhos que deixaram de existir no commit `f673638` (falha com `Failed to load url /src/utils/generatePlayer.ts`): tarefa T0.

## 1. Formato: 32 clubes, a cada 4 temporadas

| Fase | Regra |
|---|---|
| Grupos | 8 grupos de 4 (A a H), turno único, 3 rodadas (`GROUP_SCHEDULE`), `sortGroup`. Avançam 2 por grupo. |
| Oitavas | Jogo único: 1A x 2B, 1C x 2D, 1E x 2F, 1G x 2H, 1B x 2A, 1D x 2C, 1F x 2E, 1H x 2G. |
| Quartas, semis e final | Jogo único, árvore normal; 3º lugar com os perdedores das semis. |
| Empate | Pênaltis no mata-mata; 1 ponto nos grupos. |
| Mando | Neutro para todos, inclusive a sede. |
| Bilheteria no neutro | Os dois clubes recebem a fatia de visitante, `projectedStadiumIncome × ECONOMY.awayTicketShare` (40%), como renda dividida. Patrocínio, bônus de resultado, folha e manutenção seguem o `settleMatch`. |
| Jogos do usuário | Até 7 (3 de grupo, oitavas, quartas, semi, final ou 3º). |
| Outros jogos | 45 de grupo e 15 a 16 de mata-mata, simulados pelo OVER no ritmo das partidas do usuário. |
| Sorteio | 4 potes de 8 por OVER; sede em A1; no máximo 1 clube por confederação em cada grupo (Europa até 2), com novas tentativas e `rng` injetável. |
| Calendário | Edições nas temporadas múltiplas de 4 (T4, T8, ..., T28). A vaga fecha na virada que abre a temporada da edição; o ciclo são as 4 temporadas anteriores. O que estiver pendente na virada vira W.O. e a chave é completada. |
| Sede | Rotação de 4 países, um por edição; o seu país em 1 de cada 4. Como o jogo é neutro, a sede só decide quem ocupa 1 das 32 vagas: força, prêmio e calibração não mudam. |

## 2. Vagas

### 2.1 Por confederação (32)

Europa 12, América do Sul 6, Ásia 4, África 4, América do Norte e Central 4, Oceania 1, sede 1 (distribuição real atual). As vagas estrangeiras são da IA (`MUNDIAL_RIVALS`). As 6 sul-americanas e a da sede vêm do ecossistema do jogo.

### 2.2 Opção C (aprovada)

1. **Campeões da Condor de Ouro** das 4 temporadas do ciclo: vaga direta (até 4). Bicampeão ocupa uma vaga só, e a que sobra vai para o ranking.
2. **Vaga da sede:** no seu país, o campeão da Série A da temporada anterior; se ele já estiver classificado, passa ao campeão da Taça Cacique e depois ao vice da A. Fora do seu país, um clube IA local.
3. **Ranking Condor:** as vagas sul-americanas restantes (pelo menos 2) vão para os melhores do ciclo ainda não classificados. Pontos por temporada (vale a maior fase de cada competição; soma das 4):

| Competição | Participação | Quartas | Semi | Vice | Campeão |
|---|---|---|---|---|---|
| Condor de Ouro | 2 | 4 | 6 | 8 | 12 |
| Condor de Prata | 1 | 2 | 3 | 4 | 6 |
| Série A | 5º e 6º: 1 | 2º a 4º: 2 | | | 4 |
| Taça Cacique | | | | 1 | 3 |
| Supercopa, Recopa | | | | | 1 cada |

4. **Atribuição sem duplicação:** campeões da Ouro, depois a sede, depois o ranking; cada clube recebe no máximo uma vaga. O usuário classificado pelo ranking precisa somar pelo menos `RANKING_CONDOR.cutoff` pontos. A IA preenche as outras vagas de ranking com clubes fortes da A e de `CONTINENTAL_RIVALS`.
5. **Dados da IA:** o campeão IA da Ouro vem do `podiumArchive` quando o usuário disputou; senão, é sorteado na criação da edição. Os nomes ficam gravados no histórico do ciclo.

### 2.3 Revalidação do corte do ranking (ajuste: 14 → 16)

Pontos esperados por ciclo de 4 temporadas na A. São estimativas montadas sobre o motor medido: curva de vitórias, clube típico entre 42% e 47% de vitórias, forte 5 a 7 OVER acima da série, Taça "ganhável demais" (12% a 22% de títulos para o típico, relatório, decisão 5).

| Perfil na A | Série A por temporada | Condor por temporada | Taça e finais por temporada | Por ciclo (média) | Chance de passar o corte |
|---|---|---|---|---|---|
| Típico (top 4 em cerca de 20%, título em cerca de 5%) | 0,7 | 0,9 (Ouro em 20%, Prata em 12%) | 0,7 | **cerca de 9** (±4) | 14 pontos: cerca de 12%; **16 pontos: cerca de 5%** |
| Forte (top 4 em cerca de 55%, título em cerca de 20%) | 1,6 | 2,7 | 1,0 | **cerca de 21** (±6) | 14 pontos: cerca de 88%; **16 pontos: cerca de 80%** |
| Forte no 1º ciclo na A (2 temporadas na A, 2 na B) | 0,8 em média | 1,3 | 0,9 | **cerca de 12** (±5) | 14 pontos: cerca de 35%; 16 pontos: cerca de 22% |

Leitura: com 14, o forte já classificado na A entra em cerca de 88% das edições, acima do alvo de 70% a 85%, e o típico entra em 1 de cada 8, o que banaliza a vaga. **Recomendação: subir o corte para 16.** O forte entra em cerca de 80%, o típico em cerca de 5% (o torneio continua sendo prêmio de quem está no topo), e a porta da Taça Cacique e da Prata continua viva para quem soma títulos menores (Prata campeã 6 + Taça campeã 3 + Ouro nas quartas 4 + top 4 2 = 15, quase lá). A T13 mede a taxa real e só propõe outro valor se o forte ficar fora de 70% a 85%.

### 2.4 Histórico do ciclo (novo, dentro de `club`)

```ts
export type EcoPhase = 'groups' | 'qf' | 'sf' | 'runnerUp' | 'champion'
export interface SeasonEcoRecord {
  season: number
  division: number
  leagueRank: number | null
  leagueTitle: boolean
  ouro: EcoPhase | null
  prata: EcoPhase | null
  cup: 'champion' | 'runnerUp' | null
  recopa: boolean
  supercup: boolean
  ouroChampion: { name: string; power: number } | null
  prataChampion: { name: string; power: number } | null
  cupChampion: { name: string; power: number } | null
  serieAChampion: { name: string; power: number } | null
}
// em ClubSave: ecoRecords?: SeasonEcoRecord[]   (últimas 8 temporadas)
```

Os campeões gravados (Ouro, Prata, Taça e A) alimentam tanto o Mundial quanto os rivais reais da Supercopa e da Recopa (T10). Quando o jogo não conhece o campeão (por exemplo, a A com o usuário na B), ele é sorteado uma única vez na virada e gravado, para nunca mudar entre recargas.

## 3. Mapa de ligações

Toda competição recebe de pelo menos uma e alimenta pelo menos uma; a única exceção é o topo (Copa dos Continentes), que é ponto final por definição e alimenta só a galeria, o pódio e os marcos.

| Competição | Recebe de (como se entra) | Alimenta (o que o resultado dá) |
|---|---|---|
| Série D | início de carreira; rebaixados da C | Série C (4 sobem); Supercopa (campeão); Taça Cacique (todos disputam) |
| Série C | promovidos da D; rebaixados da B | Série B (4 sobem); Série D (4 caem); Supercopa (campeão) |
| Série B | promovidos da C; rebaixados da A | Série A (4 sobem); Série C (4 caem); Supercopa (campeão) |
| Série A | promovidos da B | Condor de Ouro (1º a 4º); Condor de Prata (5º e 6º); Supercopa (campeão); vaga da sede no Mundial (campeão, no ano em que o seu país é sede); Ranking Condor (1º a 6º); Série B (4 caem) |
| Taça Cacique | os clubes da série do usuário e convidados (como hoje) | Condor de Prata (campeão, se não estiver na Ouro); Supercopa (campeão); suplente da vaga da sede; Ranking Condor (campeão e vice) |
| Condor de Ouro | Série A (1º a 4º) | Recopa (campeão); Copa dos Continentes (campeões do ciclo); Ranking Condor (todas as fases) |
| Condor de Prata | Série A (5º e 6º); campeão da Taça | Recopa (campeão); Ranking Condor (todas as fases) |
| Supercopa | campeão da liga (qualquer série) x campeão da Taça (T10) | Ranking Condor (campeão: 1) |
| Recopa | campeão da Ouro x campeão da Prata (T10) | Ranking Condor (campeão: 1) |
| Ranking Condor (não é competição, é o elo) | Ouro, Prata, Série A, Taça, Supercopa, Recopa | Copa dos Continentes (vagas sul-americanas que sobram) |
| Copa dos Continentes | campeões da Ouro do ciclo; Ranking Condor; vaga da sede; vagas estrangeiras da IA | galeria, pódio e marcos (topo) |

**Regras de não duplicação (conferidas na T11):**
- Ouro antes da Prata (já é assim no código): o campeão da Taça que está no top 4 da A vai para a Ouro, e a vaga da Prata não é repassada (como hoje).
- Mundial: um clube, uma vaga (ordem Ouro, sede, ranking).
- Supercopa: se o mesmo clube ganhou a liga e a Taça, o rival é o vice da Taça.
- Recopa: o usuário nunca enfrenta a si mesmo; com o usuário campeão da Ouro, o rival é o campeão gravado da Prata, e vice-versa.
- Supercopa, Recopa e Mundial podem coexistir na mesma temporada: são competições distintas, com sessões de partida distintas.

**Representação no código:** `ECOSYSTEM_LINKS` em `src/config/competitions.ts`, uma lista declarativa `{ from, to, rule }` que espelha esta tabela. Não é usada para decidir vagas (quem decide são as funções puras); serve para a checagem de grafo da T11 e para a documentação na interface ("Caminhos": de onde vem e para onde leva cada competição).

## 4. Tipos e constantes

### 4.1 Tipos

- `MatchCompetition` ganha `'mundial'`. O `vue-tsc` aponta os `Record` em `stores/match.ts`, `MatchSwitcher.vue` e `suspension.ts`.
- `BracketCompetition` ganha `'mundial'`, e `Bracket` ganha `neutral?: boolean`.

```ts
export type MundialConfed = 'condor' | 'europa' | 'asia' | 'africa' | 'norte' | 'oceania' | 'sede'
export type MundialEntry = 'ouro' | 'ranking' | 'sede'
export interface GroupTeam extends ContinentalTeam { confed?: MundialConfed; tag?: string }
export interface GroupMatchResult { round: number; homeId: string; awayId: string; hg: number; ag: number }
export interface MundialGroup { id: string; teams: GroupTeam[]; results: GroupMatchResult[] }
export interface MundialState {
  qualified: boolean; edition: number; season: number; hostId: string
  userEntry: MundialEntry | null
  stage: 'GROUPS' | 'KNOCKOUT' | 'DONE'; groupRound: number; userGroupId: string
  groups: MundialGroup[]; bracket: Bracket | null
  eliminated: boolean; champion: boolean; finalPosition: 1 | 2 | 3 | 4 | null
  history: Array<{ roundName: string; summary: string; prize: number }>
}
```

### 4.2 Constantes (`src/config/competitions.ts`)

```ts
export const MUNDIAL_LABEL = 'Copa dos Continentes'
export const MUNDIAL_EVERY = 4
export const MUNDIAL_SLOTS = { europa: 12, condor: 6, asia: 4, africa: 4, norte: 4, oceania: 1, sede: 1 }
export const MUNDIAL_RIVALS = {               // faixas aprovadas; nomes do universo escolhido (seção 10)
  europa:  { minOver: 74, maxOver: 83, names: [/* 16 */] },   // 4 do topo entre 80 e 83
  asia:    { minOver: 66, maxOver: 72, names: [/* 6 */] },
  africa:  { minOver: 65, maxOver: 71, names: [/* 6 */] },
  norte:   { minOver: 65, maxOver: 71, names: [/* 6 */] },
  oceania: { minOver: 56, maxOver: 60, names: [/* 3 */] }
}
export const MUNDIAL_HOSTS = [ /* 3 sedes estrangeiras (clubes com OVER entre 64 e 69) + { id: 'casa', user: true } */ ]
export const RANKING_CONDOR = {
  ouro:  { groups: 2, qf: 4, sf: 6, runnerUp: 8, champion: 12 },
  prata: { groups: 1, qf: 2, sf: 3, runnerUp: 4, champion: 6 },
  serieA: { champion: 4, top4: 2, top6: 1 }, cup: { champion: 3, runnerUp: 1 },
  recopa: 1, supercup: 1, cutoff: 16
}
export const ECOSYSTEM_LINKS: Array<{ from: EcoNode; to: EcoNode; rule: string }> = [ /* seção 3 */ ]

// PRIZES.mundial (seção 7): pago ao alcançar cada fase, sem cota base.
mundial: { r16: 120000, qf: 180000, sf: 250000, thirdWin: 190000, thirdLoss: 60000, finalLoss: 350000, champion: 950000 },
```

### 4.3 Funções puras novas

- `src/utils/groups/groupStage.ts` (novo, módulo genérico): `sortGroup`, `applyGroupMatch` e `GROUP_SCHEDULE` movidos de `modules/competitions/groups.ts` (que passa a reexportar; o continental não muda), mais `drawGroups(...)` e `simulateGroupRound(group, round, rng, { neutral, skipUser })`.
- `src/utils/bracket/bracket.ts`: `simulateMatchScore(..., homeAdvantage = HOME_ADVANTAGE)`; `resolveTie` sem mando quando `bracket.neutral`.
- `src/utils/bracket/bracketSeeding.ts`: `MUNDIAL_R16_TEMPLATE`, `seedMundialRoundOf16`.
- `src/utils/competitions/rankingCondor.ts` (novo): `ecoPoints`, `rankingPoints`, `userMundialEntry`.
- `src/utils/competitions/mundialField.ts` (novo): `buildMundialField(...)`, com os 32 clubes, sem duplicação, e os grupos sorteados.
- `src/utils/competitions/finalsRivals.ts` (novo, T10): `supercupRival(record, userWonLeague, userWonCup)` e `recopaRival(record, userTier)`.
- `src/utils/competitions/ecosystem.ts` (novo, T11): `checkEcosystemGraph(ECOSYSTEM_LINKS)`, que devolve os nós órfãos (sem entrada a partir da Série D) e os sem saída (exceto o topo).

## 5. Stores e composables afetados

| Arquivo | Mudança |
|---|---|
| `src/stores/modules/competitions/mundial.ts` (novo) | `openMundialEdition`, `resetMundial`, `finishMundialForSeason` (W.O., simulação e pódio), `applyMundialResult` (grupos rodada a rodada, depois a chave de 16 no fluxo da `cup.ts`), prêmios por fase, troféu, rótulos, adversário, pendências e classificação. |
| `defaults.ts`, `save.ts`, `src/stores/competitions.ts` | `emptyMundial()`, `mundialState` no save, `isCompetitionPlayable('mundial')`, `hasPendingThirdPlace`. |
| `src/stores/modules/competitions/finals.ts` | `qualifySupercup(rival)` e `qualifyRecopa(rival)` recebem o rival real com a etiqueta de origem; `FinalState` ganha `rivalOrigin?: string`. |
| `src/stores/club.ts` | `ecoRecords` (máximo de 8), `recordEcoSeason`, save e reset. |
| `src/composables/useMatchSimulation.ts` | `mundial` neutro (`homeBonusApplies` inalterado, `rawIsHomeFor('mundial') = false`), adversário, rótulo, pênaltis só no mata-mata, ramo em `concludeMatch`. |
| `src/stores/match.ts`, `MatchSwitcher.vue`, `suspension.ts` | Entradas do `mundial`. |
| `src/composables/useSeason.ts` | Virada: (1) `SeasonEcoRecord` com fases e campeões, antes das redefinições; (2) `finishMundialForSeason` e arquivar o pódio; (3) `resetMundial`; (4) temporada múltipla de 4: `buildMundialField` e, com vaga, `openMundialEdition`; (5) Supercopa e Recopa com `supercupRival`/`recopaRival`. As vagas da Supercopa e da Recopa ficam iguais às de hoje (prêmios intactos). |
| `src/composables/usePersistence.ts` | `mundialState`; reconstrução do `ecoRecords` em save antigo; aviso único. |
| Interface | `MundialPanel.vue`, `MundialCycleCard.vue`, `CompetitionsView.vue`, `DashboardView.vue`, `SupercupsPanel.vue` (origem do rival), `useNavigation.ts`. |

## 6. Save e migração (idempotente)

- `mundialState`: chave de topo aditiva (25 no total), com 8 a 12 KB só na temporada da edição e só com o usuário classificado. Padrão `emptyMundial()` em save antigo.
- `ecoRecords` dentro de `club` (8 registros de cerca de 250 bytes). Save antigo sem o campo: reconstruir pelo `trophyGallery` (títulos por temporada) e pelo `podiumArchive` (campeões da Ouro, da Prata e da Taça). Fases que não são título ficam `null`. Roda só com o campo ausente, então uma segunda carga não muda nada. Precisa reconhecer os textos antigos e os novos se a seção 10 for aplicada.
- `FinalState.rivalOrigin`: opcional; save antigo fica sem a etiqueta.
- Aviso único: "Nova competição: Copa dos Continentes, a cada 4 temporadas. Próxima edição na temporada N. Seus títulos já contam para o Ranking Condor."
- A asserção das 17 chaves vai numa `chore` (T1); os testes da Fase 8 conferem "as chaves de antes mais `mundialState`".

## 7. Prêmios e calibração (prêmio maior)

### 7.1 Três tabelas comparadas (sem cota base; pago ao alcançar a fase)

| Desfecho (total acumulado) | Revisão 3 | Intermediária | **Recomendada** |
|---|---|---|---|
| Eliminado nos grupos | 0 | 0 | **0** |
| Oitavas | 40 mil | 80 mil | **120 mil** |
| Quartas | 100 mil | 200 mil | **300 mil** |
| Semi | 180 mil | 360 mil | **550 mil** |
| 4º | 200 mil | 400 mil | **610 mil** |
| 3º | 240 mil | 480 mil | **740 mil** |
| Vice | 280 mil | 600 mil | **900 mil** |
| Campeão | 500 mil | 1,0 mi | **1,5 mi** |

Recomendada, por fase (constantes): oitavas 120 mil; quartas +180; semi +250; perdedor do 3º +60, vencedor do 3º +190; vice +350; campeão +950 mil.

Por que é atraente: o campeão leva 1,5 mi, cerca de 3,7 vezes o campeão continental (cerca de 400 mil com cotas), 5 vezes o campeão da A (300 mil) e o equivalente a 3 a 5 ampliações da A (260 a 500 mil cada). Só passar dos grupos (120 mil) já vale mais que o vice continental (70 mil de bônus mais cotas). É um evento de 4 em 4 anos, e o prêmio tem cara de evento.

**Escada:** cada fase paga mais que a equivalente das outras copas (Taça: rodadas 10/20/40/260 mil; continental: 30 mil por vitória mais 180/70/30). O topo fica Supercopa 40 < Recopa 60 < Taça 330 < continental cerca de 400 < **Copa dos Continentes 1.500 mil**. Entre séries nada muda (o Mundial só existe para quem está no topo). O vice (900 mil) passa a valer mais que o título da A (300 mil), coerente com a hierarquia mundo > continente > país.

### 7.2 Valor esperado por perfil (por edição; chances estimadas pela curva)

| Perfil | Chances (grupos / oitavas / quartas / semi / final) | Classificado | VE por edição classificado | VE por edição | VE por temporada na A (÷4) |
|---|---|---|---|---|---|
| Elenco máximo (OVER 88) | 95% / 85% / 70% / 65% / 62% | cerca de 100% | **cerca de 690 mil** | 690 mil | **cerca de 173 mil** |
| Forte (76 a 78) | 65% / 50% / 40% / 38% / 35% | cerca de 80% | cerca de 205 mil | cerca de 165 mil | cerca de 41 mil |
| Típico (71) | 45% / 35% / 30% / 28% / 28% | cerca de 5% | cerca de 105 mil | cerca de 5 mil | cerca de 1 mil |

Conta da tabela recomendada para o elenco máximo: 120 × 0,95 + 180 × 0,81 + 250 × 0,57 + 950 × 0,23 (campeão) + 350 × 0,14 (vice) + 190 × 0,12 (3º) + 60 × 0,08 (4º) ≈ 690 mil. Os jogos a mais (até 7, com 40% de bilheteria) ficam perto de −6 mil cada num clube da A e entram no saldo, mas não mudam a ordem de grandeza.

### 7.3 Onde quebraria e o valor mais alto seguro

- **Teto do `--check`:** saldo do elenco máximo na A menor que 400 mil por temporada. Com B = saldo atual desse perfil na A (linha de base da T0; historicamente cerca de −240 mil, relatório, decisão 6), o Mundial quebra o teto quando `VE por edição / 4 > 400 mil − B`.
  - Fator máximo sobre a tabela recomendada: `k_max = 4 × (400 mil − B) / 690 mil`.
  - Com B = −240 mil: k_max ≈ 3,7, ou seja, quebraria com campeão perto de 5,5 mi.
  - Com B = 0: k_max ≈ 2,3 (campeão perto de 3,5 mi).
  - Com B = +200 mil: k_max ≈ 1,16 (campeão perto de 1,7 mi).
- **Típico** (teto de 650 mil na A, hoje cerca de 320 a 405 mil): +1 mil por temporada, irrelevante.
- **Sensação de jogo:** acima de 2 mi, um título paga toda a infraestrutura da A de uma vez, e a economia do clube forte deixa de ter freio no ciclo seguinte.

**Recomendação: campeão a 1,5 mi (tabela recomendada).** É o valor mais alto que fica seguro mesmo no pior cenário plausível da linha de base (B até cerca de +200 mil) e fica abaixo do limite de sensação de 2 mi. A T13 calcula o `k_max` com o B medido. Se B passar de +200 mil, a T13 propõe a tabela intermediária (1 mi); não muda nada sozinha.

## 8. Interface

- Aba "Continentes" com selo de pendência.
- **`MundialPanel.vue`:**
  - Sem edição na temporada: contagem regressiva, sede e Ranking Condor (corte de 16).
  - Edição sem o usuário: grupos e campeão como notícia.
  - Edição com o usuário: grupo dele, abas com os outros 7, botão de entrada, chave de 16 (`BracketView` padrão), pódio e prêmios.
- **`MundialCycleCard.vue`:** "Rumo à Copa dos Continentes", com os pontos do ciclo por competição, a porta provável e "Faltam N pontos".
- **"Caminhos"** (seção pequena no `MundialCycleCard` ou na aba Competições): a tabela da seção 3 lida de `ECOSYSTEM_LINKS`, para o jogador ver como cada competição leva à outra.
- **`SupercupsPanel.vue`:** origem do rival ("Campeão da Taça", "Campeão da Condor de Prata").
- Rótulos: "Copa dos Continentes • Grupo C, 1ª rodada" / "• Oitavas de Final"; galeria "Campeão da Copa dos Continentes".

## 9. Tarefas (uma por delegação a Sonnet, esforço low, salvo indicação)

### Regras

- Projeto `C:\Users\elphant\Downloads\Super XI`. Não commitar nem mexer em `package.json` (a 1.3.0 só entra no pedido de lançamento). Só os arquivos listados.
- Branches: T0 em `chore/calib-imports`; T1 em `chore/t23-chaves`; T2 a T14 em `feature/copa-dos-continentes`; T15 em `feature/universo-nomes`, depois da escolha do universo. Merge `--no-ff` na `develop` depois da revisão do Opus, feito pela sessão principal.
- Pronto comum: `npm run build` mais o teste da tarefa. Testes em `docs/calibracao/` (`t40` em diante), com o harness do `calib-carreira.mjs` consertado; `OK <nome>`, `exit(1)` na falha; `mulberry32(seed)`.
- Português; nenhum nome real de clube, marca ou confederação; "OVER".

### Grafo

```
T0 -> T1
T2 -> T3 -> T4 -> T5 -> T6 -> T7 -> T8 -> T9 -> T10 -> T11 -> T12 -> T13 -> T14 (Opus)
T15 depois da escolha do universo (seção 10) e depois da T14
```

---

**T0. Consertar os imports da calibração e tirar a linha de base** (`chore/calib-imports`)
- Arquivos: `docs/calibracao/calib-carreira.mjs`. Imports para `/src/config/index.ts`, `/src/utils/player/generatePlayer.ts`, `/src/utils/match/calculateTeamStrength.ts`, `/src/utils/bracket/bracket.ts`.
- Pronto: `node docs/calibracao/calib-carreira.mjs 20 curva,tipicoRot:240,forteRot:80,fracoRot:80,maximoRot:120,tipico,tipicoD,forte,fraco,caroFraco,investidor --check` dá `CHECK OK`. Anotar o `tipicoRot` por série e o **B** (saldo do `maximoRot` na A). Se falhar, parar e reportar.

**T1. Asserção das chaves no t23** (`chore/t23-chaves`)
- Arquivos: `docs/calibracao/t23-atletas.mjs` (imports e h6 com a lista real de chaves). Pronto: todas as asserções OK.

**T2. Tipos e constantes**
- Arquivos: `src/types/match.ts`, `bracket.ts`, `competitions.ts`, `club.ts` (`SeasonEcoRecord`, `ecoRecords?`, `FinalState.rivalOrigin?`), `src/config/competitions.ts` (seção 4.2, `ECOSYSTEM_LINKS` da seção 3, nomes do universo atual até a T15), `stores/match.ts`, `MatchSwitcher.vue`, `suspension.ts` (só as entradas). Pronto: build.

**T3. Módulo genérico de grupos e jogo neutro**
- Arquivos: `src/utils/groups/groupStage.ts` (novo), `modules/competitions/groups.ts` (reexporta), `src/utils/bracket/bracket.ts`.
- Teste `t40-groups.mjs`:
  1. Regressão byte a byte do continental e da Taça (sementes 1 a 20, JSON gravado antes de editar contra a `develop`).
  2. Sorteio de 32 em 1.000 sementes com as restrições (relaxamento em menos de 1%).
  3. Jogo neutro: 40% ± 2 para cada lado entre OVER iguais.
  4. Desempates de `sortGroup`.

**T4. Histórico do ciclo e Ranking Condor**
- Arquivos: `src/utils/competitions/rankingCondor.ts` (novo), `src/stores/club.ts`.
- Teste `t41-ranking.mjs`: cada célula da tabela; soma só o ciclo; ordem das portas; corte 16 (16 entra, 15 fica fora); `ecoRecords` limitado a 8; save idempotente.

**T5. Campo de 32 clubes**
- Arquivos: `src/utils/competitions/mundialField.ts` (novo), `bracketSeeding.ts`.
- Teste `t42-mundial-field.mjs`:
  1. Sempre 32 clubes distintos, 12/6/4/4/4/1/1.
  2. Portas `'ouro'`, `'sede'` e `'ranking'`; campeão da A e da Ouro no ano de sede: a sede vai ao campeão da Taça; os dois também: vai ao vice da A.
  3. Bicampeão ocupa uma vaga.
  4. Campeões vêm do `ecoRecords` ou do `podiumArchive`.
  5. Faixas de OVER.

**T6. Módulo e store do Mundial**
- Arquivos: `mundial.ts` (novo), `defaults.ts`, `save.ts`, `src/stores/competitions.ts`.
- Teste `t43-mundial-store.mjs`:
  1. Abre a edição.
  2. Passa dos grupos: +120 mil e os outros grupos completos.
  3. Campeão: 1,5 mi no total.
  4. Perde a semi e vence o 3º: 740 mil.
  5. Eliminado nos grupos: 0 e o torneio simulado até o pódio.
  6. W.O. no meio dos grupos.
  7. Save idempotente.

**T7. Partida do Mundial**
- Arquivos: `useMatchSimulation.ts`, `DashboardView.vue` (`CUP_COMPETITIONS`), `useNavigation.ts` (selo). Buscar todas as correntes `comp === ...`.
- Teste `t44-mundial-match.mjs`: adversário do grupo ou da chave; rótulo; sem mando; bilheteria de 40%; pênaltis só no mata-mata.

**T8. Virada de temporada**
- Arquivos: `useSeason.ts` (passos 1 a 4 da linha `useSeason` da seção 5).
- Teste `t45-mundial-season.mjs`:
  1. O registro grava as fases e os campeões.
  2. Edição abre na temporada múltipla de 4 com o usuário classificado.
  3. W.O. e pódio na virada seguinte.
  4. Nada fora do ano de edição.

**T9. Persistência, reconstrução e aviso**
- Arquivos: `usePersistence.ts`.
- Teste `t46-mundial-save.mjs`: save antigo reconstrói pelo `trophyGallery` e pelo `podiumArchive`; aviso único; meio dos grupos recarrega igual; save, load, save idêntico; chaves de antes mais `mundialState`.

**T10. Supercopa e Recopa com campeões reais (obrigatória)** (depende de T4 e T8)
- Arquivos: `src/utils/competitions/finalsRivals.ts` (novo), `finals.ts`, `useSeason.ts` (passo 5), `SupercupsPanel.vue`.
- Fazer: vagas iguais às de hoje (prêmios intactos). Rival real:
  - Supercopa: usuário campeão da liga (qualquer série) enfrenta o campeão da Taça; campeão da Taça enfrenta o campeão da A (gravado); campeão das duas enfrenta o vice da Taça.
  - Recopa: campeão da Ouro enfrenta o campeão gravado da Prata, e vice-versa.
  - Títulos de Supercopa e Recopa somam 1 ponto no ranking (via `SeasonEcoRecord`).
- Teste `t47-finais-ecossistema.mjs`: os 5 casos acima; o rival nunca é o usuário; `rivalOrigin` preenchido; prêmios iguais aos de hoje; ponto de ranking contado.

**T11. Checagem do ecossistema (obrigatória)** (depende de T10)
- Arquivos: `src/utils/competitions/ecosystem.ts` (novo), `docs/calibracao/t48-ecossistema.mjs`.
- Teste:
  1. **Grafo:** `checkEcosystemGraph(ECOSYSTEM_LINKS)` não acha órfão (todo nó alcançável a partir da Série D) nem beco sem saída (todo nó, exceto a Copa dos Continentes, alimenta outro). Toda linha da seção 3 tem par em `ECOSYSTEM_LINKS`.
  2. **Cenários com as funções reais** (virada simulada por `startNewSeason` em pinia de teste):
     a. usuário campeão da A, da Taça e da Ouro no mesmo ano, com sede no seu país: Ouro (não Prata) no continental; Supercopa contra o vice da Taça; Recopa contra o campeão da Prata; na edição, uma vaga só para o usuário (`'ouro'`) e a sede para o vice da A;
     b. campeão da Taça na Série D: Prata e Supercopa (contra o campeão da A gravado), sem Mundial;
     c. 5º da A sem título: Prata, nenhuma final;
     d. em 500 viradas com sementes variadas: nenhum clube aparece duas vezes no campo de 32, o rival da Supercopa e o da Recopa nunca são o usuário, e o usuário nunca está em Ouro e Prata ao mesmo tempo.
  3. Sai com a lista de violações (vazia = OK).

**T12. Interface**
- Arquivos: `MundialPanel.vue` (novo), `MundialCycleCard.vue` (novo, com "Caminhos"), `CompetitionsView.vue`, `DashboardView.vue` (card).
- Teste `t49-mundial-ui.mjs` (`renderToString`): contagem regressiva e pontos; grupo do usuário e os 8 grupos; chave de 16; "Faltam N pontos"; "Caminhos" lista as 10 competições.

**T13. Calibração**
- Arquivos: `calib-carreira.mjs` (`'mundial'` no `pickComp`; métricas informativas: edições classificadas por porta, prêmio médio por edição, jogos a mais, taxa do forte classificado nas edições em que está na A).
- Pronto: `CHECK OK`; relatório com B, `k_max` (seção 7.3) e a taxa do forte contra o corte de 16. **Não** mudar constantes: propor.

**T14. Revisão do Opus da branch** (Opus, esforço medium)
- Diff, build, t40 a t49, `--check`. Foco: regressão do continental e das chaves; ordem da virada; não duplicação; reconstrução idempotente; `LIVE_MATCH_KEY` com `mundial`; finais com rival real.

**T15. (Depois da escolha) Aplicar o universo de nomes** (`feature/universo-nomes`)
- Arquivos: `leagueScheduler.ts` (clubes e `SERIE_META.name`), `teamIdentities.ts` (nome novo e **alias do antigo para o mesmo id**), `leagueKnockout.ts`, `src/config/competitions.ts` (nomes do Mundial), textos das competições nos stores e componentes (só strings), `usePersistence.ts` (migração por id e mapa de textos, seção 10.5).
- Pronto: build; `t50-nomes.mjs` com save antigo (escudo mantido, `leagueTeams` renomeado pelo id, galeria e pódios com os textos novos, segunda carga sem mudança); reconstrução do ciclo reconhecendo os dois textos.
- Não fazer: mudar ids internos.

**Integração (sessão principal):** `chore/calib-imports`, `chore/t23-chaves`, `feature/copa-dos-continentes` e, depois, `feature/universo-nomes`, com `--no-ff`; build e `--check` depois de cada merge. A versão sobe para 1.3.0 só no pedido de lançamento.

## 10. Universo de nomes (refeito: 3 propostas e uma recomendação)

Critérios: nomes curtos (de 1 a 3 sílabas sempre que possível), sonoros, fáceis de falar e de caber num selo na interface (390 px), com identidade brasileira, sem marca, entidade ou clube real, e com uma lógica que o jogador entenda sozinho (o que está no topo soa como topo). A Copa dos Continentes se mantém nos três. Ids internos ficam intactos.

### 10.1 Universo A: "Fauna" (recomendado)

Bichos do Brasil no país, do menor ao predador do topo; o **Condor**, que já é marca do jogo, vira o elo natural com o continente; cada confederação estrangeira tem um bicho-símbolo da sua região.

| Atual | Proposto | Justificativa |
|---|---|---|
| Liga Aurora | **Liga Aurora** (mantém) | a hora em que a fauna acorda; marca já reconhecida |
| Série D | **Série D • Tatu** | cava desde o chão: o começo |
| Série C | **Série C • Quati** | esperto, sobe em árvore |
| Série B | **Série B • Guará** | o lobo-guará: o caçador quase no topo |
| Série A | **Série A • Onça** | o predador do topo, forte e reconhecível |
| Taça Cacique | **Taça Arara** | colorida, voa por todo o país, como a copa que reúne todas as séries |
| Condor de Ouro / Prata | **Condor de Ouro / Condor de Prata** (sem "Copa" no rótulo curto) | já é fauna; custo quase zero |
| Supercopa Soberana | **Supercopa Harpia** | a harpia, rainha dos céus, para o duelo dos campeões nacionais; deixa de confundir com o Soberano FC |
| Recopa Condor | **Recopa dos Condores** | Ouro x Prata: dois condores |
| Copa dos Continentes | **Copa dos Continentes** (aprovado) | |
| Europa | **Liga Lince** (Taça Lince) | felino das florestas do norte |
| Ásia | **Liga Tigre** (Copa Tigre) | símbolo da região |
| África | **Liga Okapi** (Copa Okapi) | bicho único e curioso; evita o genérico "leão" |
| América do Norte e Central | **Liga Bisão** (Copa Bisão) | força das planícies |
| Oceania | **Liga Albatroz** (Copa Albatroz) | ave dos mares do sul |
| Sedes | **Ilhas do Grou, Emirado do Falcão, Reino da Gazela**, seu país | países fictícios com o bicho-símbolo |
| Tupinambá EC (`d_18`) | **Sucuri EC** | há clubes reais com o nome Tupinambá/Tupynambás |
| Noroeste do Vale (`b_10`) | **Gavião do Vale** | lembra o Noroeste (Bauru) |
| Operário Araucário (`b_14`) | **Gralha Azul FC** | a ave que planta araucárias; sai de Operário e Araucária, dois clubes reais do Paraná |
| Oeste Catarinense (`b_16`) | **Graxaim FC** | a raposa do sul; lembra o Oeste FC |
| Farroupilha AC (`a_8`) | **Quero-Quero AC** | ave símbolo do pampa, sonora; lembra o Farroupilha (Pelotas) |
| Ferrovia Paulista (`c_8`) | **Tico-Tico Paulista** | lembra a Ferroviária |
| São Bento do Vale (`c_9`) | **Seriema do Vale** | lembra o São Bento |
| Esperança de Lagarto (`c_11`) | **Carcará EC** | ave do sertão; lembra o Lagarto (SE) |

### 10.2 Universo B: "Lendas"

Folclore brasileiro no país e lendas de cada região no mundo. Tem a identidade mais forte, mas os nomes são mais longos e alguns pedem cuidado cultural.

| Atual | Proposto |
|---|---|
| Liga Aurora | Liga das Lendas |
| Séries D / C / B / A | Caipora / Curupira / Iara / Boitatá (a serpente de fogo no topo) |
| Taça Cacique | Taça Saci (pula de série em série: a copa das zebras) |
| Condor de Ouro / Prata | Condor de Ouro / Prata (o condor sagrado dos Andes) |
| Supercopa / Recopa | Supercopa Boiúna / Recopa dos Condores |
| Confederações | Liga Valhala (Europa), Liga do Dragão (Ásia), Liga Anansi (África), Liga Quetzal (América do Norte e Central), Liga Maui (Oceania) |
| Sedes | Ilhas Kitsune, Oásis do Djinn, Reino Mokele |
| 5 clubes | Boiúna EC, Vale Encantado, Gralha Azul FC, Serra Encantada, Jarau AC (Salamanca do Jarau) |
| 3 a revisar | Mãe-d'Água FC, Norato EC (Cobra Norato), Matinta EC (Matinta Perera) |

### 10.3 Universo C: "Astros"

Estrelas pela ordem de brilho, do céu do país ao céu do mundo. É elegante e combina com a Aurora, mas os nomes de estrela são menos familiares ao público.

| Atual | Proposto |
|---|---|
| Liga Aurora | Liga Aurora |
| Séries D / C / B / A | Altair / Rigel / Vega / Sírius (a estrela mais brilhante no topo) |
| Taça Cacique | Taça Cometa (atravessa o país) |
| Condor de Ouro / Prata | Austral de Ouro / Austral de Prata (o céu do sul) |
| Supercopa / Recopa | Supercopa Eclipse (dois astros se encontram) / Recopa Equinócio (Ouro e Prata, dia e noite) |
| Confederações | Liga Boreal (Europa), Liga Plêiades (Ásia), Liga Canopo (África), Liga Polar (América do Norte e Central), Liga Fênix (Oceania) |
| Sedes | Ilhas Hoshi, Emirado de Najm, Reino de Nyota ("estrela" na língua de cada região) |
| 5 clubes | Lua Nova EC, Vale do Sol, Pinhal Celeste, Poente FC (poente = oeste), Meridiano AC |
| 3 a revisar | Via Láctea FC, Serra do Luar, Estrela do Agreste |

### 10.4 Recomendação: Universo A, "Fauna"

- **Fala e lê bem:** Tatu, Quati, Guará, Onça, Arara, Harpia têm de 2 a 3 sílabas, cabem em qualquer selo, e uma criança diz "subi pra Onça".
- **Hierarquia óbvia:** do tatu à onça ninguém precisa de explicação, ao contrário de Altair/Vega (Astros) ou Caipora/Curupira (Lendas).
- **Aproveita o que já existe:** o Condor de Ouro e de Prata e a Recopa dos Condores encaixam sem mudança de sentido, e a Liga Aurora fica. É o menor custo de troca de textos.
- **Identidade:** fauna brasileira dá um tom próprio e alegre, abre espaço para ícones de bicho nos selos e no pódio, e não toca em tema religioso ou sagrado (risco do Universo B).
- **Sem colisão com o elenco atual:** "Jaguatirica FC" (`d_9`) já é fauna e reforça o tema; "Pindorama Atlético" e os outros continuam válidos.
- Todos os nomes (clubes, ligas e rivais do Mundial) passam por uma checagem contra clubes reais conhecidos na T15. Nomes de bicho são comuns em times amadores, e um nome que colida é trocado por outro bicho da mesma região.

### 10.5 Custo de migração (vale para qualquer universo)

- **Ids internos intactos** (`cup`, `continental`, `libertadores`, `sulamericana`, ids de clube): nenhuma migração obrigatória de save.
- **Rótulos calculados** (`rawLabelFor`, `SERIE_META.name`, painéis): mudam sozinhos.
- **Textos gravados:** `trophyGallery`, `podiumArchive.competitionLabel`, `label` das chaves vigentes, `matchHistory.label`. Recomendação: mapa exato de textos antigos para novos, idempotente, aplicado ao `trophyGallery` e ao `podiumArchive`; o `matchHistory` fica como registro de época.
- **Clubes:** `teamIdentities.ts` mapeia nome → id. Manter o nome antigo como alias (o escudo continua) e renomear `leagueTeams` pelo id na carga; a próxima virada já usa o pool novo.
- **Reconstrução do ciclo:** reconhece os títulos antigos e os novos.

## 11. Riscos

1. **Escopo grande** (grupos genéricos, campo, ranking, finais reais, cerca de 60 jogos simulados por edição). Mitigação: tarefas pequenas, funções puras testadas antes do store, regressão byte a byte do continental na T3.
2. **Casos `comp === ...` esquecidos** caem no rival da liga. Mitigação: busca na T7 e o t44.
3. **Teto do elenco máximo na A** com o prêmio de 1,5 mi (cerca de +173 mil por temporada). Seguro com B de até cerca de +200 mil; a T13 mede B e o `k_max`.
4. **Corte do ranking:** a estimativa (forte cerca de 80% com 16) tem incerteza de ±10 pontos percentuais. A T13 mede.
5. **Ordem da virada:** o registro do ciclo e os campeões precisam ser lidos antes das redefinições. Conferido no t45 e no t48.
6. **Mudança de comportamento da Supercopa e da Recopa (T10):** só muda o rival e a etiqueta, não a vaga nem o prêmio. O OVER do rival real pode ser diferente do sorteado de hoje (por exemplo, campeão da Taça da Série D mais fraco), o que muda pouco a chance de título nas finais. O t47 confere os prêmios iguais.
7. **Duração da temporada da edição:** até 7 jogos a mais, opcionais; W.O. na virada.
8. **Reconstrução de save antigo** perde as fases que não foram título. Aceito, com aviso.
9. **Renomeação** (T15): alias e teste com save antigo; checagem contra clubes reais.
10. **Ruído da calibração** de ±10 a 20 mil por série.
11. **`npm run dev` com agentes editando** apaga a partida em andamento.

## 12. Perguntas ainda abertas ao dono

1. **Universo de nomes:** A "Fauna" (recomendado), B "Lendas" ou C "Astros"? Os 3 clubes "a revisar" entram? Migra os textos antigos da galeria e dos pódios?
2. **Prêmio:** confirma o campeão a 1,5 mi (tabela recomendada da seção 7.1)?
3. **Corte do ranking:** confirma o ajuste de 14 para 16?

## 13. Backlog (fora do escopo da Fase 8): Patrocinador Master

Desenho já feito, guardado para uma fase futura (sem tarefas agora):
- Contrato de 1 temporada, com 3 ofertas por temporada, uma por perfil, e marca fictícia. Prazo até o 1º jogo oficial; sem escolha, o **Estável** é assinado sozinho e reproduz a economia de hoje (a calibração não muda).
- Por jogo: corte fixo sobre o `sponsorBase` cru (o ganho da instalação de Finanças é preservado) e fatia própria do bônus de vitória; o empate fica em 0,2.
  - Estável: corte 0, vitória 0,50, meta Permanência de 1× a base.
  - Desempenho: corte 0,15, vitória 0,85, meta Acesso de 4×.
  - Ousado: corte 0,30, vitória 1,10, meta Título de 8× e 2× por troféu.
  - Equilíbrio: Desempenho em 43% de vitórias, Ousado em 50%.
- Valores na D: Estável meta 8.500; Desempenho corte 1.298 por jogo, vitória 7.353, meta 34.500; Ousado corte 2.595, vitória 9.515, meta 69.000, título 17.500. Na A: 16.500; 2.490 / 14.110 / 66.500; 4.980 / 18.260 / 133.000 / 33.000.
- Metas: Permanência (D: passar da 1ª fase; demais: não cair), Acesso (subir; na A, top 6), Título (campeão da série). A meta nunca passa o prêmio de campeão da série.
- Estado `club.sponsor` dentro de `club`, com normalização idempotente (save antigo recebe o Estável automático).
- Ao retomar: medir com `SPONSOR_TIER` na calibração, conferir se algum perfil domina o Estável do típico, e somar o efeito ao teto do elenco máximo na A junto com o Mundial (cerca de +16 mil por temporada pelo Estável).
