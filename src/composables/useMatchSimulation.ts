import { computed } from 'vue'
import { router } from '@/router'
import { useClubStore } from '@/stores/club'
import { useCompetitionsStore } from '@/stores/competitions'
import { useLeagueStore } from '@/stores/league'
import { useMarketStore } from '@/stores/market'
import { useMatchStore } from '@/stores/match'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import type { MatchCompetition, MatchEventType, MatchOpponent } from '@/types/match'
import type { PlayerAttributes } from '@/types/player'
import { getEffectiveOvr } from '@/utils/calculateTeamStrength'
import { evolutionFactor, FORMATIONS, INJURY, MATCH_SIM, POSITION_KEY_FOCUS, PROGRESSION, progressionAgeFactor, STAFF_BONUS } from '@/utils/constants'
import { refreshPlayerEconomy } from '@/utils/generatePlayer'
import { checkMilestones } from '@/utils/progression'
import {
  commentLine,
  cornerLine,
  fullTimeLine,
  goalLine,
  halfTimeLine,
  keeperDefends,
  offTargetLine,
  resetNarration,
  savedLine
} from '@/utils/narration'
import { clamp, pickRandom, randInt } from '@/utils/random'
import { usePersistence } from './usePersistence'
import { useEconomy } from './useEconomy'
import { useSeason } from './useSeason'

// Timer fora de componentes: a partida continua ao trocar de tela.
const MATCH_DURATION_NORMAL_MS = 120_000 // 2 min
const MATCH_DURATION_2X_MS = 60_000 // 1 min

let matchTimer: ReturnType<typeof setInterval> | null = null

// Gols registrados na partida em andamento (revertidos se abandonada).
let matchGoalLog: string[] = []

// Minuto do último comentário solto: segura o ritmo para o narrador não falar o tempo todo.
let lastCommentMinute = -99
const COMMENT_GAP_MIN = 2
const COMMENT_CHANCE = 0.65

