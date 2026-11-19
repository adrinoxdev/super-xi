# Amistosos (Super XI) — spec de design

Branch: `feature/amistosos` (sai da `develop`). Não alterar `package.json` / versão. Sem backend: tudo local, no save.

## 1. Objetivo e escopo

Nova modalidade "Amistosos": o usuário gasta fichas para desafiar adversários simulados (bots), joga a partida no fluxo normal (PreMatch → Match, tática e substituições ao vivo) e ganha ou perde **fama**, que define sua posição num ranking de 101 clubes (100 bots + usuário). Dinheiro é secundário e baixo.

Dentro do escopo: fichas com recarga por tempo real, sorteio com roleta (3 opções, até 3 sorteios por desafio), partida tipo `friendly`, fama estilo Elo, ranking com evolução simulada dos bots, persistência no save atual, tela `/friendlies`, item de navegação e BottomNav reorganizada (4 itens principais + menu "+").

Fora do escopo: jogadores reais/multiplayer (só a interface do provedor fica preparada, ver 4.3), mudança de versão, test runner novo, estatísticas de temporada para amistosos.

## 2. Regras

1. **Fichas**: máximo 10; +1 a cada 10 min de tempo real, inclusive com o jogo fechado. Começa com 10. Cada amistoso gasta 1 ficha **no apito inicial** (`startLiveMatch`), não no sorteio.
2. **Sorteio**: botão "Desafiar" abre a roleta, que revela 3 opções (1º sorteio). "Re-sortear" gera 3 opções novas. **Limite: até 3 sorteios por desafio** (o do "Desafiar" conta como o 1º; sobram 2 re-sorteios). Ao esgotar os 3, é obrigatório escolher uma das 3 opções do último sorteio. O contador (`drawsUsed`) fica no save e **só zera quando a partida é iniciada** (`beginMatch`, no apito inicial); sair da tela, ir ao PreMatch e voltar, recarregar a página ou fechar o jogo **não** zera (impede farm de re-sorteio saindo e voltando). Enquanto houver opções sorteadas, "Desafiar" reabre as mesmas opções em vez de sortear de novo. Sortear não exige ficha; jogar exige.
3. **Adversário**: o sorteio guarda o **deslocamento** do rival (`offset` = bônus de posição + variação uniforme em [−5, +5]), não o OVER absoluto. O OVER do rival é sempre `OVER do usuário (energia 100) + offset`, limitado a [35, 99]: no cartão do sorteio e no PreMatch ele é uma **estimativa** com a escalação do momento; no apito inicial (`beginMatch`) é recalculado com o OVER do time que vai a campo e fixado, junto com o prêmio e a fama em jogo. Assim, sortear com reservas fracos e voltar com o time forte não rende rival fraco com prêmio de rival fraco (brecha de farm fechada, decisão do dono). Cada opção mostra nome, escudo, OVER estimado (marcado como estimativa), fama, posição no ranking, dinheiro em jogo e fama em jogo (ganho na vitória / perda na derrota), todos estimados com o OVER atual.
   - **OVER efetivo do usuário (revisão do bloco 8-13, decisão do dono)**: "OVER do usuário" nesta regra é sempre o OVER efetivo `userOver = max(OVER da escalação atual, OVER da melhor escalação elegível)`, os dois com energia 100 (ver §6, OVER do usuário no amistoso). Fecha a segunda brecha de farm: apitar com titulares fora de posição ou reservas fracos (rival fraco fixado no apito) e corrigir o time ao vivo com "Reorganizar" (não gasta substituição) ou com as 5 trocas. Com o piso da melhor escalação, escalar mal não baixa o rival, o prêmio nem a fama em jogo; só piora a chance real de vencer. Cartão, PreMatch e apito usam o mesmo cálculo.
4. **Escalação**: a escalação real (`squad.starterIds`/`formation`). Não pode ter titular lesionado nem suspenso em **qualquer** competição. Precisa de 11 atletas elegíveis (não lesionados, não suspensos em nenhuma competição, não emprestados).
5. **Energia**: no amistoso todos jogam como se tivessem energia 100 (sem penalidade de cansaço no OVER nem na chance de lesão). Nenhuma energia é consumida ou recuperada pelo jogo; a recuperação natural por tempo real **não** congela durante um amistoso ao vivo.
6. **Lesões**: lesão sofrida no amistoso vale normalmente nas outras competições. O amistoso não desconta jogos de lesões existentes (senão vira cura por farm). Lesionado que fica em campo até o fim agrava a lesão como hoje.
7. **Cartões**: valem dentro da partida (expulso deixa o time com um a menos). Não geram suspensão, não somam amarelos acumulados e não descontam suspensões existentes.
8. **Fora da temporada**: amistoso não mexe em liga, copas, calendário, estatísticas de temporada/carreira (gols, assistências, jogos, cartões), Hall da Fama, evolução de atletas, marcos de progressão, reputação do clube (`club.reputation`, ver regra 12), salários, bilheteria, patrocínio nem propostas de transferência. Não entra no histórico `match.matchHistory` (limite de 150 seria engolido pelos amistosos); o histórico próprio guarda os últimos 20.
9. **Resultado**: sem prorrogação nem pênaltis.
   - Vitória: prêmio em dinheiro (8k a 25k, escala com o OVER do rival) + fama.
   - Empate: R$ 0; fama ± pequena (pode ser 0).
   - Derrota: R$ 0; perde fama (perda mínima 3); fama nunca abaixo de 0.
   - **Limite diário de vitórias pagas**: as 5 primeiras vitórias do dia (meia-noite local) pagam; depois disso a vitória rende só fama. Parâmetro `paidWinsPerDay` (0 = sem limite).
10. **Ranking**: é uma **tabela de classificação** com a mesma regra de ordenação da tabela da liga, com **fama no lugar dos pontos**: fama → vitórias → saldo de gols → gols pró (ver §6, Posição). Usuário e bots têm estatísticas de amistoso (J, V, E, D, GP, GC, SG). Tela: top 10 + linha do usuário (se fora do top 10). Os bots mudam de fama e somam jogos sozinhos, simulados quando a tela abre (sem timer em segundo plano).
11. **Uma partida de amistoso por vez** (uma sessão `friendly`). **Amistoso não começa enquanto houver partida de outra competição ao vivo** (revisão do bloco 8-13, decisão do dono): a escalação é uma só e um lesionado em campo agravaria a lesão nas duas partidas. Sortear continua livre; "Jogar" (tela), "Iniciar" (PreMatch), `prepareMatch('friendly')` e `startLiveMatch` recusam com a mensagem "Há uma partida da {competição} ao vivo. Termine-a antes de jogar um amistoso." ("ao vivo" = `match.isCompetitionLive`: rodando ou pausada na gaveta, não encerrada). O inverso (iniciar liga ou copa com um amistoso já rodando) segue permitido, como hoje; a decisão do dono cobre só o início do amistoso.
12. **Fama e reputação são separadas (decisão do dono)**: dois números independentes.
    - **Fama** (`friendlies.fame`): exclusiva do PvP dos amistosos. Só o resultado de amistoso a altera; nenhuma outra competição (liga, copas) nem upgrade mexe na fama.
    - **Reputação** (`club.reputation`): do treinador/jogador. Sobe nas partidas de liga e com upgrades, alimenta o header e o ranking de treinadores. **Amistoso nunca altera `club.reputation`**.
    - A fama aparece só na tela de Amistosos (header de `/friendlies`, cartão do usuário, ranking) e no resumo pós-jogo do amistoso. O header das demais telas continua como hoje, com a reputação.
13. **Pré-jogo sobrevive a recarregar (Tarefa 20, decisão do dono)**: recarregar a página no pré-jogo do **amistoso** ou de uma **copa** (`cup`, `continental`, `supercup`, `recopa`: toda competição selecionável no pré-jogo além da liga) volta ao mesmo pré-jogo, desde que essa competição ainda tenha partida a jogar. A liga é o padrão: sem competição válida salva, o pré-jogo é o da liga, sem erro nem aviso. "Ainda tem partida a jogar":
    - copa: `competitions.isCompetitionPlayable(comp)` (o mesmo critério de `prepareMatch` e `goToMatchTab`: copa com adversário atual, continental classificado e vivo, supercopa/recopa classificada e não jogada);
    - amistoso: adversário escolhido (`friendlies.selectedOption !== null`) e nenhum desafio em andamento (`friendlies.active === null`). Ficha zerada **não** invalida: o pré-jogo volta com "Iniciar" desabilitado e o contador, como antes de recarregar.
    - Partida ao vivo salva continua mandando (`restoreLiveMatches` roda depois e abre `/match` na competição ao vivo, como hoje).
    - O save guarda **só o identificador** da competição (`prematchCompetition: MatchCompetition`), nunca estado de partida (placar, relógio, sessão): o pré-jogo é recomposto a partir do estado da competição já salvo (chave da copa, opção do amistoso).

## 3. Como o código atual funciona (pontos de apoio)

