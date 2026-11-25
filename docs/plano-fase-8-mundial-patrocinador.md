# Plano da Fase 8: Copa dos Continentes (Mundial) e Patrocinador Master

Só planejamento: nenhum arquivo de `src/`, nem o `package.json`, foi alterado. Origem: `_origem/roadmap_de_evolu_o_handoff_completo.md` (Fase 8, itens 8.1 e 8.2). Os valores em R$ são propostas e esperam a aprovação do dono (seção 10).

## 0. Como o código está hoje (verificado)

- **Mundial:** não existe nada em `src/`. As finais de jogo único (Supercopa e Recopa) moram em `src/stores/modules/competitions/finals.ts` (`FinalState`, `qualifySupercup`, `qualifyRecopa`, `applyFinalResult`). A vaga é dada na virada, em `useSeason.startNewSeason`: `if (wonContinental) competitions.qualifyRecopa()`. A disputa acontece na temporada seguinte, sem calendário, e uma final pendente se perde na virada seguinte (relatório, item 10).
- **Continental de ouro:** `ContinentalState.tier === 'libertadores'` (na tela, "Copa Condor de Ouro"). Só entra quem fica entre os 4 primeiros da Série A. O campeão é `continentalState.champion`, lido em `startNewSeason` antes de `initContinentalForSeason`, então `tier` ainda é o da temporada que terminou.
- **Motor de chave:** `src/utils/bracket/bracket.ts` (`createBracket`, `playLeg`, `resolveTie`, `simulatePhaseExceptUser`, `propagate`, `userPendingTie`, `completeBracket` com `forfeitUser`, `buildPodium`, `userFinalPosition`) e `src/types/bracket.ts` (`BracketCompetition = 'cup' | 'continental' | 'serieD' | 'serieC'`). A Copa (`modules/competitions/cup.ts`) é o modelo mais próximo: jogo único, pênaltis, disputa de 3º lugar, pódio, W.O. na virada.
- **Patrocínio:** receita fixa por jogo `club.projectedSponsorIncome = sponsorBase × facilityIncomeFactor(financeLevel) × incomeMult` (`src/stores/club.ts:147`). Por jogo, `useEconomy.settleMatch` paga também um bônus de resultado: `sponsorBase × 0,5` na vitória e `× 0,2` no empate (`ECONOMY.winBonusShare` e `drawBonusShare`, sobre o `sponsorBase` cru, sem o fator da instalação). Não há contrato, meta nem escolha.
- **Save:** `saveGame` grava hoje 24 chaves de topo, não 17: aos 17 do protótipo se somaram `seasonAssists`, `seasonApps`, `seasonYellows`, `seasonReds`, `matchHistory`, `friendlies` e `prematchCompetition`, e `clubStaff` virou `staffContracts`. A asserção "17 chaves" do `t23-atletas.mjs` (h6) está desatualizada. Este plano soma uma chave aditiva (`mundialState`, 25 no total) e põe o patrocínio dentro de `club`.
- **Calibração quebrada:** `docs/calibracao/calib-carreira.mjs` importa `/src/utils/constants.ts`, `/src/utils/generatePlayer.ts`, `/src/utils/calculateTeamStrength.ts` e `/src/utils/bracket.ts`. Esses caminhos deixaram de existir com o commit `f673638` (refactor de utils). Rodado agora, o script falha antes de simular: `Failed to load url /src/utils/generatePlayer.ts`. Sem consertá-lo não dá para provar que o `--check` continua OK, por isso ele é a tarefa T0.

## 1. Decisões de design (recomendadas)

### 1.1 Copa dos Continentes (8.1)

| Tema | Recomendação | Motivo |
|---|---|---|
| Nome na tela | **Copa dos Continentes** (id interno `mundial`) | "Mundial de Clubes" e "Copa Intercontinental" são nomes de torneios reais, e o projeto já trocou Libertadores por Condor de Ouro. |
| Vaga | Campeão da Copa Condor de Ouro (`tier === 'libertadores'`). A Condor de Prata não dá vaga. | É o que pede o roadmap, e mantém a Recopa (que aceita as duas) como prêmio menor. |
| Quando joga | **Na temporada seguinte**, como a Supercopa e a Recopa. Vaga na virada; pendente na virada seguinte vira W.O. (sem prêmio, chave completada por `completeBracket(..., { forfeitUser: true })`). | Reaproveita o fluxo de `resetFinals`/`qualify*`, não mexe no calendário da liga e não cria uma "fase extra" entre o fim da temporada e a virada (que hoje é atômica em `startNewSeason`). |
| Formato | **4 clubes, jogo único:** semifinal, final e disputa de 3º lugar. O usuário e mais três campeões fictícios: Europa, Ásia e um terceiro sorteado entre África e Américas do Norte. | Um torneio de duas partidas para o usuário tem peso de evento sem esticar a temporada. Com 4 clubes, `createBracket` serve como está (2 fases mais 3º lugar). |
| Sorteio | O usuário enfrenta na semi o clube asiático ou o terceiro (sorteio 50/50). O europeu fica sempre na outra semi. | A final provável é contra o europeu, o "chefão". Fica previsível e dramático. |
| Força dos rivais | Europa: OVER sorteado entre 79 e 82. Ásia, África e Américas do Norte: entre 71 e 75. | O campeão da Condor de Ouro está na A (típico 71, forte 76 a 78 na T30). O europeu fica 3 a 10 pontos acima: pela curva, cerca de 30% a 40% de vitória no tempo normal e cerca de 50% de passar com os pênaltis. Os outros ficam no nível da Recopa (75) ou um pouco abaixo. |
| Mando | **Campo neutro:** sem os +3 de mando (`homeBonusApplies` continua `false` para `mundial`). | Mesma regra das copas (relatório, decisão 5: o mando saiu da Copa, da Supercopa e da Recopa). |
| Empate | Pênaltis ao vivo (`needsShootout` igual ao da Copa). | Mata-mata de jogo único. |
| Disputa de 3º | O usuário joga a de 3º se perder a semi; nos outros casos ela é simulada. | Igual à Copa e ao continental. |
| Troféu e pódio | `recordTrophy('title', 'Campeão da Copa dos Continentes', prêmio)`. O pódio vai para o `podiumArchive` na virada. | Mesmo caminho dos outros títulos. |

