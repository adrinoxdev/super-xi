// Núcleo puro da chave (sem Vue nem Pinia). Sorteios recebem `rng` injetável.
import type {
  Bracket, BracketCompetition, BracketLeg, BracketRound, BracketTeam, BracketTie,
  PenaltyShootout, Podium, PodiumEntry,
} from '@/types/bracket'
import { clamp, type Rng } from '@/utils/core/random'
import { MATCH_SIM } from '@/config'

export const SIM_TICKS = MATCH_SIM.ticks
export const HOME_ADVANTAGE = MATCH_SIM.homeAdvantage
export const FORM_SWING = MATCH_SIM.formSwing
const BASE_CONVERSION = 0.76
const USER_ID = 'user'

/** Placar de dois times da IA a partir do OVER (mandante ganha +MATCH_SIM.homeAdvantage). */
export function simulateMatchScore(homePower: number, awayPower: number, rng: Rng = Math.random) {
  const h = homePower + HOME_ADVANTAGE + (rng() * 2 - 1) * FORM_SWING
  const a = awayPower + (rng() * 2 - 1) * FORM_SWING
  const pH = clamp(MATCH_SIM.aiChanceBase + MATCH_SIM.slope * (h - a), MATCH_SIM.chanceMin, MATCH_SIM.chanceMax)
  const pA = clamp(MATCH_SIM.aiChanceBase + MATCH_SIM.slope * (a - h), MATCH_SIM.chanceMin, MATCH_SIM.chanceMax)
  let home = 0
  let away = 0
  for (let t = 0; t < SIM_TICKS; t++) {
    if (rng() < pH && rng() < MATCH_SIM.aiOnTarget && rng() < MATCH_SIM.aiGoal) home++
    if (rng() < pA && rng() < MATCH_SIM.aiOnTarget && rng() < MATCH_SIM.aiGoal) away++
  }
  return { home, away }
}

/** Conversão ajustada por OVER: 0.76 + clamp((próprio - outro) / MATCH_SIM.shootoutDiv, -0.04, 0.04). */
export function shootoutConversions(homePower: number, awayPower: number): [number, number] {
  return [
    BASE_CONVERSION + clamp((homePower - awayPower) / MATCH_SIM.shootoutDiv, -0.04, 0.04),
    BASE_CONVERSION + clamp((awayPower - homePower) / MATCH_SIM.shootoutDiv, -0.04, 0.04),
  ]
}

/** Cobranças alternadas: 5 para cada (encerra cedo se decidida), depois morte súbita até 20. */
export function simulateShootout(
  rng: Rng = Math.random, convHome = BASE_CONVERSION, convAway = BASE_CONVERSION,
): PenaltyShootout {
  let home = 0
  let away = 0
  for (let k = 1; k <= 20; k++) {
    if (rng() < convHome) home++
    if (k <= 5 && home > away + (5 - (k - 1))) break
    if (rng() < convAway) away++
    if (k <= 5) {
      const rem = 5 - k
      if (home > away + rem || away > home + rem) break
    } else if (home !== away) {
      break
    }
  }
  if (home === away) home++ // desempate forçado (praticamente inalcançável)
  return { home, away }
}

/** Disputa com vencedor imposto: repete até o lado pedido vencer (100 tentativas, senão 5x4 orientado). */
export function shootoutWithWinner(winner: 'home' | 'away', rng: Rng = Math.random): PenaltyShootout {
  for (let i = 0; i < 100; i++) {
    const s = simulateShootout(rng)
    if ((winner === 'home') === (s.home > s.away)) return s
  }
  return winner === 'home' ? { home: 5, away: 4 } : { home: 4, away: 5 }
}

const emptyLeg = (homeId: string, awayId: string): BracketLeg =>
  ({ homeId, awayId, homeScore: null, awayScore: null, played: false })

