# Plano da Fase 8: Copa dos Continentes e o ecossistema de competições

Só planejamento: nenhum arquivo de `src/`, nem o `package.json`, foi alterado. Origem: `_origem/roadmap_de_evolu_o_handoff_completo.md` (Fase 8, item 8.1). **Versão-alvo: 1.3.0.** O commit `chore(version): 1.3.0` só sai quando o dono pedir o lançamento; as branches de frente nunca mexem no `package.json`.

**Revisão 3 (respostas do dono):**
- Formato ampliado de 32 clubes (8 grupos de 4, oitavas, quartas, semis, final e 3º lugar).
- Nome "Copa dos Continentes" aprovado. Auditoria dos nomes das outras competições, confederações, sedes e clubes (seção 9, só proposta).
- Campo neutro para todos, inclusive a sede.
- A Condor de Prata, a Taça Cacique e a Série A entram no ecossistema.
- Patrocinador Master fora da Fase 8 (seção 13, backlog).
- Aprovados: aviso no save antigo, testes versionados em `docs/calibracao/` e asserção das 17 chaves do t23 numa `chore` separada.

## 0. Como o código está hoje (verificado)

- **Mundial:** não existe nada em `src/`.
- **Finais de jogo único** (`src/stores/modules/competitions/finals.ts`): a vaga da Supercopa (campeão de série ou da Copa) e a da Recopa (campeão continental) nascem na virada, em `useSeason.startNewSeason`. O rival é sorteado (`LEAGUE_CLUBS_POOL[1]` na Supercopa, `CONTINENTAL_RIVALS` na Recopa), e a disputa é na temporada seguinte.
- **Continental:** `ContinentalState.tier`: `'libertadores'` (Condor de Ouro: top 4 da A) ou `'sulamericana'` (Condor de Prata: 5º e 6º da A ou campeão da Taça Cacique). 4 grupos de 4 em ida e volta (6 rodadas), quartas, semi, 3º e final. O estado só existe quando o usuário se classifica. O pódio fica em `club.podiumArchive` (máximo de 12 itens).
- **Grupos:** `src/stores/modules/competitions/groups.ts` já tem `sortGroup` (pontos, saldo, gols pró, OVER), `GROUP_SCHEDULE` (3 rodadas de turno único; o continental repete com mando invertido) e `applyGroupMatch`. São puros, mas dependem do tipo `ContinentalTeam`. `seedContinentalGroups` (`bracketSeeding.ts`) é específico do continental (grupo A do usuário mais B, C e D).
- **Motor de chave** (`src/utils/bracket/bracket.ts`): `createBracket` monta árvores em potência de 2 com disputa de 3º. **Uma chave de 16 (oitavas) serve sem mudança estrutural.** `simulateMatchScore` sempre dá `HOME_ADVANTAGE` ao mandante; para jogo neutro é preciso um parâmetro. `BracketView.vue` desenha a árvore normalmente.
- **Liga:** só a série do usuário é simulada; o campeão da A só é conhecido quando o usuário está nela.
- **Troféus:** `recordTrophy('title', ...)` grava os textos "Campeão da Copa Condor de Ouro", "Campeão da Copa Condor de Prata" e "Campeão da Taça Cacique", além dos títulos de série e de finais. Com isso dá para reconstruir o histórico de saves antigos.
- **Save:** 24 chaves de topo hoje, não 17 (a asserção h6 do `t23-atletas.mjs` está desatualizada).
- **Calibração quebrada:** `calib-carreira.mjs` importa caminhos que deixaram de existir no commit `f673638` (falha com `Failed to load url /src/utils/generatePlayer.ts`). É a tarefa T0. É provável que `escada.mjs` tenha o mesmo problema; ele não entra na Fase 8.

## 1. Formato: 32 clubes (decisão do dono)

| Fase | Regra |
|---|---|
| Grupos | 8 grupos de 4 (A a H), turno único, 3 rodadas (`GROUP_SCHEDULE`). Classificação por `sortGroup`. Avançam os 2 primeiros. |
| Oitavas | Jogo único. Cruzamento: 1A x 2B, 1C x 2D, 1E x 2F, 1G x 2H, 1B x 2A, 1D x 2C, 1F x 2E, 1H x 2G. Quem é do mesmo grupo só se reencontra na final. |
| Quartas, semis e final | Jogo único, árvore normal. |
| 3º lugar | Perdedores das semis, jogo único (`thirdPlace` do motor). |
| Empate | Pênaltis no mata-mata; empate vale 1 ponto nos grupos. |
| Mando | **Campo neutro para todos, inclusive a sede.** Sem +3 em nenhum jogo, do usuário ou da IA. |
| Partidas do usuário | Até 3 de grupo + oitavas + quartas + semi + final ou 3º = **até 7**. |
| Outros jogos | 45 jogos de grupo e 15 a 16 de mata-mata simulados pelo OVER (`simulateMatchScore` neutro), rodada a rodada, no mesmo ritmo das partidas do usuário (como o continental). |

**Bilheteria no neutro (regra):** em cada jogo do usuário, a bilheteria é a fatia de visitante, `projectedStadiumIncome × ECONOMY.awayTicketShare` (40%), e o mesmo vale para os dois clubes. É a regra de renda dividida de jogo neutro, usa uma constante que já existe e não cria um caso especial. Patrocínio fixo, bônus de resultado, folha e manutenção seguem o `settleMatch` normal.

**Sorteio dos grupos:** 4 potes de 8 por OVER (o usuário pelo OVER do time na criação da edição). A sede vai para A1, como no real. Restrição: no máximo um clube por confederação em cada grupo, exceto a Europa, com até 2. O sorteio tenta de novo até encaixar, com `rng` injetável e guarda de 200 tentativas; se falhar, relaxa a restrição.

### 1.1 Calendário: a cada 4 temporadas, com ciclo (recomendado)

| Opção | Participações esperadas numa carreira de 30 temporadas (estimativa) | Prós | Contras |
|---|---|---|---|
| Anual | forte cerca de 6, médio cerca de 3 | aparece mais | 7 jogos a mais por temporada na A (já com cerca de 42 da liga, mais Copa e continental); vagas só com os títulos de 1 temporada; prêmio anual pesa no teto do elenco máximo |
| A cada 2 temporadas | forte cerca de 5, médio cerca de 3 | meio-termo | ciclo de 2 temporadas, sem paralelo com o real |
| **A cada 4 temporadas** | forte cerca de 3 a 4, médio cerca de 2 | igual ao real; o ciclo de 4 temporadas faz **toda temporada contar** (o ranking e a contagem regressiva ficam sempre na tela); evento raro e grande | menos edições |