### 1.2 Patrocinador Master (8.2)

| Tema | Recomendação | Motivo |
|---|---|---|
| Duração | **Contrato de 1 temporada**, escolhido no começo de cada temporada. | Os valores dependem da série (`sponsorBase`), e a série muda a cada temporada. Um contrato plurianual exigiria regra de rescisão no acesso e no descenso. |
| Ofertas | **3 ofertas por temporada, uma de cada perfil** (Estável, Desempenho, Ousado), cada uma com uma marca fictícia sorteada. | A escolha fica entre segurança e risco, não entre ofertas aleatórias melhores ou piores. |
| Prazo de escolha | Até o 1º jogo oficial da temporada. Se o usuário não escolher, o **Estável é assinado automaticamente** no primeiro `settleMatch`, com aviso. | Ninguém fica sem patrocínio, a calibração (que nunca escolhe) roda com o Estável, e o Estável é idêntico à economia de hoje. |
| O que muda por jogo | Corte fixo na receita de patrocínio e fatia do bônus de vitória diferente. **O corte incide sobre o `sponsorBase` cru, não sobre o ganho da instalação de Finanças**, e o bônus de empate não muda. | O investimento em Finanças continua valendo igual em qualquer contrato. Com o corte sobre o `sponsorBase`, o ponto de equilíbrio entre os perfis não depende do nível da instalação. |
| Meta da temporada | Uma meta por perfil, avaliada na virada: **Permanência** (Estável), **Acesso** (Desempenho), **Título** (Ousado). O bônus de meta é pago uma vez, na virada. | Usa só dados que `startNewSeason` já tem (`prevDiv`, `nextDivision`, `prevRank`, `trophyType`). |
| Bônus por título | Só no Ousado: um valor fixo por troféu de campeão conquistado na temporada (liga, Taça Cacique, continental, Supercopa, Recopa e Copa dos Continentes), pago em `recordTrophy('title', ...)`. | É o "bônus variável por título" do roadmap, num ponto único do código. |
| Escala por série | Todos os valores são múltiplos do `sponsorBase` da série, arredondados a R$ 500. | A escada se mantém sozinha: série de cima paga estritamente mais. |

Definição das metas (função pura `sponsorGoalMet`):

| Meta | Série D | Séries C e B | Série A |
|---|---|---|---|
| Permanência | passou da 1ª fase (tem jogo em `D_R64`) | não foi rebaixado (`nextDivision <= prevDiv`) | não foi rebaixado |
| Acesso | subiu (`nextDivision < prevDiv`) | subiu | terminou entre os 6 primeiros (`prevRank <= 6`, vaga continental) |
| Título | campeão da série (`trophyType === 'title'`) | campeão da série | campeão da série |

## 2. Tipos e constantes novos

### 2.1 `src/types/match.ts`

```ts
export type MatchCompetition = 'league' | 'cup' | 'continental' | 'supercup' | 'recopa' | 'mundial' | 'friendly'
```

O `vue-tsc` vai apontar cada `Record<MatchCompetition, ...>` sem a chave nova (`stores/match.ts` em `sessions`, `components/match/MatchSwitcher.vue` em `NAMES`, `utils/player/suspension.ts` em `COMP_SHORT`). Correntes de `if (comp === ...)` não são checadas e caem no caminho da liga se ficarem sem o caso novo (seção 9, risco 1).

### 2.2 `src/types/bracket.ts`

```ts
export type BracketCompetition = 'cup' | 'continental' | 'serieD' | 'serieC' | 'mundial'
```

### 2.3 `src/types/competitions.ts`

```ts
export type MundialRegion = 'europa' | 'asia' | 'africa' | 'americas'

export interface MundialHistoryItem {
  roundName: string          // 'Semifinal', 'Final', 'Disputa de 3º Lugar'
  summary: string
  prize: number
}

export interface MundialState {
  qualified: boolean
  /** Temporada em que é disputado (a seguinte à conquista da Condor de Ouro). */
  season: number
  eliminated: boolean
  champion: boolean
  /** Usuário perdeu a semi e tem a disputa de 3º pendente. */
  thirdPlace: boolean
  finalPosition: 1 | 2 | 3 | 4 | null
  history: MundialHistoryItem[]
  bracket: Bracket | null
}
```

### 2.4 `src/types/club.ts` (patrocínio, dentro de `ClubSave`)

```ts
export type SponsorTier = 'estavel' | 'desempenho' | 'ousado'
export type SponsorGoal = 'permanencia' | 'acesso' | 'titulo'

export interface SponsorOffer {
  id: string                 // `${season}_${tier}`
  tier: SponsorTier
  brand: string              // marca fictícia de SPONSOR_BRANDS
  division: number           // série em que a oferta foi feita
  fixedCut: number           // R$ por jogo descontados da receita de patrocínio
  winBonus: number           // R$ por vitória
  goal: SponsorGoal
  goalBonus: number          // R$ pagos na virada se a meta for cumprida
  titleBonus: number         // R$ por troféu de campeão (0 fora do Ousado)
}

export interface SponsorContract extends SponsorOffer {
  season: number
  signedAuto: boolean        // assinado sozinho no 1º jogo, ou herdado de save antigo
}

export interface SponsorSeasonResult {
  season: number
  brand: string
  tier: SponsorTier
  goal: SponsorGoal
  goalMet: boolean
  goalPaid: number
  winPaid: number
  titlePaid: number
}

export interface ClubSponsorState {
  season: number             // temporada a que offers/contract se referem
  offers: SponsorOffer[]
  contract: SponsorContract | null
  earned: { win: number; title: number }
  lastResult: SponsorSeasonResult | null
}

// em ClubSave:
sponsor?: ClubSponsorState
```

Os valores ficam gravados na oferta, em R$, no momento em que ela é feita. Assim uma mudança de constante não altera um contrato já assinado.

### 2.5 `src/config/competitions.ts`