- **OVER do time**: `calculateTeamStrength(slots, unavailable?)` em `src/utils/match/calculateTeamStrength.ts` (média ponderada de `getEffectiveOvr` por setor). `getEffectiveOvr` aplica −3 se `stamina < 60` e penalidade de lesão. `squad.teamStrength.rating` (em `src/stores/squad.ts`) é o OVER sem arredondar usado pelo motor.
- **Competição ativa**: `useMatchStore().activeMatchCompetition` (`src/stores/match.ts`) escolhe a sessão exibida em `sessions: Record<MatchCompetition, MatchSession>`; `COMPETITIONS_ORDER` lista as competições. Toda a simulação em `src/composables/useMatchSimulation.ts` recebe `comp`.
- **Adversário/rótulo/mando**: `rawOpponentFor`, `rawLabelFor`, `rawIsHomeFor`, congelados em `snapshot` em `startLiveMatch`.
- **Rating na partida**: `userBaseRating(comp)` → `ratingsFor(comp)`; mando por `homeBonusApplies`.
- **Lesão ao vivo**: `rollLiveInjury` (usa `stamina` em `tired`; grava `matchesLeft: matches + 1`).
- **Pós-jogo**: `concludeMatch` → `settleMatch` (`src/composables/useEconomy.ts`), `applyDiscipline`, `applyPostMatchProgression` (desgaste, recuperação, `applyInjuries`, evolução), marcos, resultado da competição, `addMatchRecord`, `generateIncomingTransferOffer`.
- **Créditos de estatística ao vivo**: `club.recordGoal`/`recordAssist` em `simulateMatchTick` (4 pontos: jogada, falta, pênalti, assistência), revertidos por `discardInProgressGoals`.
- **Suspensão**: `isSuspendedFor(p, comp)` e `COMP_SHORT` em `src/utils/player/suspension.ts`.
- **Energia por tempo real**: `squad.regenStamina(now)` com `club.staminaTickAt` e `STAMINA_REGEN_MS_PER_POINT` (`src/config/squad.ts`), chamada pelo ticker de 1 s em `useScouting().startMissionTicker` (iniciado em `src/App.vue`), que congela a energia se `match.liveCompetitions.length`.
- **Save**: `usePersistence().saveGame/loadGame` (`src/composables/usePersistence.ts`), chave `STORAGE_KEY = 'super_xi_full_save_v7'`; partida ao vivo à parte em `LIVE_MATCH_KEY` (`saveLiveMatch`/`restoreLiveMatches`). Migrações em `src/migrations/*`. Até a Tarefa 18, `match.activeMatchCompetition` não ia no save principal (só no save ao vivo, campo `active`, e só com partida ao vivo): recarregar no pré-jogo de copa ou amistoso voltava ao pré-jogo da liga. A Tarefa 20 corrige (regra 13).
- **Boot** (`src/App.vue`, `onMounted`): `loadGame()` → `restoreLiveMatches()` → `friendlies.resolveOrphan(...)`. A navegação inicial do router (hash) é assíncrona e o `afterEach` (`rememberSection(to.path, activeMatchCompetition)`) roda depois do `onMounted`, então vê a competição já restaurada. O guarda `beforeEach` só troca `/match` ↔ `/pre-match` conforme `match.isMatchActive`; `PreMatch.vue`, `MatchView`, cabeçalho, subtítulo e item ativo da navegação leem `activeMatchCompetition` de forma reativa.
- **Navegação**: `useNavigation().navItems` (Sidebar e BottomNav), `navIdForCompetition`/`rememberSection` em `src/utils/navigation/sectionMemory.ts`, guarda de rota em `src/router/index.ts`. Hoje são 7 itens (Início, Liga, Competições, Scouting, Elenco & Tática, Partidas, Clube) e `src/components/layout/BottomNav.vue` mostra todos numa grade `grid-cols-7`.

## 4. Arquitetura

### 4.1 Arquivos novos

| Arquivo | Conteúdo |
|---|---|
| `src/config/friendlies.ts` | `FRIENDLIES` (todos os números da seção 6, só leitura) e `FRIENDLY_BOT_NAME_PARTS` (`as const`). Reexportado em `src/config/index.ts`. |
| `src/types/friendlies.ts` | Tipos da seção 5 e `FriendlyOpponentProvider`. Reexportado em `src/types/index.ts`. |
| `src/utils/friendlies/rng.ts` | `unit(rng)`, `safeRng(rng)`, `randIntWith(rng, min, max)`: contrato `[0, 1)` do `Rng` garantido com `Math.min(rng(), 1 − 1e-12)`. Puras. |
| `src/utils/friendlies/ranking.ts` | `emptyStats`, `sanitizeStats`, `addResult`, `goalDiff`, `compareStanding`, `userRank(user, bots)`, `rankedBots(bots, user)`. Puras. |
| `src/utils/friendlies/tokens.ts` | `regenTokens(state, now)`, `spendToken(state, now)`, `msToNextToken(state, now)` (saneiam `NaN`/`undefined`). Puras. |
| `src/utils/friendlies/fame.ts` | `expectedScore`, `fameDelta(userOver, oppOver, outcome)`, `applyFame(fame, delta)`. Puras. |
| `src/utils/friendlies/draw.ts` | `rankBonus(rank)`, `drawOffset(rank, rng)`, `opponentOverFrom(userOver, offset)`, `opponentOver(userOver, rank, rng)`, `friendlyPrize(oppOver)`, `quoteOption(offset, userOver, paidWinsLeft)`, `rankPool(...)`, `drawOptions(ctx, rng)`. Puras. |
| `src/utils/friendlies/bots.ts` | `generateBots(seed)`, `simScore(outcome, rng)`, `simulateBots(bots, lastSimAt, now, rng)`, `rankingView(bots, user)`; reexporta `userRank`. Puras. |
| `src/utils/friendlies/localBotProvider.ts` | Implementação local de `FriendlyOpponentProvider` usando as funções acima. |
| `src/utils/friendlies/strength.ts` | (Revisão do bloco 8-13) `isFriendlyEligible(p)` e `friendlyStrengthOf(players, formation, starterIds)` → `{ current, best, bestFormation, over }` (OVER efetivo do amistoso, §6). Puras. |
| `src/stores/friendlies.ts` | Store Pinia: estado, ações, `toSave/fromSave/reset`. (Revisão do bloco 8-13) `beginMatch` devolve `FriendlyBeginResult`; `cancelBegin()` desfaz o último apito com o estado de antes guardado só em memória (limpo por `settle`, `resolveOrphan`, `fromSave` e `reset`). |
| `src/composables/useFriendlies.ts` | Orquestra store + `useMatchSimulation().prepareMatch('friendly')` + toasts + `saveGame`. |
| `src/views/FriendliesView.vue` | Tela: barra de fichas, botão Desafiar, roleta, ranking, últimos resultados. |
| `src/components/friendlies/TokenBar.vue` | 10 fichas, contador para a próxima. |
| `src/components/friendlies/OpponentRoulette.vue` | Roleta animada com 3 slots. |
| `src/components/friendlies/OpponentCard.vue` | Cartão de uma opção, botão "Jogar". |
| `src/components/friendlies/FriendlyRanking.vue` | Tabela de classificação (Fama, J, V, E, D, GP, GC, SG): top 10 + linha do usuário. |
| `src/components/friendlies/FriendlyHistory.vue` | Últimos 20 resultados. |
| `src/components/layout/BottomNavMore.vue` | Painel do botão "+" da BottomNav com os itens secundários (seção 7, Navegação). |
| `src/utils/match/prematchMemory.ts` | (Tarefa 20) `resolvePrematchCompetition(saved, ctx)` e `PrematchContext`: decide, na carga, qual pré-jogo restaurar (regra 13). Pura. |
| `scripts/verify-friendlies/prematch.check.ts` | (Tarefa 20) Checagem de `resolvePrematchCompetition`. |

### 4.2 Arquivos alterados (integração)

| Arquivo | Mudança |
|---|---|
| `src/types/match.ts` | `MatchCompetition` ganha `'friendly'`. `LastMatchSummary` ganha `friendly?: FriendlySummary` (seção 5). |
| `src/stores/match.ts` | `sessions` ganha `friendly: newSession()`; `COMPETITIONS_ORDER` termina com `'friendly'` (assim `saveLiveMatch`/`restoreLiveMatches`, `liveCompetitions` e `MatchSwitcher` cobrem o amistoso sem código novo). |
| `src/utils/player/suspension.ts` | `COMP_SHORT.friendly = 'Amistoso'`. `isSuspendedFor(p, 'friendly')` = suspenso em qualquer competição (`Object.values(p.suspension ?? {}).some(n => n > 0)`). `ORDER` passa a excluir `'friendly'` (senão `suspensionsOf` listaria uma "suspensão no amistoso"). Com isso, `activeStarters`, `SubstitutionDrawer`, `SlotPickerSheet`, `useSquad.suspendedNow` e `lineupBlockers` tratam o amistoso certo sem código extra. |
| `src/utils/match/calculateTeamStrength.ts` | `getEffectiveOvr(player, role, opts?: { ignoreFatigue?: boolean })` e `calculateTeamStrength(slots, unavailable?, opts?)` repassando `opts`. (Revisão do bloco 8-13) `pickBestLineup(players, formation, exclude?, opts?)` repassa `opts` a `getEffectiveOvr`. Padrão inalterado. |
| `src/stores/squad.ts` | `freshTeamStrength = computed(() => calculateTeamStrength(pitchSlots.value, undefined, { ignoreFatigue: true }))` (força real da escalação em campo, energia 100) e `friendlyEligibleCount` (não lesionado, `!isSuspendedFor(p,'friendly')`, não emprestado). (Revisão do bloco 8-13) `friendlyStrength = computed(() => friendlyStrengthOf(players, formation, starterIds))`; `friendlyEligibleCount` passa a usar `isFriendlyEligible`. |
| `src/composables/useMatchSimulation.ts` | Ver 4.4. |
| `src/components/match/PreMatch.vue` | Para `friendly`, `estimateOutcome` usa `squad.freshTeamStrength.rating` (chance real: o motor joga com quem está em campo); OVER do rival, prêmio e fama em jogo vêm de `friendlies.quote(opção, squad.friendlyStrength.over, agora)` (OVER efetivo, o mesmo do apito; marcados como estimativa até o apito); aviso de bloqueio cobre lesionado/suspenso ("lesionado ou suspenso", nunca "suspenso na Amistoso"); aviso âmbar quando a escalação atual está abaixo da melhor elegível; mostra "Custa 1 ficha (X/10)"; "Iniciar" desabilitado sem ficha, com menos de 11 titulares (`lineupShort`) ou com outra partida ao vivo (`friendlyLiveBlock`), sempre com o motivo no `title` e num aviso. |
| `src/components/match/PostMatchSummary.vue` | Se `summary.friendly`: bloco "Resultado do Amistoso" (prêmio, fama ±, fama atual, posição antes → depois, aviso de limite diário) no lugar da grade financeira; botão "Voltar aos Amistosos". |
| `src/components/match/MatchSwitcher.vue` | `NAMES.friendly = 'Amistoso'`. |
| `src/components/match/SubstitutionDrawer.vue` | Para `friendly`, `benchCandidates` também exclui lesionados. (Revisão do bloco 8-13) `effectiveLabel` usa `getEffectiveOvr(p, vaga, { ignoreFatigue: comp === 'friendly' })`. |
| `src/components/squad/SquadRoster.vue` | (Revisão do bloco 8-13) "Recuperação natural pausada durante a partida" só com partida ao vivo de outra competição (`match.liveCompetitions.some(c => c !== 'friendly')`, mesmo critério do ticker em `useScouting`). |
| `src/utils/match/matchResult.ts` | `COMPETITION_NAMES.friendly = 'Amistoso'` (exigido pelo tipo). |
| `src/utils/navigation/sectionMemory.ts` | `MatchNavId` ganha `'friendlies'`; `navIdForCompetition('friendly') = 'friendlies'`; `MAIN_PATHS['/friendlies'] = 'friendlies'`. |
| `src/composables/useNavigation.ts` | Item `{ id: 'friendlies', label: 'Amistosos', shortLabel: 'Amist.', icon: Swords, path: '/friendlies', badge: tokens > 0 ? tokens : null }` entre "Competições" e "Scouting". `NavItem` ganha `primary: boolean` (true em `dashboard`, `league`, `competitions`, `squad`; false nos demais) e o composable exporta `primaryNavItems` e `moreNavItems` (filtros de `navItems`). A Sidebar continua usando `navItems` inteiro. |
| `src/components/layout/BottomNav.vue` | Grade de 5 colunas: 2 principais, botão "+" central, 2 principais (seção 7, Navegação). O "+" abre `BottomNavMore`. |
| `src/router/index.ts` | `{ path: '/friendlies', name: 'friendlies', component: () => import('../views/FriendliesView.vue') }`. |
| `src/composables/usePageSubtitle.ts` | `'/friendlies': 'Fichas e ranking'`. |
| `src/composables/useHeaderStats.ts` | Caso `'/friendlies'`: Fichas, Fama, Posição (só nessa rota; as demais não mudam e seguem com `club.reputation`). |
| `src/composables/useScouting.ts` | No ticker: `friendlies.regenTokens(now)` a cada segundo; a energia só congela se houver partida ao vivo **de outra competição** (`match.liveCompetitions.some(c => c !== 'friendly')`). |
| `src/composables/usePersistence.ts` | `saveGame` grava `friendlies: friendlies.toSave()`; `loadGame` chama `friendlies.fromSave(p.friendlies)`; `clearSave` chama `friendlies.reset()`. (Tarefa 20) `saveGame` grava `prematchCompetition: match.activeMatchCompetition`; no fim de `loadGame`, se nenhuma competição estiver ao vivo na memória, `match.activeMatchCompetition = resolvePrematchCompetition(p.prematchCompetition, { known: COMPETITIONS_ORDER, isPlayable, friendlyReady })`. |
| `src/App.vue` | Depois de `restoreLiveMatches()`: `friendlies.resolveOrphan(match.isCompetitionLive('friendly'))` (seção 8). (Tarefa 20) `watch(() => match.activeMatchCompetition, () => saveGame())`: toda troca da competição exibida (pré-jogo, `MatchSwitcher`, navegação, fim de partida) vai ao save na hora, sem depender só do `beforeunload`. |
| `scripts/verify-friendlies/run.mjs` | (Tarefa 20) `'prematch'` no fim de `ALL`. |