/** Ida e volta: legs[0] = visitante x mandante, legs[1] = mandante x visitante. */
export function fillTieTeams(tie: BracketTie, homeId: string, awayId: string): void {
  tie.homeId = homeId
  tie.awayId = awayId
  tie.legs = tie.legCount === 1
    ? [emptyLeg(homeId, awayId)]
    : [emptyLeg(awayId, homeId), emptyLeg(homeId, awayId)]
}

export function createTie(
  id: string, roundIndex: number, slot: number, legCount: 1 | 2,
  homeId: string | null, awayId: string | null, homeLabel = 'A definir', awayLabel = 'A definir',
): BracketTie {
  const tie: BracketTie = {
    id, roundIndex, slot, homeId: null, awayId: null, homeLabel, awayLabel, legCount,
    legs: [], penalties: null, winnerId: null, loserId: null,
  }
  if (homeId && awayId) fillTieTeams(tie, homeId, awayId)
  return tie
}

export function createBracket(p: {
  competition: BracketCompetition; season: number; label: string; teams: BracketTeam[]
  rounds: Array<{ key: string; label: string; shortLabel: string; legCount: 1 | 2 }>
  firstRound: Array<[string | null, string | null]>
  firstRoundLabels?: Array<[string, string]>
  thirdPlace: boolean; thirdLegCount?: 1 | 2
}): Bracket {
  const teams: Record<string, BracketTeam> = {}
  for (const t of p.teams) teams[t.id] = t
  const rounds: BracketRound[] = p.rounds.map((r, ri) => {
    const count = Math.max(1, Math.floor(p.firstRound.length / 2 ** ri))
    const ties: BracketTie[] = []
    for (let s = 0; s < count; s++) {
      const id = `${p.competition}_r${ri}_t${s}`
      if (ri === 0) {
        const [h, a] = p.firstRound[s]
        const [hl, al] = p.firstRoundLabels?.[s] ?? ['A definir', 'A definir']
        ties.push(createTie(id, ri, s, r.legCount, h, a, hl, al))
      } else {
        const prev = p.rounds[ri - 1].shortLabel
        ties.push(createTie(id, ri, s, r.legCount, null, null,
          `Venc. ${prev} ${2 * s + 1}`, `Venc. ${prev} ${2 * s + 2}`))
      }
    }
    return { key: r.key, label: r.label, shortLabel: r.shortLabel, legCount: r.legCount, ties }
  })
  let thirdPlace: BracketTie | null = null
  if (p.thirdPlace) {
    const semi = p.rounds.length >= 2 ? p.rounds[p.rounds.length - 2].shortLabel : 'Semifinal'
    thirdPlace = createTie(`${p.competition}_third`, -1, 0, p.thirdLegCount ?? 1, null, null,
      `Perd. ${semi} 1`, `Perd. ${semi} 2`)
  }
  return { competition: p.competition, season: p.season, label: p.label, teams, rounds, thirdPlace, side: null, podium: null }
}

export function playLeg(tie: BracketTie, legIndex: number, homeGoals: number, awayGoals: number): void {
  const leg = tie.legs[legIndex]
  if (!leg) return
  leg.homeScore = homeGoals
  leg.awayScore = awayGoals
  leg.played = true
}

/** Agregado do ponto de vista de tie.homeId / tie.awayId; null se falta jogo. */
export function tieAggregate(tie: BracketTie): { home: number; away: number } | null {
  if (!tie.homeId || !tie.awayId || tie.legs.length === 0) return null
  let home = 0
  let away = 0
  for (const leg of tie.legs) {
    if (!leg.played) return null
    const hs = leg.homeScore ?? 0
    const as = leg.awayScore ?? 0
    if (leg.homeId === tie.homeId) { home += hs; away += as } else { home += as; away += hs }
  }
  return { home, away }
}

const setWinner = (tie: BracketTie, winner: 'home' | 'away') => {
  tie.winnerId = winner === 'home' ? tie.homeId : tie.awayId
  tie.loserId = winner === 'home' ? tie.awayId : tie.homeId
}

const hasUser = (t: BracketTie) => t.homeId === USER_ID || t.awayId === USER_ID