```ts
export const MUNDIAL_LABEL = 'Copa dos Continentes'

// Nomes fictícios (sem clubes reais). OVER sorteado dentro da faixa na hora da vaga.
export const MUNDIAL_RIVALS: Record<MundialRegion, { tag: string; minOver: number; maxOver: number; names: string[] }> = {
  europa:   { tag: 'Campeão europeu',  minOver: 79, maxOver: 82, names: ['Rheinstadt SV', 'AC Valdoro', 'Nordhavn FK', 'Athletic Brisamar'] },
  asia:     { tag: 'Campeão asiático', minOver: 71, maxOver: 75, names: ['Sakura Minato FC', 'Shenhai Golden Dragons', 'Al-Rimal SC', 'Hanseong United'] },
  africa:   { tag: 'Campeão africano', minOver: 71, maxOver: 75, names: ['Kilima Stars', 'Nilo Azul SC', 'Atlas Sahel FC', 'Savana Real'] },
  americas: { tag: 'Campeão norte-americano', minOver: 71, maxOver: 74, names: ['Sierra Madre FC', 'Bahía Esmeralda', 'Lakeshore United', 'Monte Caribe SC'] }
}

// Em PRIZES (acrescentar, sem mexer nas outras entradas):
mundial: { champion: 400000, runnerUp: 160000, third: 50000, fourth: 20000 },
```

### 2.6 `src/config/economy.ts`

```ts
/** Perfis do patrocinador master. Valores em múltiplos do sponsorBase da série; meta e título arredondados a 500. */
export const SPONSOR_TIERS: Record<SponsorTier, {
  label: string; fixedCutX: number; winShare: number; goal: SponsorGoal; goalBonusX: number; titleBonusX: number
}> = {
  estavel:    { label: 'Estável',    fixedCutX: 0,    winShare: 0.50, goal: 'permanencia', goalBonusX: 1, titleBonusX: 0 },
  desempenho: { label: 'Desempenho', fixedCutX: 0.15, winShare: 0.85, goal: 'acesso',      goalBonusX: 4, titleBonusX: 0 },
  ousado:     { label: 'Ousado',     fixedCutX: 0.30, winShare: 1.10, goal: 'titulo',      goalBonusX: 8, titleBonusX: 2 }
}

// Marcas fictícias (conferir com o dono; nenhuma marca real).
export const SPONSOR_BRANDS = [
  'Vértice Telecom', 'Tropeiro Seguros', 'Maré Alta Bebidas', 'Cerrado Energia', 'Grupo Aurora Austral',
  'Ipê Roxo Construtora', 'Farol Azul Logística', 'Sabiá Pagamentos', 'Serra Fria Laticínios'
]
```

O Estável tem `fixedCutX = 0` e `winShare = 0,50` (= `ECONOMY.winBonusShare`), ou seja, é exatamente a economia de hoje mais um bônus de meta pequeno.

### 2.7 Funções puras novas

- `src/utils/bracket/bracketSeeding.ts`: `seedMundial(rng): { teams: BracketTeam[]; firstRound: Array<[string, string]> }`. Sorteia um nome e um OVER por região, sorteia o terceiro (África ou Américas) e monta `[['user', asiaOuTerceiro], [europa, outro]]`. O usuário manda no papel (`homeId = 'user'`), sem bônus.
- `src/utils/club/sponsor.ts`:
  - `buildSponsorOffers(division, season, rng): SponsorOffer[]`: 3 ofertas, uma por perfil, com marcas distintas.
  - `sponsorGoalMet(goal, ctx: { prevDiv; nextDiv; prevRank; seriesTitle: boolean; reachedDKnockout: boolean }): boolean` (tabela da seção 1.2).
  - `sponsorGoalLabel(goal, division): string`, por exemplo "Passar da 1ª fase", "Subir para a Série B", "Terminar entre os 6", "Ser campeão da Série C".
  - `roundTo500(v)`.

## 3. Stores e composables afetados

| Arquivo | Mudança |
|---|---|
| `src/stores/modules/competitions/mundial.ts` (novo) | `createMundial({ mundialState, club })`: `qualifyMundial(season, rng?)`, `resetMundial()`, `finishMundialForSeason()` (W.O. com `completeBracket(..., { forfeitUser: true })` e pódio), `applyMundialResult(uGoals, oGoals, clubName, pens)`, `mundialStageLabel`, `mundialOpponent`, `hasPendingMundial`. Prêmios: campeão `champion` (troféu), vice `runnerUp`, 3º `third`, 4º `fourth`, pagos com `club.earn`. Toasts no padrão de `applyFinalResult`. |
| `src/stores/modules/competitions/defaults.ts` | `emptyMundial()`. |
| `src/stores/modules/competitions/save.ts` | `mundialState` em `toSave`, e em `fromSave` com spread sobre `emptyMundial()`. |
| `src/stores/competitions.ts` | `mundialState`, ligação do módulo, `isCompetitionPlayable('mundial')` (qualificado, temporada certa, não eliminado nem campeão, com confronto pendente), `hasPendingThirdPlace` com o 3º do Mundial, e `hasPendingMundial` exposto. |
| `src/composables/useMatchSimulation.ts` | `rawOpponentFor`, `rawLabelFor` ("Copa dos Continentes • Semifinal"), `needsShootout` (`u === o`), ramo em `concludeMatch` (`applyMundialResult`). `homeBonusApplies` fica igual: só comentar que o `mundial` é neutro. |
| `src/stores/match.ts` | `sessions.mundial` e `'mundial'` em `COMPETITIONS_ORDER` (depois de `'recopa'`). |
| `src/composables/useSeason.ts` | Na virada: `finishMundialForSeason()` antes de arquivar os pódios (o pódio do Mundial entra na lista), `resetMundial()` e `if (wonContinental && prevTier === 'libertadores') qualifyMundial(club.season)`. Patrocínio: avaliar a meta antes de `club.season += 1`, pagar e gravar `lastResult`; gerar as ofertas da nova temporada depois de `club.division = nextDivision`. `initializeFreshCareer` gera as ofertas da T1. |
| `src/composables/usePersistence.ts` | Passar `mundialState: p.mundialState` a `competitions.fromSave`. O patrocínio vem dentro de `p.club`, sem mudança aqui. |
| `src/stores/club.ts` | Estado `sponsor`; `projectedSponsorIncome` desconta `round(contract.fixedCut × incomeMult)` com piso 0; `signSponsor(offerId)` (só antes do 1º jogo oficial da temporada); `ensureSponsorContract()` (assina o Estável sozinho); `recordSponsorWin(amount)`; em `recordTrophy`, se `type === 'title'` e houver `titleBonus`, `earn` e soma em `earned.title`; `closeSponsorSeason(ctx)` e `openSponsorSeason(division, season)`; `toSave`/`fromSave` (normalização, seção 4) e `resetCareerRecords`. |
| `src/composables/useEconomy.ts` | `settleMatch`: chamar `club.ensureSponsorContract()`; `winBonus = contract.winBonus` na vitória (empate continua `sponsorBase × drawBonusShare`); registrar em `earned.win`. A renda offline usa `projectedSponsorIncome`, que já traz o contrato. |
| `src/views/CompetitionsView.vue`, `src/components/competitions/MundialPanel.vue` (novo) | Aba e painel (seção 6). |
| `src/components/club/SponsorCard.vue` (novo), `src/views/ClubView.vue`, `src/views/DashboardView.vue`, `src/components/match/PostMatchSummary.vue` | Interface do patrocínio (seção 6). |
| `src/composables/useNavigation.ts` | Selo `!` na aba Competições com o Mundial pendente; selo na aba Clube com a oferta não escolhida. |
| `src/views/DashboardView.vue` | `'mundial'` em `CUP_COMPETITIONS`. |