### 4.3 Provedor de adversários (fonte trocável)

```ts
export interface FriendlyOpponentProvider {
  /** Avança o estado dos adversários até `now` (bots: simulação; futuro: busca remota). Sem passo a dar, não troca o array. */
  refresh(now: number): void
  ranking(user: FriendlyStanding): FriendlyRankingView
  /** Opções com o deslocamento do rival (offset); o OVER absoluto, o prêmio e a fama em jogo saem de quoteOption. */
  drawOptions(ctx: FriendlyDrawContext, rng: () => number): FriendlyOption[]
  /** Aplica no adversário o efeito do resultado: fama oposta à EFETIVAMENTE aplicada ao usuário e o jogo nas estatísticas. */
  reportResult(botId: string, result: FriendlyReport): void
}
```

A store só fala com essa interface (`localBotProvider`, que opera sobre `bots` e `botsSimAt` da própria store). Nota: para jogadores reais no futuro, troca-se o provedor por um remoto (ranking e oponentes vindos de servidor); nada disso é implementado agora.

### 4.4 Integração em `useMatchSimulation.ts` (por função)

- `rawOpponentFor('friendly')`: com opção selecionada (`friendlies.selectedOption`), `{ name, power: friendlies.quote(opt, squad.friendlyStrength.over, Date.now()).oppOver, style: 'Amistoso' }` (estimativa viva com o OVER efetivo); depois do apito, `friendlies.active.oppOver` (fixado); sem nenhum, `{ name: 'Adversário', power: Math.round(squad.friendlyStrength.over), style: 'Amistoso' }` (só para não quebrar computeds).
- (Revisão do bloco 8-13) `friendlyLiveBlock(): string | null`, exportado: motivo do bloqueio se `match.liveCompetitions` tiver competição diferente de `'friendly'` (regra 11), senão `null`. Usado por `prepareMatch('friendly')`, `startLiveMatch` (antes de `fixLineupFor`, para não mexer na escalação de uma partida ao vivo), `PreMatch.vue` e `useFriendlies` (Tarefa 15).
- (Revisão do bloco 8-13) `reorganizeTeam` e `recommendSubstitution`: no amistoso, `getEffectiveOvr`/`calculateTeamStrength` com `{ ignoreFatigue: true }` e sem o desempate por energia (todos jogam com energia 100).
- `rawLabelFor('friendly')`: `'Amistoso • Ranking #' + rank` do adversário.
- `rawIsHomeFor`: já devolve `true` por padrão; `homeBonusApplies('friendly')` já é `false`. Sem mudança.
- `userBaseRating(comp)`: para `friendly`, sempre `calculateTeamStrength(squad.pitchSlots, ids, { ignoreFatigue: true }).rating`.
- `lineupBlockers('friendly')`: titulares lesionados ou `isSuspendedFor(p,'friendly')`, ou menos de 11 titulares, **independente** de haver reserva (bloqueia sempre).
- `fixLineupFor('friendly')`: inalterado (já troca lesionados e suspensos via `replaceInjuredStarters(isSuspendedFor)`).
- `prepareMatch('friendly')`: se não houver opção selecionada, toast "Sorteie um adversário." e `router.push('/friendlies')`.
- `startLiveMatch()`: para `friendly`, logo depois da checagem de competição jogável, recusa com `friendlyLiveBlock()` (toast `warning`, nada gasto). Depois de `lineupBlockers` e antes do `snapshot`, chama `friendlies.beginMatch(userOver, now)` com `userOver = squad.friendlyStrength.over` (OVER efetivo; gasta a ficha, recalcula `oppOver = clamp(round(userOver + offset), 35, 99)`, prêmio e fama com esse OVER, grava `active`, limpa `options`/`selectedBotId` e zera `drawsUsed`). (Revisão do bloco 8-13) `beginMatch` devolve `FriendlyBeginResult` (`'ok' | 'active' | 'no-option' | 'invalid-over' | 'no-token'`) e cada motivo tem o seu toast: `no-token` → "Sem fichas. Próxima em mm:ss."; `active` → "Já há um amistoso em andamento."; `no-option` → "Sorteie um adversário." e `/friendlies`; `invalid-over` → "Não foi possível calcular a força do time. Recarregue a página.". Com `'ok'`, o `power` do adversário congelado no snapshot é sobrescrito por `friendlies.active.oppOver` (garante que motor, fama e prêmio usam o mesmo número). `saveGame()` logo depois.
- (Revisão do bloco 8-13) `abortStart` (a tela `/match` não abriu depois do apito): além de parar o relógio e limpar a sessão, no amistoso chama `friendlies.cancelBegin()` (desfaz o apito: ficha, `tokenTickAt`, opções, seleção e contador de sorteios voltam ao estado de antes de `beginMatch`; `active` limpo) e `saveGame()`; em todas as competições chama `saveLiveMatch()` (senão a sessão abortada continuaria no save ao vivo e seria retomada ao recarregar). Toast do amistoso: "Não foi possível abrir a partida. A ficha foi devolvida; tente de novo.".
- `simulateMatchTick`: os 4 `club.recordGoal`/`recordAssist` passam por um helper `credit(comp, fn)` que não faz nada em `friendly`; os logs `matchGoalLogs/matchAssistLogs` ficam vazios no amistoso.
- `rollLiveInjury`: em `friendly`, `tired = 0` e `matchesLeft = matches` (sem o `+1`, porque o amistoso não desconta jogo).
- `needsShootout('friendly')`: `false`.
- `concludeMatch('friendly')`: ramo próprio no início, que retorna cedo:
  1. limpa logs e `matchCards[comp]` (sem `applyDiscipline`);
  2. `applyFriendlyInjuries()`: titular lesionado em campo agrava (`INJURY.aggravateMatches`, teto `aggravateCap`); os demais não mudam; depois `squad.replaceInjuredStarters()`;
  3. `const summary = friendlies.settle(uGoals, oGoals, now)` (fama, prêmio, `club.earn(prize)`, estatísticas do usuário, bot com a fama oposta à aplicada e o jogo espelhado nas estatísticas dele, histórico próprio, limpa `active`; **não** toca em `club.reputation`);
  4. `session.lastMatchSummary = summary`; `saveGame(); saveLiveMatch()`.
  Não chama `settleMatch`, `applyPostMatchProgression`, marcos, `addMatchRecord` nem `generateIncomingTransferOffer`.
  (Revisão do bloco 8-13) **Idempotente**: `settle` roda antes de `applyFriendlyInjuries`; se devolver `null` (sem `active`: desafio já encerrado ou desfeito), não agrava lesão, não credita nada e não sobrescreve um `lastMatchSummary` existente; se não houver resumo, grava um resumo neutro de amistoso (tudo 0, `fameAfter` e posição atuais) para a tela pós-jogo ter o botão "Voltar aos Amistosos", com toast "Este amistoso não contou: o desafio já tinha sido encerrado."; e só `saveLiveMatch()`.
- `finishMatchAndReturn`: destino `'/friendlies'` quando `comp === 'friendly'`.

## 5. Modelo de dados

```ts
// src/types/friendlies.ts
/** Estatísticas de amistoso (mesmas colunas da tabela da liga). played = won + drawn + lost. */
export interface FriendlyStats { played: number; won: number; drawn: number; lost: number; gf: number; ga: number }
/** Quem entra no ranking: fama + estatísticas (FriendlyBot satisfaz por estrutura). */
export interface FriendlyStanding { fame: number; stats: FriendlyStats }
export interface FriendlyBot { id: string; name: string; over: number; fame: number; stats: FriendlyStats }   // id 'fb_1'..'fb_100'
/** Opção do sorteio: guarda o DESLOCAMENTO do rival (bônus de posição + variação), não o OVER absoluto. */
export interface FriendlyOption { botId: string; name: string; fame: number; rank: number; offset: number }
/** Valores de uma opção com um OVER do usuário (estimativa no cartão/PreMatch; fixados no apito). */
export interface FriendlyQuote { oppOver: number; prize: number; fameWin: number; fameDraw: number; fameLoss: number }
export interface FriendlyChallenge { botId: string; botName: string; userOver: number; oppOver: number; prize: number; rankBefore: number; startedAt: number }
export interface FriendlyResult { at: number; botName: string; oppOver: number; userScore: number; oppScore: number; fameDelta: number; prize: number }
export interface FriendlySummary { prize: number; fameDelta: number; fameAfter: number; rankBefore: number; rankAfter: number; paidCapReached: boolean }
/** Linha da tabela de classificação. id = botId ou 'user'; gd = gf − ga. */
export interface FriendlyRankingRow { rank: number; id: string; name: string; fame: number; isUser: boolean
  played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number }
export interface FriendlyRankingView { top: FriendlyRankingRow[]; user: FriendlyRankingRow }
export interface FriendlyDrawContext { user: FriendlyStanding }
/** Resultado repassado ao provedor: delta de fama EFETIVAMENTE aplicado ao usuário e o placar do ponto de vista dele. */
export interface FriendlyReport { userFameDelta: number; userScore: number; oppScore: number }
/** (Revisão do bloco 8-13) Resultado de beginMatch: 'ok' ou o motivo da recusa, para o toast certo. */
export type FriendlyBeginResult = 'ok' | 'active' | 'no-option' | 'invalid-over' | 'no-token'
export interface FriendliesSave {
  v: 1
  fame: number
  stats: FriendlyStats                        // campo novo; ausente em save antigo → zerado
  tokens: number
  tokenTickAt: number
  seed: number
  bots: FriendlyBot[]
  botsSimAt: number
  options: FriendlyOption[] | null
  drawsUsed: number                           // 0..3 sorteios feitos no desafio atual; zera só em beginMatch
  selectedBotId: string | null
  active: FriendlyChallenge | null
  paidWins: { day: number; count: number }   // day = dayStart(ts) de src/config/time.ts
  recent: FriendlyResult[]                    // máx. 20, mais recente primeiro
}
```