/** Joga os jogos pendentes (se houver) e decide o vencedor; empate no agregado vai a pênaltis. */
export function resolveTie(
  tie: BracketTie, teams: Record<string, BracketTeam>, rng: Rng = Math.random, userDrawWinProb = 0.55,
): void {
  if (tie.winnerId || !tie.homeId || !tie.awayId) return
  for (const leg of tie.legs) {
    if (leg.played) continue
    const s = simulateMatchScore(teams[leg.homeId]?.power ?? 0, teams[leg.awayId]?.power ?? 0, rng)
    leg.homeScore = s.home
    leg.awayScore = s.away
    leg.played = true
  }
  const agg = tieAggregate(tie)
  if (!agg) return
  if (agg.home !== agg.away) { setWinner(tie, agg.home > agg.away ? 'home' : 'away'); return }
  if (hasUser(tie)) {
    const userIsHome = tie.homeId === USER_ID
    const userWins = rng() < userDrawWinProb
    tie.penalties = shootoutWithWinner(userWins === userIsHome ? 'home' : 'away', rng)
  } else {
    const [ch, ca] = shootoutConversions(teams[tie.homeId]?.power ?? 0, teams[tie.awayId]?.power ?? 0)
    tie.penalties = simulateShootout(rng, ch, ca)
  }
  setWinner(tie, tie.penalties.home > tie.penalties.away ? 'home' : 'away')
}

/** Simula confronto da IA; não toca em confronto com 'user'. */
export function simulateTie(tie: BracketTie, teams: Record<string, BracketTeam>, rng: Rng = Math.random): void {
  if (hasUser(tie) || tie.winnerId || !tie.homeId || !tie.awayId) return
  resolveTie(tie, teams, rng)
}

const allTies = (b: Bracket): BracketTie[] => [
  ...b.rounds.flatMap(r => r.ties),
  ...(b.thirdPlace ? [b.thirdPlace] : []),
  ...(b.side ? b.side.ties : []),
]

const fillFrom = (tie: BracketTie, h: string | null, a: string | null, userHosts: boolean) => {
  if (tie.homeId || tie.awayId || !h || !a) return
  if (userHosts && a === USER_ID) fillTieTeams(tie, a, h)
  else fillTieTeams(tie, h, a)
}

const entry = (b: Bracket, id: string | null, userName: string): PodiumEntry => ({
  teamId: id ?? '',
  name: id === USER_ID ? userName : (id ? b.teams[id]?.name ?? id : ''),
  isUser: id === USER_ID,
})

function summarize(b: Bracket, tie: BracketTie, userName: string): string {
  const nm = (id: string | null) => (id === USER_ID ? userName : (id ? b.teams[id]?.name ?? id : ''))
  if (tie.walkover) return `W.O. (${nm(tie.winnerId)} avança)`
  const agg = tieAggregate(tie)
  if (!agg) return ''
  const pens = tie.penalties ? ` (pên. ${tie.penalties.home} x ${tie.penalties.away})` : ''
  if (tie.legCount === 2) return `Agregado ${agg.home} x ${agg.away}${pens}`
  return `${nm(tie.homeId)} ${agg.home} x ${agg.away} ${nm(tie.awayId)}${pens}`
}

export function buildPodium(bracket: Bracket, userName: string): Podium | null {
  const fin = bracket.rounds[bracket.rounds.length - 1]?.ties[0]
  if (!fin || !fin.winnerId || !fin.loserId) return null
  const third = bracket.thirdPlace
  if (third && !third.winnerId) return null
  return {
    competition: bracket.competition,
    competitionLabel: bracket.label,
    season: bracket.season,
    champion: entry(bracket, fin.winnerId, userName),
    runnerUp: entry(bracket, fin.loserId, userName),
    third: third ? entry(bracket, third.winnerId, userName) : null,
    finalSummary: summarize(bracket, fin, userName),
    thirdSummary: third ? summarize(bracket, third, userName) : null,
  }
}