**Recomendação: a cada 4 temporadas** (edições nas temporadas múltiplas de 4: T4, T8, ..., T28; 7 edições em 30 temporadas). O dono quer que o torneio apareça na carreira, e com o ciclo ele aparece sempre: o card "Rumo à Copa dos Continentes" mostra os pontos do Ranking Condor e as temporadas que faltam. O jogador forte, que chega à A entre a 12ª e a 16ª temporada, disputa 3 a 4 edições; o médio, 2. A edição T4 é, na prática, inalcançável (o usuário está na D), e isso é esperado.

O torneio acontece **durante a temporada da edição** (a vaga fecha na virada que abre essa temporada; o ciclo são as 4 temporadas anteriores). O Mundial fica disponível na aba Competições desde o 1º jogo, como o continental. O que estiver pendente na virada vira W.O. (derrota de 0 x 3 nos grupos, eliminação no mata-mata) e a chave é completada.

### 1.2 Sede

Rotação fixa entre 4 países fictícios, um por edição: Ilhas Sakura, Emirado de Al-Rimal, Reino do Atlas e o seu país (`MUNDIAL_HOSTS[(edição - 1) % 4]`). O seu país é sede em 1 de cada 4 edições (a cada 16 temporadas, cerca de 1 a 2 vezes por carreira).

A frequência da sede não mexe nos números do jogo: ela só decide qual clube nacional ocupa 1 das 32 vagas. Como não há mando para ninguém, força, prêmio, bilheteria e calibração não mudam.

## 2. Ecossistema de vagas

### 2.1 Vagas por confederação (32)

| Confederação (nome proposto, seção 9) | Vagas | Origem |
|---|---|---|
| Europa (Liga Boreal) | 12 | IA, `MUNDIAL_RIVALS.europa` |
| América do Sul (Confederação Condor) | 6 | ecossistema do jogo (seção 2.2) |
| Ásia (Liga das Monções) | 4 | IA |
| África (Liga da Savana) | 4 | IA |
| América do Norte e Central (Liga dos Alísios) | 4 | IA |
| Oceania (Liga dos Corais) | 1 | IA |
| Sede | 1 | campeão nacional do país-sede (seção 2.2) |

É a distribuição real atual. Fica assim porque a América do Sul (as 6 vagas em que o usuário compete) já é a segunda maior.

### 2.2 Como a Condor de Ouro, a Condor de Prata, a Taça Cacique e a Série A se ligam

Opções avaliadas para as 6 vagas sul-americanas e a vaga da sede:

| Opção | Desenho | Avaliação |
|---|---|---|
| A. Só campeões da Ouro | as 6 vagas para os campeões da Condor de Ouro do ciclo; o resto sorteado | a Prata, a Copa e a Série A ficam de fora; não atende ao dono |
| B. Vagas diretas para cada título | campeão da Ouro, da Prata, da Série A e da Copa, cada um com vaga direta | dá vaga duplicada quando o mesmo clube ganha dois títulos; a Prata e a Copa valeriam tanto quanto a Ouro; foge do real |
| **C. Campeões + Ranking Condor + sede nacional** | 4 vagas para os campeões da Ouro do ciclo; 2 vagas pelo **Ranking Condor**, que soma Ouro, Prata, Série A, Taça Cacique, Recopa e Supercopa; a vaga da sede no seu país para o campeão da Série A, com a Taça Cacique como suplente | **recomendado** |

**Recomendação C, em detalhe:**

1. **Campeões da Condor de Ouro** das 4 temporadas do ciclo: vaga direta (até 4). Um clube que ganhou duas vezes ocupa uma vaga só, e a vaga que sobra vai para o ranking (como no real).
2. **Vaga da sede:** quando a sede é o seu país, vai para o campeão da Série A da temporada anterior à edição. Se ele já estiver classificado, passa ao campeão da Taça Cacique da mesma temporada e, depois, ao vice da A. É assim que a Série A e a Copa ganham porta direta. Quando a sede é estrangeira, a vaga é de um clube IA daquele país.
3. **Ranking Condor:** as vagas sul-americanas que sobram (pelo menos 2) vão para os melhores do ranking do ciclo que ainda não estão classificados. É aqui que a Prata, a Copa, a Série A e as finais entram para todos os anos. Pontos por temporada (vale a maior fase de cada competição; soma do ciclo):

| Competição | Participação | Quartas | Semi | Vice | Campeão |
|---|---|---|---|---|---|
| Condor de Ouro | 2 | 4 | 6 | 8 | 12 |
| Condor de Prata | 1 | 2 | 3 | 4 | 6 |
| Série A | 5º e 6º: 1 | 2º a 4º: 2 | | | campeão: 4 |
| Taça Cacique | | | | 1 | 3 |
| Recopa / Supercopa | | | | | 1 cada |

   - **Para o usuário:** classifica-se pelo ranking com **14 pontos ou mais** no ciclo (`RANKING_CUTOFF`). A IA preenche as outras vagas de ranking (sorteadas entre os clubes fortes da A e `CONTINENTAL_RIVALS`). O corte de 14 representa "estar entre os 2 melhores não classificados" sem simular o ranking inteiro da IA. Exemplos: forte na A (Ouro nas quartas duas vezes, semi uma vez e 2º na A uma vez) soma 16 e entra; médio (Prata na semi, Ouro na fase de grupos, campeão da Copa e 5º na A) soma 9 e fica fora. A T12 mede e ajusta o corte para o forte entrar em 70% a 85% das edições em que está na A.
4. **Sem vaga duplicada:** a vaga é atribuída nesta ordem (campeões da Ouro, sede, ranking), e cada clube recebe no máximo uma. O usuário tem uma vaga só e o estado guarda a porta (`userEntry`).
5. **Sem conflito com a Supercopa e a Recopa:** as duas continuam anuais, com as vagas de hoje, jogadas na temporada seguinte à conquista. São competições separadas, com sessão de partida própria, e não usam a vaga do Mundial. Os títulos dão 1 ponto de ranking. Para fechar o ecossistema, a T10 troca os rivais sorteados pelos campeões de verdade, quando o jogo os conhece: Supercopa = campeão da liga x campeão da Taça Cacique (vice da Copa se o mesmo clube ganhou as duas); Recopa = campeão da Ouro x campeão da Prata.