`LastMatchSummary.friendly?: FriendlySummary`; num amistoso `ticket = sponsor = wages = interest = maintenance = 0`, `winBonus = net = prize`.

### Persistência e migração

- Campo novo `friendlies` no JSON do `STORAGE_KEY`. **Sem trocar a chave nem criar migração numerada**: o campo é aditivo.
- `fromSave(raw)`: ausente ou `v !== 1` → estado novo (`fame 0`, `stats` zeradas, `tokens 10`, `tokenTickAt = now`, `seed = Date.now()`, `bots = generateBots(seed)`, `botsSimAt = now`, resto vazio). Presente: valida campo a campo, todo número com `Number.isFinite` (`NaN`, `Infinity`, `undefined` e texto caem no padrão) — `bots` com tamanho diferente de 100 ou com bot sem `id`/`name`/`over`/`fame` válidos é regenerado mantendo `fame` e `stats` do usuário; bot sem `stats` (save anterior a esta revisão) **é mantido** com `stats` zeradas; `over` do bot limitado a `[overFloor, overCeil]` e `fame ≥ 0`; `stats` (usuário e bots) saneadas por `sanitizeStats` (cada campo inteiro `≥ 0`, `played = won + drawn + lost`); `tokens` limitado a `[0, 10]`; `options` só valem se todas tiverem `botId`, `name`, `fame`, `rank` e `offset` válidos (`offset` limitado a `[−spread, rankBonusMax + spread]`); opções no formato antigo (com `over`, sem `offset`) são descartadas; `drawsUsed` limitado a `[0, maxDraws]` e forçado a 0 se `options` for `null` (sem opções não há desafio em curso, e o usuário não fica travado sem nada para escolher); `tokenTickAt` e `botsSimAt` limitados a `≤ now` (mesmo cuidado de `staminaTickAt` em `club.fromSave`); `fame ≥ 0`; `recent` cortado em 20.
- Campos novos desta revisão (`stats` do usuário, `stats` dos bots, `offset` da opção) **não** trocam `v` (continua `1`): são aditivos com padrão seguro. O único efeito num save antigo é perder as opções sorteadas no formato antigo (o contador de sorteios volta a 0 junto, pela regra acima). Como ainda não houve lançamento com amistosos, isso só afeta saves de desenvolvimento.
- `reset()` (nova carreira, `clearSave`) volta ao estado novo.
- Importar código de carreira passa por `loadGame`, então herda as regras acima. Saves antigos exportados sem o campo ganham estado novo.
- Partida ao vivo: a sessão `friendly` vai em `LIVE_MATCH_KEY` pelo mecanismo existente.

### Persistência do pré-jogo (Tarefa 20)

- Campo novo `prematchCompetition` na raiz do JSON do `STORAGE_KEY`, gravado por `saveGame` com o valor de `match.activeMatchCompetition` (uma string de `MatchCompetition`). **Sem trocar a chave nem criar migração numerada**: aditivo, como `friendlies`. Não vai no `LIVE_MATCH_KEY` (o save ao vivo é apagado quando não há partida ao vivo, justamente o caso do pré-jogo).
- O campo nunca carrega estado de partida: é só o identificador. Na carga, qualquer valor que não seja uma string idêntica a um item de `COMPETITIONS_ORDER` (objeto, número, `null`, texto desconhecido ou com outra caixa) vira `'league'`.
- Carga (`loadGame`, depois de `competitions.fromSave`/`ensureBrackets`, `friendlies.fromSave` e das migrações, antes de `loading = false`): `resolvePrematchCompetition(p.prematchCompetition, ctx)` com `ctx = { known: COMPETITIONS_ORDER, isPlayable: competitions.isCompetitionPlayable, friendlyReady: friendlies.selectedOption !== null && friendlies.active === null }`:
  - ausente (save antigo), inválido ou `'league'` → `'league'`;
  - copa → ela mesma se `isPlayable(comp)`, senão `'league'`;
  - `'friendly'` → `'friendly'` se `friendlyReady`, senão `'league'`.
- Só aplica se `match.liveCompetitions` estiver vazio. No boot sempre está (as sessões nascem zeradas e `restoreLiveMatches` roda depois); num import de código de carreira com partida rodando na sessão, a competição exibida não muda (a partida ao vivo manda). Num import sem partida rodando, a competição da carreira importada é validada como no boot (a da carreira anterior não sobra).
- Gravação imediata: `App.vue` observa `match.activeMatchCompetition` e chama `saveGame()` a cada troca. `beforeunload` e `visibilitychange` continuam gravando como hoje.
- Importar código de carreira e exportar herdam o campo pelo JSON do save. `clearSave` apaga o save inteiro (o campo some junto).

## 6. Fórmulas e parâmetros iniciais (`src/config/friendlies.ts`)

```ts
// export const FRIENDLIES: DeepReadonly<typeof config> = config  → só leitura no tipo (números continuam `number`)
const config = {
  tokens: { max: 10, msPerToken: 10 * 60 * 1000, initial: 10 },
  bots: { count: 100, fameTop: 1800, fameCurve: 1.6, fameJitter: 20, fameMinStart: 10,
          overMin: 48, overSpan: 40, overJitter: 4, overFloor: 40, overCeil: 92,
          simStepMs: 60 * 60 * 1000, simMaxSteps: 72, simNoise: 6, simPull: 0.03,
          simDrawBand: 1, simWinGoalsMax: 4, simDrawGoalsMax: 2 },
  draw: { spread: 5, rankBonusMax: 6, rankBonusTop: 10, rankBonusFrom: 50, overMin: 35, overMax: 99,
          rankWindow: 15, rankWindowGrow: 5, options: 3, maxDraws: 3 },
  prize: { base: 8000, refOver: 50, perOver: 500, min: 8000, max: 25000, step: 500, paidWinsPerDay: 5 },
  fame: { k: 30, scale: 20, minWin: 4, minLoss: 3, drawCap: 6, start: 0 },
  rankingTop: 10,
  recentMax: 20
}
```

- `bots.overFloor`/`overCeil`: limites do OVER interno dos bots na geração (e no `fromSave`).
- `bots.simDrawBand`, `simWinGoalsMax`, `simDrawGoalsMax`: como a evolução simulada vira jogo (ver Evolução dos bots).
- `draw.rankWindowGrow`: passo de crescimento da janela de posições quando faltam bots.
- `rankingTop`: linhas do topo exibidas na tabela.

**Fichas** (`regenTokens`, mesmo padrão de `squad.regenStamina`):
`n = floor((now − tokenTickAt) / msPerToken)`; se `tokens ≥ max` → `tokenTickAt = now`; se `n ≤ 0` → se `now < tokenTickAt`, `tokenTickAt = now` (relógio voltado); senão `tokens = min(max, tokens + n)`, `tokenTickAt += n·msPerToken`, e se encheu `tokenTickAt = now`.
`spendToken`: se `tokens === max` antes de gastar, `tokenTickAt = now`; `tokens −= 1`. Offline funciona porque o primeiro tick depois de abrir aplica todo o tempo decorrido (teto natural de 10).
Saneamento (as três funções): `tokens` não finito → `max` (mesmo padrão do `fromSave`, que usa `initial = max`); finito → `clamp(floor(tokens), 0, max)`; `tokenTickAt` não finito → `now`; `now` não finito → devolve o estado saneado sem avançar (com `tokenTickAt` inválido virando 0).

**Contrato do `Rng`**: `() => number` em `[0, 1)`. Todo uso que vira índice ou inteiro (`randIntWith`, `shuffle`) passa por `unit(rng) = Math.min(Math.max(rng(), 0), 1 − 1e-12)` (valor não finito vira 0), via `src/utils/friendlies/rng.ts`, para um `rng` injetado fora do contrato (ex.: `() => 1` num teste) não estourar índice. `src/utils/core/random.ts` não muda.

**OVER do usuário no amistoso** (OVER efetivo, revisão do bloco 8-13): `userOver = squad.friendlyStrength.over` (sem arredondar; exibido arredondado), com `friendlyStrengthOf(players, formation, starterIds)` em `src/utils/friendlies/strength.ts`:
- `current` = `calculateTeamStrength(escalação atual, undefined, { ignoreFatigue: true }).rating` (igual a `squad.freshTeamStrength.rating`);
- `best` = maior `calculateTeamStrength(..., { ignoreFatigue: true }).rating` entre **todas as formações** de `FORMATIONS`, cada uma com `pickBestLineup(elegíveis, formação, undefined, { ignoreFatigue: true })`; elegível = `isFriendlyEligible(p)`: sem lesão, sem suspensão em nenhuma competição (`isSuspendedFor(p, 'friendly')`), não emprestado. Todas as formações porque "Reorganizar" ao vivo também troca de formação;
- `over = max(current, best)`. O `max` cobre o caso de a escalação montada à mão superar a heurística gulosa de `pickBestLineup`.
- Sem elegível nenhum: `best = 0`, `bestFormation = null` (o amistoso já está bloqueado por `friendlyEligibleCount < 11`).
- A estimativa de chance no PreMatch (`estimateOutcome`) continua com `current` (o motor joga com quem está em campo): escalar mal piora a chance e não melhora o rival.
- Folga residual aceita: a heurística é gulosa por vaga (a mesma de "Escalar melhor" no Elenco), então "Reorganizar" ao vivo pode, em casos raros, achar uma organização um pouco acima de `best`. A diferença é pequena e não é reproduzível à vontade; não justifica uma busca exaustiva.