## 4. Save e migração (idempotente, sem migração numerada)

- **`mundialState`:** chave de topo aditiva, como `friendlies`. Save antigo sem a chave carrega `emptyMundial()`. Não precisa de versão: o campo não existia, então não há o que converter. `migrateBalanceV2` e `migrateProgressionV3` não tocam no Mundial (os rivais nascem já na escala nova).
- **`club.sponsor`:** campo opcional dentro de `club`, normalizado em `fromSave`:
  1. Campo ausente (save antigo): `sponsor = { season: club.season, offers: [], contract: <Estável da série atual, signedAuto: true>, earned: { win: 0, title: 0 }, lastResult: null }`. Um save antigo está quase sempre no meio da temporada, e o Estável reproduz a economia de hoje. As ofertas aparecem a partir da próxima virada.
  2. Campo presente: validar cada número (`Number.isFinite`, mínimo 0), descartar ofertas malformadas, manter o contrato. Se `sponsor.season !== club.season` (save gravado no meio da virada), tratar como o caso 1.
  3. Segunda carga: o campo já está presente e válido, então nada muda. Teste: load, save, load, save dá JSON idêntico.
- O aviso único não é necessário (não muda nenhum número da carreira). Opcional: um toast "Patrocinador master chega na próxima temporada" no primeiro load de save antigo, decidido pelo dono (seção 10).
- **Asserção das 17 chaves:** está desatualizada (o save tem 24 chaves hoje; com `mundialState`, 25). Os testes novos conferem "as chaves de antes mais `mundialState`" e não um número fixo.

## 5. Impacto na calibração econômica

### 5.1 Patrocínio

Por jogo, contra a economia de hoje: `Δ = sponsorBase × (−fixedCutX + (winShare − 0,5) × p)`, em que `p` é a taxa de vitórias. O empate não muda.

| Perfil | Δ por jogo | Equilíbrio (p) |
|---|---|---|
| Estável | 0 | qualquer |
| Desempenho | `S × (−0,15 + 0,35 p)` | p = 0,43 (o típico fica entre 0,40 e 0,47) |
| Ousado | `S × (−0,30 + 0,60 p)` | p = 0,50 |

Valores em R$ (S = `sponsorBase`; meta e título arredondados a 500):

| | D | C | B | A |
|---|---|---|---|---|
| `sponsorBase` | 8.650 | 10.520 | 13.690 | 16.600 |
| Bônus de vitória hoje (= Estável) | 4.325 | 5.260 | 6.845 | 8.300 |
| Estável: meta Permanência (1 S) | 8.500 | 10.500 | 13.500 | 16.500 |
| Desempenho: corte por jogo / vitória | 1.298 / 7.353 | 1.578 / 8.942 | 2.054 / 11.637 | 2.490 / 14.110 |
| Desempenho: meta Acesso (4 S) | 34.500 | 42.000 | 55.000 | 66.500 |
| Ousado: corte por jogo / vitória | 2.595 / 9.515 | 3.156 / 11.572 | 4.107 / 15.059 | 4.980 / 18.260 |
| Ousado: meta Título (8 S) | 69.000 | 84.000 | 109.500 | 133.000 |
| Ousado: bônus por troféu (2 S) | 17.500 | 21.000 | 27.500 | 33.000 |

Ganho esperado por temporada acima da economia de hoje (jogos: D 16,4, A 41,6; probabilidades de meta **estimadas**, medidas na T16):

| Perfil do clube | Estável | Desempenho | Ousado |
|---|---|---|---|
| D típico (p 0,40; passa da 1ª fase 75%, sobe 15%, título 3%, 0,05 troféu) | +6,4 mil | +3,8 mil | −5,5 mil |
| D forte (p 0,55; 90% / 50% / 20%, 0,3 troféu) | +7,7 mil | +23,3 mil | +23,4 mil |
| D dominante (p 0,65; 100% / 70% / 40%, 0,6 troféu) | +8,5 mil | +35,2 mil | +50,9 mil |
| A típico (p 0,45; não cai 90%, top 6 35%, título 8%, 0,2 troféu) | +14,9 mil | +28,5 mil | −3,5 mil |

Leitura: o clube fraco ou típico fica com o Estável, o clube bom com o Desempenho, e o Ousado só compensa para quem domina a série. O teto do Ousado na D (meta mais um troféu = 86,5 mil) fica perto do prêmio do campeão da D (80 mil). A meta sozinha é sempre menor que o prêmio de campeão da série (D 69 contra 80; C 84 contra 140; B 109,5 contra 240; A 133 contra 300 mil), então o patrocínio nunca passa a valer mais que o título.

Efeito no `--check` (a política da calibração não escolhe, então fica com o Estável):
- **Saldo sem prêmio** (bilheteria + patrocínio + bônus − folha − manutenção) igual ao de hoje: o Estável não tem corte e paga o mesmo bônus por vitória. O piso de 3 mil da D (hoje cerca de +12 mil) não muda.
- **Saldo total:** o bônus de meta cai em "prêmios" (o script calcula os prêmios por resíduo do caixa). Somam-se cerca de +6 mil (D) a +15 mil (A) por temporada. Tetos do `--check`: D 130 mil (hoje cerca de 79 a 83 mil), C 220 mil (cerca de 138 mil), B 380 mil (cerca de 241 mil), A 650 mil (cerca de 321 a 405 mil). Há folga de pelo menos 45 mil em todas as séries.
- **Elenco máximo na A** (saldo menor que 400 mil): mais cerca de 16 mil.
- Risco fora do `--check`: um jogador fraco que escolhe o Ousado na D perde cerca de 8,5 mil de saldo operacional e se aproxima da "armadilha de caixa" (decisão b1). É uma escolha dele, e a interface mostra o equilíbrio (seção 6).