**Dados da IA:** o campeão IA da Ouro numa temporada vem do `podiumArchive` quando o usuário disputou a edição; senão, é sorteado na criação do Mundial entre `CONTINENTAL_RIVALS` e os clubes mais fortes da A. Os nomes ficam gravados no histórico do ciclo para não mudarem entre recargas.

### 2.3 Histórico do ciclo (novo, dentro de `club`)

Para pontuar o ranking é preciso guardar o desempenho de cada temporada. Fica num registro curto, gravado na virada antes das redefinições:

```ts
export type EcoPhase = 'groups' | 'qf' | 'sf' | 'runnerUp' | 'champion'
export interface SeasonEcoRecord {
  season: number
  division: number
  leagueRank: number | null          // só quando o jogo conhece (série do usuário)
  leagueTitle: boolean
  ouro: EcoPhase | null              // fase do usuário na Condor de Ouro
  prata: EcoPhase | null
  cup: 'champion' | 'runnerUp' | null
  recopa: boolean
  supercup: boolean
  ouroChampion: { name: string; power: number } | null   // campeão da Ouro (usuário ou IA do pódio)
}
// em ClubSave: ecoRecords?: SeasonEcoRecord[]   (as últimas 8 temporadas)
```

## 3. Tipos e constantes

### 3.1 Tipos

`src/types/match.ts`: `MatchCompetition` ganha `'mundial'`. O `vue-tsc` vai apontar os `Record<MatchCompetition, ...>` (`stores/match.ts`, `MatchSwitcher.vue`, `suspension.ts`).

`src/types/bracket.ts`: `BracketCompetition` ganha `'mundial'`. `Bracket` ganha `neutral?: boolean` (sem mando para ninguém na simulação).

`src/types/competitions.ts`:
```ts
export type MundialConfed = 'condor' | 'europa' | 'asia' | 'africa' | 'norte' | 'oceania' | 'sede'
export type MundialEntry = 'ouro' | 'ranking' | 'sede'

export interface GroupTeam extends ContinentalTeam { confed?: MundialConfed; tag?: string }
export interface GroupMatchResult { round: number; homeId: string; awayId: string; hg: number; ag: number }
export interface MundialGroup { id: string; teams: GroupTeam[]; results: GroupMatchResult[] }

export interface MundialState {
  qualified: boolean
  edition: number            // 1, 2, 3... (temporada = 4 × edição)
  season: number
  hostId: string
  userEntry: MundialEntry | null
  stage: 'GROUPS' | 'KNOCKOUT' | 'DONE'
  groupRound: number         // 1 a 3: rodada a jogar
  userGroupId: string
  groups: MundialGroup[]
  bracket: Bracket | null    // oitavas em diante, criado ao fim dos grupos
  eliminated: boolean
  champion: boolean
  finalPosition: 1 | 2 | 3 | 4 | null
  history: Array<{ roundName: string; summary: string; prize: number }>
}
```

### 3.2 Constantes (`src/config/competitions.ts`)

```ts
export const MUNDIAL_LABEL = 'Copa dos Continentes'
export const MUNDIAL_EVERY = 4                       // edição nas temporadas múltiplas de 4
export const MUNDIAL_SLOTS = { europa: 12, condor: 6, asia: 4, africa: 4, norte: 4, oceania: 1, sede: 1 }

// Nomes fictícios (seção 9). OVER sorteado na faixa ao criar a edição; listas maiores que o número de vagas.
export const MUNDIAL_RIVALS = {
  europa:  { tag: 'Campeão da Taça Boreal',  minOver: 74, maxOver: 83, names: [/* 16 nomes */] }, // 4 do topo entre 80 e 83
  asia:    { tag: 'Campeão da Copa Monção',  minOver: 66, maxOver: 72, names: [/* 6 */] },
  africa:  { tag: 'Campeão da Copa Savana',  minOver: 65, maxOver: 71, names: [/* 6 */] },
  norte:   { tag: 'Campeão da Copa Alísios', minOver: 65, maxOver: 71, names: [/* 6 */] },
  oceania: { tag: 'Campeão da Copa Coral',   minOver: 56, maxOver: 60, names: [/* 3 */] }
}
// Clubes sul-americanos IA: CONTINENTAL_RIVALS (72 a 76) e os clubes mais fortes de LEAGUE_CLUBS_POOL[1].

export const MUNDIAL_HOSTS = [
  { id: 'sakura',  label: 'Ilhas Sakura',      user: false, clubs: ['Hanami FC', 'Minato Bay'],       minOver: 64, maxOver: 69 },
  { id: 'alrimal', label: 'Emirado de Al-Rimal', user: false, clubs: ['Al-Rimal Club', 'Nakheel SC'], minOver: 64, maxOver: 69 },
  { id: 'atlas',   label: 'Reino do Atlas',    user: false, clubs: ['Medina Atlas FC', 'Sahel Azul'], minOver: 64, maxOver: 69 },
  { id: 'aurora',  label: 'seu país',          user: true,  clubs: [],                                minOver: 0,  maxOver: 0 }
]

export const RANKING_CONDOR = {
  ouro:  { groups: 2, qf: 4, sf: 6, runnerUp: 8, champion: 12 },
  prata: { groups: 1, qf: 2, sf: 3, runnerUp: 4, champion: 6 },
  serieA: { champion: 4, top4: 2, top6: 1 },
  cup: { champion: 3, runnerUp: 1 },
  recopa: 1, supercup: 1,
  cutoff: 14
}

// Em PRIZES (acréscimo): pago ao alcançar cada fase, sem cota base (como PRIZES.cup.rounds).
mundial: { r16: 40000, qf: 60000, sf: 80000, thirdWin: 60000, thirdLoss: 20000, finalLoss: 100000, champion: 320000 },
```

Escala de força: a A típica está em 71, o forte em 76 a 78 na T30, e a Condor IA entre 72 e 76. Os 4 europeus do topo (80 a 83) são os favoritos; os outros 8 europeus (74 a 79) ficam no nível do forte sul-americano; Ásia, África e América do Norte ficam um pouco abaixo da A típica; a Oceania é a zebra. É a hierarquia do real.