**Posição (tabela de classificação)**: mesma ordem da tabela da liga (`computeStandings`, `src/utils/league/leagueScheduler.ts:275`: `pontos → vitórias → saldo de gols → gols pró`), com **fama no lugar dos pontos**:
`compareStanding(a, b) = (b.fame − a.fame) || (b.won − a.won) || (b.gd − a.gd) || (b.gf − a.gf)` (negativo: `a` fica acima).
- `rank = 1 + nº de bots com compareStanding(bot, usuário) < 0`, ou seja, bots estritamente à frente pelos quatro critérios. **Empate total nos quatro critérios favorece o usuário** (fica acima do bot). Vai de 1 a 101.
- Entre bots, depois dos quatro critérios: nome (`localeCompare(…, 'pt-BR')`) e, por último, `id` — ordem total e determinística (a liga cai na ordem de inserção; aqui não há ordem de inserção estável entre saves).
- Partidas jogadas (`played`) não entram no desempate (a liga também não usa).

**Bônus de posição**:
`rankBonus(rank) = rank ≤ 10 ? 6 : rank ≤ 50 ? round1(6 · (51 − rank) / 41) : 0`
(rank 11 → 5.9; 30 → 3.1; 50 → 0.1; 51+ → 0).

**Deslocamento do adversário** (gravado na opção): `offset = round1(rankBonus(rank) + U(−5, +5))`, com `U` uniforme contínuo vindo do `rng` e `rank` = posição do usuário no sorteio. Cada uma das 3 opções sorteia o seu. Faixa: `[−5, 11]`.

**OVER do adversário**: `oppOver = opponentOverFrom(userOver, offset) = clamp(round(userOver + offset), 35, 99)`.
- No cartão do sorteio e no PreMatch: `userOver` = OVER do momento (estimativa, recalculada a cada troca de escalação).
- No apito (`beginMatch(userOver, now)`): `userOver` = OVER do time que vai a campo; `oppOver`, prêmio (com o limite diário de `now`) e a fama em jogo são recalculados e fixados em `active`. `settle` usa só `active.userOver`/`active.oppOver`.

**Cotação** (`quoteOption(offset, userOver, paidWinsLeft)` → `FriendlyQuote`): `oppOver` como acima; `prize = paidWinsLeft > 0 ? friendlyPrize(oppOver) : 0`; `fameWin/Draw/Loss = fameDelta(userOver, oppOver, …)`. A store expõe `quote(opção, userOver, now)` (usa `paidWinsLeft(now)`).

**Limite de sorteios** (`draw()` na store, sem `userOver`: o sorteio só depende da posição): se `drawsUsed ≥ maxDraws` → recusa e devolve `false`; senão sorteia, grava `options`, `drawsUsed += 1`, limpa `selectedBotId` e salva. `drawsLeft = maxDraws − drawsUsed`. Só `beginMatch` zera `drawsUsed`.

**Escolha dos bots das opções**: 3 bots distintos sorteados entre os de posição a até ±15 da posição do usuário (`rankPool`: a janela cresce de `rankWindowGrow` em `rankWindowGrow`, mínimo 1, enquanto houver menos de 3 e ainda sobrar bot fora dela). Posições pela tabela de classificação acima. O cartão mostra a fama e a posição do bot; o OVER mostrado é a estimativa `opponentOverFrom(OVER atual, offset)`, não o `over` interno do bot.

**Prêmio da vitória**: `friendlyPrize(oppOver) = clamp(roundTo500(8000 + (oppOver − 50) · 500), 8000, 25000)` (OVER 50 → 8k; 60 → 13k; 70 → 18k; 84+ → 25k). Se `paidWins.count ≥ paidWinsPerDay` no dia corrente → 0. O valor é recalculado e fixado em `active.prize` no apito inicial (com o `oppOver` do apito).

**Fama (Elo sobre OVER)**:
`E = 1 / (1 + 10^((oppOver − userOver) / 20))`
- vitória: `Δ = max(4, round(30 · (1 − E)))`
- empate: `Δ = clamp(round(30 · (0.5 − E)), −6, 6)`
- derrota: `Δ = −max(3, round(30 · E))`
- `fame = max(0, fame + Δ)`; `aplicado = fama depois − fama antes` (difere de `Δ` quando o piso 0 corta). O bot recebe `−aplicado` (também `≥ 0`): soma zero do ponto de vista do usuário (perder 15 com fama 5 tira só 5 do usuário e dá só 5 ao bot). Se o bot bate no piso 0 numa vitória do usuário, o usuário ainda ganha o `Δ` inteiro (o piso do bot não limita o usuário).
- Estatísticas: o usuário soma o jogo (`addResult(stats, userScore, oppScore)`) e o bot soma o espelho (`addResult(stats, oppScore, userScore)`).

Exemplos (`oppOver − userOver`): 0 → +15/0/−15; +5 → +19/+4/−11; −5 → +11/−4/−19; +10 → +23/+6/−7; +20 → +27/+6/−3.

**Geração dos bots** (`generateBots(seed)`, `mulberry32(seed)` de `src/utils/core/random.ts`):
para `i = 0..99`: `fame = max(10, round(1800 · (1 − i/100)^1.6) + randInt(−20, 20))`; `over = clamp(round(48 + 40 · fame/1800) + randInt(−4, 4), overFloor 40, overCeil 92)`; `stats` zeradas; nome = combinação única de `FRIENDLY_BOT_NAME_PARTS` (prefixo + lugar), embaralhada pelo mesmo seed. Referências: top ≈ 1800, 10º ≈ 1550, 50º ≈ 610, 100º ≈ 10. Usuário começa em 0 (posição 101) com `stats` zeradas. As estatísticas começam zeradas para todos: a tabela "começa a temporada" junto com o usuário e os bots acumulam jogos pela evolução simulada.

**Nomes**: `FRIENDLY_BOT_NAME_PARTS = { prefixes: [10 itens], places: [≥ 20 itens] }` com lugares inventados, ex.: prefixos `Atlético`, `Esporte Clube`, `União`, `Grêmio Esportivo`, `Sociedade Esportiva`, `Associação`, `Racing`, `Sport Club`, `Real`, `Independente`; lugares `Pedra Funda`, `Vila Aurora`, `Lagoa Serena`, `Morro Azul`, `Campina Alta`, `Barra do Vento`, `Ribeira Dourada`, `Serra Velada`, `Porto Esmeralda`, `Vale Sereno`, `Alto do Ipê`, `Mata Funda`, `Cachoeira Mansa`, `Areia Branca do Sul`, `Bosque das Garças`, `Ilha Verde`, `Pontal da Brisa`, `Colina Rubra`, `Várzea Grande do Leste`, `Recanto do Sabiá` (o lugar `Bosque Real` virou `Bosque das Garças`: com o prefixo `Real` geraria "Real Bosque Real"). A tarefa confere contra `docs/catalogo-nomes-ficticios.md` e `TEAM_ID_BY_NAME` (sem repetir nome de clube da liga nem de clube real). Escudo: `getTeamIdentity(name)` (cai no `fallbackIdentity`, determinístico pelo nome).

**Evolução dos bots** (`simulateBots`, chamada por `provider.refresh(now)` ao abrir `/friendlies`):
`steps = min(72, floor((now − botsSimAt) / 1h))`; `botsSimAt += floor((now − botsSimAt)/1h) · 1h` (o excedente acima de 72 passos é descartado, o resto de tempo fica). Sem passo a dar (`steps ≤ 0`), devolve **o mesmo array** (sem cópia: a store não troca `bots` e nada reativo dispara à toa) e `simAt` só muda se o relógio voltou (`now < botsSimAt` → `now`). Em cada passo, para cada bot, **um jogo simulado**:
- `alvo = max(fameMinStart, (over − 48) / 40 · 1800)` (piso: bot de OVER interno baixo não afunda até 0 e fica preso lá);
- `Δ = randInt(−6, 6) + randInt(−6, 6) + round((alvo − fame) · 0.03)`;
- resultado coerente com a fama: `Δ > simDrawBand (1)` → vitória; `Δ < −1` → derrota; senão empate (variação de fama de −1 a +1, como o empate do Elo, que é pequeno). Com o ruído de ±6+±6, dá cerca de 22% de empates;
- placar plausível (`simScore`): vitória `gf = randInt(1, simWinGoalsMax 4)`, `ga = randInt(0, gf − 1)`; derrota é o espelho; empate `g = randInt(0, simDrawGoalsMax 2)` para os dois;
- `fame = max(0, fame + Δ)`; `stats = addResult(stats, gf, ga)`.
O `over` interno dos bots não muda. Resultado: ranking se mexe algumas posições por hora, sem deriva infinita (puxão de volta ao alvo), e cada bot soma 1 jogo por hora simulada (até 72 por abertura da tela).

## 7. UI/UX

**FriendliesView** (`/friendlies`), de cima para baixo:
1. `TokenBar`: 10 fichas (cheias/vazias), "Próxima ficha em mm:ss" (some com 10/10). Contador lê `club.clubNow` (já atualizado a cada 1 s).
2. Cartão do usuário: fama, posição `#n de 101`, OVER do amistoso (energia 100), bônus de posição atual.
3. Ação: botão "Desafiar" (sempre ativo). Desabilitado com motivo apenas se houver amistoso ao vivo ("Acompanhar amistoso" leva para `/match`) ou `friendlyEligibleCount < 11` ("São precisos 11 atletas sem lesão e sem suspensão"). Se já houver opções sorteadas, "Desafiar" não sorteia: mostra as opções salvas. (Revisão do bloco 8-13) Com partida de outra competição ao vivo, sortear continua possível, mas o "Jogar" dos cartões fica desabilitado com o rótulo "Outra partida ao vivo" e, abaixo do botão "Desafiar", aparece o motivo completo de `friendlyLiveBlock()` em vermelho. O "OVER do amistoso" do cartão do usuário mostra o OVER efetivo (`friendlyStrength.over`) com a legenda "energia 100 • melhor escalação".
4. `OpponentRoulette` + 3 `OpponentCard` + botão "Re-sortear" com "Sorteios restantes: N" ao lado (N = `drawsLeft`; 2 logo depois do 1º sorteio). Com N = 0 o botão fica desabilitado e o aviso vira "Sem sorteios restantes: escolha um dos 3 adversários".
5. `FriendlyRanking`: tabela de classificação no mesmo formato da tabela da liga (`LeagueView.vue`), com **Fama no lugar de P**: colunas `# · Clube · Fama · J · V · E · D · GP · GC · SG` (SG com sinal, verde se ≥ 0 e vermelho se < 0, como na liga). Top 10 + linha do usuário destacada embaixo, separada por uma linha "…", quando ele está fora do top 10; se está no top 10, só a tabela (linha dele destacada no lugar). Legenda do critério no cabeçalho: "Fama • V • SG • GP". Em telas estreitas a tabela rola na horizontal dentro do cartão (`overflow-x-auto`, `min-w-[460px]`) com a coluna Clube fixa (`sticky left-0`), igual à liga; a página não rola na horizontal.
6. `FriendlyHistory` (últimos 20: rival, placar, fama ±, prêmio).

