import { computed, reactive } from 'vue'
import { router } from '@/router'
import { useClubStore } from '@/stores/club'
import { useCompetitionsStore } from '@/stores/competitions'
import { useLeagueStore } from '@/stores/league'
import { useMarketStore } from '@/stores/market'
import { useMatchStore } from '@/stores/match'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import { useFriendliesStore } from '@/stores/friendlies'
import { formatTokenCountdown } from '@/utils/friendlies/tokens'
import type { FormationName, LiveMatchEvent, MatchCompetition, MatchEventType, MatchOpponent } from '@/types/match'
import { LIVE_MATCH_KEY } from '@/config/storage'
import { COMP_SHORT, isSuspendedFor } from '@/utils/player/suspension'
import { COMPETITIONS_ORDER } from '@/stores/match'
import type { Player, PlayerAttributes } from '@/types/player'
import { calculateTeamStrength, getEffectiveOvr } from '@/utils/match/calculateTeamStrength'
import { evolutionFactor, FORMATIONS, INJURY, MATCH_SIM, POSITION_KEY_FOCUS, PROGRESSION, progressionAgeFactor, STAFF_BONUS } from '@/config'
import { refreshPlayerEconomy } from '@/utils/player/generatePlayer'
import { checkMilestones } from '@/utils/club/progression'
import {
  brawlCalmLine,
  brawlLine,
  brawlReaction,
  cornerLine,
  freeKickGoalLine,
  gkEmergencyLine,
  gkSubLine,
  freeKickLine,
  freeKickResultLine,
  fullTimeLine,
  fullTimeReaction,
  goalLine,
  goalReaction,
  halfTimeLine,
  halfTimeReaction,
  keeperDefends,
  offTargetLine,
  offsideLine,
  oppKeeperOffLine,
  ownGoalLine,
  postLine,
  postReaction,
  throwInLine,
  penaltyAwardLine,
  penaltyAwardReaction,
  penaltyHandballLine,
  penaltyMissLine,
  penaltyMissReaction,
  redCardLine,
  reorganizeLine,
  redReaction,
  resetNarration,
  saveReaction,
  savedLine,
  shootoutEndLine,
  shootoutKickLine,
  shootoutStartLine,
  stoppageLine,
  yellowCardLine,
  yellowReaction
} from '@/utils/match/narration'
import { shootoutStatus } from '@/utils/match/penaltyShootout'
import { shootoutConversions } from '@/utils/bracket/bracket'
import { clamp, pickRandom, randInt } from '@/utils/core/random'
import { usePersistence } from './usePersistence'
import { useEconomy } from './useEconomy'
import { useSeason } from './useSeason'

// Timer fora de componentes: a partida continua ao trocar de tela.
const MATCH_DURATION_NORMAL_MS = 120_000 // 2 min
const MATCH_DURATION_2X_MS = 60_000 // 1 min

// Cada competição tem seu próprio relógio: partidas de competições diferentes rodam em paralelo.
const matchTimers: Partial<Record<MatchCompetition, ReturnType<typeof setInterval>>> = {}

// Gols registrados na partida em andamento de cada competição (revertidos se abandonada).
const matchGoalLogs: Partial<Record<MatchCompetition, string[]>> = {}
const matchAssistLogs: Partial<Record<MatchCompetition, string[]>> = {}

// Cartões da partida em andamento de cada competição. Reativo: a tela mostra o time com um a menos.
// yellow/off: titulares do usuário com amarelo e expulsos. oppOff: expulsões do rival (sem nomes).
interface MatchCards { yellow: Set<string>; off: Set<string>; direct: Set<string>; oppOff: number }
const matchCards = reactive<Partial<Record<MatchCompetition, MatchCards>>>({})
function cardsFor(comp: MatchCompetition): MatchCards {
  return (matchCards[comp] ??= { yellow: new Set(), off: new Set(), direct: new Set(), oppOff: 0 })
}
/** O atleta foi expulso na partida em andamento desta competição? */
export function isSentOff(comp: MatchCompetition, playerId: string): boolean {
  return matchCards[comp]?.off.has(playerId) ?? false
}

/** Acréscimos do 2º tempo: o árbitro soma o tempo perdido com gols, cartões, lesões, trocas, pênaltis e brigas. */
function stoppageMinutes(events: LiveMatchEvent[]): number {
  const weight: Partial<Record<MatchEventType, number>> = {
    sub: 0.5, injury: 1.5, yellow: 0.4, red: 1, brawl: 1.5, goal: 0.5, opp_goal: 0.5, penalty: 1
  }
  const sum = events.filter((e) => e.minute >= 46 && e.minute <= 90).reduce((a, e) => a + (weight[e.type] ?? 0), 0)
  return clamp(Math.round(1 + 0.7 * sum), 2, 8)
}

// Mentalidade vigente quando o painel de substituições abriu (para narrar a mudança de estilo).
let mentalityOnOpen: string | null = null

function clearMatchTimer(comp: MatchCompetition) {
  const t = matchTimers[comp]
  if (t !== undefined) {
    clearInterval(t)
    delete matchTimers[comp]
  }
}

/** Amistoso não credita gols nem assistências: nada entra nas estatísticas de temporada/carreira nem nos logs da partida. */
function credit(comp: MatchCompetition, fn: () => void) {
  if (comp !== 'friendly') fn()
}

/** Mando de +3 OVER só vale na liga e no continental; Copa, Supercopa e Recopa não dão mando ao usuário. */
export function homeBonusApplies(comp: MatchCompetition | null | undefined): boolean {
  return comp === 'league' || comp === 'continental'
}