### 3.3 Funções puras novas

- `src/utils/groups/groupStage.ts` (novo, **módulo genérico de grupos**): `sortGroup`, `applyGroupMatch` e `GROUP_SCHEDULE` movidos de `modules/competitions/groups.ts`, que passa a reexportá-los (o continental não muda), tipados com `ContinentalTeam` ou `GroupTeam`. Mais `drawGroups(teams, groupCount, rng, { pots, maxPerConfed, hostId })` e `simulateGroupRound(group, roundIndex, rng, { neutral, skipUser })`, que grava o resultado em `results`.
- `src/utils/bracket/bracket.ts`: `simulateMatchScore(home, away, rng, homeAdvantage = HOME_ADVANTAGE)`; `resolveTie` passa 0 quando `bracket.neutral`. Sem o campo, nada muda.
- `src/utils/bracket/bracketSeeding.ts`: `MUNDIAL_R16_TEMPLATE` e `seedMundialRoundOf16(sortedGroups)`, entregue a `createBracket` com 8 confrontos na 1ª fase e `thirdPlace: true`.
- `src/utils/competitions/rankingCondor.ts` (novo): `ecoPoints(record)`, `rankingPoints(records, editionSeason)` (soma das 4 temporadas anteriores) e `userMundialEntry(records, editionSeason, hostIsUser, ...)`, que devolve `'ouro' | 'sede' | 'ranking' | null` na ordem da seção 2.2.
- `src/utils/competitions/mundialField.ts` (novo): `buildMundialField({ edition, records, userOver, userName, serieAPool, podiumArchive, rng })` monta os 32 `GroupTeam` com `confed` e `tag`, aplica a regra das vagas sem duplicação e devolve os grupos sorteados.

## 4. Stores e composables afetados

| Arquivo | Mudança |
|---|---|
| `src/stores/modules/competitions/mundial.ts` (novo) | `createMundial({ mundialState, club })`: `openMundialEdition(field)`, `resetMundial()`, `finishMundialForSeason()` (W.O. do que falta, grupos simulados, `completeBracket(..., { forfeitUser: true })` e pódio), `applyMundialResult(uGoals, oGoals, clubName, pens)` (grupos: aplica o jogo do usuário, simula a rodada dos outros 7 grupos e o outro jogo do grupo dele; na 3ª rodada, classifica e cria a chave; mata-mata: segue o fluxo da `cup.ts`), prêmios ao alcançar cada fase, troféu "Campeão da Copa dos Continentes", `mundialStageLabel`, `mundialOpponent`, `hasPendingMundial`, `mundialStandings`. |
| `defaults.ts`, `save.ts`, `src/stores/competitions.ts` | `emptyMundial()`; `mundialState` em `toSave`/`fromSave` (spread sobre o vazio); `isCompetitionPlayable('mundial')`; `hasPendingThirdPlace` com o 3º do Mundial. |
| `src/stores/club.ts` | `ecoRecords` (máximo de 8), `recordEcoSeason(record)`, `toSave`/`fromSave`/`resetCareerRecords`. |
| `src/composables/useMatchSimulation.ts` | `homeBonusApplies` continua só liga e continental (o `mundial` é neutro); `rawIsHomeFor('mundial') = false` (bilheteria de 40%); `rawOpponentFor`, `rawLabelFor` ("Copa dos Continentes • Grupo C, 2ª rodada" / "• Oitavas de Final"), `needsShootout` (só no mata-mata), ramo em `concludeMatch`. |
| `src/stores/match.ts`, `MatchSwitcher.vue`, `suspension.ts` | `sessions.mundial`, `COMPETITIONS_ORDER`, `NAMES` ("Continentes"), `COMP_SHORT` ("CON"). |
| `src/composables/useSeason.ts` | Virada: (1) montar e gravar o `SeasonEcoRecord` da temporada que termina (antes de `finishContinentalForSeason` reiniciar o estado, lendo `tier`, fase, `finalPosition`, pódio, `prevRank`, `trophyType`, Copa, Recopa e Supercopa); (2) `finishMundialForSeason()` e arquivar o pódio; (3) `resetMundial()`; (4) se a temporada nova for múltipla de 4, `buildMundialField` e, se o usuário tiver vaga, `openMundialEdition`. |
| `src/stores/modules/competitions/finals.ts` | T10: rivais reais da Supercopa e da Recopa (seção 2.2, item 5). |
| `src/composables/usePersistence.ts` | `mundialState` em `competitions.fromSave`; reconstrução do `ecoRecords` em save antigo e aviso único (seção 5). |
| Interface | `MundialPanel.vue` (novo), `src/components/club/MundialCycleCard.vue` (novo), `CompetitionsView.vue`, `DashboardView.vue` (`CUP_COMPETITIONS` e card), `useNavigation.ts` (selo). |

## 5. Save e migração (idempotente)

- **Tamanho:** `mundialState` com 32 times nos grupos (cerca de 3 KB), 48 resultados de grupo (cerca de 3 KB) e uma chave de 16 com 3º lugar (cerca de 5 KB): **8 a 12 KB**, só na temporada da edição e só com o usuário classificado. `ecoRecords`: 8 registros de cerca de 150 bytes. Fica longe do limite do `localStorage` (cerca de 5 MB).
- **`mundialState`:** chave de topo aditiva (25 no total), padrão `emptyMundial()` em save antigo. O campo `neutral` da chave é opcional, e as chaves já gravadas carregam sem mudança.
- **`ecoRecords`** dentro de `club`. Em save antigo (campo ausente), reconstruir a partir do `trophyGallery` (títulos por temporada: "Campeão da Copa Condor de Ouro", "...de Prata", "Campeão da Taça Cacique", títulos de série e das finais) e do `podiumArchive` (campeões da Ouro). As fases que não são título (quartas, semis) ficam desconhecidas e contam como `null`. A reconstrução roda só quando o campo está ausente, então uma segunda carga não muda nada. Se a seção 9 renomear as competições, a reconstrução precisa reconhecer os textos antigos e os novos.
- **Aviso único (aprovado):** no primeiro load de um save antigo, um toast: "Nova competição: Copa dos Continentes, a cada 4 temporadas. Próxima edição na temporada N. Seus títulos já contam para o Ranking Condor."
- **Asserção das 17 chaves:** numa `chore` separada (T1), atualizar a h6 do `t23-atletas.mjs` para a lista real de chaves. Os testes da Fase 8 conferem "as chaves de antes mais `mundialState`".