**Roleta**:
- O resultado é calculado e salvo na store **antes** da animação (a animação é só visual; recarregar no meio mostra as opções já sorteadas).
- 3 slots lado a lado (≥ 640 px) ou empilhados (mobile). Cada slot rola nomes de bots e OVERs aleatórios em torno da estimativa da opção (troca a cada 60 ms, desacelerando), e para em sequência: 900 ms, 1300 ms, 1700 ms. Ao parar, o slot vira o `OpponentCard` com um "pop" (`animate-pop` existente) e brilho dourado.
- `prefers-reduced-motion: reduce` → revela as 3 na hora.
- Durante a animação, "Re-sortear" e "Jogar" ficam desabilitados. Re-sortear repete a animação e consome 1 dos 3 sorteios.

**OpponentCard**: escudo, nome, posição `#n`, fama, **"OVER estimado"** (rótulo explícito, com `~` antes do número) com selo de diferença (`+3` em vermelho se mais forte, `−2` em verde se mais fraco), "Prêmio: R$ 18.000" (ou "R$ 0 — limite diário de vitórias pagas atingido"), "Fama: +19 / +4 / −11" (V/E/D), nota curta "Estimativa com a melhor escalação disponível; os valores são fixados no apito inicial." e botão "Jogar (1 ficha)". Todos os números vêm de `friendlies.quote(opção, squad.friendlyStrength.over, agora)` (OVER efetivo, revisão do bloco 8-13) e só mudam quando muda o elenco elegível ou quando a escalação montada à mão supera a melhor calculada. Selo de diferença contra o OVER efetivo. Sem ficha: botão desabilitado com "Sem fichas — próxima em mm:ss".

**PreMatch do amistoso**: OVER do rival (cabeçalho/barra de força), "Prêmio da Vitória" e "Fama em Jogo" mostram a cotação recalculada com o OVER efetivo (`quote(opção, friendlyStrength.over, agora)`), com a legenda "Estimativa: fixado no apito inicial"; piorar a escalação em "Ajustar Tática" não baixa nenhum dos três (piso da melhor escalação elegível); eles só mudam quando muda o elenco elegível (lesão, suspensão, contratação, empréstimo) ou quando a escalação montada à mão supera a melhor calculada. Se `best > current + 0.5`, aviso âmbar: "Sua escalação (OVER X) está abaixo da melhor possível (OVER Y). O rival, o prêmio e a fama são calculados pela mais forte." Com outra partida ao vivo, aviso vermelho com o texto de `friendlyLiveBlock()` e "Iniciar" desabilitado.

**Fluxo**: "Jogar" → `friendlies.select(botId)` → `prepareMatch('friendly')` → PreMatch (tática, escalação, estimativa) → "Iniciar" gasta a ficha e zera os sorteios → MatchView → PostMatchSummary (bloco do amistoso) → "Voltar aos Amistosos" → `/friendlies` com novas opções vazias (precisa desafiar de novo, com 3 sorteios). Voltar do PreMatch sem iniciar mantém as 3 opções e o contador; pode escolher outra das 3.

**Navegação**: item "Amistosos" (ícone `Swords` do `lucide-vue-next`) na Sidebar e no menu "+" da BottomNav, badge com o número de fichas.

**BottomNav (decisão do dono: 4 itens + "+")**. Ordem: **Início · Liga · [+] · Copas · Elenco**.
- Principais (`primary: true`): `dashboard` (Início), `league` (Liga), `competitions` (Copas), `squad` (Elenco). São as telas de uso diário: Liga e Copas têm partida (indicador "ao vivo" e retorno ao pré-jogo via `sectionMemory`), Elenco é a escalação de todo jogo (badge de propostas), Início é a home.
- No "+" (`primary: false`): Amistosos, Scouting, Partidas, Clube, na ordem de `navItems`.
- O "+" (ícone `Plus`, rótulo "Mais") abre `BottomNavMore`: painel que sobe da base, acima da BottomNav, com os itens secundários (ícone, rótulo completo, badge, ponto "ao vivo"). Fecha ao escolher item, ao tocar fora, com `Esc` e ao trocar de rota.
- Acessibilidade: "+" com `aria-label="Mais opções"`, `aria-expanded` e `aria-controls`; painel com `role="dialog"` e `aria-label="Mais opções de navegação"`; foco vai ao primeiro item ao abrir e volta ao "+" ao fechar; alvos de toque com pelo menos 48 px.
- Estado do "+": dourado (`text-gold`) se o item ativo estiver no menu; ponto "ao vivo" se algum item do menu tiver partida ao vivo (ex.: amistoso rodando); badge "!" se algum item do menu tiver badge, exceto as fichas de amistoso (senão o "+" ficaria sempre marcado).
- Cabe em 360 px: 5 colunas (`grid-cols-5`, cerca de 72 px cada), sem rolagem horizontal; o painel ocupa a largura com 16 px de margem.

## 8. Erros e casos de borda

| Caso | Comportamento |
|---|---|
| Sem fichas | Sortear pode; "Jogar" e "Iniciar" desabilitados com contador; `beginMatch` devolve `false` como rede de segurança. |
| Elenco com < 11 elegíveis | "Desafiar" desabilitado com aviso; `lineupBlockers('friendly')` também bloqueia "Iniciar". |
| Titular lesionado/suspenso no PreMatch | `fixLineupFor` troca pelo melhor reserva elegível; se ainda sobrar, aviso e "Iniciar" bloqueado. |
| Recarregar a página no PreMatch do amistoso | (Tarefa 20) `options`/`selectedBotId` e `prematchCompetition: 'friendly'` estão no save: o PreMatch do amistoso reabre com o mesmo rival e o mesmo contador de sorteios. Nada foi gasto. Até a Tarefa 18 voltava ao pré-jogo da liga. |
| Recarregar no PreMatch de uma copa | (Tarefa 20) Reabre o pré-jogo da mesma copa se `isCompetitionPlayable(comp)`; item "Copas" ativo na navegação. |
| Save antigo sem `prematchCompetition` | Pré-jogo da liga (padrão), sem erro nem aviso. |
| `prematchCompetition` inválido (objeto, número, texto desconhecido, estado de partida colado à mão) | Ignorado: pré-jogo da liga. Nunca vira sessão de partida. |
| Copa salva que deixou de ter partida entre sessões (eliminado, campeão, supercopa já jogada, save editado) | Pré-jogo da liga, sem aviso. |
| Amistoso salvo sem adversário escolhido (opções esgotadas pelo apito, `selectedBotId` nulo) | Pré-jogo da liga; em `/friendlies` o estado do sorteio continua como estava. |
| Amistoso órfão (apito dado, save ao vivo perdido) | `beginMatch` já limpou `options`/`selectedBotId`, e `active` ainda está presente na carga: `friendlyReady` é falso → pré-jogo da liga. Depois `resolveOrphan(false)` limpa `active`, toast de interrompido, ficha não volta (regra já existente). |
| Amistoso ao vivo salvo | Na carga `active` está presente → a carga põe a liga; `restoreLiveMatches` retoma a sessão `friendly` e abre `/match` (a partida ao vivo manda). |
| Pré-jogo de copa ou amistoso exibido e outra competição ao vivo | `restoreLiveMatches` abre `/match` na competição ao vivo (o `active` do save ao vivo não está entre as retomadas, cai na primeira retomada). O pré-jogo salvo não reaparece sozinho; o usuário volta a ele pela seção (Copas/Amistosos) como antes. |
| Troca de competição no `MatchSwitcher` (ou pela navegação, ou fim de partida) | A troca muda `activeMatchCompetition`, o `watch` do `App.vue` grava; recarregar volta à última competição exibida (validada como acima). Se era uma partida ao vivo, ela é retomada pelo save ao vivo; se ficou só o pré-jogo, ele volta se ainda for válido. |
| Recarregar no resumo pós-jogo (partida encerrada, ainda não fechada) | O save ao vivo não guarda partida encerrada (comportamento existente: o resumo se perde). Amistoso: `active` já foi limpo e não há opção → liga. Copa: se a copa tem a próxima partida, abre o pré-jogo dela; senão, liga. |
| Ficha zerada no PreMatch do amistoso e recarregar | Volta ao PreMatch do amistoso com "Iniciar" desabilitado e o contador (a ficha não é critério de validade). |
| Recarregar no meio da partida | `restoreLiveMatches` retoma a sessão `friendly` (como as outras); `active` está no save. Resultado normal no fim. |
| Partida perdida (live save corrompido ou ausente, mas `active` presente) | `resolveOrphan(false)` no boot: limpa `active`, ficha não volta, fama e dinheiro não mudam; toast "O amistoso anterior foi interrompido e não contou." |
| Sair da tela durante o amistoso | Partida segue (timer por competição, como hoje); ponto "ao vivo" no item Amistosos (Sidebar e menu "+") e no botão "+" da BottomNav. |
| 3 sorteios usados | "Re-sortear" desabilitado com "Sorteios restantes: 0"; só resta "Jogar" numa das 3 opções. `draw()` recusa como rede de segurança. |
| Sair e voltar, ou recarregar, para ganhar sorteios | Não funciona: `drawsUsed` está no save e só zera em `beginMatch`. |
| Partida órfã (`resolveOrphan(false)`) | `drawsUsed` já foi zerado no `beginMatch`; o próximo desafio tem 3 sorteios. |
| Tentar novo sorteio com amistoso ao vivo | Bloqueado: botão vira "Acompanhar amistoso". |
| Empate | Fama `±` até 6 (pode ser 0), R$ 0. |
| Fama mínima | `max(0, …)` para usuário e bots; derrota com fama 0 fica em 0. |
| Lesão no amistoso sem reserva elegível | Mecânica atual: segue em campo e agrava no fim (`applyFriendlyInjuries`). |
| Expulsão do goleiro | Mecânica atual (`keeperOff`), sem suspensão depois. |
| Relógio do sistema voltado | `tokenTickAt`/`botsSimAt` limitados a `now`; nenhum ganho negativo. |
| Fim de temporada (`applyEndOfSeason`) | Não afeta amistosos (fama, fichas e bots continuam). |
| Limite diário | Virada de `dayStart` zera `paidWins.count`; opções sorteadas antes da virada recalculam o prêmio no `beginMatch`. |
| Sortear com reservas fracos e jogar com o time forte | Não rende rival fraco: a opção guarda só o `offset`; `beginMatch` recalcula `oppOver` com o OVER do apito, e prêmio e fama saem desse `oppOver`. O cartão e o PreMatch avisam que os valores são estimativa. |
| Apitar com escalação fraca (fora de posição ou reservas) e corrigir ao vivo | Não rende rival fraco: o OVER do apito é o efetivo `max(atual, melhor elegível)`, ambos com energia 100. Reorganizar ou trocar ao vivo não muda o rival já fixado, que já é o da melhor escalação. |
| Melhor escalação com atleta lesionado, suspenso ou emprestado | Fora da conta: `isFriendlyEligible` exclui os três (lesionado bloquearia o apito de qualquer jeito). |
| Elenco cansado | OVER efetivo, rótulos da gaveta ("OVER x → y na vaga"), "Reorganizar" e "Recomendar" ignoram o cansaço no amistoso; "Recomendar" não desempata por energia. |
| Falha ao abrir `/match` depois do apito | `abortStart` desfaz o apito (`cancelBegin`): a ficha volta, as 3 opções, a seleção e o contador de sorteios voltam como estavam, `active` fica vazio; `saveGame()` e `saveLiveMatch()`. O usuário continua no PreMatch e pode tentar de novo. |
| Recarregar depois de um apito que falhou e não foi desfeito | Regra de órfão (`resolveOrphan(false)` no boot): ficha não volta. O desfazer só existe na mesma sessão (o estado de antes do apito fica só em memória). |
| `beginMatch` recusado | Motivo próprio (`active`, `no-option`, `invalid-over`, `no-token`) e toast correspondente; nada é gasto. |
| `concludeMatch('friendly')` sem desafio gravado (chamada repetida ou desafio já desfeito) | Nada é aplicado: sem agravar lesão, sem fama, sem prêmio; o resumo existente fica; sem resumo, entra um neutro com toast "Este amistoso não contou: o desafio já tinha sido encerrado.". |
| Partida de liga ou copa ao vivo | Amistoso bloqueado (regra 11): "Jogar", "Iniciar", `prepareMatch` e `startLiveMatch` recusam com "Há uma partida da {competição} ao vivo. Termine-a antes de jogar um amistoso."; sortear continua livre. |
| Amistoso ao vivo e o usuário inicia liga ou copa | Permitido (a decisão só bloqueia o início do amistoso). A energia congela por causa da outra partida. |
| Só um amistoso ao vivo, tela do Elenco | O aviso de recuperação natural mostra o contador normal, não "pausada" (mesmo critério do ticker). |
| Empate de fama no ranking | Desempate pela regra da liga: vitórias → saldo → gols pró; empate total favorece o usuário; entre bots, nome e depois `id`. |
| Derrota com fama baixa | Usuário com fama 5 perdendo 15 vai a 0; o bot ganha só 5 (o aplicado). |
| Bot de OVER interno baixo | Alvo da simulação nunca abaixo de `fameMinStart` (10): não afunda a 0 e fica lá. |
| Save com `NaN`/`undefined` em fichas ou estatísticas | `fromSave` e as funções de fichas saneiam com `Number.isFinite`; estatísticas inválidas viram 0. |

