import { defineStore } from 'pinia'
import type { MatchCompetition } from '@/types/match'
import { computed, ref } from 'vue'
import type {
  ContinentalState,
  ContinentalTeam,
  ContinentalTier,
  CupState,
  FinalState
} from '@/types'
import { CONTINENTAL_RIVALS, PRIZES } from '@/config'
import type { Bracket, BracketTeam, BracketTie, Podium } from '@/types'
import {
  completeBracket,
  createBracket,
  playLeg,
  propagate,
  fillTieTeams,
  resolveTie,
  simulateMatchScore,
  simulatePhaseExceptUser,
  simulateTie,
  userFinalPosition,
  userPendingTie
} from '@/utils/bracket'
import {
  CONTINENTAL_QF_TEMPLATE,
  seedContinentalGroups,
  seedContinentalQuarterFinals,
  seedCup
} from '@/utils/bracketSeeding'
import { formatCurrency } from '@/utils/formatCurrency'
import { LEAGUE_CLUBS_POOL } from '@/utils/leagueScheduler'
import { pickRandom, randInt, shuffle } from '@/utils/random'
import { TEAM_ID_BY_NAME } from '@/utils/teamIdentities'
import { useClubStore } from './club'

export type ToastType = 'success' | 'danger' | 'warning' | 'info'
export interface CompetitionToast {
  toast: string
  toastType: ToastType
}

const DEFAULT_SUPERCUP_RIVAL = { name: 'Esporte Clube Estrela do Norte', power: 74 }
const DEFAULT_RECOPA_RIVAL = { name: 'Deportivo Costa Dourada', power: 75 }

const emptyCup = (): CupState => ({
  roundIndex: 0,
  eliminated: false,
  champion: false,
  currentRival: null,
  history: [],
  bracket: null,
  thirdPlace: false,
  finalPosition: null
})

const emptyContinental = (): ContinentalState => ({
  qualified: false,
  tier: 'sulamericana',
  stage: 'GROUPS',
  groupRound: 1,
  eliminated: false,
  champion: false,
  teams: [],
  history: [],
  otherGroups: [],
  bracket: null,
  finalPosition: null
})

/** Classificação do grupo: pontos, saldo, gols pró e, por fim, OVER. */
const sortGroup = (teams: ContinentalTeam[]): ContinentalTeam[] =>
  [...teams].sort(
    (a, b) =>
      b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || b.power - a.power
  )

/** Calendário do grupo (índices 0 a 3): rodadas 4 a 6 repetem 1 a 3 com mando invertido. */
const GROUP_SCHEDULE: Array<Array<[number, number]>> = [
  [
    [0, 1],
    [2, 3]
  ],
  [
    [0, 2],
    [1, 3]
  ],
  [
    [0, 3],
    [1, 2]
  ]
]

function applyGroupMatch(home: ContinentalTeam, away: ContinentalTeam, hg: number, ag: number) {
  home.played++
  away.played++
  home.gf += hg
  home.ga += ag
  away.gf += ag
  away.ga += hg
  if (hg > ag) {
    home.won++
    home.points += 3
  } else if (hg < ag) {
    away.won++
    away.points += 3
  } else {
    home.points += 1
    away.points += 1
  }
}

const emptyFinal = (rival: { name: string; power: number }): FinalState => ({
  qualified: false,
  played: false,
  won: false,
  scoreText: '',
  rivalName: rival.name,
  rivalPower: rival.power
})