## 6. Prêmios e calibração

### 6.1 Prêmios (sem cota base; pagos ao alcançar a fase)

| Desfecho | Pago na fase | Total |
|---|---|---|
| Eliminado nos grupos | 0 | **0** |
| Oitavas (passou dos grupos) | 40 mil | 40 mil |
| Quartas | +60 mil | 100 mil |
| Semi | +80 mil | 180 mil |
| 4º (perdeu o 3º) | +20 mil | 200 mil |
| 3º | +60 mil | 240 mil |
| Vice | +100 mil | 280 mil |
| Campeão | +320 mil | **500 mil** |

Escada:
- Cada fase paga mais que a fase equivalente da Taça Cacique (`cup.rounds` 10/20/40/260) e do continental (30 mil por vitória mais bônus de 180/70/30 mil).
- O campeão (500 mil) fica no topo: > campeão continental (cerca de 380 a 420 mil com cotas) > Copa (330 mil) > Série A (300 mil).
- O vice (280 mil) fica abaixo do campeão da A (300 mil), então título nacional continua valendo mais que vice mundial.
- Quem cai nos grupos não recebe nada (regra do dono).

### 6.2 Efeito no `--check` e no teto do elenco máximo na A

- **Edição a cada 4 temporadas:** o valor por temporada é o valor da edição dividido por 4.
- **`maximoRot` (OVER 88) na A:** quase sempre classificado (Ouro ou ranking). Chances por fase, estimadas: grupos 95%, oitavas 85% (contra cerca de 76), quartas 70%, semi 65%, final 62% (contra 80 a 83). Valor esperado da edição ≈ 38 + 48 + 45 + 73 (campeão) + 14 (vice) + 9 (3º e 4º) ≈ **230 mil por edição, cerca de 57 mil por temporada**. A anual seria cerca de 230 mil por temporada. Com o saldo histórico desse perfil na A negativo (cerca de −240 mil), fica bem abaixo do teto de 400 mil. A medição fica na T12; se quebrar, a alavanca é o campeão (320 → 220 mil).
- **Jogos a mais:** até 7 na temporada da edição, com 40% de bilheteria. Num clube típico da A, cada jogo do Mundial fica perto de −6 mil (bilheteria de cerca de 11 mil + patrocínio de cerca de 28 mil + bônus médio de cerca de 4 mil − folha de cerca de 44 mil − manutenção de cerca de 5 mil). Cair nos grupos custa cerca de −18 mil; chegar às oitavas já paga a conta (+40 mil). É coerente com "sem cota base": jogar o torneio não é lucro garantido.
- **`tipicoRot`:** raramente classificado (precisa da Ouro ou de 14 pontos). Efeito de poucos mil por temporada, longe dos tetos (A 650 mil).
- O `calib-carreira.mjs` precisa de `'mundial'` no `pickComp` e de rodar pelo menos 20 temporadas (5 edições). Saem duas métricas novas e informativas: edições classificadas por política e prêmio médio por edição.
- **Escada entre séries:** sem efeito. O Mundial só existe para clubes da A ou que pontuaram no ciclo; a escada D < C < B < A não muda.

## 7. Interface

- Aba "Continentes" em `CompetitionsView.vue`, com selo `!` quando há jogo pendente.
- **`MundialPanel.vue`:**
  - Sem edição na temporada: contagem regressiva ("Próxima edição: temporada N, sede: Reino do Atlas") e o Ranking Condor do usuário, com o corte de 14.
  - Edição sem o usuário: os 8 grupos simulados ao fim da temporada (ou na virada) e o campeão, como notícia.
  - Edição com o usuário: a tabela do grupo dele (no padrão de `ContinentalPanel`), as abas com os outros 7 grupos, o botão de entrada (`prepareMatch('mundial')`, `matchEntryLabel`), a chave do mata-mata (`BracketView` padrão, já que a chave de 16 é uma árvore normal), o `PodiumCard` e os prêmios lidos de `PRIZES.mundial`.
- **`MundialCycleCard.vue`** (Painel ou aba Clube): "Rumo à Copa dos Continentes": temporadas que faltam, pontos do ciclo por competição e a porta provável ("Vaga pelo campeão da Ouro", "Vaga pelo ranking", "Faltam N pontos").
- Rótulos: "Copa dos Continentes • Grupo C, 1ª rodada" / "• Oitavas de Final" / "• Disputa de 3º Lugar". Galeria: "Campeão da Copa dos Continentes".
- T10: os cards da Supercopa e da Recopa mostram a origem do rival.

## 8. Tarefas (uma por delegação a Sonnet, esforço low, salvo indicação)

### Regras para todas as tarefas

- Projeto `C:\Users\elphant\Downloads\Super XI`. Não commitar nem mexer em `package.json` (a versão 1.3.0 só entra quando o dono pedir o lançamento). Só os arquivos listados.
- Branches: T0 em `chore/calib-imports`; T1 em `chore/t23-chaves`; T2 a T13 em `feature/copa-dos-continentes`; T14 em `feature/universo-nomes` (só depois de o dono aprovar a seção 9). Saem da `develop` e voltam com `--no-ff`, depois da revisão do Opus. Commit e merge ficam com a sessão principal.
- Pronto comum: `npm run build` sem erro, mais o teste da tarefa.
- Testes versionados em `docs/calibracao/` (`t40` em diante), com o harness do `calib-carreira.mjs` consertado (T0). Imprimem `OK <nome>`, saem com `exit(1)` na 1ª falha e fecham o servidor Vite. Sorteios com `mulberry32(seed)`.
- Português; nenhum nome real de clube, marca ou confederação; poder sempre como "OVER".

### Grafo

```
T0 -> T1
T2 -> T3 -> T4 -> T5 -> T6 -> T7 -> T8 -> T9 -> (T10, T11) -> T12 -> T13 (Opus)
T14 depois de aprovada a seção 9, independente de T2-T13 (conflita só em textos: integrar depois da T13)
```

---