## 9. Estratégia de testes

- `package.json` não tem test runner (só `dev`, `build`, `preview`). **Não será adicionado** (evita mexer em `package.json`). O portão é `npm run build` (`vue-tsc && vite build`), obrigatório em toda tarefa.
- As regras ficam em funções puras em `src/utils/friendlies/*` (sem Pinia, sem `Date.now()` nem `Math.random()` internos: recebem `now` e `rng`), prontas para Vitest se o dono aprovar um runner no futuro.
- Verificação manual por tarefa (no `npm run dev`), registrada no commit quando relevante:
  1. Fichas: gastar 3, conferir contador; ajustar `tokenTickAt` no localStorage para 30 min atrás e recarregar → +5.
  2. Energia: elenco com energia baixa → OVER do amistoso igual ao de energia 100; energia inalterada depois do jogo.
  3. Lesão no amistoso aparece no Elenco e tira o atleta da liga; amistoso não desconta lesões antigas.
  4. Cartões não geram suspensão; estatísticas de temporada e `matchHistory` não mudam.
  5. Fama: vitória/empate/derrota batem com a tabela de exemplos; fama não fica negativa.
  5b. Farm de OVER: escalar reservas ou titulares fora de posição e abrir `/friendlies` e o PreMatch → o OVER estimado do rival, o prêmio e a fama em jogo **não** caem (piso da melhor escalação elegível) e o PreMatch mostra o aviso "abaixo da melhor possível"; iniciar assim e usar "Reorganizar" ao vivo → fama e prêmio no fim batem com os valores mostrados antes do apito. Lesionar ou suspender (editando o save) o melhor atleta → o OVER efetivo cai, porque ele deixa de ser elegível. Checagem automática: `node scripts/verify-friendlies/run.mjs strength`.
  5c. Ranking: colunas Fama, J, V, E, D, GP, GC, SG; depois de um amistoso, J/V/E/D/GP/GC do usuário e do rival mudam; reabrir a tela horas depois aumenta o J dos bots.
  6. Recarregar no meio da partida retoma; apagar `super_xi_live_match_v1` e recarregar → toast de interrompido.
  7. Save antigo (sem `friendlies`) carrega com estado novo; nova carreira zera amistosos.
  8. Roleta com `prefers-reduced-motion` revela na hora; layout em 360 px sem rolagem horizontal.
  9. Sorteios: Desafiar + 2 re-sorteios → botão desabilitado com "Sorteios restantes: 0"; sair, recarregar e voltar → continua 0 com as mesmas opções; iniciar a partida → próximo desafio volta a 3.
  10. Reputação: `club.reputation` igual antes e depois de vitória/derrota no amistoso; partida de liga não muda a fama.
  11. BottomNav em 360 px: 4 itens + "+", sem rolagem; "+" abre e fecha (toque fora, `Esc`, escolher item), foco volta ao "+"; ponto "ao vivo" no "+" com amistoso rodando.
  12. (Revisão do bloco 8-13) Gaveta no amistoso com elenco cansado (energia < 60): o rótulo "OVER x → y na vaga" não desconta os 3 de cansaço; "Recomendar" não prefere o reserva descansado só pela energia; "Reorganizar" compara forças sem cansaço.
  13. (Revisão do bloco 8-13) Elenco com só um amistoso ao vivo: aviso "Recuperação natural: ... próximo ponto em m:ss" (não "pausada"); com partida de liga ao vivo: "pausada".
  14. (Revisão do bloco 8-13) Partida de liga ao vivo (rodando ou na gaveta): em `/friendlies`, "Jogar" desabilitado com "Outra partida ao vivo" e o motivo completo abaixo de "Desafiar"; sortear funciona; PreMatch do amistoso com "Iniciar" desabilitado e aviso vermelho. Encerrada a partida de liga, tudo volta a funcionar. Amistoso rodando e iniciar uma partida de liga → permitido.
  15. (Revisão do bloco 8-13) Desfazer o apito, motivos de `beginMatch`: `node scripts/verify-friendlies/run.mjs store` (a falha de rota não é reproduzível à mão sem mexer no código).
  16. (Revisão do bloco 8-13) PreMatch do amistoso com titular lesionado: aviso "está lesionado ou suspenso" (nunca "suspenso na Amistoso"); com menos de 11 titulares: "Iniciar" desabilitado e aviso "Escalação incompleta".
  17. (Tarefa 20) Pré-jogo ao recarregar: no PreMatch do amistoso, recarregar → mesmo PreMatch, mesmo rival, ficha e sorteios iguais; no PreMatch de uma copa com partida pendente, recarregar → mesmo PreMatch; `prematchCompetition` apagado, `"xyz"`, `{}` ou uma copa encerrada no save → PreMatch da liga sem erro; amistoso órfão → toast de interrompido e "Partidas" abre o PreMatch da liga; partida de liga ao vivo com PreMatch de copa exibido → recarregar retoma a liga. Checagem automática: `node scripts/verify-friendlies/run.mjs prematch`.

## 10. Tarefas (uma tarefa = um commit, na ordem)

1. `feat(amistosos): config e tipos` — `src/config/friendlies.ts`, `src/types/friendlies.ts`, reexports.
2. `feat(amistosos): funcoes puras de fichas` — `utils/friendlies/tokens.ts`.
3. `feat(amistosos): funcoes puras de fama elo` — `utils/friendlies/fame.ts`.
4. `feat(amistosos): sorteio, bonus de posicao e premio` — `utils/friendlies/draw.ts`.
5. `feat(amistosos): geracao e simulacao dos bots` — `utils/friendlies/bots.ts` + nomes conferidos contra o catálogo.
6. `feat(amistosos): provedor local de adversarios` — `utils/friendlies/localBotProvider.ts`.
7. `feat(amistosos): store de amistosos com save` — `stores/friendlies.ts` (incl. `drawsUsed` e `draw()` com limite de 3, zerado em `beginMatch`) + `usePersistence` (save/load/clear) + `resolveOrphan` no `App.vue`.
7b. Tarefa 6b do plano, correções da revisão do lote 1-7 (offset do rival, ranking como tabela com estatísticas, fama soma zero, piso do alvo, saneamento, contrato do `rng`, checagens), em 4 commits `fix(amistosos): ...` (ver plano).
8. `feat(amistosos): recarga de fichas no ticker` — `useScouting` (fichas e energia sem congelar no amistoso).
9. `feat(partida): competicao friendly no tipo e nas sessoes` — `MatchCompetition`, `sessions`, `COMPETITIONS_ORDER`, `COMP_SHORT`, `isSuspendedFor`/`ORDER`, `COMPETITION_NAMES`, `MatchSwitcher.NAMES`, `sectionMemory`.
10. `feat(partida): forca do time sem cansaco` — opção `ignoreFatigue` em `calculateTeamStrength`, `squad.freshTeamStrength`, `friendlyEligibleCount`.
11. `feat(partida): fluxo do amistoso na simulacao` — 4.4 até o apito (`rawOpponentFor`, `rawLabelFor`, `userBaseRating`, `lineupBlockers`, `prepareMatch`, `startLiveMatch` com `beginMatch`).
12. `feat(partida): regras ao vivo do amistoso` — `credit()` nos gols/assistências, `rollLiveInjury`, `needsShootout`, `SubstitutionDrawer`.
13. `feat(partida): encerramento do amistoso` — ramo de `concludeMatch`, `applyFriendlyInjuries`, `friendlies.settle`, `finishMatchAndReturn`.
13b. Tarefa 13b do plano, correções da revisão do bloco 8-13 (OVER efetivo pela melhor escalação elegível, desfazer o apito em `abortStart`, `beginMatch` com motivo, `concludeFriendly` idempotente, gaveta sem cansaço, aviso de recuperação no Elenco, bloqueio do amistoso com outra partida ao vivo), em 3 commits `fix(amistosos): ...` (ver plano).
14. `feat(partida): pre-jogo e resumo do amistoso` — `PreMatch.vue` e `PostMatchSummary.vue`.
15. `feat(amistosos): tela, fichas, ranking e historico` — `FriendliesView` (incl. "Sorteios restantes" e re-sortear desabilitado em 0), `TokenBar`, `FriendlyRanking`, `FriendlyHistory`, `OpponentCard`, rota.
16. `feat(amistosos): roleta animada` — `OpponentRoulette` (incl. reduced motion).
17. `feat(amistosos): navegacao, subtitulo e cabecalho` — item Amistosos em `useNavigation`, `usePageSubtitle`, `useHeaderStats` (fama só em `/friendlies`).
18. `feat(layout): bottomnav com 4 itens e menu +` — `primary`/`primaryNavItems`/`moreNavItems` em `useNavigation`, `BottomNav.vue` em 5 colunas, `BottomNavMore.vue` acessível (`aria-expanded`, `role="dialog"`, `Esc`, foco), conferida em 360 px.
20. `feat(partida): pre-jogo de copa e amistoso sobrevive a recarregar` — regra 13: `src/utils/match/prematchMemory.ts`, `scripts/verify-friendlies/prematch.check.ts`, `run.mjs`, `usePersistence` (grava e restaura `prematchCompetition`), `watch` no `App.vue`. Executada **antes** da 19 (a numeração segue a ordem em que foi pedida).
19. `chore(amistosos): verificacao manual e ajustes` — roteiro da seção 9 (inclui o item 17), só correções. Última tarefa; depende da 20.