### 5.2 Copa dos Continentes

Prêmios (sem cota base nem cota por vitória):

| Colocação | Prêmio | Comparação |
|---|---|---|
| Campeão | 400 mil | > Série A campeã (300 mil); > bônus de campeão continental (180 mil). Fica no nível do total de um campeão continental (cerca de 380 a 420 mil, com 30 mil por vitória mais 180 mil), em 2 jogos em vez de 9 a 10. É o topo da escada: Supercopa 40 < Recopa 60 < Copa 330 < continental ~400 <= Mundial 400. |
| Vice | 160 mil | > vice continental (70 mil) e > vice da Copa (140 mil). |
| 3º | 50 mil | > 3º continental (30 mil) e 3º da Copa (25 mil). |
| 4º | 20 mil | > 4º da Copa (10 mil). |

Efeito no `--check`:
- O `tipicoRot` quase nunca ganha a Condor de Ouro (precisa ficar no top 4 da A e vencer 9 a 10 jogos). O valor esperado por temporada na A fica na casa de alguns mil, longe do teto de 650 mil.
- **Ponto de atenção: elenco máximo na A** (saldo menor que 400 mil). O `maximoRot` (OVER 88) ganha a Condor de Ouro com frequência. Se a ganhar em metade das temporadas e levar o Mundial em 2 de 3 tentativas (88 contra 79 a 82), o valor esperado é de cerca de +140 mil por temporada. O saldo histórico desse perfil na A era negativo (cerca de −240 mil, relatório, decisão 6), então deve continuar abaixo de 400 mil, mas precisa ser medido (T8). Se passar do teto, a alavanca é baixar o campeão para 300 mil (o mesmo da Série A) antes de mexer em qualquer outra constante.
- O `calib-carreira.mjs` precisa incluir `'mundial'` no `pickComp`; sem isso o Mundial ficaria pendente e viraria W.O., e a medição sairia otimista.

## 6. Interface

**Copa dos Continentes**
- Aba nova "Continentes" em `CompetitionsView.vue` (depois de "Supercopa & Recopa"), com selo `!` quando há jogo pendente.
- `MundialPanel.vue`: travado, mostra um `EmptyState` ("Vaga bloqueada. Conquiste a Copa Condor de Ouro para disputar a Copa dos Continentes na temporada seguinte."). Qualificado, mostra a lista dos 4 clubes com escudo, região (`tag`) e "OVER N"; o botão "Disputar Semifinal" / "Disputar Final" / "Jogar Disputa de 3º Lugar" via `prepareMatch('mundial')` e `matchEntryLabel`; a chave reaproveitada (`BracketView`) e o `PodiumCard` ao fim. Prêmios lidos de `PRIZES.mundial`.
- Rótulo da partida: "Copa dos Continentes • Semifinal" / "• Final" / "• Disputa de 3º Lugar". `MatchSwitcher` com o nome curto "Continentes" e `COMP_SHORT` "CON".
- Galeria de troféus: "Campeão da Copa dos Continentes".

**Patrocinador Master**
- `SponsorCard.vue` na aba Clube, perto de `FinanceSummary`:
  - Sem contrato, mostra as 3 ofertas lado a lado (empilhadas no celular): marca, perfil, "Patrocínio por jogo: R$ X" (já com o corte, calculado com a instalação atual), "Por vitória: R$ Y", "Meta: <rótulo> → R$ Z" e, no Ousado, "Por título: R$ W". Uma linha curta: "Vale a pena se o time vencer mais de 43% dos jogos" (Desempenho) ou "50%" (Ousado). O botão "Assinar" abre `ui.askConfirm` (padrão de `docs/modais-confirmacao.md`).
  - Com contrato, mostra marca, perfil, meta com o estado ("em andamento" / "cumprida" / "perdida" quando já se sabe), e o recebido na temporada (vitórias e títulos).
  - Mostra o resultado da temporada anterior (`lastResult`).
- Painel: um banner "Escolha o patrocinador master da temporada" enquanto há ofertas e nenhum contrato, com link para Clube.
- `PostMatchSummary.vue`: a linha do bônus de vitória ganha o nome da marca ("Bônus de vitória (Vértice Telecom)").
- Virada: um toast "Meta do patrocinador cumprida: +R$ Z" ou "Meta do patrocinador não cumprida" (no mesmo toast de saídas ou logo depois), e uma linha no `SeasonReviewCard`.

## 7. Tarefas (uma por delegação a Sonnet, esforço low)

### Regras para todas as tarefas

- Projeto `C:\Users\elphant\Downloads\Super XI`. Não commitar nem mexer em `package.json` (a versão só muda com o dono). Só os arquivos listados na tarefa.
- Branches (fluxo do `CLAUDE.md`): T0 em `chore/calib-imports`; T1 a T9 em `feature/copa-dos-continentes`; T10 a T17 em `feature/patrocinador-master`. Todas saem da `develop` e voltam com `--no-ff`, depois da revisão do Opus. Quem commita e faz o merge é a sessão principal.
- Pronto comum: `npm run build` (`vue-tsc` + `vite build`) sem erro, mais o teste da tarefa.
- Testes: scripts Node em `docs/calibracao/` (`t40-...` em diante), com o harness do `calib-carreira.mjs` já consertado (T0): `createServer` do Vite em middleware, `ssrLoadModule('/src/...')`, stubs de `localStorage`, `window`, `location`, `history` e `document`, `setActivePinia(createPinia())`. Cada script imprime `OK <nome>` por verificação, sai com `process.exit(1)` na primeira falha e fecha o servidor. Rodar com `node docs/calibracao/<script>.mjs`. Sorteios recebem `rng`; nos testes, `mulberry32(seed)` fixa.
- Textos em português, nenhum nome de clube ou marca real, poder sempre como "OVER".

### Grafo