/** Preenche fases seguintes, disputa de 3º, lado (perdedores das quartas) e pódio. Não simula. */
export function propagate(bracket: Bracket, opts: { userHosts?: boolean } = {}): void {
  const uh = !!opts.userHosts
  const R = bracket.rounds
  for (let r = 0; r < R.length - 1; r++) {
    for (const tie of R[r + 1].ties) {
      fillFrom(tie, R[r].ties[2 * tie.slot]?.winnerId ?? null, R[r].ties[2 * tie.slot + 1]?.winnerId ?? null, uh)
    }
  }
  if (bracket.thirdPlace && R.length >= 2) {
    const semi = R[R.length - 2].ties
    fillFrom(bracket.thirdPlace, semi[0]?.loserId ?? null, semi[1]?.loserId ?? null, uh)
  }
  if (bracket.side && R.length >= 3) {
    const qf = R[R.length - 3].ties
    for (const tie of bracket.side.ties) {
      fillFrom(tie, qf[2 * tie.slot]?.loserId ?? null, qf[2 * tie.slot + 1]?.loserId ?? null, uh)
    }
  }
  if (!bracket.podium) {
    bracket.podium = buildPodium(bracket, bracket.teams[USER_ID]?.name ?? 'Seu clube')
  }
}

/** Próximo confronto do usuário ainda sem vencedor (fases em ordem, depois 3º, depois lado). */
export function userPendingTie(bracket: Bracket): BracketTie | null {
  const ready = (t: BracketTie) => hasUser(t) && !t.winnerId && !!t.homeId && !!t.awayId
  for (const r of bracket.rounds) for (const t of r.ties) if (ready(t)) return t
  if (bracket.thirdPlace && ready(bracket.thirdPlace)) return bracket.thirdPlace
  for (const t of bracket.side?.ties ?? []) if (ready(t)) return t
  return null
}

/** Simula todos os confrontos da fase sem o usuário. Na final inclui o 3º; na semi inclui o lado. Não propaga. */
export function simulatePhaseExceptUser(bracket: Bracket, roundIndex: number, rng: Rng = Math.random): void {
  const round = bracket.rounds[roundIndex]
  if (!round) return
  for (const t of round.ties) simulateTie(t, bracket.teams, rng)
  if (roundIndex === bracket.rounds.length - 1 && bracket.thirdPlace) simulateTie(bracket.thirdPlace, bracket.teams, rng)
  if (roundIndex === bracket.rounds.length - 2 && bracket.side) {
    for (const t of bracket.side.ties) simulateTie(t, bracket.teams, rng)
  }
}

/** Repete simular e propagar até haver pódio. Com forfeitUser, o confronto do usuário vira W.O. */
export function completeBracket(bracket: Bracket, rng: Rng = Math.random, opts: { forfeitUser?: boolean } = {}): void {
  for (let guard = 0; guard < 200; guard++) {
    propagate(bracket)
    if (bracket.podium) return
    let progress = false
    for (const t of allTies(bracket)) {
      if (t.winnerId || !t.homeId || !t.awayId) continue
      if (hasUser(t)) {
        if (!opts.forfeitUser) continue
        t.walkover = true
        setWinner(t, t.homeId === USER_ID ? 'away' : 'home')
        progress = true
      } else {
        simulateTie(t, bracket.teams, rng)
        progress = progress || !!t.winnerId
      }
    }
    if (!progress) return
  }
}

/** 1 campeão, 2 vice, 3 vencedor do 3º, 4 perdedor do 3º; null se fora do pódio ou indefinido. */
export function userFinalPosition(bracket: Bracket): 1 | 2 | 3 | 4 | null {
  const fin = bracket.rounds[bracket.rounds.length - 1]?.ties[0]
  if (fin?.winnerId === USER_ID) return 1
  if (fin?.loserId === USER_ID) return 2
  const third = bracket.thirdPlace
  if (third?.winnerId === USER_ID) return 3
  if (third?.loserId === USER_ID) return 4
  return null
}