**T0. Consertar os imports da calibração e tirar a linha de base** (`chore/calib-imports`)
- Arquivos: `docs/calibracao/calib-carreira.mjs`.
- Fazer: trocar os imports para `/src/config/index.ts`, `/src/utils/player/generatePlayer.ts`, `/src/utils/match/calculateTeamStrength.ts` e `/src/utils/bracket/bracket.ts` (conferir os nomes usados de `C.`). Mais nada.
- Pronto: `node docs/calibracao/calib-carreira.mjs 20 curva,tipicoRot:240,forteRot:80,fracoRot:80,maximoRot:120,tipico,tipicoD,forte,fraco,caroFraco,investidor --check` dá `CHECK OK`. Anotar os números do `tipicoRot` por série e do `maximoRot` na A (linha de base). Se falhar, parar e reportar.

**T1. Asserção das chaves do save no t23** (`chore/t23-chaves`)
- Arquivos: `docs/calibracao/t23-atletas.mjs`.
- Fazer: consertar os imports como na T0 e trocar a h6 (`Object.keys(o).length === 17`) pela lista real de chaves de topo de hoje.
- Pronto: `node docs/calibracao/t23-atletas.mjs` com todas as asserções OK.

**T2. Tipos e constantes**
- Arquivos: `src/types/match.ts`, `src/types/bracket.ts`, `src/types/competitions.ts`, `src/types/club.ts` (só `SeasonEcoRecord` e `ecoRecords?`), `src/config/competitions.ts`, `src/stores/match.ts` (só `sessions` e `COMPETITIONS_ORDER`), `MatchSwitcher.vue` (só `NAMES`), `src/utils/player/suspension.ts` (só `COMP_SHORT`).
- Fazer: seções 2.3, 3.1 e 3.2 (com as listas completas de nomes da seção 9).
- Pronto: build. Não fazer: lógica.

**T3. Módulo genérico de grupos e jogo neutro**
- Arquivos: `src/utils/groups/groupStage.ts` (novo), `src/stores/modules/competitions/groups.ts` (passa a reexportar), `src/utils/bracket/bracket.ts`.
- Fazer: as funções de grupos e de jogo neutro da seção 3.3.
- Teste `t40-groups.mjs`:
  1. **Regressão:** antes de editar, gravar em JSON o resultado do continental completo e de `seedCup` + `completeBracket` (sementes 1 a 20) contra a `develop`; depois, JSON idêntico.
  2. `drawGroups` com 32 times em 1.000 sementes: 8 grupos de 4, a sede em A1, no máximo 2 europeus e 1 de cada outra confederação por grupo (ou relaxado, com o caso contado e menor que 1%), potes respeitados.
  3. `simulateGroupRound` neutro: em 20 mil jogos entre OVER iguais, o mandante vence 40% ± 2 e o visitante igual.
  4. `sortGroup` desempata por pontos, saldo, gols pró e OVER.

**T4. Histórico do ciclo e Ranking Condor**
- Arquivos: `src/utils/competitions/rankingCondor.ts` (novo), `src/stores/club.ts` (`ecoRecords`, `recordEcoSeason`, save e reset).
- Fazer: seções 2.2 (item 3), 2.3 e a linha `rankingCondor` da seção 3.3.
- Teste `t41-ranking.mjs`: pontos de cada célula da tabela; soma só as 4 temporadas do ciclo; ordem das portas (Ouro > sede > ranking); corte de 14; `ecoRecords` limitado a 8 e `fromSave(toSave())` idêntico.

**T5. Campo de 32 clubes**
- Arquivos: `src/utils/competitions/mundialField.ts` (novo), `src/utils/bracket/bracketSeeding.ts` (template das oitavas).
- Fazer: as linhas `mundialField` e `bracketSeeding` da seção 3.3.
- Teste `t42-mundial-field.mjs`:
  1. Sempre 32 clubes distintos com 12/6/4/4/4/1/1 por confederação.
  2. Campeão da Ouro no ciclo: usuário entra por `'ouro'`.
  3. Sede no seu país e usuário campeão da A sem Ouro: entra por `'sede'`; campeão da A e da Ouro: entra por `'ouro'` e a sede vai ao campeão da Taça Cacique.
  4. 14 pontos sem título: `'ranking'`; 13: fora (`null`).
  5. Bicampeão da Ouro ocupa uma vaga só.
  6. Campeão IA da Ouro vem do `podiumArchive` quando existe.
  7. Faixas de OVER respeitadas.

**T6. Módulo e store do Mundial**
- Arquivos: `src/stores/modules/competitions/mundial.ts` (novo), `defaults.ts`, `save.ts`, `src/stores/competitions.ts`.
- Fazer: seção 4 (linhas do módulo e da store).
- Teste `t43-mundial-store.mjs`:
  1. Abre a edição: grupos sorteados e `isCompetitionPlayable('mundial')` verdadeiro.
  2. 3 vitórias nos grupos: passa, +40 mil, chave de 16 com o usuário e os outros 7 grupos completos (cada grupo com 6 resultados).
  3. Campeão: total de 500 mil, troféu e pódio.
  4. Perde a semi e vence o 3º: 240 mil no total.
  5. Eliminado nos grupos: 0 e o resto do torneio simulado até o pódio.
  6. `finishMundialForSeason()` no meio dos grupos: W.O. e pódio completo.
  7. `fromSave({})` dá `emptyMundial()`; `fromSave(toSave())` preserva tudo.

**T7. Partida do Mundial**
- Arquivos: `src/composables/useMatchSimulation.ts`, `src/views/DashboardView.vue` (só `CUP_COMPETITIONS`), `src/composables/useNavigation.ts` (só o selo).
- Fazer: as linhas correspondentes da seção 4. Buscar todas as correntes `comp === 'recopa'` / `'supercup'` / `'continental'` em `src/` e decidir caso a caso.
- Teste `t44-mundial-match.mjs`: o adversário vem do grupo ou da chave (não da liga); o rótulo começa com "Copa dos Continentes"; `homeBonusApplies('mundial')` é falso; a bilheteria é 40% de `projectedStadiumIncome`; empate nos grupos não gera pênaltis e no mata-mata gera.