```
T0 (chore, antes de tudo)
8.1: T1 -> T2 -> T3 -> (T4, T5, T6 em sequência: mesmos arquivos de store) -> T7 -> T8 -> T9 (Opus)
8.2: T10 -> T11 -> T12 -> T13 -> T14 -> T15 -> T16 -> T17 (Opus)
8.1 e 8.2 são independentes e podem correr em paralelo depois de T0 (tocam em useSeason.ts e useNavigation.ts nos dois:
quem integrar por último resolve o merge; o conflito é pequeno e localizado).
```

---

**T0. Consertar os imports da calibração e tirar a linha de base** (`chore/calib-imports`)
- Arquivos: `docs/calibracao/calib-carreira.mjs`.
- Fazer: trocar `/src/utils/constants.ts` por `/src/config/index.ts` (conferir que `PRIZES`, `UPGRADE_COSTS`, `FACILITY_MAX_LEVEL`, `SERIE_TYPICAL_OVER` e o resto do que o script usa de `C.` são exportados ali; se faltar algum, importar do módulo certo), `/src/utils/generatePlayer.ts` por `/src/utils/player/generatePlayer.ts`, `/src/utils/calculateTeamStrength.ts` por `/src/utils/match/calculateTeamStrength.ts` e `/src/utils/bracket.ts` por `/src/utils/bracket/bracket.ts`. Mais nada.
- Pronto: `node docs/calibracao/calib-carreira.mjs 20 curva,tipicoRot:240,forteRot:80,fracoRot:80,maximoRot:120,tipico,tipicoD,forte,fraco,caroFraco,investidor --check` termina com `CHECK OK`. Anotar no relatório da tarefa os números por série do `tipicoRot` (saldo sem prêmio e saldo total) e do `maximoRot` na A: é a linha de base da Fase 8.
- Não fazer: mudar alvos, constantes ou a lógica das políticas. Se o `--check` falhar na linha de base, parar e reportar (não é problema da Fase 8).

**T1. Tipos e constantes do Mundial**
- Arquivos: `src/types/match.ts`, `src/types/bracket.ts`, `src/types/competitions.ts`, `src/config/competitions.ts`, `src/stores/match.ts` (só `sessions.mundial` e `COMPETITIONS_ORDER`), `src/components/match/MatchSwitcher.vue` (só `NAMES`), `src/utils/player/suspension.ts` (só `COMP_SHORT`).
- Fazer: seções 2.1, 2.2, 2.3 e 2.5 exatamente.
- Pronto: o build passa.
- Não fazer: lógica de jogo, store ou interface.

**T2. Sorteio do Mundial** (depende de T1)
- Arquivos: `src/utils/bracket/bracketSeeding.ts`.
- Fazer: `seedMundial(rng)` (seção 2.7).
- Teste `t40-mundial-seed.mjs`: em 1.000 sementes, sempre 4 times com ids distintos; o usuário nunca enfrenta o europeu na semi; o europeu entre 79 e 82; os outros entre 71 e 75; o terceiro é África em cerca de 50% (40% a 60%); a mesma semente dá o mesmo sorteio.

**T3. Módulo e store do Mundial** (depende de T2)
- Arquivos: `src/stores/modules/competitions/mundial.ts` (novo), `defaults.ts`, `save.ts`, `src/stores/competitions.ts`.
- Fazer: seção 3 (linhas do módulo, defaults, save e store). Seguir `cup.ts` para a chave, o 3º lugar, o pódio e o W.O.; `applyFinalResult` para os toasts e o troféu.
- Teste `t41-mundial-store.mjs`: (1) `qualifyMundial(5)` cria a chave com 4 times e `isCompetitionPlayable('mundial')` verdadeiro; (2) vitória na semi e na final: campeão, troféu "Campeão da Copa dos Continentes", caixa +400 mil, pódio com o usuário em 1º; (3) derrota na semi: `thirdPlace` verdadeiro, `hasPendingThirdPlace` verdadeiro; vitória no 3º: +50 mil, `finalPosition` 3; (4) derrota na final: +160 mil; (5) `finishMundialForSeason()` com o jogo pendente: W.O., sem prêmio, pódio sem o usuário em 1º; (6) `toSave`/`fromSave` preserva o estado; `fromSave({})` dá `emptyMundial()`.

**T4. Partida do Mundial** (depende de T3)
- Arquivos: `src/composables/useMatchSimulation.ts`, `src/views/DashboardView.vue` (só `CUP_COMPETITIONS`), `src/composables/useNavigation.ts` (só o selo de Competições).
- Fazer: as linhas de `useMatchSimulation`, `DashboardView` e `useNavigation` da seção 3. Procurar todas as correntes `comp === 'recopa'` / `'supercup'` em `src/` e decidir caso a caso se o `mundial` entra.
- Teste `t42-mundial-match.mjs`: com o Mundial qualificado, `prepareMatch('mundial')`, simular até o fim (como no `calib-carreira.mjs`) e `concludeMatch()`: o adversário é o da semi da chave (não o da liga), o rótulo começa com "Copa dos Continentes", o mando não soma +3 (`homeBonusApplies('mundial') === false`), empate gera pênaltis, e a chave avança.

**T5. Virada de temporada do Mundial** (depende de T4)
- Arquivos: `src/composables/useSeason.ts`.
- Fazer: a parte do Mundial na linha `useSeason` da seção 3. Ler `continentalState.tier` antes de `initContinentalForSeason`.
- Teste `t43-mundial-season.mjs`: (1) campeão da Condor de Ouro: a próxima temporada tem Mundial qualificado, com `season` = nova temporada, e a Recopa também; (2) campeão da Condor de Prata: Recopa sim, Mundial não; (3) Mundial pendente na virada seguinte: W.O. arquivado em `podiumArchive` e estado zerado.

**T6. Persistência do Mundial** (depende de T5)
- Arquivos: `src/composables/usePersistence.ts`.
- Fazer: seção 4 (Mundial).
- Teste `t44-mundial-save.mjs`: (1) save antigo sem `mundialState` carrega com `emptyMundial()`; (2) save no meio do Mundial (semi jogada, final pendente) recarrega com a final pendente; (3) save, load, save dá JSON idêntico; (4) as chaves do save são as de antes mais `mundialState`.

