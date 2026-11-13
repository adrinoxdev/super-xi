// Adaptador puro entre os jogos do mata-mata da liga (leagueFixtures) e a chave (Bracket).
import type { Bracket, BracketTeam, PenaltyShootout, BracketTie, CompetitionStageType, LeagueFixture, LeagueTeam } from '@/types'
import { createBracket, createTie, fillTieTeams, playLeg, propagate, resolveTie } from '@/utils/bracket/bracket'
import { SERIE_C_FINAL_TEMPLATE, serieDDrawTemplate } from '@/utils/bracket/bracketSeeding'
import type { Rng } from '@/utils/core/random'

const USER_ID = 'user'

export const STAGE_TIE_COUNT: Partial<Record<CompetitionStageType, number>> = {
  D_R64: 32, D_R32: 16, D_R16: 8, D_QF: 4, D_SF: 2, D_FINAL: 1, D_THIRD: 1, C_FINAL: 1, C_THIRD: 1
}
export const SINGLE_LEG_STAGES: CompetitionStageType[] = ['D_THIRD', 'C_THIRD']
export const PARALLEL_STAGES: Partial<Record<CompetitionStageType, CompetitionStageType[]>> = {
  D_FINAL: ['D_THIRD'], D_THIRD: ['D_FINAL'],
  C_FINAL: ['C_THIRD'], C_THIRD: ['C_FINAL']
}

type TieResult = { tie: number; winnerId: string; loserId: string }

const isSingle = (stage: CompetitionStageType) => SINGLE_LEG_STAGES.includes(stage)

/** pairs: [mandanteDaVolta, visitante]. Ida: rodada 1 (visitante manda); volta: rodada 2. Jogo único: rodada 1, mandante = pairs[i][0]. */
export function buildKnockoutFixtures(stage: CompetitionStageType, pairs: Array<[string, string]>): LeagueFixture[] {
  const out: LeagueFixture[] = []
  pairs.forEach(([home, away], k) => {
    const base = { stage, tie: k, homeScore: null, awayScore: null, played: false }
    if (isSingle(stage)) {
      out.push({ ...base, id: `fx_${stage}_t${k}`, round: 1, homeId: home, awayId: away })
    } else {
      out.push({ ...base, id: `fx_${stage}_t${k}_l1`, round: 1, leg: 1, homeId: away, awayId: home })
      out.push({ ...base, id: `fx_${stage}_t${k}_l2`, round: 2, leg: 2, homeId: home, awayId: away })
    }
  })
  return out
}

/** Jogos de um confronto, em ordem (ida, volta). */
function tieFixtures(fixtures: LeagueFixture[], stage: CompetitionStageType, k: number): LeagueFixture[] {
  return fixtures
    .filter((f) => f.stage === stage && f.tie === k)
    .sort((a, b) => (a.leg ?? 1) - (b.leg ?? 1))
}

/** Monta um BracketTie a partir dos jogos (pênaltis do último jogo viram pênaltis do confronto). */
function tieFromFixtures(fxs: LeagueFixture[], id: string, roundIndex: number, slot: number): BracketTie {
  const last = fxs[fxs.length - 1]
  const tie = createTie(id, roundIndex, slot, fxs.length === 2 ? 2 : 1, null, null)
  fillTieTeams(tie, last.homeId, last.awayId)
  fxs.forEach((f, i) => {
    if (f.played) playLeg(tie, i, f.homeScore ?? 0, f.awayScore ?? 0)
  })
  if (last.homePens != null && last.awayPens != null) tie.penalties = { home: last.homePens, away: last.awayPens }
  return tie
}

const decided = (tie: BracketTie): boolean => tie.legs.every((l) => l.played)

function applyWinnerFromScores(tie: BracketTie): void {
  let h = 0
  let a = 0
  for (const l of tie.legs) {
    if (l.homeId === tie.homeId) { h += l.homeScore ?? 0; a += l.awayScore ?? 0 } else { h += l.awayScore ?? 0; a += l.homeScore ?? 0 }
  }
  let homeWins: boolean | null = h === a ? null : h > a
  if (homeWins === null && tie.penalties) homeWins = tie.penalties.home > tie.penalties.away
  if (homeWins === null) return
  tie.winnerId = homeWins ? tie.homeId : tie.awayId
  tie.loserId = homeWins ? tie.awayId : tie.homeId
}

/** Resolve os confrontos da fase com todos os jogos disputados; grava pênaltis no último jogo. */
export function resolveStageTies(
  fixtures: LeagueFixture[], stage: CompetitionStageType, powerOf: (id: string) => number,
  rng: Rng = Math.random, userDrawWinProb = 0.55
): TieResult[] {
  const out: TieResult[] = []
  const count = STAGE_TIE_COUNT[stage] ?? 0
  for (let k = 0; k < count; k++) {
    const fxs = tieFixtures(fixtures, stage, k)
    if (fxs.length === 0 || fxs.some((f) => !f.played)) continue
    const tie = tieFromFixtures(fxs, `${stage}_t${k}`, 0, k)
    if (!tie.penalties) {
      const teams: Record<string, BracketTeam> = {}
      for (const id of [tie.homeId!, tie.awayId!]) teams[id] = { id, name: id, power: powerOf(id) }
      resolveTie(tie, teams, rng, userDrawWinProb)
      const pens = tie.penalties as PenaltyShootout | null
      if (pens) {
        const last = fxs[fxs.length - 1]
        last.homePens = pens.home
        last.awayPens = pens.away
      }
    } else {
      applyWinnerFromScores(tie)
    }
    if (tie.winnerId && tie.loserId) out.push({ tie: k, winnerId: tie.winnerId, loserId: tie.loserId })
  }
  return out
}