**T8. Virada de temporada**
- Arquivos: `src/composables/useSeason.ts`.
- Fazer: a linha `useSeason` da seção 4.
- Teste `t45-mundial-season.mjs`:
  1. O registro do ciclo grava a fase da Ouro, a da Prata, a Copa e a colocação na A.
  2. Na virada para a temporada 8, com o usuário campeão da Ouro na 6, a edição 2 abre com o usuário.
  3. Na virada para a 9, a edição pendente vira W.O. e o pódio vai para o `podiumArchive`.
  4. Fora de ano de edição, nada é criado.
  5. A Supercopa e a Recopa continuam com as vagas de hoje.

**T9. Persistência, reconstrução e aviso**
- Arquivos: `src/composables/usePersistence.ts`.
- Fazer: seção 5.
- Teste `t46-mundial-save.mjs`:
  1. Save antigo sem `mundialState` nem `ecoRecords`: carrega, e os títulos do `trophyGallery` viram registros.
  2. Aviso único (o segundo load não repete).
  3. Save no meio dos grupos recarrega igual.
  4. Save, load, save dá JSON idêntico.
  5. As chaves são as de antes mais `mundialState`.

**T10. Supercopa e Recopa com os rivais reais**
- Arquivos: `src/stores/modules/competitions/finals.ts`, `src/composables/useSeason.ts` (só os argumentos de `qualifySupercup`/`qualifyRecopa`), `src/components/competitions/SupercupsPanel.vue` (texto da origem).
- Fazer: seção 2.2, item 5.
- Teste `t47-finais-ecossistema.mjs`:
  1. Campeão da liga e da Copa enfrenta o vice da Copa.
  2. Só campeão da Copa, estando na A: enfrenta o campeão da A.
  3. Campeão da Ouro: rival com etiqueta "Campeão da Condor de Prata".
  4. Prêmios iguais aos de hoje.

**T11. Interface**
- Arquivos: `src/components/competitions/MundialPanel.vue` (novo), `src/components/club/MundialCycleCard.vue` (novo), `src/views/CompetitionsView.vue`, `src/views/DashboardView.vue` (só o card).
- Fazer: seção 7.
- Teste `t48-mundial-ui.mjs` (`renderToString`):
  1. Sem edição: contagem regressiva e pontos.
  2. Edição com o usuário: a tabela do grupo, "Disputar 1ª rodada" e os 8 grupos.
  3. No mata-mata: a chave de 16.
  4. O card do ciclo mostra "Faltam N pontos".

**T12. Calibração**
- Arquivos: `docs/calibracao/calib-carreira.mjs` (`'mundial'` no `pickComp` e as duas métricas informativas da seção 6.2).
- Fazer: `--check` completo (comando da T0). Extra informativo: `maximoRot:120`, `forteRot:80`, `tipicoRot:240`, com edições classificadas por porta, prêmio médio por edição e jogos a mais.
- Pronto: `CHECK OK`; relatório contra a linha de base; saldo do `maximoRot` na A abaixo de 400 mil; a taxa do forte classificado nas edições em que está na A, com a proposta de corte (alvo de 70% a 85%). **Não** mudar constantes: reportar.

**T13. Revisão do Opus da branch `feature/copa-dos-continentes`** (Opus, esforço medium)
- Diff contra a `develop`, build, t40 a t48, `--check`. Foco: regressão do continental e das chaves; casos `comp === ...` esquecidos; ordem da virada (registro do ciclo antes das redefinições); W.O.; vagas sem duplicação; reconstrução idempotente; restauração de partida ao vivo (`LIVE_MATCH_KEY`) com `mundial`.

**T14. (Condicional) Aplicar os nomes aprovados da seção 9** (`feature/universo-nomes`)
- Arquivos: `src/utils/league/leagueScheduler.ts` (nomes de clubes e `SERIE_META.name`), `src/utils/identity/teamIdentities.ts` (nome novo e **alias do nome antigo para o mesmo id**), `src/utils/league/leagueKnockout.ts`, textos das competições nos stores e componentes (só strings), `src/composables/usePersistence.ts` (migração por id, seção 9.4).
- Pronto: build; t49 com save antigo (clube renomeado mantém o escudo; `leagueTeams` atualizado pelo id; segunda carga sem mudança).
- Não fazer: mudar ids internos (`libertadores`, `sulamericana`, `cup`, ids de clube).

**Integração (sessão principal):** `chore/calib-imports`, `chore/t23-chaves` e depois `feature/copa-dos-continentes` na `develop` com `--no-ff`; build e `--check` depois do merge. A versão sobe para 1.3.0 só no pedido de lançamento.

## 9. Auditoria de nomes: proposta de universo (o dono aprova depois)

### 9.1 Tema

Hoje o universo mistura a Liga Aurora (luz), o Condor (Andes) e o Cacique (título de liderança indígena). A proposta organiza tudo em torno de **céu, luz e forças da natureza**:
- No país: a Aurora e a subida das raízes ao zênite.
- No continente: o Condor.
- No mundo: confederações com nome de fenômeno natural de cada região. A Liga Boreal conversa com a Aurora (aurora boreal).

Nenhum nome é de marca, entidade ou clube real.

### 9.2 Competições, ligas, confederações e sedes

| Atual | Proposto | Justificativa |
|---|---|---|
| Liga Aurora | **Liga Aurora** (mantém) | âncora do universo, já reconhecida |
| Série D | **Série D • Raízes** | começo da escalada; a letra continua para leitura rápida |
| Série C | **Série C • Horizonte** | o sol aparece |
| Série B | **Série B • Ascensão** | a subida |
| Série A | **Série A • Zênite** | o ponto mais alto do céu: a elite |
| Taça Cacique | **Taça Ipê** | o ipê floresce em todo o país (copa de todas as séries) e tem flor dourada (troféu); evita usar um título de liderança indígena como nome de taça |
| Copa Condor de Ouro / de Prata | **Condor de Ouro / Condor de Prata** (sem "Copa" nos rótulos curtos) | já coesos e marcantes; custo quase zero |
| Supercopa Soberana | **Supercopa Aurora** | liga a decisão nacional à liga; "Soberana" se confunde com o clube Soberano FC |
| Recopa Condor | **Recopa dos Condores** | Ouro x Prata, o duelo dos dois condores |
| Copa dos Continentes | **Copa dos Continentes** (aprovado) | |
| Confederação sul-americana (sem nome) | **Confederação Condor** | organiza as Condores |
| Europa | **Liga Boreal** / **Taça Boreal** | aurora boreal: eco direto da Liga Aurora |
| Ásia | **Liga das Monções** / **Copa Monção** | o fenômeno climático da região |
| África | **Liga da Savana** / **Copa Savana** | paisagem emblemática |
| América do Norte e Central | **Liga dos Alísios** / **Copa Alísios** | os ventos do Caribe |
| Oceania | **Liga dos Corais** / **Copa Coral** | recifes da região |
| Sedes (Sakura, Al-Rimal, Atlas) | **Ilhas Sakura, Emirado de Al-Rimal, Reino do Atlas** | países fictícios, com tipo de governo para soar como país e não como cidade |