**T7. Interface do Mundial** (depende de T6)
- Arquivos: `src/components/competitions/MundialPanel.vue` (novo), `src/views/CompetitionsView.vue`.
- Fazer: seção 6 (Copa dos Continentes). Reaproveitar `BracketView`, `PodiumCard`, `TeamCrest`, `BaseCard`, `EmptyState` e `ListRow` como no `SupercupsPanel.vue`.
- Teste `t45-mundial-panel.mjs` (`renderToString` com a store preparada): travado contém "Vaga bloqueada"; qualificado contém "Disputar Semifinal" e os 4 nomes; com a semi perdida contém "Jogar Disputa de 3º Lugar".

**T8. Calibração com o Mundial** (depende de T7)
- Arquivos: `docs/calibracao/calib-carreira.mjs` (só `'mundial'` no `pickComp`).
- Fazer: rodar o `--check` completo (comando da T0) e um extra informativo, `maximoRot:120`, contando as temporadas com Mundial e o prêmio médio do Mundial na A.
- Pronto: `CHECK OK`; relatório com os números contra a linha de base da T0: saldo do `maximoRot` na A abaixo de 400 mil e a diferença do `tipicoRot` A em menos de 5%. Se o teto de 400 mil quebrar, **não** mudar constantes: reportar para a decisão do dono (seção 5.2).

**T9. Revisão do Opus da branch `feature/copa-dos-continentes`** (Opus, esforço medium)
- Diff contra a `develop`, `npm run build`, os testes t40 a t45 e o `--check`. Foco: casos `comp === ...` esquecidos, W.O. na virada, restauração de partida ao vivo (`LIVE_MATCH_KEY`) com `mundial`, e a ordem dos passos em `startNewSeason`.

**T10. Tipos, constantes e funções puras do patrocínio** (`feature/patrocinador-master`)
- Arquivos: `src/types/club.ts`, `src/config/economy.ts`, `src/utils/club/sponsor.ts` (novo).
- Fazer: seções 2.4, 2.6 e 2.7 (patrocínio).
- Teste `t46-sponsor-pure.mjs`: (1) `buildSponsorOffers(4, 1, rng)` dá 3 ofertas, uma por perfil, marcas distintas e valores da tabela da seção 5.1 (D: Estável meta 8.500; Desempenho corte 1.298, vitória 7.353, meta 34.500; Ousado corte 2.595, vitória 9.515, meta 69.000, título 17.500); (2) para cada série, os valores crescem de D para A; (3) `sponsorGoalMet` cobre todas as células da tabela da seção 1.2, inclusive o top 6 da A e a 1ª fase da D.

**T11. Estado do patrocínio no `club`** (depende de T10)
- Arquivos: `src/stores/club.ts`.
- Fazer: a linha de `club.ts` da seção 3 e a normalização da seção 4.
- Teste `t47-sponsor-club.mjs`: (1) sem contrato, `projectedSponsorIncome` igual ao de hoje; (2) com o Desempenho na D, nível de Finanças 1, desconto de 1.298 por jogo; (3) o desconto não depende do nível de Finanças (níveis 1 e 3 dão a mesma diferença contra o Estável); (4) com o Ousado, `recordTrophy('title', ...)` soma 17.500 ao caixa e a `earned.title`, e `recordTrophy('promotion', ...)` não soma nada; (5) `signSponsor` recusa depois do 1º jogo oficial; (6) `fromSave` sem `sponsor` dá o contrato Estável com `signedAuto`; (7) `fromSave(toSave())` idempotente.

**T12. Patrocínio no jogo** (depende de T11)
- Arquivos: `src/composables/useEconomy.ts`.
- Fazer: a linha de `useEconomy.ts` da seção 3.
- Teste `t48-sponsor-match.mjs`: (1) sem escolha, o 1º `settleMatch` assina o Estável e o resultado (`ticket`, `sponsor`, `winBonus`) é idêntico ao de hoje para a mesma vitória; (2) com o Ousado na D, a vitória paga `winBonus` 9.515 e o empate 1.730 (= 8.650 × 0,2); (3) `earned.win` acumula; (4) a renda offline com o Ousado usa a receita fixa já descontada.

**T13. Patrocínio na virada** (depende de T12)
- Arquivos: `src/composables/useSeason.ts`, `src/stores/modules/league/getters.ts` (só um getter `userReachedStage(stage)`, se ainda não houver nada equivalente).
- Fazer: a parte do patrocínio na linha `useSeason` da seção 3. Ordem: troféu da série (o bônus por título entra pelo `recordTrophy`), meta, `club.season += 1`, `club.division = nextDivision`, e depois as ofertas novas. Em `initializeFreshCareer`, ofertas da T1.
- Teste `t49-sponsor-season.mjs`: (1) Desempenho na C com acesso: +42.000 na virada e `lastResult.goalMet` verdadeiro; (2) Estável na A rebaixado: meta perdida, 0; (3) Ousado campeão da D: meta 69.000 mais o título 17.500; (4) depois da virada, 3 ofertas novas com `division` da série nova e o contrato nulo; (5) carreira nova tem 3 ofertas na T1.

**T14. Interface do patrocínio** (depende de T13)
- Arquivos: `src/components/club/SponsorCard.vue` (novo), `src/views/ClubView.vue`, `src/views/DashboardView.vue` (banner), `src/components/match/PostMatchSummary.vue`, `src/components/club/SeasonReviewCard.vue`, `src/composables/useNavigation.ts` (selo de Clube).
- Fazer: seção 6 (Patrocinador Master).
- Teste `t50-sponsor-ui.mjs` (`renderToString`): sem contrato contém os 3 rótulos de perfil e "Assinar"; com contrato contém a marca e "Meta:"; o Painel mostra o banner só sem contrato.

**T15. Toasts e textos finais do patrocínio** (depende de T14)
- Arquivos: `src/composables/useSeason.ts` (só os toasts), `src/composables/usePersistence.ts` (toast opcional de save antigo, se o dono aprovar).
- Fazer: os toasts da seção 6. Conferir quebra de linha em textos longos (marca + meta) a 390 px.
- Pronto: build mais o t49 de novo (os toasts não mudam o caixa).