export function useMatchSimulation() {
  const club = useClubStore()
  const squad = useSquadStore()
  const league = useLeagueStore()
  const competitions = useCompetitionsStore()
  const market = useMarketStore()
  const match = useMatchStore()
  const ui = useUiStore()
  const friendlies = useFriendliesStore()
  const { saveGame } = usePersistence()
  const { settleMatch } = useEconomy()
  const { applyStageOutcome } = useSeason()

  function rawIsHomeFor(comp: MatchCompetition): boolean {
    if (comp === 'league') return league.nextFixtureIsHome
    if (comp === 'continental') {
      const c = competitions.continentalState
      // groupRound = rodada a jogar (1-based); rodadas 4 a 6 do grupo são fora
      return c.stage !== 'GROUPS' || c.groupRound <= 3
    }
    return true
  }
  // Partida aberta (rodando ou encerrada e ainda na tela): vale o que foi congelado no início.
  function isHomeFor(comp: MatchCompetition): boolean {
    const snap = match.sessions[comp].snapshot
    return snap && match.isCompetitionMatchActive(comp) ? snap.isHome : rawIsHomeFor(comp)
  }
  const activeMatchIsHome = computed(() => isHomeFor(match.activeMatchCompetition))

  function opponentFor(comp: MatchCompetition): MatchOpponent {
    const snap = match.sessions[comp].snapshot
    return snap && match.isCompetitionMatchActive(comp) ? snap.opponent : rawOpponentFor(comp)
  }

  function rawOpponentFor(comp: MatchCompetition): MatchOpponent {
    if (comp === 'friendly') {
      // Opção escolhida na roleta: OVER do rival estimado com a escalação atual (offset do sorteio + OVER de agora), que
      // acompanha as trocas no PreMatch; depois do apito vale o desafio gravado. Sem nenhum, um rival neutro só para os computeds.
      const opt = friendlies.selectedOption
      if (opt) return { name: opt.name, power: friendlies.quote(opt, squad.freshTeamStrength.rating, Date.now()).oppOver, style: 'Amistoso' }
      const a = friendlies.active
      if (a) return { name: a.botName, power: a.oppOver, style: 'Amistoso' }
      return { name: 'Adversário', power: Math.round(squad.freshTeamStrength.rating), style: 'Amistoso' }
    }
    if (comp === 'supercup') {
      return {
        name: competitions.supercupState.rivalName,
        power: competitions.supercupState.rivalPower,
        style: 'Supercopa Soberana'
      }
    }
    if (comp === 'recopa') {
      return {
        name: competitions.recopaState.rivalName,
        power: competitions.recopaState.rivalPower,
        style: 'Recopa Condor'
      }
    }
    const rival = competitions.cupState.currentRival
    if (comp === 'cup' && rival) {
      return { name: rival.name, power: rival.power, style: 'Taça Cacique' }
    }
    if (comp === 'continental' && competitions.continentalState.qualified) {
      return competitions.continentalOpponent
    }
    return league.nextOpponent
  }
  const activeMatchOpponent = computed<MatchOpponent>(() => opponentFor(match.activeMatchCompetition))

  function labelFor(comp: MatchCompetition): string {
    const snap = match.sessions[comp].snapshot
    return snap && match.isCompetitionMatchActive(comp) ? snap.label : rawLabelFor(comp)
  }

  function rawLabelFor(comp: MatchCompetition): string {
    if (comp === 'friendly') {
      const opt = friendlies.selectedOption
      return opt ? 'Amistoso • Ranking #' + opt.rank : 'Amistoso'
    }
    if (comp === 'supercup') return 'Supercopa Soberana • Final Única'
    if (comp === 'recopa') return 'Recopa Condor • Final Única'
    if (comp === 'cup') return 'Taça Cacique • ' + competitions.cupRoundLabel
    if (comp === 'continental') {
      return (
        (competitions.continentalState.tier === 'libertadores' ? 'Condor de Ouro' : 'Condor de Prata') +
        ' • ' +
        competitions.continentalStageLabel
      )
    }
    if (league.isKnockoutStage) {
      const leg = league.nextUserFixture?.leg
      const legLabel = leg === 1 ? 'Jogo de Ida' : leg === 2 ? 'Jogo de Volta' : 'Jogo Único'
      return league.currentStageLabel + ' • ' + legLabel
    }
    return league.currentStageLabel + ' • Rodada ' + league.currentRound
  }
  const activeMatchCompetitionLabel = computed(() => labelFor(match.activeMatchCompetition))

  // Mando de +3 OVER só vale na liga e no continental; Copa, Supercopa e Recopa não dão mando ao usuário.
  const homeBonusOn = computed(() => homeBonusApplies(match.activeMatchCompetition))
  // OVER de partida (sem arredondar): OVER do time + mando. Mesma unidade do OVER dos rivais.
  const userMatchRating = computed(
    () => userBaseRating(match.activeMatchCompetition) + (homeBonusOn.value && activeMatchIsHome.value ? MATCH_SIM.homeAdvantage : 0)
  )
  const opponentMatchRating = computed(
    () => opponentPower(match.activeMatchCompetition) + (homeBonusOn.value && !activeMatchIsHome.value ? MATCH_SIM.homeAdvantage : 0)
  )
  const effectiveUserPower = computed(() => Math.round(userMatchRating.value))
  const effectiveOpponentPower = computed(() => Math.round(opponentMatchRating.value))

  // Titulares ainda em campo (sem os expulsos).
  function activeStarters(comp: MatchCompetition) {
    return squad.currentStartersList.filter((p) => !isSentOff(comp, p.id) && !isSuspendedFor(p, comp))
  }

  // Quem está no gol agora: o ocupante da vaga de goleiro (pode ser um jogador de linha após uma expulsão).
  function keeperOf(comp: MatchCompetition) {
    const layout = FORMATIONS[squad.formation] || FORMATIONS['4-3-3']
    const idx = layout.findIndex((slot) => slot.role === 'GK')
    const p = squad.players.find((pl) => pl.id === squad.starterIds[idx])
    return p && !isSentOff(comp, p.id) && !isSuspendedFor(p, comp) ? p : undefined
  }

  // Titulares que não jogam esta partida: expulsos nela e suspensos na competição.
  function unavailableIds(comp: MatchCompetition): Set<string> {
    const ids = new Set<string>(matchCards[comp]?.off ?? [])
    squad.currentStartersList.forEach((p) => {
      if (isSuspendedFor(p, comp)) ids.add(p.id)
    })
    return ids
  }

  // OVER do time do usuário: indisponível deixa a vaga vazia (conta 0 na média ponderada), então o time joga com 10.
  function userBaseRating(comp: MatchCompetition): number {
    const ids = unavailableIds(comp)
    // Amistoso: todos jogam como se tivessem energia 100, sem a penalidade de cansaço.
    if (comp === 'friendly') return calculateTeamStrength(squad.pitchSlots, ids, { ignoreFatigue: true }).rating
    return ids.size ? calculateTeamStrength(squad.pitchSlots, ids).rating : squad.teamStrength.rating
  }

  // Titulares suspensos na competição que ainda dá para substituir (há reserva não suspenso, mesmo lesionado).
  // Bloqueiam o início da partida; sem nenhum reserva possível, o time joga com a vaga vazia.
  function lineupBlockers(comp: MatchCompetition) {
    // Amistoso: titular lesionado ou suspenso em qualquer competição bloqueia sempre, haja reserva ou não.
    if (comp === 'friendly') return squad.currentStartersList.filter((p) => !!p.injury || isSuspendedFor(p, comp))
    const starters = new Set(squad.starterIds)
    const hasSub = squad.players.some((q) => !starters.has(q.id) && !q.isLoanedOut && !isSuspendedFor(q, comp))
    return hasSub ? squad.currentStartersList.filter((p) => isSuspendedFor(p, comp)) : []
  }

  /** Amistoso exige 11 titulares escalados. */
  function lineupShort(comp: MatchCompetition): boolean {
    return comp === 'friendly' && squad.currentStartersList.length < 11
  }

  // Suspenso na competição sai da escalação: o melhor reserva disponível assume a vaga. Devolve as trocas feitas.
  function fixLineupFor(comp: MatchCompetition) {
    const swaps = squad.replaceInjuredStarters((p) => isSuspendedFor(p, comp))
    // Jogador de linha no gol (sobrou de uma expulsão do goleiro) e há goleiro disponível no banco: devolve o gol.
    const layout = FORMATIONS[squad.formation] || FORMATIONS['4-3-3']
    const gkIdx = layout.findIndex((slot) => slot.role === 'GK')
    const holder = squad.players.find((pl) => pl.id === squad.starterIds[gkIdx])
    const spare = squad.availableBenchList.find((q) => q.position === 'GK' && !q.injury && !isSuspendedFor(q, comp))
    if (holder && holder.position !== 'GK' && spare) {
      squad.starterIds[gkIdx] = spare.id
      saveGame()
    }
    if (swaps.length) saveGame()
    return swaps
  }

  // Rival com expulsos perde 1/11 da força por jogador a menos (mesmo peso médio de uma vaga vazia do usuário).
  function opponentPower(comp: MatchCompetition): number {
    const n = matchCards[comp]?.oppOff ?? 0
    const power = opponentFor(comp).power
    return n ? (power * Math.max(0, 11 - n)) / 11 : power
  }

  // Rating de uma competição específica (a partida pode não ser a exibida).
  function ratingsFor(comp: MatchCompetition) {
    const bonus = homeBonusApplies(comp)
    const home = isHomeFor(comp)
    return {
      user: userBaseRating(comp) + (bonus && home ? MATCH_SIM.homeAdvantage : 0),
      opp: opponentPower(comp) + (bonus && !home ? MATCH_SIM.homeAdvantage : 0)
    }
  }

  function discardInProgressGoals(comp: MatchCompetition) {
    ;(matchGoalLogs[comp] ?? []).forEach((id) => club.revertGoal(id))
    matchGoalLogs[comp] = []
    ;(matchAssistLogs[comp] ?? []).forEach((id) => club.revertAssist(id))
    matchAssistLogs[comp] = []
    delete matchCards[comp]
  }

  function prepareMatch(comp: MatchCompetition = 'league') {
    // Partida desta competição em andamento: só volta para ela, sem reiniciar.
    // Partida já encerrada não bloqueia: o resultado já está no histórico e o botão inicia a próxima.
    if (match.isCompetitionMatchActive(comp) && !match.sessions[comp].matchState.isFinished) {
      match.activeMatchCompetition = comp
      router.push('/match')
      return
    }
    if (!competitions.isCompetitionPlayable(comp)) {
      ui.showToast('Competição já encerrada.', 'warning')
      router.push(comp === 'league' ? '/league' : '/competitions')
      return
    }
    if (comp === 'friendly' && !friendlies.selectedOption) {
      ui.showToast('Sorteie um adversário.', 'warning')
      router.push('/friendlies')
      return
    }
    clearMatchTimer(comp)
    discardInProgressGoals(comp)
    match.activeMatchCompetition = comp
    match.resetMatchState(comp)
    fixLineupFor(comp).forEach((sw) =>
      ui.showToast(
        comp === 'friendly'
          ? `Desfalque no Amistoso: ${sw.out.name} está lesionado ou suspenso e ${sw.in.name} assume a vaga.`
          : `Desfalque na ${COMP_SHORT[comp]}: ${sw.out.name} está suspenso e ${sw.in.name} assume a vaga.`,
        'warning'
      )
    )
    router.push('/pre-match')
  }

  /** Texto do botão de entrada da competição: se já há partida aberta, ele leva a ela em vez de iniciar outra. */
  function matchEntryLabel(comp: MatchCompetition, idleLabel: string): string {
    if (!match.isCompetitionLive(comp)) return idleLabel
    return 'Acompanhar partida ao vivo'
  }

  /** Troca a competição exibida na tela de partida (partidas simultâneas). */
  function switchActiveMatch(comp: MatchCompetition) {
    if (comp === match.activeMatchCompetition) return
    match.activeMatchCompetition = comp
    router.push(match.isCompetitionMatchActive(comp) ? '/match' : '/pre-match')
  }

  function startLiveMatch() {
    const comp = match.activeMatchCompetition
    clearMatchTimer(comp)
    if (!competitions.isCompetitionPlayable(comp)) {
      ui.showToast('Competição já encerrada.', 'warning')
      router.push(comp === 'league' ? '/league' : '/competitions')
      return
    }
    // Suspenso na competição não entra: o melhor reserva disponível assume a vaga.
    fixLineupFor(comp)
    // Se ainda sobrou suspenso titular (só havia reservas lesionados), a partida não começa até o técnico escalar outro.
    const blockers = lineupBlockers(comp)
    if (blockers.length) {
      const names = blockers.map((p) => p.name).join(', ')
      ui.showToast(
        comp === 'friendly'
          ? `${names} ${blockers.length === 1 ? 'está lesionado ou suspenso' : 'estão lesionados ou suspensos'}. Substitua antes de iniciar o amistoso.`
          : `${names} ${blockers.length === 1 ? 'está suspenso' : 'estão suspensos'} na ${COMP_SHORT[comp]}. Substitua antes de iniciar.`,
        'danger'
      )
      return
    }
    if (lineupShort(comp)) {
      ui.showToast('São precisos 11 titulares para iniciar o amistoso.', 'danger')
      return
    }
    // Congela adversário, mando e rótulo antes de ativar a sessão (depois do apito o estado das competições avança).
    // No amistoso, antes de beginMatch: ele limpa a opção escolhida, que dá o nome e a posição do rival.
    const frozen = { opponent: { ...rawOpponentFor(comp) }, isHome: rawIsHomeFor(comp), label: rawLabelFor(comp) }
    if (comp === 'friendly') {
      if (!friendlies.selectedOption) {
        ui.showToast('Sorteie um adversário.', 'warning')
        router.push('/friendlies')
        return
      }
      // A ficha é gasta no apito inicial; grava o desafio e zera os sorteios.
      if (!friendlies.beginMatch(squad.freshTeamStrength.rating, Date.now())) {
        ui.showToast(`Sem fichas. Próxima em ${formatTokenCountdown(friendlies.msToNext)}.`, 'warning')
        return
      }
      // beginMatch recalculou e fixou o OVER do rival com o OVER do apito: o motor usa exatamente o mesmo número que fama e prêmio.
      if (friendlies.active) frozen.opponent.power = friendlies.active.oppOver
      saveGame()
    }
    discardInProgressGoals(comp)
    match.sessions[comp].snapshot = frozen
    delete matchCards[comp]
    resetNarration()
    const absent = squad.players.filter((p) => !p.isLoanedOut && isSuspendedFor(p, comp)).map((p) => p.name)
    match.matchState = {
      isRunning: true,
      isFinished: false,
      minute: 0,
      speed: 1,
      userScore: 0,
      opponentScore: 0,
      subsUsed: 0,
      events: [
        {
          minute: 1,
          type: 'whistle',
          description: `Apita o árbitro! Começa ${club.name} x ${activeMatchOpponent.value.name}!`
        },
        ...(absent.length
          ? [{ minute: 0, type: 'info' as const, description: `Desfalques por suspensão no ${club.name}: ${absent.join(', ')}.` }]
          : [])
      ]
    }
    match.resetStats(comp)
    match.showSubDrawer = false
    // O relógio só roda se a tela da partida realmente abriu.
    const abortStart = () => {
      clearMatchTimer(comp)
      match.resetMatchState(comp)
      ui.showToast('Não foi possível abrir a partida. Recarregue a página.', 'danger')
    }
    saveLiveMatch()
    router.push('/match').then((failure) => (failure ? abortStart() : runMatchLoop(comp)), abortStart)
  }

  /** O resultado da partida exige vencedor e o placar (ou o agregado) está empatado? */
  function needsShootout(comp: MatchCompetition, u: number, o: number): boolean {
    if (comp === 'friendly') return false // amistoso: sem prorrogação nem pênaltis
    if (comp === 'cup' || comp === 'supercup' || comp === 'recopa') return u === o
    if (comp === 'continental') return u === o && competitions.continentalState.stage !== 'GROUPS'
    if (!league.isKnockoutStage) return false
    const fx = league.nextUserFixture
    if (!fx || fx.leg === 1) return false
    let uAgg = u
    let oAgg = o
    if (fx.leg === 2) {
      const first = league.leagueFixtures.find((f) => f.stage === fx.stage && f.tie === fx.tie && f.leg === 1 && f.played)
      if (first) {
        uAgg += first.homeId === 'user' ? (first.homeScore ?? 0) : (first.awayScore ?? 0)
        oAgg += first.homeId === 'user' ? (first.awayScore ?? 0) : (first.homeScore ?? 0)
      }
    }
    return uAgg === oAgg
  }

  function startShootout(comp: MatchCompetition) {
    const state = match.sessions[comp].matchState
    state.shootout = { kicks: [], first: isHomeFor(comp) ? 'user' : 'opp', done: false }
    state.events.unshift({
      minute: 90,
      type: 'penalty',
      description: shootoutStartLine(club.name, opponentFor(comp).name, state.userScore, state.opponentScore)
    })
    runShootoutLoop(comp)
  }

  // Uma cobrança por intervalo; usa o mesmo timer por competição da partida.
  function runShootoutLoop(comp: MatchCompetition) {
    clearMatchTimer(comp)
    const state = match.sessions[comp].matchState
    const sh = state.shootout
    if (!sh || sh.done) return
    const ratings = ratingsFor(comp)
    const [convUser, convOpp] = shootoutConversions(ratings.user, ratings.opp)
    const oppName = opponentFor(comp).name
    matchTimers[comp] = setInterval(() => {
      const s = match.sessions[comp].matchState
      const shoot = s.shootout
      if (!s.isRunning || !shoot || shoot.done) return
      const side = shootoutStatus(shoot.kicks, shoot.first).next
      const scored = Math.random() < (side === 'user' ? convUser : convOpp)
      const userKicks = shoot.kicks.filter((k) => k.side === 'user').length
      const takers = activeStarters(comp).filter((p) => p.position !== 'GK')
      const taker = side === 'user' ? takers[userKicks % Math.max(1, takers.length)]?.name : undefined
      shoot.kicks.push({ side, scored })
      const st = shootoutStatus(shoot.kicks, shoot.first)
      s.events.unshift({
        minute: 90,
        type: 'penalty',
        description: shootoutKickLine(side === 'user' ? club.name : oppName, taker, scored, st.user, st.opp, club.name, oppName)
      })
      if (st.done) {
        shoot.done = true
        s.events.unshift({
          minute: 90,
          type: 'penalty',
          description: shootoutEndLine(st.winner === 'user' ? club.name : oppName, st.user, st.opp)
        })
        s.isRunning = false
        s.isFinished = true
        clearMatchTimer(comp)
        concludeMatch(comp)
      }
      saveLiveMatch()
    }, MATCH_SIM.shootoutKickMs[state.speed === 2 ? 2 : 1])
  }

  function runMatchLoop(comp: MatchCompetition = match.activeMatchCompetition) {
    clearMatchTimer(comp)
    const st = match.sessions[comp].matchState
    // Disputa de pênaltis em andamento (ex.: troca de velocidade): retoma a disputa, não o tempo normal.
    if (st.shootout && !st.shootout.done) {
      runShootoutLoop(comp)
      return
    }
    // Duração da partida: 2 min na velocidade normal e 1 min no 2x. O relógio avança 2 minutos de jogo por tick (45 ticks).
    const totalMs = st.speed === 2 ? MATCH_DURATION_2X_MS : MATCH_DURATION_NORMAL_MS
    const intervalMs = Math.round(totalMs / (90 / 2))
    matchTimers[comp] = setInterval(() => {
      const state = match.sessions[comp].matchState
      if (!state.isRunning) return
      state.minute += 2
      // Acréscimos: anunciados aos 88'; o jogo segue até 90 + N (os lances do tempo extra aparecem como 90+N').
      if (state.minute === 88 && state.addedTime === undefined) {
        state.addedTime = stoppageMinutes(state.events)
        state.events.unshift({ minute: 88, type: 'info', description: stoppageLine(state.addedTime) })
      }
      const end = 90 + (state.addedTime ?? 0)
      const scoreBefore = state.userScore
      simulateMatchTick(Math.min(state.minute, end), comp)
      // Gol do usuário mexe em estatísticas de carreira: grava junto para o save principal não ficar para trás.
      if (state.userScore !== scoreBefore) saveGame()
      saveLiveMatch()
      if (state.minute >= end) {
        state.minute = end
        clearMatchTimer(comp)
        // Mata-mata empatado: o jogo segue para os pênaltis, ao vivo, antes de fechar o resultado.
        if (needsShootout(comp, state.userScore, state.opponentScore)) {
          startShootout(comp)
          return
        }
        state.isRunning = false
        state.isFinished = true
        concludeMatch(comp)
      }
    }, intervalMs)
  }

  function toggleMatchSpeed() {
    const comp = match.activeMatchCompetition
    match.matchState.speed = match.matchState.speed === 1 ? 2 : 1
    if (match.matchState.isRunning) runMatchLoop(comp)
    saveLiveMatch()
  }

  function openInMatchSubDrawer() {
    match.matchState.isRunning = false
    match.showSubDrawer = true
    match.subOutId = ''
    match.subInId = ''
    mentalityOnOpen = match.selectedMentality
    saveLiveMatch()
  }

  // Narra a mudança de estilo de jogo feita no painel (compara com a mentalidade de quando ele abriu).
  function announceMentalityChange() {
    if (!mentalityOnOpen || mentalityOnOpen === match.selectedMentality) return
    const info = match.mentalityInfo
    match.matchState.events.unshift({
      minute: match.matchState.minute,
      type: 'sub',
      description: `Mudança de estilo no ${club.name}: passa a jogar com postura ${info.label} (ATQ x${info.atkMod.toFixed(2)} • DEF x${info.defMod.toFixed(2)}).`
    })
    mentalityOnOpen = match.selectedMentality
    saveGame()
  }

  // Titulares lesionados ainda em campo que dá para trocar (há reserva saudável e disponível). Lesão exige ajuste:
  // a partida só retoma depois de resolver. Sem reserva possível, o time segue com o lesionado em campo.
  function pendingInjuries(comp: MatchCompetition): Player[] {
    const hasReplacement = squad.availableBenchList.some((q) => !q.injury && !isSuspendedFor(q, comp))
    return hasReplacement ? activeStarters(comp).filter((p) => !!p.injury) : []
  }

  function closeInMatchSubDrawer() {
    const pending = pendingInjuries(match.activeMatchCompetition)
    if (pending.length) {
      ui.showToast(`${pending.map((p) => p.name).join(', ')} ${pending.length === 1 ? 'está lesionado' : 'estão lesionados'}: faça a substituição antes de retomar.`, 'danger')
      return
    }
    announceMentalityChange()
    match.showSubDrawer = false
    if (!match.matchState.isFinished) {
      match.matchState.isRunning = true
      runMatchLoop(match.activeMatchCompetition)
    }
    saveLiveMatch()
  }

  // Reorganiza o time com quem está em campo: testa todas as formações e, com jogador a menos (expulsão ou
  // suspensão), todas as vagas que podem ficar vazias, e adota a de maior força. Não faz substituições.
  function reorganizeTeam() {
    const comp = match.activeMatchCompetition
    const state = match.matchState
    if (state.isFinished) return
    const unavailable = (p: Player) => isSentOff(comp, p.id) || isSuspendedFor(p, comp)
    const starters = squad.currentStartersList
    const out = starters.filter(unavailable)
    const pool = starters.filter((p) => !unavailable(p))
    const empties = starters.length - pool.length
    if (starters.length !== 11 || pool.length === 0) return
    if (empties > 4) {
      ui.showToast('Jogadores demais fora de campo para reorganizar automaticamente.', 'warning')
      return
    }
    const combos = (items: number[], k: number): number[][] => {
      if (k === 0) return [[]]
      if (items.length < k) return []
      const [head, ...tail] = items
      return [...combos(tail, k - 1).map((c) => [head, ...c]), ...combos(tail, k)]
    }
    const before = userBaseRating(comp)
    let best: { f: FormationName; ids: string[]; rating: number } | null = null
    const order = [squad.formation, ...squad.formationNames.filter((f) => f !== squad.formation)]
    for (const f of order) {
      const layout = FORMATIONS[f]
      const gkIdx = layout.findIndex((slot) => slot.role === 'GK')
      const others = layout.map((_, i) => i).filter((i) => i !== gkIdx)
      for (const empty of combos(others, empties)) {
        const picked: Array<Player | null> = Array(11).fill(null)
        const used = new Set<string>()
        // Goleiro primeiro: a vaga nunca fica vazia e o titular natural do gol não pode ser tomado por outra posição.
        for (const i of [gkIdx, ...others]) {
          if (empty.includes(i)) continue
          const cand = pool
            .filter((p) => !used.has(p.id))
            .sort((a, b) => getEffectiveOvr(b, layout[i].role) - getEffectiveOvr(a, layout[i].role))[0]
          if (cand) {
            picked[i] = cand
            used.add(cand.id)
          }
        }
        const rating = calculateTeamStrength(layout.map((slot, i) => ({ role: slot.role, player: picked[i] }))).rating
        if (!best || rating > best.rating + 1e-9) {
          const spare = out.map((p) => p.id)
          best = { f, rating, ids: picked.map((p) => p?.id ?? spare.shift() ?? '') }
        }
      }
    }
    if (!best || best.ids.some((id) => !id) || new Set(best.ids).size !== 11) return
    const same = best.f === squad.formation && best.ids.every((id, i) => id === squad.starterIds[i])
    if (same || best.rating <= before + 0.05) {
      ui.showToast('O time já está na melhor organização possível.', 'info')
      return
    }
    squad.setFormation(best.f)
    squad.setStarters(best.ids)
    state.events.unshift({
      minute: state.minute,
      type: 'sub',
      description: reorganizeLine(club.name, best.f, pool.length, before, best.rating)
    })
    ui.showToast(`Time reorganizado no ${best.f}: força ${before.toFixed(1)} → ${best.rating.toFixed(1)}.`, 'success')
    saveGame()
    saveLiveMatch()
  }

  // Sugere a melhor troca: maior ganho de OVER efetivo na vaga (posição, cansaço e lesão contam). Só preenche a
  // seleção; quem confirma é o usuário. Sem substituições restantes, só lesionados podem sair.
  function recommendSubstitution() {
    const subsLeft = match.matchState.subsUsed < 5
    const bench = squad.availableBenchList.filter((p) => !p.injury && !isSuspendedFor(p, match.activeMatchCompetition))
    let best: { outId: string; inId: string; gain: number } | null = null
    squad.currentStartersList.forEach((starter) => {
      if (isSentOff(match.activeMatchCompetition, starter.id)) return
      if (!subsLeft && !starter.injury) return
      const slot = squad.starterIds.indexOf(starter.id)
      const role = (FORMATIONS[squad.formation] || FORMATIONS['4-3-3'])[slot]?.role
      if (!role) return
      const current = getEffectiveOvr(starter, role)
      for (const cand of bench) {
        // Energia desempata: a diferença de stamina vale até ~1 ponto de OVER.
        const gain = getEffectiveOvr(cand, role) - current + ((cand.stamina ?? 100) - (starter.stamina ?? 100)) * 0.01
        if (!best || gain > best.gain) best = { outId: starter.id, inId: cand.id, gain }
      }
    })
    const pick = best as { outId: string; inId: string; gain: number } | null
    if (!pick || pick.gain <= 0.5) {
      ui.showToast(bench.length ? 'Nenhuma troca melhora o time agora.' : 'Sem reservas saudáveis no banco.', 'info')
      return
    }
    match.subOutId = pick.outId
    match.subInId = pick.inId
  }

  function confirmInMatchSubstitution() {
    const outPl = squad.players.find((p) => p.id === match.subOutId)
    const forced = !!outPl?.injury
    // Expulso não pode ser substituído: o time segue com um a menos.
    if (isSentOff(match.activeMatchCompetition, match.subOutId)) return
    if (!match.subOutId || !match.subInId || (!forced && match.matchState.subsUsed >= 5)) return
    announceMentalityChange()
    const inPl = squad.players.find((p) => p.id === match.subInId)
    if (!squad.substituteStarter(match.subOutId, match.subInId)) return
    if (!forced) match.matchState.subsUsed += 1
    match.matchState.events.unshift({
      minute: match.matchState.minute,
      type: 'sub',
      description: `Substituição no ${club.name}: Sai ${outPl?.name}, entra ${inPl?.name}.`
    })
    match.subOutId = ''
    match.subInId = ''
    saveGame()
    saveLiveMatch()
  }

  function simulateMatchTick(minute: number, comp: MatchCompetition = match.activeMatchCompetition) {
    const ment = match.mentalityInfo
    const session = match.sessions[comp]
    const stats = session.matchStats
    const state = session.matchState
    const M = MATCH_SIM
    const ratings = ratingsFor(comp)
    const diff = ratings.user - ratings.opp
    const userName = club.name
    const oppName = opponentFor(comp).name
    const say = (type: MatchEventType, description: string) => {
      state.events.unshift({ minute, type, description })
    }
    // Opinião do comentarista sobre o lance que acabou de ser narrado.
    const opine = (description: string) => say('comment', description)

    rollLiveInjury(minute, comp)

    const basePoss = clamp(Math.round(50 + diff * M.possessionPerOver + (ment.atkMod - 1) * 40), 32, 68)
    stats.userPossession = clamp(basePoss + randInt(-3, 3), 28, 72)

    // Nem todo escanteio é narrado (os totais aparecem nas estatísticas).
    if (Math.random() < 0.16) {
      stats.userCorners++
      if (Math.random() < 0.35) say('corner', cornerLine(userName))
    }
    if (Math.random() < 0.15) {
      stats.oppCorners++
      if (Math.random() < 0.35) say('corner', cornerLine(oppName))
    }
    // Lateral e impedimento: sempre contados; só parte é narrada (os totais aparecem nas estatísticas).
    const roster = activeStarters(comp)
    const bump = (key: 'userThrowIns' | 'oppThrowIns' | 'userOffsides' | 'oppOffsides') => {
      stats[key] = (stats[key] ?? 0) + 1
    }
    if (Math.random() < M.throwInChance) {
      bump('userThrowIns')
      if (Math.random() < 0.12) say('throwin', throwInLine(userName, pickRandom(roster.filter((p) => ['LB', 'RB', 'LW', 'RW'].includes(p.position)))?.name))
    }
    if (Math.random() < M.throwInChance) {
      bump('oppThrowIns')
      if (Math.random() < 0.12) say('throwin', throwInLine(oppName))
    }
    if (Math.random() < M.offsideChance) {
      bump('userOffsides')
      if (Math.random() < 0.6) say('offside', offsideLine(userName, pickRandom(roster.filter((p) => ['ST', 'LW', 'RW', 'CAM'].includes(p.position)))?.name))
    }
    if (Math.random() < M.offsideChance) {
      bump('oppOffsides')
      if (Math.random() < 0.6) say('offside', offsideLine(oppName))
    }
    // Cada falta pode virar cartão. Time do usuário usa jogadores reais; o rival, só o clube. Segundo amarelo expulsa.
    const cards = cardsFor(comp)
    const count = (side: 'user' | 'opp', kind: 'Yellows' | 'Reds') => {
      const key = `${side}${kind}` as 'userYellows' | 'oppYellows' | 'userReds' | 'oppReds'
      stats[key] = (stats[key] ?? 0) + 1
    }
    const sendOff = (id: string, name: string) => {
      cards.off.add(id)
      ui.showToast(`${name} foi expulso! Você joga com ${11 - cards.off.size}.`, 'danger')
    }
    // Goleiro do usuário expulso: com troca disponível e goleiro reserva, o técnico sacrifica o jogador de linha de menor
    // rendimento; senão, o jogador de linha de melhor defesa veste as luvas (joga fora de posição, com a penalidade de
    // OVER de quem está no gol). O expulso fica na vaga do sacrificado (vazia), então o time joga com um a menos.
    // Quem está no gol é quem ocupa a vaga de goleiro, mesmo que seja um jogador de linha improvisado.
    const isInGoal = (id: string) => {
      const layout = FORMATIONS[squad.formation] || FORMATIONS['4-3-3']
      return squad.starterIds[layout.findIndex((slot) => slot.role === 'GK')] === id
    }
    const keeperOff = (gk: { id: string }) => {
      const gkIdx = squad.starterIds.indexOf(gk.id)
      if (gkIdx < 0) return
      const layout = FORMATIONS[squad.formation] || FORMATIONS['4-3-3']
      const field = activeStarters(comp).filter((p) => p.position !== 'GK' && p.id !== gk.id)
      const backup = state.subsUsed < 5 ? squad.availableBenchList.find((p) => p.position === 'GK' && !p.injury && !isSuspendedFor(p, comp)) : undefined
      const weakest = [...field].sort(
        (a, b) =>
          getEffectiveOvr(a, layout[squad.starterIds.indexOf(a.id)]?.role ?? a.position) -
          getEffectiveOvr(b, layout[squad.starterIds.indexOf(b.id)]?.role ?? b.position)
      )[0]
      if (backup && weakest && squad.substituteStarter(weakest.id, backup.id)) {
        const slot = squad.starterIds.indexOf(backup.id)
        squad.starterIds[slot] = gk.id
        squad.starterIds[gkIdx] = backup.id
        state.subsUsed += 1
        say('sub', gkSubLine(userName, weakest.name, backup.name))
        saveGame()
        return
      }
      const volunteer = [...field].sort((a, b) => b.attributes.defending - a.attributes.defending)[0]
      if (!volunteer) return
      const vIdx = squad.starterIds.indexOf(volunteer.id)
      squad.starterIds[gkIdx] = volunteer.id
      squad.starterIds[vIdx] = gk.id
      say('info', gkEmergencyLine(userName, volunteer.name))
      saveGame()
    }
    // `force`: punição já decidida (briga); sem ela, o sorteio é por falta.
    const rollCard = (side: 'user' | 'opp', force?: 'yellow' | 'red', target?: ReturnType<typeof activeStarters>[number]) => {
      const r = Math.random()
      if (!force && r >= M.yellowPerFoul + M.redPerFoul) return
      const team = side === 'user' ? userName : oppName
      const player =
        side === 'user' ? (target ?? pickRandom(activeStarters(comp))) : undefined
      if (force ? force === 'red' : r < M.redPerFoul) {
        count(side, 'Reds')
        if (player) {
          cards.direct.add(player.id)
          sendOff(player.id, player.name)
        } else cards.oppOff = Math.min(cards.oppOff + 1, 4)
        say('red', redCardLine(team, player?.name, false))
        if (player && isInGoal(player.id)) keeperOff(player)
        else if (!player && Math.random() < 1 / 11) say('info', oppKeeperOffLine(team))
        opine(redReaction(team, side === 'user' ? oppName : userName, side === 'user' ? state.userScore : state.opponentScore, side === 'user' ? state.opponentScore : state.userScore, minute))
        return
      }
      if (player && cards.yellow.has(player.id)) {
        count(side, 'Yellows')
        count(side, 'Reds')
        sendOff(player.id, player.name)
        say('yellow', yellowCardLine(team, player.name))
        say('red', redCardLine(team, player.name, true))
        if (isInGoal(player.id)) keeperOff(player)
        opine(redReaction(team, oppName, state.userScore, state.opponentScore, minute))
        return
      }
      count(side, 'Yellows')
      if (player) cards.yellow.add(player.id)
      say('yellow', yellowCardLine(team, player?.name))
      // Amarelos da competição já contando este: 2 = pendurado, 3 = suspenso no próximo jogo (sempre comentado).
      const accumulated = player ? (player.yellowCards?.[comp] ?? 0) + 1 : 1
      if (accumulated >= 2 || Math.random() < 0.35) opine(yellowReaction(team, player?.name, minute, accumulated))
    }
    // Falta perigosa: o time que sofreu cobra. Conta como finalização e pode virar gol (M.freeKickGoal).
    const freeKick = (taker: 'user' | 'opp') => {
      if (Math.random() >= M.dangerousFreeKick) return
      const team = taker === 'user' ? userName : oppName
      const kicker = taker === 'user' ? pickRandom(activeStarters(comp).filter((p) => p.position !== 'GK')) : undefined
      const who = kicker?.name
      say('freekick', freeKickLine(team, who))
      if (taker === 'user') stats.userShots++
      else stats.oppShots++
      // Pequena chance de gol de falta: conta como qualquer gol (artilharia, placar e comentário).
      if (Math.random() < M.freeKickGoal) {
        if (taker === 'user') {
          stats.userShotsOnTarget++
          state.userScore++
          if (kicker) {
            credit(comp, () => {
              club.recordGoal(kicker)
              ;(matchGoalLogs[comp] ??= []).push(kicker.id)
            })
          }
          say('goal', freeKickGoalLine(team, who))
          opine(goalReaction({ team, other: oppName, scorer: who, scoreFor: state.userScore, scoreAgainst: state.opponentScore, minute }))
        } else {
          stats.oppShotsOnTarget++
          state.opponentScore++
          say('opp_goal', freeKickGoalLine(team))
          opine(goalReaction({ team, other: userName, scoreFor: state.opponentScore, scoreAgainst: state.userScore, minute }))
        }
        return
      }
      const r = Math.random()
      if (r < 0.3) {
        if (taker === 'user') stats.userShotsOnTarget++
        else stats.oppShotsOnTarget++
        const keeper = taker === 'user' ? keeperDefends(undefined, oppName) : keeperDefends(keeperOf(comp)?.name, userName)
        say('info', freeKickResultLine('saved', team, who, keeper))
      } else if (r < 0.5) say('info', freeKickResultLine('wall', team, who, ''))
      else if (r < 0.6) say('post', freeKickResultLine('post', team, who, ''))
      else say('info', freeKickResultLine('over', team, who, ''))
    }
    if (Math.random() < 0.18) {
      stats.userFouls++
      rollCard('user')
      freeKick('opp')
    }
    if (Math.random() < 0.18) {
      stats.oppFouls++
      rollCard('opp')
      freeKick('user')
    }
    // Briga: tumulto curto, sem parar o jogo. O árbitro pode dar cartões aos dois lados (até vermelho) ou só acalmar.
    if (minute > 6 && minute < 88 && Math.random() < M.brawlChance) {
      say('brawl', brawlLine(userName, oppName))
      stats.userFouls++
      stats.oppFouls++
      const punish = (side: 'user' | 'opp') => {
        const x = Math.random()
        if (x < 0.12) rollCard(side, 'red')
        else if (x < 0.6) rollCard(side, 'yellow')
        else return false
        return true
      }
      const carded = [punish('user'), punish('opp')]
      if (!carded.some(Boolean)) say('info', brawlCalmLine())
      opine(brawlReaction())
    }

    // Mentalidade muda o quanto o jogo é aberto: multiplica as chances próprias e divide as do rival.
    const userChanceProb = clamp((M.userChanceBase + M.slope * diff) * ment.atkMod, M.chanceMin, M.chanceMax)
    const oppChanceProb = clamp((M.oppChanceBase - M.slope * diff) / ment.defMod, M.chanceMin, M.chanceMax)

    if (Math.random() < userChanceProb) {
      stats.userShots++
      const starters = activeStarters(comp)
      const attackers = starters.filter((p) => ['ST', 'LW', 'RW', 'CAM', 'CM'].includes(p.position))
      const shooter = pickRandom(attackers.length ? attackers : starters)

      if (Math.random() < M.userOnTarget) {
        stats.userShotsOnTarget++
        if (Math.random() < M.userGoal) {
          state.userScore++
          let assisterName: string | undefined
          // Parte dos gols é gol contra do rival: o placar sobe igual, mas ninguém do elenco leva gol ou assistência.
          const ownGoal = Math.random() < M.ownGoalShare
          if (shooter && !ownGoal) {
            credit(comp, () => {
              club.recordGoal(shooter)
              ;(matchGoalLogs[comp] ??= []).push(shooter.id)
            })
            if (Math.random() < 0.75) {
              const pool = starters.filter((p) => p.id !== shooter.id && p.position !== 'GK')
              const creators = pool.filter((p) => ['CAM', 'CM', 'LW', 'RW'].includes(p.position))
              const assister = pickRandom(creators.length && Math.random() < 0.6 ? creators : pool)
              if (assister) {
                assisterName = assister.name
                credit(comp, () => {
                  club.recordAssist(assister)
                  ;(matchAssistLogs[comp] ??= []).push(assister.id)
                })
              }
            }
          }
          say('goal', ownGoal ? ownGoalLine(oppName, userName) : goalLine(userName, shooter?.name, assisterName))
          opine(goalReaction({ team: userName, other: oppName, scorer: ownGoal ? undefined : shooter?.name, scoreFor: state.userScore, scoreAgainst: state.opponentScore, minute }))
        } else {
          say('info', savedLine(userName, shooter?.name, keeperDefends(undefined, oppName)))
          if (Math.random() < 0.4) opine(saveReaction(shooter?.name ?? userName, oppName))
        }
      } else {
        if (Math.random() < M.postShare) {
          say('post', postLine(userName, shooter?.name))
          if (Math.random() < 0.4) opine(postReaction())
        } else say('info', offTargetLine(userName, shooter?.name))
      }
    }

    if (Math.random() < oppChanceProb) {
      stats.oppShots++
      if (Math.random() < M.oppOnTarget) {
        stats.oppShotsOnTarget++
        if (Math.random() < M.oppGoal) {
          state.opponentScore++
          if (Math.random() < M.ownGoalShare) {
            const defender = pickRandom(activeStarters(comp).filter((p) => ['CB', 'LB', 'RB', 'CDM'].includes(p.position)))
            say('opp_goal', ownGoalLine(userName, oppName, defender?.name))
          } else say('opp_goal', goalLine(oppName))
          opine(goalReaction({ team: oppName, other: userName, scoreFor: state.opponentScore, scoreAgainst: state.userScore, minute }))
        } else {
          const keeper = keeperOf(comp)?.name
          say('info', savedLine(oppName, undefined, keeperDefends(keeper, userName)))
          if (Math.random() < 0.4) opine(saveReaction(oppName, userName))
        }
      } else {
        if (Math.random() < M.postShare) {
          say('post', postLine(oppName))
          if (Math.random() < 0.4) opine(postReaction())
        } else say('info', offTargetLine(oppName))
      }
    }

    // Pênalti em jogo: raro, narrado em dois lances (marcação e cobrança). Conversão ajustada pelo OVER.
    const [convUser, convOpp] = shootoutConversions(ratings.user, ratings.opp)
    if (minute < 90 && Math.random() < M.penaltyChance * ment.atkMod) {
      const starters = activeStarters(comp)
      const attackers = starters.filter((p) => ['ST', 'LW', 'RW', 'CAM', 'CM'].includes(p.position))
      const taker = pickRandom(attackers.length ? attackers : starters)
      // Parte dos pênaltis é toque de mão do rival (sem nome); às vezes o árbitro dá amarelo ao infrator.
      if (Math.random() < M.handballShare) {
        say('penalty', penaltyHandballLine(userName, taker?.name))
        if (Math.random() < M.handballCard) rollCard('opp', 'yellow')
      } else say('penalty', penaltyAwardLine(userName, taker?.name))
      opine(penaltyAwardReaction(userName))
      stats.userShots++
      if (Math.random() < convUser) {
        stats.userShotsOnTarget++
        state.userScore++
        if (taker) {
          credit(comp, () => {
            club.recordGoal(taker)
            ;(matchGoalLogs[comp] ??= []).push(taker.id)
          })
        }
        say('goal', goalLine(userName, taker?.name))
        opine(goalReaction({ team: userName, other: oppName, scorer: taker?.name, scoreFor: state.userScore, scoreAgainst: state.opponentScore, minute }))
      } else {
        const wide = Math.random() < 0.4
        if (!wide) stats.userShotsOnTarget++
        say('info', penaltyMissLine(userName, taker?.name, keeperDefends(undefined, oppName), wide))
        opine(penaltyMissReaction(userName, state.userScore, state.opponentScore))
      }
    }
    if (minute < 90 && Math.random() < M.penaltyChance / ment.defMod) {
      // Toque de mão de um defensor seu: o árbitro pode dar amarelo a ele.
      if (Math.random() < M.handballShare) {
        const offender = pickRandom(activeStarters(comp).filter((p) => ['CB', 'LB', 'RB', 'CDM'].includes(p.position)))
        say('penalty', penaltyHandballLine(oppName, undefined, offender?.name))
        if (offender && Math.random() < M.handballCard) rollCard('user', 'yellow', offender)
      } else say('penalty', penaltyAwardLine(oppName))
      opine(penaltyAwardReaction(oppName))
      stats.oppShots++
      if (Math.random() < convOpp) {
        stats.oppShotsOnTarget++
        state.opponentScore++
        say('opp_goal', goalLine(oppName))
        opine(goalReaction({ team: oppName, other: userName, scoreFor: state.opponentScore, scoreAgainst: state.userScore, minute }))
      } else {
        const wide = Math.random() < 0.4
        if (!wide) stats.oppShotsOnTarget++
        const keeper = keeperOf(comp)?.name
        say('info', penaltyMissLine(oppName, undefined, keeperDefends(keeper, userName), wide))
        opine(penaltyMissReaction(oppName, state.opponentScore, state.userScore))
      }
    }

    // Marcos da partida: começo do 2º tempo e apito final, sempre com o placar real.
    const phase = { possession: Math.round(stats.userPossession), userShots: stats.userShots, oppShots: stats.oppShots }
    if (minute === 46) {
      say('whistle', halfTimeLine(userName, oppName, state.userScore, state.opponentScore))
      opine(halfTimeReaction(userName, oppName, state.userScore, state.opponentScore, phase))
    }
    if (minute >= 90 + (state.addedTime ?? 0)) {
      say('whistle', fullTimeLine(userName, oppName, state.userScore, state.opponentScore))
      opine(fullTimeReaction(userName, oppName, state.userScore, state.opponentScore, phase))
    }
  }

  // Lesão ao vivo: a cada tick cada titular sorteia (chance da partida dividida pelos 45 ticks). A chance sobe com
  // cansaço e cai com Departamento Médico e Fisioterapeuta. A partida pausa e abre as substituições com o lesionado
  // já selecionado; trocá-lo não gasta substituição.
  function rollLiveInjury(minute: number, comp: MatchCompetition) {
    if (minute >= 88) return
    const medCut = 1 - INJURY.medicalReductionPerLevel * (club.upgrades.medicalCenterLevel - 1)
    const physio = club.clubStaff.physio
    for (const p of activeStarters(comp)) {
      if (p.injury) continue
      // Amistoso: todos jogam com energia 100, então o cansaço não aumenta a chance de lesão.
      const tired = comp === 'friendly' ? 0 : Math.max(0, 60 - (p.stamina ?? 100)) / 60
      const perMatch = (INJURY.baseChance + tired * INJURY.fatigueChance) * medCut * (physio ? STAFF_BONUS.physioChanceMult : 1)
      if (Math.random() >= perMatch / INJURY.matchTicks) continue
      const [lo, hi] = Math.random() < INJURY.severeChance ? INJURY.severeMatches : INJURY.lightMatches
      const matches = Math.max(1, Math.round(randInt(lo, hi) * medCut * (physio ? STAFF_BONUS.physioDurationMult : 1)))
      // +1: o fim desta partida já desconta um jogo de quem for substituído. O amistoso não desconta jogo, então sem o +1.
      p.injury = { matchesLeft: comp === 'friendly' ? matches : matches + 1 }
      const session = match.sessions[comp]
      const state = session.matchState
      state.events.unshift({
        minute,
        type: 'injury',
        description: `Lesão no ${club.name}! ${p.name} cai no gramado e precisa ser atendido. Fora por ${matches} ${matches === 1 ? 'jogo' : 'jogos'} se sair agora.`
      })
      ui.showToast(`${p.name} se lesionou! Faça a substituição.`, 'danger')
      saveGame()
      state.isRunning = false
      clearMatchTimer(comp)
      session.showSubDrawer = true
      session.subOutId = p.id
      session.subInId = ''
      return
    }
  }

  // Pós-jogo: lesionado que ficou em campo agrava a lesão (mais jogos fora); os demais cumprem uma partida.
  function applyInjuries() {
    squad.players.forEach((p) => {
      if (!p.injury) return
      if (squad.starterIds.includes(p.id)) {
        p.injury.matchesLeft = Math.min(INJURY.aggravateCap, p.injury.matchesLeft + INJURY.aggravateMatches)
        ui.showToast(`${p.name} agravou a lesão por jogar machucado: agora são ${p.injury.matchesLeft} jogos fora.`, 'danger')
        return
      }
      p.injury.matchesLeft -= 1
      if (p.injury.matchesLeft <= 0) delete p.injury
    })
    squad.replaceInjuredStarters()
  }

  // Disciplina pós-jogo, por competição: quem estava suspenso nela cumpriu esta partida; expulsos e pendurados
  // (3 amarelos na competição) são suspensos nela. Expulsão direta: 2 jogos. Segundo amarelo: 1 jogo.
  function applyDiscipline(cards: MatchCards | undefined, comp: MatchCompetition) {
    squad.players.forEach((p) => {
      const left = p.suspension?.[comp]
      if (!left || !p.suspension) return
      if (left <= 1) delete p.suspension[comp]
      else p.suspension[comp] = left - 1
      if (!Object.keys(p.suspension).length) delete p.suspension
    })
    if (!cards) return
    // Amarelos recebidos na partida: quem foi expulso pelo segundo amarelo levou dois (e depois o vermelho).
    const yellowsGiven = (id: string) => 1 + (cards.off.has(id) && !cards.direct.has(id) ? 1 : 0)
    cards.yellow.forEach((id) => {
      const yp = squad.players.find((pl) => pl.id === id)
      if (yp) for (let i = 0; i < yellowsGiven(id); i++) club.recordYellow(yp)
    })
    cards.off.forEach((id) => {
      const rp = squad.players.find((pl) => pl.id === id)
      if (rp) club.recordRed(rp)
    })
    const suspend =(p: { name: string; suspension?: Partial<Record<MatchCompetition, number>> }, games: number, why: string) => {
      p.suspension = { ...p.suspension, [comp]: Math.max(games, p.suspension?.[comp] ?? 0) }
      ui.showToast(`${p.name} está suspenso por ${games} ${games === 1 ? 'jogo' : 'jogos'} na ${COMP_SHORT[comp]} (${why}).`, 'warning')
    }
    cards.off.forEach((id) => {
      const p = squad.players.find((pl) => pl.id === id)
      if (p) suspend(p, cards.direct.has(id) ? 2 : 1, cards.direct.has(id) ? 'cartão vermelho' : 'segundo amarelo')
    })
    // Acúmulo da competição: todos os amarelos contam (inclusive os dois do expulso por segundo amarelo). Ao chegar a 3
    // vira suspensão de 1 jogo, a não ser que o atleta já esteja suspenso por esta expulsão.
    cards.yellow.forEach((id) => {
      const p = squad.players.find((pl) => pl.id === id)
      if (!p) return
      let total = (p.yellowCards?.[comp] ?? 0) + yellowsGiven(id)
      if (total >= 3) {
        total -= 3
        if (!cards.off.has(id)) suspend(p, 1, 'terceiro amarelo')
      }
      p.yellowCards = { ...p.yellowCards, [comp]: total }
    })
  }

  // Partida ao vivo salva à parte: recarregar a página retoma de onde parou (relógio, placar, cartões, trocas).
  function saveLiveMatch() {
    try {
      const live = COMPETITIONS_ORDER.filter((c) => match.isCompetitionLive(c))
      if (!live.length) {
        localStorage.removeItem(LIVE_MATCH_KEY)
        return
      }
      const sessions: Record<string, unknown> = {}
      const cards: Record<string, unknown> = {}
      const goals: Record<string, string[]> = {}
      const assists: Record<string, string[]> = {}
      live.forEach((c) => {
        sessions[c] = match.sessions[c]
        const k = matchCards[c]
        cards[c] = k ? { yellow: [...k.yellow], off: [...k.off], direct: [...k.direct], oppOff: k.oppOff } : null
        goals[c] = matchGoalLogs[c] ?? []
        assists[c] = matchAssistLogs[c] ?? []
      })
      localStorage.setItem(
        LIVE_MATCH_KEY,
        JSON.stringify({ v: 1, active: match.activeMatchCompetition, mentality: match.selectedMentality, sessions, cards, goals, assists })
      )
    } catch {
      /* silencioso, igual ao save principal */
    }
  }

  /** Retoma partidas que estavam ao vivo quando a página foi fechada. Devolve true se retomou alguma. */
  function restoreLiveMatches(): boolean {
    try {
      const raw = localStorage.getItem(LIVE_MATCH_KEY)
      if (!raw) return false
      const d = JSON.parse(raw)
      const restored: MatchCompetition[] = []
      for (const comp of COMPETITIONS_ORDER) {
        const s = d?.sessions?.[comp]
        if (!s?.matchState || s.matchState.isFinished || !competitions.isCompetitionPlayable(comp)) continue
        if (!s.matchState.isRunning && !s.showSubDrawer) continue
        match.sessions[comp] = s
        const k = d.cards?.[comp]
        matchCards[comp] = {
          yellow: new Set<string>(k?.yellow ?? []),
          off: new Set<string>(k?.off ?? []),
          direct: new Set<string>(k?.direct ?? []),
          oppOff: k?.oppOff ?? 0
        }
        matchGoalLogs[comp] = Array.isArray(d.goals?.[comp]) ? d.goals[comp] : []
        matchAssistLogs[comp] = Array.isArray(d.assists?.[comp]) ? d.assists[comp] : []
        restored.push(comp)
      }
      if (!restored.length) {
        localStorage.removeItem(LIVE_MATCH_KEY)
        return false
      }
      match.activeMatchCompetition = restored.includes(d.active) ? d.active : restored[0]
      if (d.mentality) match.selectedMentality = d.mentality
      resetNarration()
      // Partidas que estavam rodando seguem do mesmo minuto; as pausadas para trocas continuam pausadas.
      restored.forEach((c) => {
        if (match.sessions[c].matchState.isRunning) runMatchLoop(c)
      })
      router.push('/match')
      ui.showToast('Partida retomada de onde você parou.', 'info')
      return true
    } catch {
      localStorage.removeItem(LIVE_MATCH_KEY)
      return false
    }
  }

  function applyPostMatchProgression() {
    // Aparições no Hall da Fama e desgaste de stamina
    const drainBase = club.clubStaff.fitnessCoach ? STAFF_BONUS.fitnessDrain : STAFF_BONUS.fitnessDrainDefault
    squad.starterIds.forEach((id) => {
      const p = squad.players.find((pl) => pl.id === id)
      if (!p) return
      club.recordAppearance(p)
      p.stamina = clamp((p.stamina ?? 100) - drainBase, 35, 100)
    })

    // Recuperação do banco, reforçada pelo Centro Médico
    const medRec = 14 + club.upgrades.medicalCenterLevel * 4 + (club.clubStaff.fitnessCoach ? STAFF_BONUS.fitnessRecovery : 0)
    // Sem reservas (elenco de 11), os titulares recuperam metade: senão ficariam exaustos para sempre.
    const hasBench = squad.players.length > squad.starterIds.length
    squad.players.forEach((p) => {
      const isStarter = squad.starterIds.includes(p.id)
      if (isStarter && hasBench) return
      p.stamina = Math.min(100, (p.stamina ?? 100) + (isStarter ? Math.round(medRec / 2) : medRec))
    })

    applyInjuries()

    // Evolução por temporada (docs/plano-progressao.md): idade, distância ao potencial, CT, comissão, minutos e foco.
    const PG = PROGRESSION
    const perMatch = 1 / (PG.matchesPerSeason[club.division] ?? 30)
    const tcMult = 1 + PG.tcPerLevel * (club.upgrades.trainingCenterLevel - 1) + (club.clubStaff.assistantCoach ? STAFF_BONUS.assistantEvolution : 0)
    const gains: Array<{ id: string; name: string; overall: number }> = []
    squad.players.forEach((p) => {
      if (p.isLoanedOut || p.isLoanedIn) return // emprestados não evoluem
      if (p.overall >= p.potential) return
      const evoF = evolutionFactor(p.overall) // retorno decrescente acima de OVER 85; 0 no teto de evolução
      if (evoF <= 0) return
      const youthBonus = club.clubStaff.youthCoach && p.age <= STAFF_BONUS.youthCoachMaxAge ? STAFF_BONUS.youthCoachEvolution : 0
      const played = squad.starterIds.includes(p.id) ? 1 : PG.benchShare
      const focus = p.trainingFocus === POSITION_KEY_FOCUS[p.position] ? 1 + PG.focusBonus : 1
      const gap = Math.min(1, (p.potential - p.overall) / PG.gapFull)
      const expected = PG.seasonBase * progressionAgeFactor(p.age) * gap * (tcMult + youthBonus) * played * focus * evoF
      if (Math.random() < Math.min(PG.maxPerMatch, expected * perMatch)) {
        const f = p.trainingFocus || 'balanced'
        const attrKey = (f === 'balanced' ? pickRandom(['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']) : f) as keyof PlayerAttributes
        p.attributes[attrKey] = Math.min(99, p.attributes[attrKey] + 1)
        p.overall = Math.min(p.potential, p.overall + 1)
        refreshPlayerEconomy(p)
        club.recordEvolution(p.id)
        gains.push({ id: p.id, name: p.name, overall: p.overall })
      }
    })
    return gains
  }

  // Amistoso: lesionado que ficou em campo agrava; ninguém cumpre jogo de lesão antiga (senão vira cura por farm).
  function applyFriendlyInjuries() {
    squad.players.forEach((p) => {
      if (!p.injury || !squad.starterIds.includes(p.id)) return
      p.injury.matchesLeft = Math.min(INJURY.aggravateCap, p.injury.matchesLeft + INJURY.aggravateMatches)
      ui.showToast(`${p.name} agravou a lesão por jogar machucado: agora são ${p.injury.matchesLeft} jogos fora.`, 'danger')
    })
    squad.replaceInjuredStarters()
  }

  // Fim do amistoso: fora da temporada. Sem disciplina, economia da partida, desgaste, evolução, marcos, histórico de
  // partidas nem propostas; club.reputation não muda (a fama é separada).
  function concludeFriendly() {
    const comp: MatchCompetition = 'friendly'
    const session = match.sessions[comp]
    matchGoalLogs[comp] = []
    matchAssistLogs[comp] = []
    delete matchCards[comp]
    applyFriendlyInjuries()
    const fs = friendlies.settle(session.matchState.userScore, session.matchState.opponentScore, Date.now())
    const prize = fs?.prize ?? 0
    session.lastMatchSummary = {
      ticket: 0,
      sponsor: 0,
      winBonus: prize,
      wages: 0,
      net: prize,
      interest: 0,
      maintenance: 0,
      ...(fs ? { friendly: fs } : {})
    }
    saveGame()
    saveLiveMatch()
  }

  function concludeMatch(comp: MatchCompetition = match.activeMatchCompetition) {
    if (comp === 'friendly') {
      concludeFriendly()
      return
    }
    const session = match.sessions[comp]
    const uGoals = session.matchState.userScore
    const oGoals = session.matchState.opponentScore
    const isHome = isHomeFor(comp)
    const rival = opponentFor(comp)

    matchGoalLogs[comp] = []
    matchAssistLogs[comp] = []
    const cards = matchCards[comp]
    delete matchCards[comp]
    const sh = session.matchState.shootout
    const shoot = sh?.done ? shootoutStatus(sh.kicks, sh.first) : null
    const pens = shoot ? { user: shoot.user, opp: shoot.opp } : null
    const summary = settleMatch(uGoals, oGoals, isHome, pens)
    session.lastMatchSummary = summary
    applyDiscipline(cards, comp)
    const evolved = applyPostMatchProgression()
    if (evolved.length) summary.evolutions = evolved.map((g) => ({ name: g.name, overall: g.overall }))
    const newMilestones = club.addMilestones(
      checkMilestones({
        season: club.season,
        teamOver: squad.teamStrength.rating,
        bestPlayerOver: Math.max(0, ...squad.players.map((p) => p.overall)),
        existingIds: club.progress.milestones.map((m) => m.id)
      })
    )
    if (newMilestones.length) summary.milestones = newMilestones.map((m) => m.title)

    if (comp === 'supercup' || comp === 'recopa') {
      const r = competitions.applyFinalResult(comp, uGoals, oGoals, pens)
      ui.showToast(r.toast, r.toastType)
    } else if (comp === 'cup') {
      const r = competitions.applyCupResult(uGoals, oGoals, club.name, pens)
      ui.showToast(r.toast, r.toastType)
    } else if (comp === 'continental') {
      const r = competitions.applyContinentalResult(uGoals, oGoals, club.name, rival.name, pens)
      if (r) ui.showToast(r.toast, r.toastType)
    } else {
      league.recordRoundResults(uGoals, oGoals, pens)
      applyStageOutcome(league.evaluateStageProgression())
    }

    match.addMatchRecord({
      id: `${Date.now()}-${comp}`,
      playedAt: Date.now(),
      season: club.season,
      competition: comp,
      label: labelFor(comp),
      userName: club.name,
      opponentName: rival.name,
      isHome,
      userScore: uGoals,
      opponentScore: oGoals,
      mentality: match.mentalityInfo.label,
      formation: squad.formation,
      events: JSON.parse(JSON.stringify(session.matchState.events)),
      stats: { ...session.matchStats },
      summary: JSON.parse(JSON.stringify(summary)),
      penalties: pens
    })

    market.generateIncomingTransferOffer()
    saveGame()
    saveLiveMatch()
  }

  function finishMatchAndReturn() {
    const comp = match.activeMatchCompetition
    match.matchState.isFinished = false
    match.matchState.isRunning = false
    match.showSubDrawer = false
    router.push(comp === 'league' ? '/league' : comp === 'friendly' ? '/friendlies' : '/competitions')
    // Se outra partida segue aberta, ela vira o alvo do item "Partidas"; senão, competição encerrada volta para a liga.
    // Amistoso encerrado também volta para a liga: o próximo exige novo sorteio, não há pré-jogo a reabrir.
    const other = match.openCompetitions.find((c) => c !== comp)
    if (other) match.activeMatchCompetition = other
    else if (comp === 'friendly' || !competitions.isCompetitionPlayable(comp)) match.activeMatchCompetition = 'league'
  }

  return {
    activeMatchIsHome,
    lineupBlockers,
    lineupShort,
    activeMatchOpponent,
    activeMatchCompetitionLabel,
    effectiveUserPower,
    effectiveOpponentPower,
    prepareMatch,
    matchEntryLabel,
    isHomeFor,
    switchActiveMatch,
    opponentFor,
    labelFor,
    startLiveMatch,
    runMatchLoop,
    toggleMatchSpeed,
    openInMatchSubDrawer,
    closeInMatchSubDrawer,
    pendingInjuries,
    reorganizeTeam,
    recommendSubstitution,
    confirmInMatchSubstitution,
    simulateMatchTick,
    restoreLiveMatches,
    applyPostMatchProgression,
    concludeMatch,
    finishMatchAndReturn
  }
}