### 9.3 Clubes que lembram reais

| Atual (id) | Proposto | Motivo |
|---|---|---|
| Tupinambá EC (`d_18`) | **Jacarandá EC** | há clubes reais com o nome Tupinambá/Tupynambás |
| Noroeste do Vale (`b_10`) | **Vale dos Ventos** | lembra o Noroeste (Bauru) |
| Operário Araucário (`b_14`) | **Pinhão Atlético** | junta dois clubes reais do Paraná (Operário e Araucária) |
| Oeste Catarinense (`b_16`) | **Rio do Peixe EC** | lembra o Oeste FC e o futebol do oeste catarinense |
| Farroupilha AC (`a_8`) | **Minuano AC** | lembra o Farroupilha (Pelotas); minuano é o vento gaúcho (tema dos ventos) |
| Ferrovia Paulista (`c_8`), a revisar | **Trilho Bandeirante** | lembra a Ferroviária |
| São Bento do Vale (`c_9`), a revisar | **Serra do Bento** | lembra o São Bento |
| Esperança de Lagarto (`c_11`), a revisar | **Esperança do Agreste** | lembra o Lagarto (SE) |
| Rivais da revisão 2: Raja Atlas, Wydad Sahel, Kashiwa Sakura FC | **Medina Atlas FC, Sahel Azul, Hanami FC** | "Raja", "Wydad" e "Kashiwa" são de clubes reais |

As listas completas de `MUNDIAL_RIVALS` (16 europeus, 6 de cada confederação média e 3 da Oceania) entram na T2 pela mesma regra: nome de lugar ou fenômeno inventado mais um sufixo genérico (FC, SV, AC, United), checado contra clubes reais conhecidos.

### 9.4 Custo de migração

- **Ids internos não mudam** (`cup`, `continental`, `libertadores`, `sulamericana`, ids de clube): **nenhuma migração obrigatória de save.** Trocar `libertadores`/`sulamericana` por `ouro`/`prata` exigiria migrar o `tier` gravado (relatório, item 8) e não é proposto.
- **Rótulos calculados na hora** (`rawLabelFor`, `SERIE_META.name`, painéis): mudam sozinhos.
- **Textos gravados no save:** títulos no `trophyGallery`, `competitionLabel` no `podiumArchive`, `label` das chaves vigentes e `label` no `matchHistory`. Recomendação: migração idempotente por mapa exato de textos antigos para novos, só no `trophyGallery` e no `podiumArchive` (a galeria fica coerente); o `matchHistory` fica como está (é registro de época). Custo: um mapa e um laço, com teste.
- **Clubes:** o nome fica em `leagueTeams` da temporada vigente, e `teamIdentities.ts` mapeia **nome → id**. Para não perder o escudo, manter o nome antigo como alias. Na carga, renomear em `leagueTeams` pelo id (idempotente). Na virada seguinte, a liga nasce do pool com os nomes novos.
- **Reconstrução do ciclo (seção 5):** precisa reconhecer os títulos antigos e os novos.

## 10. Riscos

1. **Escopo do formato de 32:** é o maior módulo novo do projeto desde o chaveamento (grupos genéricos, campo, ranking, cerca de 60 jogos simulados por edição). Mitigação: tarefas pequenas, funções puras testadas antes do store, e regressão byte a byte do continental na T3.
2. **Casos esquecidos de `comp === ...`** caem no rival da liga. Mitigação: busca explícita na T7 e o adversário conferido no t44.
3. **Teto do elenco máximo na A:** cerca de +57 mil por temporada, estimado. Medido na T12; a alavanca é o prêmio do campeão.
4. **Corte do ranking mal calibrado:** o usuário forte não entra (frustra) ou entra sempre (banaliza). Mitigação: a T12 mede e propõe o corte (alvo de 70% a 85%).
5. **Ordem da virada:** o registro do ciclo precisa ler o continental, a Copa e a liga antes das redefinições. Conferido no t45.
6. **Duração da temporada da edição:** até 7 jogos a mais na A. São opcionais (o Mundial não trava a liga); o W.O. na virada evita que a temporada fique presa.
7. **Reconstrução de save antigo** perde as fases que não foram título (quartas, semis). Aceito: o aviso explica que os títulos já contam.
8. **Renomeação (T14):** escudos perdidos se o alias faltar; textos misturados no histórico. Mitigação: alias e teste com save antigo.
9. **Ruído da calibração** (±10 a 20 mil por série): o Mundial dividido por 4 fica perto do ruído na média, mas o teto tem folga.
10. **`npm run dev` com agentes editando** apaga a partida em andamento: não testar no navegador durante as tarefas.

## 11. Perguntas ainda abertas ao dono

1. **Calendário:** a cada 4 temporadas com ciclo (recomendado), a cada 2 ou anual?
2. **Ecossistema:** aprova a opção C (4 campeões da Ouro, 2 vagas pelo Ranking Condor somando Ouro, Prata, Série A, Copa e finais, e a sede no seu país para o campeão da A, com a Taça Cacique de suplente)?
3. **Ranking Condor:** aprova a tabela de pontos e o corte de 14 (a T12 mede e pode propor outro)?
4. **Prêmios:** 40 / +60 / +80 mil por fase, 3º +60, 4º +20, vice +100, campeão +320 (total de 500 mil), sem nada nos grupos?
5. **Rivais:** Europa 74 a 83 (4 do topo entre 80 e 83), Ásia 66 a 72, África e América do Norte 65 a 71, Oceania 56 a 60, sede estrangeira 64 a 69?
6. **Supercopa e Recopa com os rivais reais** (T10)?
7. **Nomes (seção 9):** aprova o tema e a tabela atual → proposto? Quais dos itens "a revisar" entram? Migra os textos antigos da galeria e dos pódios?