**T16. Calibração com o patrocínio** (depende de T15)
- Arquivos: `docs/calibracao/calib-carreira.mjs` (opção `SPONSOR_TIER=estavel|desempenho|ousado` por variável de ambiente, que assina o perfil no início de cada temporada; padrão: nenhum, o que deixa o auto-Estável agir).
- Fazer: (1) `--check` completo sem a variável: `CHECK OK`; (2) informativo, `tipicoRot:240` e `forteRot:80` com cada perfil: saldo por série e a taxa medida de cada meta (passar da 1ª fase da D, acesso, top 6, título).
- Pronto: `CHECK OK`; relatório com o valor esperado medido de cada perfil (tabela no formato da seção 5.1). Se o Desempenho ou o Ousado do típico ficar acima do Estável em mais de 10 mil por temporada em alguma série (escolha dominante), reportar ao dono com a proposta de ajuste do `goalBonusX`. Não alterar sozinho.

**T17. Revisão do Opus da branch `feature/patrocinador-master`** (Opus, esforço medium)
- Diff contra a `develop`, build, t46 a t50 e `--check`. Foco: idempotência do `fromSave`, ordem da virada (bônus pago com o contrato da temporada certa), trava da escolha depois do 1º jogo, renda offline e venda forçada com o corte do Ousado.

**Integração (sessão principal, não delega):** merge `--no-ff` de `chore/calib-imports`, `feature/copa-dos-continentes` e `feature/patrocinador-master` na `develop`, nessa ordem; depois do segundo merge, rodar o build e o `--check` de novo. A versão não muda sem o dono (seção 10).

## 8. Ordem recomendada

1. T0 (linha de base: sem ela nenhuma medição da Fase 8 vale).
2. 8.2 antes de 8.1, se for preciso escolher uma: o patrocínio aparece em toda temporada e para todo jogador, e o Mundial só para quem chega ao topo da A.
3. As duas frentes podem correr em paralelo; o merge de `useSeason.ts` fica com quem entrar por último.

## 9. Riscos

1. **Casos esquecidos de `comp === ...`:** o `vue-tsc` só pega os `Record<MatchCompetition, ...>`. Uma corrente de `if` sem o `mundial` cai em `league.nextOpponent`, e o usuário jogaria o Mundial contra o rival da liga. Mitigação: T4 faz uma busca explícita, e o t42 confere o adversário.
2. **Teto do elenco máximo na A** (saldo menor que 400 mil) com o prêmio do Mundial. Mitigação: medir na T8; a alavanca é o prêmio do campeão.
3. **Ruído da calibração:** o saldo por série oscila de ±10 a 20 mil entre execuções. As diferenças do Estável (+6 a +15 mil) ficam perto do ruído, mas longe dos tetos.
4. **Ordem na virada:** pagar a meta depois de `club.division = nextDivision` usaria a série errada no rótulo; gerar as ofertas antes usaria a série velha. A T13 fixa a ordem, e o t49 confere.
5. **Save gravado no meio da virada ou adulterado:** `sponsor.season !== club.season` cai no caso do save antigo (Estável automático). Nada de `NaN` no caixa: os números são validados em `fromSave`.
6. **Escolha dominante:** se a medição mostrar que um perfil vence os outros para o clube típico, a escolha perde o sentido. A T16 mede, e o ajuste é só no `goalBonusX`.
7. **Armadilha de caixa na D** (decisão b1) agravada pelo Ousado para quem perde. É aceitável como escolha consciente, mas a interface deve mostrar o equilíbrio de 50%.
8. **Conflito de merge** entre as duas frentes em `useSeason.ts` e `useNavigation.ts`: blocos separados, resolução manual simples.
9. **`dev` e agentes ao mesmo tempo:** como no relatório, recarregar o servidor de desenvolvimento apaga a partida em andamento. Não testar no navegador enquanto um Sonnet edita.

## 10. Perguntas ao dono do produto

1. **Nome:** "Copa dos Continentes" serve? (Evita "Mundial de Clubes" e "Intercontinental", que são nomes reais.)
2. **Calendário:** o Mundial é jogado na temporada seguinte à Condor de Ouro, como a Recopa (recomendado), ou ao fim da mesma temporada, antes da virada (pede uma fase nova no fluxo da virada)?
3. **Formato:** 4 clubes (Europa, Ásia e um sorteado entre África e Américas do Norte) com semi, final e 3º lugar (recomendado), ou só 3 clubes (Ásia na semi, Europa na final)?
4. **Força dos rivais:** europeu com OVER entre 79 e 82, os outros entre 71 e 75?
5. **Prêmios do Mundial:** campeão R$ 400 mil, vice R$ 160 mil, 3º R$ 50 mil, 4º R$ 20 mil? (Alternativa mais conservadora: campeão R$ 300 mil, se o teto do elenco máximo quebrar.)
6. **Patrocínio, perfis e valores:** os 3 perfis e a tabela em R$ da seção 5.1 (Estável igual a hoje com meta de 1× base; Desempenho com corte de 15% da base, vitória de 85% e meta de 4×; Ousado com corte de 30%, vitória de 110%, meta de 8× e 2× por título)?
7. **Duração do contrato:** 1 temporada (recomendado) ou contratos de 2 a 3 temporadas com metas acumuladas?
8. **Prazo:** escolha travada depois do 1º jogo oficial, com o Estável automático se ninguém escolher?
9. **Bônus por título do Ousado:** vale para todos os títulos (liga, Copa, continental, Supercopa, Recopa, Mundial) ou só para a liga e a Copa?
10. **Meta da Série D:** "Permanência" na D = passar da 1ª fase, já que a D não tem rebaixamento?
11. **Save antigo:** mostrar um aviso "O patrocinador master chega na próxima temporada", ou deixar em silêncio?
12. **Marcas fictícias:** aprovar a lista de `SPONSOR_BRANDS` e os nomes de `MUNDIAL_RIVALS`, ou prefere outros?
13. **Testes no repositório:** os scripts `t40` a `t50` ficam em `docs/calibracao/` (versionados, como o `t23-atletas.mjs`) ou só no scratchpad, como nas fases anteriores?
14. **Versão do jogo:** hoje é 1.2.0. A Fase 8 sobe a versão (por exemplo, 1.3.0)? Num commit próprio na `develop` ou só no lançamento? Uma subida por frente ou uma só para as duas?
15. **Asserção das 17 chaves:** posso atualizar o `t23-atletas.mjs` (h6) para a lista real de chaves, numa `chore` separada? Hoje ela falharia, porque o save tem 24 chaves.