## 11. Decisões

### Confirmadas pelo dono do produto

- **Fama separada da reputação**: fama (PvP dos amistosos) e `club.reputation` (treinador/jogador; sobe na liga e com upgrades, alimenta header e ranking de treinadores) são independentes. Amistoso nunca mexe em `club.reputation`; nenhuma outra competição mexe na fama. A fama só aparece na tela de Amistosos (e no resumo pós-jogo do amistoso).
- **Até 3 sorteios por desafio**: esgotados, é obrigatório escolher uma das 3 opções do último sorteio. A UI mostra "Sorteios restantes" e desabilita "Re-sortear" em 0.
- **BottomNav com 4 itens principais + botão "+" central** que abre as demais opções (inclusive Amistosos).
- **Revisão do lote 1-7 (2026-11-19)**:
  - Brecha de farm fechada: a opção guarda o deslocamento do rival (`offset`), não o OVER absoluto; no apito `oppOver = clamp(round(OVER do apito + offset), 35, 99)` e prêmio e fama são recalculados; cartão e PreMatch mostram estimativa com o OVER do momento, marcada como tal.
  - Ranking como tabela de classificação com a regra de ordenação da liga, fama no lugar dos pontos (fama → vitórias → saldo → gols pró); usuário e bots com estatísticas de amistoso; a evolução simulada dos bots gera jogos com resultado e placar coerentes com a variação de fama.
  - Fama soma zero pelo delta aplicado ao usuário; piso `fameMinStart` no alvo da simulação dos bots; saneamento com `Number.isFinite` em fichas e `fromSave`; contrato `[0, 1)` do `Rng` com clamp; `FRIENDLIES` só leitura; `simulateBots` sem array novo quando não há passo; checagens determinísticas (bots com semente, bot de fama 2 montado à mão, usuário em 1º, janela crescente, desempate).

- **Revisão do bloco 8-13 (2026-11-19)**:
  - Brecha de farm da escalação fraca fechada: no apito `userOver = max(OVER da escalação atual, OVER da melhor escalação elegível)`, ambos sem cansaço; elegível = sem lesão, sem suspensão, não emprestado. Rival, prêmio e fama dependem dessa força; o PreMatch e os cartões usam o mesmo cálculo.
  - Falha ao abrir a partida depois da ficha gasta: o apito é desfeito (ficha devolvida, `active` limpo) e o jogo salvo; `beginMatch` devolve o motivo da recusa para o toast certo. A regra "save ao vivo perdido não devolve ficha" continua valendo para órfãos.
  - `concludeFriendly` idempotente: sem `active`, não aplica lesões nem sobrescreve o resumo.
  - Ferramentas da gaveta sem cansaço no amistoso (reorganizar, recomendar, rótulo de OVER na vaga), sem desempate por energia.
  - Aviso de recuperação natural do Elenco com o mesmo critério do ticker (amistoso não pausa).
  - Amistoso bloqueado enquanto outra partida (não amistosa) está ao vivo.

- **Persistência do pré-jogo (Tarefa 20, 2026-11-19)**: recarregar a página no pré-jogo volta ao mesmo pré-jogo **no amistoso e nas copas** (copa, continental, supercopa, recopa), se a competição ainda tiver partida a jogar; senão, liga. A liga é o padrão. Partida ao vivo salva continua mandando. Substitui o "comportamento aceito" do ajuste 9 do plano (voltar ao pré-jogo da liga).

### Tomadas nesta spec (não vinham do dono)

- O contador de sorteios zera só ao iniciar a partida (`beginMatch`), não ao sair da tela, e fica no save (anti-farm de re-sorteio).
- Itens principais da BottomNav: Início, Liga, Copas, Elenco; no "+": Amistosos, Scouting, Partidas, Clube.
- Ficha é gasta no apito inicial; sortear não exige ficha.
- Limite de 5 vitórias pagas por dia (parametrizável, 0 desliga) para conter farm: com 10 fichas/hora, 25k por vitória superaria a renda líquida de um jogo da Série D.
- Amistoso não desconta lesões nem suspensões existentes e não credita estatísticas, evolução ou marcos (anti-farm).
- Amistoso não entra em `matchHistory`; histórico próprio de 20.
- O Elo usa a diferença de OVER (não de fama); o `over` interno do bot só serve à simulação do ranking e não é exibido.
- Opções vêm de bots a até ±15 posições do usuário.
- Partida perdida por save ao vivo corrompido não devolve a ficha nem conta resultado.
- Sem test runner novo; sem migração numerada (campo aditivo no save v7).
- (Revisão do lote 1-7) Estatísticas de todos começam zeradas, inclusive as dos 100 bots gerados e as de bots de saves antigos: não se inventa histórico; a tabela "começa a temporada" com o usuário.
- (Revisão do lote 1-7) Um passo da simulação = um jogo por bot; empate quando a variação de fama fica em [−1, +1] (≈ 22% dos jogos); placares de 0 a 4 gols por lado.
- (Revisão do lote 1-7) Empate total no ranking continua favorecendo o usuário, agora só depois dos quatro critérios da liga; entre bots o último desempate é nome (`pt-BR`) e depois `id`.
- (Revisão do lote 1-7) `FriendliesSave.v` continua `1`: campos novos com padrão seguro; opções sorteadas no formato antigo são descartadas na carga (só saves de desenvolvimento).
- (Revisão do lote 1-7) A opção não guarda mais prêmio nem fama em jogo (ficariam velhos): tudo sai de `quoteOption` com o OVER do momento. `draw()` deixa de receber `userOver` (o sorteio só depende da posição).
- (Revisão do lote 1-7) `FRIENDLIES` fica só leitura por tipo (`DeepReadonly`), não por `as const`: `as const` transformaria os números em literais (`15`, `5`…) e quebraria contas como `let size = rankWindow; size += grow`. `FRIENDLY_BOT_NAME_PARTS` usa `as const`.
- (Revisão do bloco 8-13) A melhor escalação é procurada em **todas as formações**, não só na atual, porque "Reorganizar" ao vivo também troca de formação; a heurística é a de `pickBestLineup` (gulosa por vaga), com folga residual aceita (§6).
- (Revisão do bloco 8-13) O cálculo mora numa função pura nova, `src/utils/friendlies/strength.ts` (testável pelo verificador), exposta pela store como `squad.friendlyStrength`; `pickBestLineup` ganha o parâmetro `opts` (padrão inalterado).
- (Revisão do bloco 8-13) `estimateOutcome` no PreMatch continua com a força real em campo (`current`), não com o OVER efetivo: a chance de vitória reflete o time que o motor usa.
- (Revisão do bloco 8-13) Desfazer o apito restaura exatamente o estado de antes de `beginMatch` (fichas, `tokenTickAt`, opções, seleção, contador), guardado só em memória (`cancelBegin`). Assim a falha de rota não dá sorteios grátis nem tira a opção escolhida. Depois de recarregar, vale a regra de órfão.
- (Revisão do bloco 8-13) `abortStart` passa a chamar `saveLiveMatch()` em todas as competições (antes a sessão abortada ficava no save ao vivo e voltava ao recarregar).
- (Revisão do bloco 8-13) Com outra partida ao vivo, o sorteio continua liberado; só "Jogar"/"Iniciar" bloqueiam. O inverso (liga ou copa com amistoso rodando) segue permitido. **Ponto para o dono confirmar**: nesse caso inverso a escalação continua compartilhada e um lesionado que fique em campo nas duas agrava duas vezes.
- (Revisão do bloco 8-13) `concludeFriendly` sem desafio grava, se não houver resumo, um resumo neutro de amistoso (zeros), para a tela pós-jogo ter o botão de saída.
- (Tarefa 20) O campo salvo é `activeMatchCompetition` inteiro (a competição exibida), não "só quando a rota é `/pre-match`": dentro da sessão essa competição já sobrevive à navegação (o atalho "Partidas" e os avisos de suspensão do Elenco usam ela), e recarregar passa a repetir isso. A validação na carga é o que impede voltar a uma competição sem partida.
- (Tarefa 20) Validade da copa = `competitions.isCompetitionPlayable` (o mesmo critério de `prepareMatch`/`goToMatchTab`), sem critério novo. Validade do amistoso = opção escolhida e sem `active`; ficha zerada não invalida.
- (Tarefa 20) Campo na raiz do save principal (`prematchCompetition`), sem migração numerada e sem tocar no `LIVE_MATCH_KEY`; leitura por função pura (`src/utils/match/prematchMemory.ts`) testada pelo verificador dos amistosos (`prematch`), sem criar `scripts/verify-prematch`.
- (Tarefa 20) Gravação imediata por `watch` no `App.vue` (um ponto só cobre `prepareMatch`, `MatchSwitcher`, navegação, `finishMatchAndReturn`, `useFriendlies.watchLive`), em vez de `saveGame()` espalhado por cada lugar que troca a competição.
- (Tarefa 20) Na carga, a restauração só acontece sem partida ao vivo na memória (protege o import de código de carreira com partida rodando). `sectionMemory` continua só em memória: depois de recarregar, o `afterEach` da navegação inicial registra a seção certa, e as outras seções começam sem memória (como hoje).