/** Só lê; null se algum confronto da fase está incompleto ou inexistente. */
export function stageTieResults(fixtures: LeagueFixture[], stage: CompetitionStageType): TieResult[] | null {
  const count = STAGE_TIE_COUNT[stage]
  if (!count) return null
  const out: TieResult[] = []
  for (let k = 0; k < count; k++) {
    const fxs = tieFixtures(fixtures, stage, k)
    if (fxs.length === 0 || fxs.some((f) => !f.played)) return null
    const tie = tieFromFixtures(fxs, `${stage}_t${k}`, 0, k)
    applyWinnerFromScores(tie)
    if (!tie.winnerId || !tie.loserId) return null
    out.push({ tie: k, winnerId: tie.winnerId, loserId: tie.loserId })
  }
  return out
}

/** Preenche um confronto da chave com os jogos da liga, se existirem. */
function fillFromFixtures(tie: BracketTie, fixtures: LeagueFixture[], stage: CompetitionStageType): void {
  const fxs = tieFixtures(fixtures, stage, tie.slot)
  if (fxs.length === 0) return
  const built = tieFromFixtures(fxs, tie.id, tie.roundIndex, tie.slot)
  tie.legCount = built.legCount
  tie.homeId = built.homeId
  tie.awayId = built.awayId
  tie.legs = built.legs
  tie.penalties = built.penalties
  if (decided(built)) {
    applyWinnerFromScores(built)
    tie.winnerId = built.winnerId
    tie.loserId = built.loserId
  }
}

const D_ROUNDS: Array<{ key: CompetitionStageType; label: string; shortLabel: string }> = [
  { key: 'D_R64', label: '2ª Fase', shortLabel: '2ª Fase' },
  { key: 'D_R32', label: '3ª Fase', shortLabel: '3ª Fase' },
  { key: 'D_R16', label: 'Oitavas de Final', shortLabel: 'Oitavas' },
  { key: 'D_QF', label: 'Quartas de Final', shortLabel: 'Quartas' },
  { key: 'D_SF', label: 'Semifinal', shortLabel: 'Semifinal' },
  { key: 'D_FINAL', label: 'Final', shortLabel: 'Final' }
]

/** Visão de chave (para BracketView) derivada dos jogos; fases ainda não criadas aparecem com rótulos. */
export function buildLeagueBracketView(a: {
  division: number; season: number; stage: CompetitionStageType; fixtures: LeagueFixture[]
  teams: LeagueTeam[]; clubName: string
}): Bracket | null {
  if (a.division !== 3 && a.division !== 4) return null
  const teams: BracketTeam[] = a.teams.map((t) => ({
    id: t.id, name: t.isUser || t.id === USER_ID ? a.clubName : t.name, power: t.power, tag: t.tag
  }))
  let b: Bracket
  if (a.division === 4) {
    const template = serieDDrawTemplate(a.season)
    const firstRound: Array<[string | null, string | null]> = template.map(() => [null, null])
    b = createBracket({
      competition: 'serieD', season: a.season, label: 'Liga Aurora — Série D', teams,
      rounds: D_ROUNDS.map((r) => ({ key: r.key, label: r.label, shortLabel: r.shortLabel, legCount: 2 as const })),
      firstRound, firstRoundLabels: template, thirdPlace: true, thirdLegCount: 1
    })
    D_ROUNDS.forEach((r, ri) => b.rounds[ri].ties.forEach((t) => fillFromFixtures(t, a.fixtures, r.key)))
    if (b.thirdPlace) fillFromFixtures(b.thirdPlace, a.fixtures, 'D_THIRD')
  } else {
    b = createBracket({
      competition: 'serieC', season: a.season, label: 'Liga Aurora — Série C', teams,
      rounds: [{ key: 'C_FINAL', label: 'Final', shortLabel: 'Final', legCount: 2 }],
      firstRound: [[null, null]], firstRoundLabels: [SERIE_C_FINAL_TEMPLATE[0]],
      thirdPlace: true, thirdLegCount: 1
    })
    if (b.thirdPlace) {
      b.thirdPlace.homeLabel = SERIE_C_FINAL_TEMPLATE[1][0]
      b.thirdPlace.awayLabel = SERIE_C_FINAL_TEMPLATE[1][1]
    }
    fillFromFixtures(b.rounds[0].ties[0], a.fixtures, 'C_FINAL')
    if (b.thirdPlace) fillFromFixtures(b.thirdPlace, a.fixtures, 'C_THIRD')
  }
  propagate(b)
  return b
}
