import { RANKING_CONTINENTAL, MUNDIAL_EVERY } from '@/config/competitions'
import type { EcoPhase, SeasonEcoRecord } from '@/types/club'
import type { MundialEntry } from '@/types/competitions'

type PhasePoints = { groups: number; qf: number; sf: number; runnerUp: number; champion: number }

function phasePoints(table: PhasePoints, phase: EcoPhase | null): number {
  return phase ? table[phase] ?? 0 : 0
}

/** Pontos do Ranking Condor de uma temporada (vale a maior fase de cada competição). */
export function ecoPoints(r: SeasonEcoRecord): number {
  const R = RANKING_CONTINENTAL
  let p = phasePoints(R.ouro, r.ouro) + phasePoints(R.prata, r.prata)
  if (r.division === 1) {
    if (r.leagueTitle || r.leagueRank === 1) p += R.serieA.champion
    else if (r.leagueRank !== null && r.leagueRank >= 2 && r.leagueRank <= 4) p += R.serieA.top4
    else if (r.leagueRank !== null && r.leagueRank >= 5 && r.leagueRank <= 6) p += R.serieA.top6
  }
  if (r.cup === 'champion') p += R.cup.champion
  else if (r.cup === 'runnerUp') p += R.cup.runnerUp
  if (r.recopa) p += R.recopa
  if (r.supercup) p += R.supercup
  return p
}

/** Soma só as temporadas do ciclo: as `MUNDIAL_EVERY` anteriores à temporada da edição. */
export function rankingPoints(records: SeasonEcoRecord[], editionSeason: number): number {
  return records
    .filter((r) => r.season >= editionSeason - MUNDIAL_EVERY && r.season < editionSeason)
    .reduce((s, r) => s + ecoPoints(r), 0)
}

/**
 * Porta de entrada do usuário: ouro, depois sede, depois ranking (cutoff inclusive). Sem vaga: null.
 * `hostQualified`: o usuário já é a vaga da sede (decidido pelo campo).
 */
export function userMundialEntry(
  records: SeasonEcoRecord[],
  editionSeason: number,
  hostQualified = false
): MundialEntry | null {
  const cycle = records.filter((r) => r.season >= editionSeason - MUNDIAL_EVERY && r.season < editionSeason)
  if (cycle.some((r) => r.ouro === 'champion')) return 'ouro'
  if (hostQualified) return 'sede'
  if (rankingPoints(records, editionSeason) >= RANKING_CONTINENTAL.cutoff) return 'ranking'
  return null
}