function clearMatchTimer() {
  if (matchTimer !== null) {
    clearInterval(matchTimer)
    matchTimer = null
  }
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
  const { saveGame } = usePersistence()
  const { settleMatch } = useEconomy()
  const { applyStageOutcome } = useSeason()

  const activeMatchIsHome = computed(() => {
    if (match.activeMatchCompetition === 'league') return league.nextFixtureIsHome
    if (match.activeMatchCompetition === 'continental') {
      const c = competitions.continentalState
      // groupRound = rodada a jogar (1-based); rodadas 4 a 6 do grupo são fora
      return c.stage !== 'GROUPS' || c.groupRound <= 3
    }
    return true
  })

  const activeMatchOpponent = computed<MatchOpponent>(() => {
    const comp = match.activeMatchCompetition
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
  })

  const activeMatchCompetitionLabel = computed(() => {
    const comp = match.activeMatchCompetition
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
  })

  // Mando de +3 OVER só vale na liga e no continental; Copa, Supercopa e Recopa não dão mando ao usuário.
  const homeBonusOn = computed(() => homeBonusApplies(match.activeMatchCompetition))
  // OVER de partida (sem arredondar): OVER do time + mando. Mesma unidade do OVER dos rivais.
  const userMatchRating = computed(
    () => squad.teamStrength.rating + (homeBonusOn.value && activeMatchIsHome.value ? MATCH_SIM.homeAdvantage : 0)
  )
  const opponentMatchRating = computed(
    () => activeMatchOpponent.value.power + (homeBonusOn.value && !activeMatchIsHome.value ? MATCH_SIM.homeAdvantage : 0)
  )
  const effectiveUserPower = computed(() => Math.round(userMatchRating.value))
  const effectiveOpponentPower = computed(() => Math.round(opponentMatchRating.value))

  function discardInProgressGoals() {
    matchGoalLog.forEach((id) => club.revertGoal(id))
    matchGoalLog = []
  }

  function prepareMatch(comp: MatchCompetition = 'league') {
    clearMatchTimer()
    if (!competitions.isCompetitionPlayable(comp)) {
      ui.showToast('Competição já encerrada.', 'warning')
      router.push(comp === 'league' ? '/league' : '/competitions')
      return
    }
    discardInProgressGoals()
    match.activeMatchCompetition = comp
    match.resetMatchState()
    router.push('/pre-match')
  }

  function startLiveMatch() {
    clearMatchTimer()
    const comp = match.activeMatchCompetition
    if (!competitions.isCompetitionPlayable(comp)) {
      ui.showToast('Competição já encerrada.', 'warning')
      router.push(comp === 'league' ? '/league' : '/competitions')
      return
    }
    discardInProgressGoals()
    lastCommentMinute = -99
    resetNarration()
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
          type: 'info',
          description: `Apita o árbitro! Começa ${club.name} x ${activeMatchOpponent.value.name}!`
        }
      ]
    }
    match.resetStats()
    match.showSubDrawer = false
    // O relógio só roda se a tela da partida realmente abriu.
    const abortStart = () => {
      clearMatchTimer()
      match.resetMatchState()
      ui.showToast('Não foi possível abrir a partida. Recarregue a página.', 'danger')
    }
    router.push('/match').then((failure) => (failure ? abortStart() : runMatchLoop()), abortStart)
  }

  function runMatchLoop() {
    clearMatchTimer()
    // Duração da partida: 2 min na velocidade normal e 1 min no 2x. O relógio avança 2 minutos de jogo por tick (45 ticks).
    const totalMs = match.matchState.speed === 2 ? MATCH_DURATION_2X_MS : MATCH_DURATION_NORMAL_MS
    const intervalMs = Math.round(totalMs / (90 / 2))
    matchTimer = setInterval(() => {
      if (!match.matchState.isRunning) return
      match.matchState.minute += 2
      simulateMatchTick(match.matchState.minute)
      if (match.matchState.minute >= 90) {
        match.matchState.minute = 90
        match.matchState.isRunning = false
        match.matchState.isFinished = true
        clearMatchTimer()
        concludeMatch()
      }
    }, intervalMs)
  }

  function toggleMatchSpeed() {
    match.matchState.speed = match.matchState.speed === 1 ? 2 : 1
    if (match.matchState.isRunning) runMatchLoop()
  }

  function openInMatchSubDrawer() {
    match.matchState.isRunning = false
    match.showSubDrawer = true
    match.subOutId = ''
    match.subInId = ''
  }

  function closeInMatchSubDrawer() {
    match.showSubDrawer = false
    if (!match.matchState.isFinished) {
      match.matchState.isRunning = true
      runMatchLoop()
    }
  }

  // Sugere a melhor troca: maior ganho de OVER efetivo na vaga (posição, cansaço e lesão contam). Só preenche a
  // seleção; quem confirma é o usuário. Sem substituições restantes, só lesionados podem sair.
  function recommendSubstitution() {
    const subsLeft = match.matchState.subsUsed < 5
    const bench = squad.availableBenchList.filter((p) => !p.injury)
    let best: { outId: string; inId: string; gain: number } | null = null
    squad.currentStartersList.forEach((starter) => {
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
    if (!match.subOutId || !match.subInId || (!forced && match.matchState.subsUsed >= 5)) return
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
  }

  function simulateMatchTick(minute: number) {
    const ment = match.mentalityInfo
    const stats = match.matchStats
    const state = match.matchState
    const M = MATCH_SIM
    const diff = userMatchRating.value - opponentMatchRating.value
    const userName = club.name
    const oppName = activeMatchOpponent.value.name
    let narrated = false
    const say = (type: MatchEventType, description: string) => {
      state.events.unshift({ minute, type, description })
      narrated = true
    }

    rollLiveInjury(minute)

    const basePoss = clamp(Math.round(50 + diff * M.possessionPerOver + (ment.atkMod - 1) * 40), 32, 68)
    stats.userPossession = clamp(basePoss + randInt(-3, 3), 28, 72)

    // Nem todo escanteio é narrado (os totais aparecem nas estatísticas).
    if (Math.random() < 0.16) {
      stats.userCorners++
      if (Math.random() < 0.35) say('info', cornerLine(userName))
    }
    if (Math.random() < 0.15) {
      stats.oppCorners++
      if (Math.random() < 0.35) say('info', cornerLine(oppName))
    }
    if (Math.random() < 0.18) stats.userFouls++
    if (Math.random() < 0.18) stats.oppFouls++

    // Mentalidade muda o quanto o jogo é aberto: multiplica as chances próprias e divide as do rival.
    const userChanceProb = clamp((M.userChanceBase + M.slope * diff) * ment.atkMod, M.chanceMin, M.chanceMax)
    const oppChanceProb = clamp((M.oppChanceBase - M.slope * diff) / ment.defMod, M.chanceMin, M.chanceMax)

    if (Math.random() < userChanceProb) {
      stats.userShots++
      const starters = squad.currentStartersList
      const attackers = starters.filter((p) => ['ST', 'LW', 'RW', 'CAM', 'CM'].includes(p.position))
      const shooter = pickRandom(attackers.length ? attackers : starters)

      if (Math.random() < M.userOnTarget) {
        stats.userShotsOnTarget++
        if (Math.random() < M.userGoal) {
          state.userScore++
          if (shooter) {
            club.recordGoal(shooter)
            matchGoalLog.push(shooter.id)
          }
          say('goal', goalLine(userName, shooter?.name))
        } else {
          say('info', savedLine(userName, shooter?.name, keeperDefends(undefined, oppName)))
        }
      } else {
        say('info', offTargetLine(userName, shooter?.name))
      }
    }

    if (Math.random() < oppChanceProb) {
      stats.oppShots++
      if (Math.random() < M.oppOnTarget) {
        stats.oppShotsOnTarget++
        if (Math.random() < M.oppGoal) {
          state.opponentScore++
          say('opp_goal', goalLine(oppName))
        } else {
          const keeper = squad.currentStartersList.find((p) => p.position === 'GK')?.name
          say('info', savedLine(oppName, undefined, keeperDefends(keeper, userName)))
        }
      } else {
        say('info', offTargetLine(oppName))
      }
    }

    // Marcos da partida: começo do 2º tempo e apito final, sempre com o placar real.
    if (minute === 46) say('info', halfTimeLine(userName, oppName, state.userScore, state.opponentScore))
    if (minute >= 90) say('info', fullTimeLine(userName, oppName, state.userScore, state.opponentScore))

    // Momentos vagos: sem lance narrado neste tick, espaça os comentários e solta um dado real, uma dica ou uma piada.
    if (!narrated && minute < 88 && minute - lastCommentMinute >= COMMENT_GAP_MIN && Math.random() < COMMENT_CHANCE) {
      lastCommentMinute = minute
      const tired = squad.currentStartersList.find((p) => (p.stamina ?? 100) < 60)
      const injured = squad.currentStartersList.find((p) => p.injury)
      say(
        'comment',
        commentLine({
          minute,
          user: userName,
          opp: oppName,
          possession: Math.round(stats.userPossession),
          userShots: stats.userShots,
          oppShots: stats.oppShots,
          userOnTarget: stats.userShotsOnTarget,
          oppOnTarget: stats.oppShotsOnTarget,
          userCorners: stats.userCorners,
          oppCorners: stats.oppCorners,
          userScore: state.userScore,
          oppScore: state.opponentScore,
          userPlayer: pickRandom(squad.currentStartersList.filter((p) => p.position !== 'GK'))?.name,
          tired: tired ? { name: tired.name, stamina: Math.round(tired.stamina ?? 100) } : undefined,
          injuredOnPitch: injured?.name
        })
      )
    }
  }

  // Lesão ao vivo: a cada tick cada titular sorteia (chance da partida dividida pelos 45 ticks). A chance sobe com
  // cansaço e cai com Departamento Médico e Fisioterapeuta. A partida pausa e abre as substituições com o lesionado
  // já selecionado; trocá-lo não gasta substituição.
  function rollLiveInjury(minute: number) {
    if (minute >= 88) return
    const medCut = 1 - INJURY.medicalReductionPerLevel * (club.upgrades.medicalCenterLevel - 1)
    const physio = club.clubStaff.physio
    for (const p of squad.currentStartersList) {
      if (p.injury) continue
      const tired = Math.max(0, 60 - (p.stamina ?? 100)) / 60
      const perMatch = (INJURY.baseChance + tired * INJURY.fatigueChance) * medCut * (physio ? STAFF_BONUS.physioChanceMult : 1)
      if (Math.random() >= perMatch / INJURY.matchTicks) continue
      const [lo, hi] = Math.random() < INJURY.severeChance ? INJURY.severeMatches : INJURY.lightMatches
      const matches = Math.max(1, Math.round(randInt(lo, hi) * medCut * (physio ? STAFF_BONUS.physioDurationMult : 1)))
      // +1: o fim desta partida já desconta um jogo de quem for substituído.
      p.injury = { matchesLeft: matches + 1 }
      const state = match.matchState
      state.events.unshift({
        minute,
        type: 'injury',
        description: `Lesão no ${club.name}! ${p.name} cai no gramado e precisa ser atendido. Fora por ${matches} ${matches === 1 ? 'jogo' : 'jogos'} se sair agora.`
      })
      ui.showToast(`${p.name} se lesionou! Faça a substituição.`, 'danger')
      state.isRunning = false
      clearMatchTimer()
      match.showSubDrawer = true
      match.subOutId = p.id
      match.subInId = ''
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

  function concludeMatch() {
    const uGoals = match.matchState.userScore
    const oGoals = match.matchState.opponentScore
    const comp = match.activeMatchCompetition
    const isHome = activeMatchIsHome.value
    const rival = activeMatchOpponent.value

    matchGoalLog = []
    match.lastMatchSummary = settleMatch(uGoals, oGoals, isHome)
    const evolved = applyPostMatchProgression()
    if (evolved.length) match.lastMatchSummary.evolutions = evolved.map((g) => ({ name: g.name, overall: g.overall }))
    const newMilestones = club.addMilestones(
      checkMilestones({
        season: club.season,
        teamOver: squad.teamStrength.rating,
        bestPlayerOver: Math.max(0, ...squad.players.map((p) => p.overall)),
        existingIds: club.progress.milestones.map((m) => m.id)
      })
    )
    if (newMilestones.length) match.lastMatchSummary.milestones = newMilestones.map((m) => m.title)

    if (comp === 'supercup' || comp === 'recopa') {
      const r = competitions.applyFinalResult(comp, uGoals, oGoals)
      ui.showToast(r.toast, r.toastType)
    } else if (comp === 'cup') {
      const r = competitions.applyCupResult(uGoals, oGoals, club.name)
      ui.showToast(r.toast, r.toastType)
    } else if (comp === 'continental') {
      const r = competitions.applyContinentalResult(uGoals, oGoals, club.name, rival.name)
      if (r) ui.showToast(r.toast, r.toastType)
    } else {
      league.recordRoundResults(uGoals, oGoals)
      applyStageOutcome(league.evaluateStageProgression())
    }

    market.generateIncomingTransferOffer()
    saveGame()
  }

  function finishMatchAndReturn() {
    match.matchState.isFinished = false
    match.matchState.isRunning = false
    match.showSubDrawer = false
    router.push(match.activeMatchCompetition === 'league' ? '/league' : '/competitions')
    // Competição que acabou de terminar não deve ficar como alvo do item "Partidas".
    if (!competitions.isCompetitionPlayable(match.activeMatchCompetition)) match.activeMatchCompetition = 'league'
  }

  return {
    activeMatchIsHome,
    activeMatchOpponent,
    activeMatchCompetitionLabel,
    effectiveUserPower,
    effectiveOpponentPower,
    prepareMatch,
    startLiveMatch,
    runMatchLoop,
    toggleMatchSpeed,
    openInMatchSubDrawer,
    closeInMatchSubDrawer,
    recommendSubstitution,
    confirmInMatchSubstitution,
    simulateMatchTick,
    applyPostMatchProgression,
    concludeMatch,
    finishMatchAndReturn
  }
}