export const useCompetitionsStore = defineStore('competitions', () => {
  const clubStore = useClubStore()

  const cupState = ref<CupState>(emptyCup())
  const continentalState = ref<ContinentalState>(emptyContinental())
  const supercupState = ref<FinalState>(emptyFinal(DEFAULT_SUPERCUP_RIVAL))
  const recopaState = ref<FinalState>(emptyFinal(DEFAULT_RECOPA_RIVAL))

  const cupRoundLabel = computed(() => {
    if (cupState.value.thirdPlace) return 'Disputa de 3º Lugar'
    const names = ['Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final da Taça Cacique']
    return names[cupState.value.roundIndex] || 'Final'
  })

  const continentalStageLabel = computed(() => {
    const c = continentalState.value
    if (c.stage === 'GROUPS') return `Fase de Grupos • Rodada ${c.groupRound}/6`
    if (c.stage === 'QF') return 'Quartas de Final Continental'
    if (c.stage === 'SF') return 'Semifinal Continental'
    if (c.stage === 'THIRD') return 'Disputa de 3º Lugar Continental'
    return 'Final Continental'
  })

  const continentalStandings = computed(() => sortGroup(continentalState.value.teams))

  const continentalOpponent = computed(() => {
    const cs = continentalState.value
    if (cs.stage !== 'GROUPS' && cs.bracket) {
      const tie = userPendingTie(cs.bracket)
      if (tie) {
        const oppId = tie.homeId === 'user' ? tie.awayId : tie.homeId
        const team = oppId ? cs.bracket.teams[oppId] : null
        if (team) return { name: team.name, power: team.power, style: 'Copa Condor' }
      }
    }
    const rivals = continentalState.value.teams.filter((t) => !t.isUser)
    const r =
      rivals[(continentalState.value.groupRound - 1) % Math.max(1, rivals.length)] ||
      CONTINENTAL_RIVALS[0]
    return { name: r.name, power: r.power, style: 'Copa Condor' }
  })

  const hasPendingFinal = computed(
    () =>
      (supercupState.value.qualified && !supercupState.value.played) ||
      (recopaState.value.qualified && !recopaState.value.played)
  )

  const hasPendingThirdPlace = computed(
    () =>
      (cupState.value.thirdPlace && isCompetitionPlayable('cup')) ||
      (continentalState.value.stage === 'THIRD' && isCompetitionPlayable('continental'))
  )

  const CUP_ROUNDS = [
    { key: 'R16', label: 'Oitavas de Final', shortLabel: 'Oitavas', legCount: 1 as const },
    { key: 'QF', label: 'Quartas de Final', shortLabel: 'Quartas', legCount: 1 as const },
    { key: 'SF', label: 'Semifinal', shortLabel: 'Semi', legCount: 1 as const },
    { key: 'FINAL', label: 'Final', shortLabel: 'Final', legCount: 1 as const }
  ]

  function buildCupBracket(excludeId?: string): Bracket {
    let seed = seedCup(Math.random)
    // Migração: o rival do save antigo não pode aparecer duas vezes na chave.
    if (excludeId) {
      for (let i = 0; i < 300 && seed.teams.some((t) => t.id === excludeId); i++) seed = seedCup(Math.random)
    }
    const { teams, firstRound } = seed
    const user = teams.find((t) => t.id === 'user')
    if (user) user.name = clubStore.name
    const bracket = createBracket({
      competition: 'cup',
      season: clubStore.season,
      label: 'Taça Cacique',
      teams,
      rounds: CUP_ROUNDS,
      firstRound,
      thirdPlace: true,
      thirdLegCount: 1
    })
    propagate(bracket, { userHosts: true })
    return bracket
  }

  function rivalFromTie(bracket: Bracket, tie: BracketTie | null): CupState['currentRival'] {
    if (!tie) return null
    const oppId = tie.homeId === 'user' ? tie.awayId : tie.homeId
    const team = oppId ? bracket.teams[oppId] : null
    if (!team) return null
    return { name: team.name, power: team.power, serieCode: team.tag ?? '' }
  }

  function initCupForSeason() {
    const bracket = buildCupBracket()
    cupState.value = {
      roundIndex: 0,
      eliminated: false,
      champion: false,
      currentRival: rivalFromTie(bracket, userPendingTie(bracket)),
      history: [],
      bracket,
      thirdPlace: false,
      finalPosition: null
    }
  }

  /** Fim da temporada: copa não concluída vira W.O. do usuário e o resto da chave é simulado. */
  function finishCupForSeason(): Podium | null {
    const cup = cupState.value
    if (!cup.bracket) return null
    if (!cup.bracket.podium) {
      cup.bracket.teams.user.name = clubStore.name
      completeBracket(cup.bracket, Math.random, { forfeitUser: true })
    }
    if (!cup.champion) cup.eliminated = true
    cup.thirdPlace = false
    cup.currentRival = null
    cup.finalPosition = cup.finalPosition ?? userFinalPosition(cup.bracket)
    return cup.bracket.podium
  }

  function buildContinentalBracket(tier: ContinentalTier, groups: ContinentalTeam[][]): Bracket {
    const teams: BracketTeam[] = groups.flat().map((t) => ({
      id: t.id,
      name: t.id === 'user' ? clubStore.name : t.name,
      power: t.power
    }))
    return createBracket({
      competition: 'continental',
      season: clubStore.season,
      label: tier === 'libertadores' ? 'Copa Condor de Ouro' : 'Copa Condor de Prata',
      teams,
      rounds: [
        { key: 'QF', label: 'Quartas de Final', shortLabel: 'Quartas', legCount: 1 },
        { key: 'SF', label: 'Semifinal', shortLabel: 'Semi', legCount: 1 },
        { key: 'FINAL', label: 'Final', shortLabel: 'Final', legCount: 1 }
      ],
      firstRound: CONTINENTAL_QF_TEMPLATE.map((): [string | null, string | null] => [null, null]),
      firstRoundLabels: CONTINENTAL_QF_TEMPLATE,
      thirdPlace: true,
      thirdLegCount: 1
    })
  }

  function initContinentalForSeason(qualified: boolean, tier: ContinentalTier = 'sulamericana') {
    if (!qualified) {
      continentalState.value = emptyContinental()
      return
    }
    const { groupA, others } = seedContinentalGroups(clubStore.name, Math.random)
    continentalState.value = {
      qualified: true,
      tier,
      stage: 'GROUPS',
      groupRound: 1,
      eliminated: false,
      champion: false,
      teams: groupA,
      history: [],
      otherGroups: others,
      bracket: buildContinentalBracket(tier, [groupA, ...others.map((g) => g.teams)]),
      finalPosition: null
    }
  }

  /**
   * Joga a rodada dos 4 grupos. userScore = gols do usuário e do adversário;
   * null = usuário sem jogar (W.O. 0 x 3, só no fim da temporada).
   */
  function playGroupRound(round: number, userScore: [number, number] | null, onlyOthers = false) {
    const c = continentalState.value
    const sched = GROUP_SCHEDULE[(round - 1) % 3]
    const swap = round > 3
    const groups: Array<{ id: string; teams: ContinentalTeam[] }> = [
      ...(onlyOthers ? [] : [{ id: 'A', teams: c.teams }]),
      ...c.otherGroups
    ]
    for (const g of groups) {
      for (const [i, j] of sched) {
        const [hi, ai] = swap ? [j, i] : [i, j]
        const home = g.teams[hi]
        const away = g.teams[ai]
        if (!home || !away) continue
        if (home.isUser || away.isUser) {
          const [u, o] = userScore ?? [0, 3]
          if (home.isUser) applyGroupMatch(home, away, u, o)
          else applyGroupMatch(home, away, o, u)
          continue
        }
        const s = simulateMatchScore(home.power, away.power)
        applyGroupMatch(home, away, s.home, s.away)
      }
    }
  }

  /** Após a 6ª rodada: preenche as quartas com os classificados e marca a origem de cada time. */
  function seedContinentalKnockout(forceUserTop2 = false) {
    const c = continentalState.value
    const b = c.bracket
    if (!b) return
    const sorted: Record<'A' | 'B' | 'C' | 'D', string[]> = { A: [], B: [], C: [], D: [] }
    const all: Array<['A' | 'B' | 'C' | 'D', ContinentalTeam[]]> = [
      ['A', c.teams],
      ...c.otherGroups.map((g): ['A' | 'B' | 'C' | 'D', ContinentalTeam[]] => [
        g.id as 'B' | 'C' | 'D',
        g.teams
      ])
    ]
    for (const [id, teams] of all) {
      sorted[id] = sortGroup(teams).map((t) => t.id)
      if (forceUserTop2 && id === 'A') {
        const ui = sorted.A.indexOf('user')
        if (ui > 1) [sorted.A[1], sorted.A[ui]] = [sorted.A[ui], sorted.A[1]]
      }
      sorted[id].forEach((tid, k) => {
        if (b.teams[tid]) b.teams[tid].tag = `${k + 1}º Grupo ${id}`
      })
    }
    seedContinentalQuarterFinals(sorted).forEach(([h, a], i) => {
      const tie = b.rounds[0].ties[i]
      if (a === 'user') fillTieTeams(tie, a, h)
      else fillTieTeams(tie, h, a)
    })
    b.teams.user.name = clubStore.name
    propagate(b, { userHosts: true })
  }

  /** Fim da temporada: continental não concluído vira W.O. do usuário e o resto da chave é simulado. */
  function finishContinentalForSeason(): Podium | null {
    const c = continentalState.value
    if (!c.qualified || !c.bracket) return null
    if (!c.bracket.podium) {
      if (c.stage === 'GROUPS') {
        for (let r = c.groupRound; r <= 6; r++) playGroupRound(r, null)
        c.groupRound = 6
        seedContinentalKnockout()
      }
      c.bracket.teams.user.name = clubStore.name
      completeBracket(c.bracket, Math.random, { forfeitUser: true })
    }
    if (!c.champion) c.eliminated = true
    c.finalPosition = c.finalPosition ?? userFinalPosition(c.bracket)
    return c.bracket.podium
  }

  // ---- Migração de saves antigos (sem chave) ----

  const OLD_CUP_NAMES = ['Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final da Taça Cacique']
  const CONTINENTAL_ROUND_LABELS = ['Quartas de Final Continental', 'Semifinal Continental', 'Final Continental']

  const bracketTies = (b: Bracket): BracketTie[] => [
    ...b.rounds.flatMap((r) => r.ties),
    ...(b.thirdPlace ? [b.thirdPlace] : []),
    ...(b.side ? b.side.ties : [])
  ]

  function legacyRivalId(name: string): string {
    const byName = TEAM_ID_BY_NAME[name]
    if (byName) return byName
    const found = Object.values(LEAGUE_CLUBS_POOL).flat().find((c) => c.name === name)
    return found?.id ?? 'legacy_rival'
  }

  /** Placar do usuário (primeiro número) lido do texto do histórico; null se não houver. */
  function scoreFromText(text: string | undefined): [number, number] | null {
    const m = text ? /(\d+) x (\d+)/.exec(text) : null
    return m ? [Number(m[1]), Number(m[2])] : null
  }

  /** Troca o id de um time da chave por outro (mapa, confrontos e pernas). */
  function renameBracketTeam(b: Bracket, from: string, to: string, team: BracketTeam) {
    if (from !== to) {
      delete b.teams[from]
      const swap = (v: string | null) => (v === from ? to : v)
      for (const t of bracketTies(b)) {
        t.homeId = swap(t.homeId)
        t.awayId = swap(t.awayId)
        t.winnerId = swap(t.winnerId)
        t.loserId = swap(t.loserId)
        for (const l of t.legs) {
          l.homeId = swap(l.homeId) as string
          l.awayId = swap(l.awayId) as string
        }
      }
    }
    b.teams[to] = team
  }

  /** Fecha o confronto do usuário na fase como resultado reconstruído (legado) e simula o resto da fase. */
  function legacyUserResult(b: Bracket, roundIdx: number, userWon: boolean, score: [number, number] | null) {
    const tie = b.rounds[roundIdx]?.ties.find(
      (t) => (t.homeId === 'user' || t.awayId === 'user') && !t.winnerId && !!t.homeId && !!t.awayId
    )
    if (!tie || !tie.homeId || !tie.awayId) return
    const userIsHome = tie.homeId === 'user'
    if (score) {
      playLeg(tie, 0, userIsHome ? score[0] : score[1], userIsHome ? score[1] : score[0])
    } else if (tie.legs[0]) {
      tie.legs[0].played = true
    }
    const opp = userIsHome ? tie.awayId : tie.homeId
    tie.winnerId = userWon ? 'user' : opp
    tie.loserId = userWon ? opp : 'user'
    tie.legacy = true
    simulatePhaseExceptUser(b, roundIdx)
    propagate(b, { userHosts: true })
  }

  /** Taça Cacique de save antigo: reconstrói a chave alinhada ao roundIndex, ao histórico e ao rival atual. */
  function migrateCup() {
    const cup = cupState.value
    if (cup.bracket) return
    const rival = cup.currentRival
    const rivalId = rival ? legacyRivalId(rival.name) : null
    const b = buildCupBracket(rivalId ?? undefined)
    const last = b.rounds.length - 1
    const pending = Math.min(cup.roundIndex, last)
    const scoreOf = (r: number) =>
      scoreFromText(
        cup.history.find((h) => h.roundName === OLD_CUP_NAMES[r] || h.roundName === b.rounds[r].label)?.summary
      )
    const wins = cup.champion ? last + 1 : pending
    for (let r = 0; r < wins; r++) legacyUserResult(b, r, true, scoreOf(r))
    if (!cup.champion && rival && rivalId) {
      const tie = userPendingTie(b)
      const oppId = tie ? (tie.homeId === 'user' ? tie.awayId : tie.homeId) : null
      if (tie && oppId) {
        renameBracketTeam(b, oppId, rivalId, {
          id: rivalId,
          name: rival.name,
          power: rival.power,
          ...(rival.serieCode ? { tag: rival.serieCode } : {})
        })
      }
    }
    if (cup.eliminated && !cup.champion) legacyUserResult(b, pending, false, scoreOf(pending))
    b.teams.user.name = clubStore.name
    cup.bracket = b
    if (cup.champion) {
      completeBracket(b)
      cup.finalPosition = 1
      cup.thirdPlace = false
      cup.currentRival = null
    } else if (cup.eliminated) {
      if (pending === 2) {
        // Regra nova aplicada a quem caiu na semi: abre a disputa de 3º.
        cup.eliminated = false
        cup.thirdPlace = true
        cup.currentRival = rivalFromTie(b, userPendingTie(b))
      } else {
        completeBracket(b)
        if (pending === last) cup.finalPosition = 2
        cup.currentRival = null
      }
    } else {
      propagate(b, { userHosts: true })
      if (!cup.currentRival) cup.currentRival = rivalFromTie(b, userPendingTie(b))
    }
  }

  /** Continental de save antigo: cria os grupos B, C e D, a chave e as fases já jogadas. */
  function migrateContinental() {
    const c = continentalState.value
    if (!c.qualified || (c.bracket && c.otherGroups.length)) return
    if (!c.teams.length) {
      initContinentalForSeason(true, c.tier)
      return
    }
    const seed = seedContinentalGroups(clubStore.name, Math.random)
    const aIds = new Set(c.teams.map((t) => t.id))
    const pool = shuffle(
      [...seed.others.flatMap((g) => g.teams), ...seed.groupA.filter((t) => !t.isUser)].filter((t) => !aIds.has(t.id)),
      Math.random
    )
    c.otherGroups = ['B', 'C', 'D'].map((id, g) => ({ id, teams: pool.slice(g * 4, g * 4 + 4) }))
    const groupsDone = c.stage !== 'GROUPS' || c.eliminated
    const rounds = groupsDone ? 6 : Math.max(0, c.groupRound - 1)
    for (let r = 1; r <= rounds; r++) playGroupRound(r, null, true)
    const b = buildContinentalBracket(c.tier, [c.teams, ...c.otherGroups.map((g) => g.teams)])
    c.bracket = b
    if (!groupsDone) return
    c.groupRound = 6
    seedContinentalKnockout(c.stage !== 'GROUPS')
    const idx = ({ QF: 0, SF: 1, FINAL: 2 } as Record<string, number | undefined>)[c.stage]
    if (idx !== undefined) {
      const scoreOf = (r: number) =>
        scoreFromText(c.history.find((h) => h.summary.startsWith(`${CONTINENTAL_ROUND_LABELS[r]}:`))?.summary)
      const wins = c.champion ? 3 : idx
      for (let r = 0; r < wins; r++) legacyUserResult(b, r, true, scoreOf(r))
      if (c.eliminated && !c.champion) legacyUserResult(b, idx, false, scoreOf(idx))
    }
    if (c.champion) {
      completeBracket(b)
      c.finalPosition = 1
    } else if (c.eliminated && c.stage === 'SF') {
      c.stage = 'THIRD'
      c.eliminated = false
    } else if (c.eliminated) {
      completeBracket(b)
      c.finalPosition = userFinalPosition(b)
    }
  }

  /** Chamar depois de fromSave: saves antigos ganham a chave reconstruída (a virada de temporada troca as vigentes). */
  function ensureBrackets() {
    const cup = cupState.value
    if (!cup.bracket && (cup.currentRival || cup.eliminated || cup.champion || cup.history.length)) migrateCup()
    migrateContinental()
  }

  function resetFinals() {
    supercupState.value = emptyFinal(DEFAULT_SUPERCUP_RIVAL)
    recopaState.value = emptyFinal(DEFAULT_RECOPA_RIVAL)
  }

  function qualifySupercup() {
    const pick = pickRandom(LEAGUE_CLUBS_POOL[1])
    supercupState.value = {
      qualified: true,
      played: false,
      won: false,
      scoreText: '',
      rivalName: pick.name,
      rivalPower: pick.basePower
    }
  }

  function qualifyRecopa() {
    const pick = pickRandom(CONTINENTAL_RIVALS)
    recopaState.value = {
      qualified: true,
      played: false,
      won: false,
      scoreText: '',
      rivalName: pick.name,
      rivalPower: pick.power
    }
  }

  function applyCupResult(uGoals: number, oGoals: number, clubName: string): CompetitionToast {
    const cup = cupState.value
    if (!cup.bracket) migrateCup()
    const b = cup.bracket
    if (!b) return { toast: 'Competição já encerrada.', toastType: 'warning' }
    b.teams.user.name = clubName
    const tie = userPendingTie(b)
    if (!tie) return { toast: 'Competição já encerrada.', toastType: 'warning' }
    const isThird = tie === b.thirdPlace
    const idx = tie.roundIndex
    const rivalName = cup.currentRival?.name ?? ''
    const userIsHome = tie.homeId === 'user'
    playLeg(tie, 0, userIsHome ? uGoals : oGoals, userIsHome ? oGoals : uGoals)
    resolveTie(tie, b.teams, Math.random, 0.55)
    const userWon = tie.winnerId === 'user'
    let scoreLabel = `${uGoals} x ${oGoals}`
    if (tie.penalties) {
      const pu = userIsHome ? tie.penalties.home : tie.penalties.away
      const po = userIsHome ? tie.penalties.away : tie.penalties.home
      scoreLabel += ` (Pênaltis ${pu}x${po}: ${userWon ? 'Classificado' : 'Eliminado'})`
    }
    const summary = `${clubName} ${scoreLabel} ${rivalName}`
    const final = b.rounds[b.rounds.length - 1].ties[0]
    if (isThird) simulateTie(final, b.teams)
    else simulatePhaseExceptUser(b, idx)
    propagate(b, { userHosts: true })

    const finish = (position: 1 | 2 | 3 | 4) => {
      cup.finalPosition = position
      cup.thirdPlace = false
      cup.currentRival = null
    }

    if (isThird) {
      const prize = userWon ? PRIZES.cup.thirdWin : PRIZES.cup.thirdLoss
      clubStore.earn(prize)
      cup.history.unshift({ roundName: 'Disputa de 3º Lugar', summary, prize })
      cup.eliminated = true
      finish(userWon ? 3 : 4)
      return userWon
        ? {
            toast: `3º LUGAR NA TAÇA CACIQUE! Cota: ${formatCurrency(prize)}`,
            toastType: 'success'
          }
        : { toast: '4º lugar na Taça Cacique.', toastType: 'info' }
    }

    const roundName = b.rounds[idx].label
    if (!userWon) {
      if (idx === 3) {
        const prize = PRIZES.cup.finalLoss
        clubStore.earn(prize)
        cup.history.unshift({ roundName, summary, prize })
        cup.eliminated = true
        finish(2)
        return { toast: 'Vice-campeão da Taça Cacique.', toastType: 'info' }
      }
      cup.history.unshift({ roundName, summary, prize: 0 })
      if (idx === 2) {
        cup.thirdPlace = true
        cup.currentRival = rivalFromTie(b, userPendingTie(b))
        return { toast: 'Eliminado na semifinal. Dispute o 3º lugar!', toastType: 'warning' }
      }
      cup.eliminated = true
      completeBracket(b)
      cup.currentRival = null
      return { toast: 'Eliminado da Taça Cacique.', toastType: 'warning' }
    }

    const prize = PRIZES.cup.rounds[idx]
    clubStore.earn(prize)
    cup.history.unshift({ roundName, summary, prize })
    if (idx >= 3) {
      cup.champion = true
      cup.currentRival = null
      cup.finalPosition = 1
      clubStore.recordTrophy('title', 'Campeão da Taça Cacique', prize)
      return { toast: 'CAMPEÃO DA TAÇA CACIQUE!', toastType: 'success' }
    }
    cup.roundIndex += 1
    cup.currentRival = rivalFromTie(b, userPendingTie(b))
    return {
      toast: `Classificado na Taça Cacique! Cota: ${formatCurrency(prize)}`,
      toastType: 'success'
    }
  }

  function applyContinentalResult(
    uGoals: number,
    oGoals: number,
    clubName: string,
    rivalName: string
  ): CompetitionToast | null {
    if (continentalState.value.qualified && (!continentalState.value.bracket || !continentalState.value.otherGroups.length)) {
      migrateContinental()
    }
    const c = continentalState.value
    const prize = uGoals > oGoals ? PRIZES.continental.win : PRIZES.continental.other
    let result: CompetitionToast | null = null

    if (c.stage === 'GROUPS') {
      clubStore.earn(prize)
      playGroupRound(c.groupRound, [uGoals, oGoals])
      c.history.unshift({
        summary: `Rodada ${c.groupRound}: ${clubName} ${uGoals} x ${oGoals} ${rivalName}`,
        prize
      })
      if (c.groupRound >= 6) {
        const rank = continentalStandings.value.findIndex((t) => t.isUser) + 1
        seedContinentalKnockout()
        if (rank <= 2) {
          c.stage = 'QF'
          result = { toast: 'Classificado ao Mata-Mata Continental!', toastType: 'success' }
        } else {
          c.eliminated = true
          if (c.bracket) {
            completeBracket(c.bracket)
            c.finalPosition = userFinalPosition(c.bracket)
          }
          result = { toast: 'Eliminado na fase de grupos continental.', toastType: 'warning' }
        }
      } else {
        c.groupRound += 1
      }
      return result
    }

    const b = c.bracket
    const tie = b ? userPendingTie(b) : null
    if (!b || !tie) return { toast: 'Competição já encerrada.', toastType: 'warning' }
    clubStore.earn(prize)
    b.teams.user.name = clubName
    const stageLabel = continentalStageLabel.value
    const isThird = tie === b.thirdPlace
    const idx = tie.roundIndex
    const userIsHome = tie.homeId === 'user'
    playLeg(tie, 0, userIsHome ? uGoals : oGoals, userIsHome ? oGoals : uGoals)
    resolveTie(tie, b.teams, Math.random, 0.55)
    const userWon = tie.winnerId === 'user'
    let scoreLabel = `${uGoals} x ${oGoals}`
    if (tie.penalties) {
      const pu = userIsHome ? tie.penalties.home : tie.penalties.away
      const po = userIsHome ? tie.penalties.away : tie.penalties.home
      scoreLabel += ` (Pênaltis ${pu}x${po}: ${userWon ? 'Classificado' : 'Eliminado'})`
    }
    c.history.unshift({ summary: `${stageLabel}: ${clubName} ${scoreLabel} ${rivalName}`, prize })
    const final = b.rounds[b.rounds.length - 1].ties[0]
    if (isThird) simulateTie(final, b.teams)
    else simulatePhaseExceptUser(b, idx)
    propagate(b, { userHosts: true })

    const bonus = (amount: number, text: string) => {
      if (amount <= 0) return
      clubStore.earn(amount)
      c.history.unshift({ summary: text, prize: amount })
    }
    const finish = (position: 1 | 2 | 3 | 4) => {
      c.finalPosition = position
      c.eliminated = true
    }

    if (isThird) {
      if (userWon) bonus(PRIZES.continental.third, 'Bônus de 3º lugar continental')
      finish(userWon ? 3 : 4)
      return userWon
        ? { toast: '3º LUGAR NA COPA CONDOR!', toastType: 'success' }
        : { toast: '4º lugar na Copa Condor.', toastType: 'info' }
    }
    if (!userWon) {
      if (idx === 2) {
        bonus(PRIZES.continental.runnerUp, 'Bônus de vice-campeão continental')
        finish(2)
        return { toast: 'Vice-campeão continental.', toastType: 'info' }
      }
      if (idx === 1) {
        c.stage = 'THIRD'
        return {
          toast: 'Eliminado na semifinal continental. Dispute o 3º lugar!',
          toastType: 'warning'
        }
      }
      c.eliminated = true
      completeBracket(b)
      c.finalPosition = userFinalPosition(b)
      return { toast: 'Eliminado no mata-mata continental.', toastType: 'warning' }
    }
    if (idx === 0) {
      c.stage = 'SF'
      return { toast: 'Avançou para a Semifinal Continental!', toastType: 'success' }
    }
    if (idx === 1) {
      c.stage = 'FINAL'
      return { toast: 'Na Final Continental!', toastType: 'success' }
    }
    c.champion = true
    c.finalPosition = 1
    const title =
      c.tier === 'libertadores' ? 'Campeão da Copa Condor de Ouro' : 'Campeão da Copa Condor de Prata'
    clubStore.recordTrophy('title', title, PRIZES.continental.champion)
    bonus(PRIZES.continental.champion, 'Bônus de campeão continental')
    return { toast: `${title.toUpperCase()}!`, toastType: 'success' }
  }

  function applyFinalResult(
    kind: 'supercup' | 'recopa',
    uGoals: number,
    oGoals: number
  ): CompetitionToast {
    const isSuper = kind === 'supercup'
    const state = isSuper ? supercupState : recopaState
    const titlePrize = isSuper ? PRIZES.supercup.champion : PRIZES.recopa.champion
    const runnerUpPrize = isSuper ? PRIZES.supercup.runnerUp : PRIZES.recopa.runnerUp
    const titleName = isSuper ? 'Campeão da Supercopa Soberana' : 'Campeão da Recopa Condor'
    let userWon = uGoals > oGoals
    let scoreText = `${uGoals} x ${oGoals}`
    if (uGoals === oGoals) {
      const uPen = 4 + randInt(0, 1)
      userWon = Math.random() < 0.56
      const oPen = userWon ? uPen - 1 : uPen + 1
      scoreText += ` (${uPen}x${oPen} pên.)`
    }
    state.value.played = true
    state.value.won = userWon
    state.value.scoreText = scoreText
    if (userWon) {
      clubStore.earn(titlePrize)
      clubStore.recordTrophy('title', titleName, titlePrize)
      return {
        toast: `${titleName.toUpperCase()}! Prêmio: ${formatCurrency(titlePrize)}!`,
        toastType: 'success'
      }
    }
    clubStore.earn(runnerUpPrize)
    return { toast: `Vice-campeão (${scoreText}). Prêmio: ${formatCurrency(runnerUpPrize)}.`, toastType: 'info' }
  }

  function toSave() {
    return {
      supercupState: supercupState.value,
      recopaState: recopaState.value,
      cupState: cupState.value,
      continentalState: continentalState.value
    }
  }

  function fromSave(data: Partial<ReturnType<typeof toSave>> | null | undefined) {
    if (!data) return
    if (data.cupState) cupState.value = { ...emptyCup(), ...data.cupState }
    if (data.continentalState) continentalState.value = { ...emptyContinental(), ...data.continentalState }
    if (data.supercupState) supercupState.value = data.supercupState
    if (data.recopaState) recopaState.value = data.recopaState
  }

  function isCompetitionPlayable(comp: MatchCompetition): boolean {
    if (comp === 'cup') {
      const c = cupState.value
      return !c.eliminated && !c.champion && !!c.currentRival
    }
    if (comp === 'continental') {
      const c = continentalState.value
      return c.qualified && !c.eliminated && !c.champion
    }
    if (comp === 'supercup') return supercupState.value.qualified && !supercupState.value.played
    if (comp === 'recopa') return recopaState.value.qualified && !recopaState.value.played
    return true
  }

  return {
    isCompetitionPlayable,
    cupState,
    continentalState,
    supercupState,
    recopaState,
    cupRoundLabel,
    continentalStageLabel,
    continentalStandings,
    continentalOpponent,
    hasPendingFinal,
    hasPendingThirdPlace,
    initCupForSeason,
    finishCupForSeason,
    initContinentalForSeason,
    finishContinentalForSeason,
    resetFinals,
    qualifySupercup,
    qualifyRecopa,
    applyCupResult,
    applyContinentalResult,
    applyFinalResult,
    toSave,
    fromSave,
    ensureBrackets
  }
})
