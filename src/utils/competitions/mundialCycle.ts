import { MUNDIAL_EVERY, MUNDIAL_HOSTS, RANKING_CONTINENTAL } from '@/config/competitions'
import type { SeasonEcoRecord } from '@/types/club'
import { ecoPoints, rankingPoints } from '@/utils/competitions/rankingCondor'

export type CycleDoor = 'ouro' | 'ranking' | null

export interface CycleRow { key: 'serieA' | 'cup' | 'ouro' | 'prata' | 'supercup' | 'recopa'; points: number }

export interface CycleInfo {
  /** Temporada da próxima edição cujo ciclo está em andamento. */
  target: number
  /** Temporadas até a edição (0 = a edição é esta temporada). */
  remaining: number
  hostName: string
  hostIsUser: boolean
  total: number
  cutoff: number
  missing: number
  door: CycleDoor
  rows: CycleRow[]
}

/** Edição cujo ciclo conta agora: na temporada da própria edição, o ciclo já é o da seguinte. */
export function cycleTarget(season: number): number {
  return season % MUNDIAL_EVERY === 0 ? season + MUNDIAL_EVERY : Math.ceil(season / MUNDIAL_EVERY) * MUNDIAL_EVERY
}

export function hostForSeason(season: number) {
  const edition = Math.round(season / MUNDIAL_EVERY)
  return MUNDIAL_HOSTS[(edition - 1 + MUNDIAL_HOSTS.length) % MUNDIAL_HOSTS.length]
}

/** Pontos de uma competição isolada, reaproveitando `ecoPoints` sobre um registro em branco. */
function partial(r: SeasonEcoRecord, key: CycleRow['key']): number {
  const blank: SeasonEcoRecord = {
    ...r, leagueRank: null, leagueTitle: false, ouro: null, prata: null, cup: null, recopa: false, supercup: false
  }
  if (key === 'serieA') return ecoPoints({ ...blank, leagueRank: r.leagueRank, leagueTitle: r.leagueTitle })
  if (key === 'cup') return ecoPoints({ ...blank, cup: r.cup })
  if (key === 'ouro') return ecoPoints({ ...blank, ouro: r.ouro })
  if (key === 'prata') return ecoPoints({ ...blank, prata: r.prata })
  if (key === 'supercup') return ecoPoints({ ...blank, supercup: r.supercup })
  return ecoPoints({ ...blank, recopa: r.recopa })
}

export function cycleInfo(records: SeasonEcoRecord[], season: number): CycleInfo {
  const target = cycleTarget(season)
  const cycle = records.filter((r) => r.season >= target - MUNDIAL_EVERY && r.season < target)
  const host = hostForSeason(target)
  const total = rankingPoints(records, target)
  const cutoff = RANKING_CONTINENTAL.cutoff
  const keys: CycleRow['key'][] = ['serieA', 'cup', 'ouro', 'prata', 'supercup', 'recopa']
  const rows = keys.map((key) => ({ key, points: cycle.reduce((s, r) => s + partial(r, key), 0) }))
  const ouro = cycle.some((r) => r.ouro === 'champion')
  const door: CycleDoor = ouro ? 'ouro' : total >= cutoff ? 'ranking' : null
  return {
    target,
    remaining: target - season,
    hostName: host.name,
    hostIsUser: !!host.user,
    total,
    cutoff,
    missing: Math.max(0, cutoff - total),
    door,
    rows
  }
}
