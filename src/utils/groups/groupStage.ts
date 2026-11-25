import type { ContinentalTeam, GroupMatchResult, GroupTeam } from '@/types'
import { shuffle, type Rng } from '@/utils/core/random'
import { simulateMatchScore } from '@/utils/bracket/bracket'

/** Classificação do grupo: pontos, saldo, gols pró e, por fim, OVER. */
export const sortGroup = (teams: ContinentalTeam[]): ContinentalTeam[] =>
  [...teams].sort(
    (a, b) =>
      b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf || b.power - a.power
  )

/** Calendário do grupo (índices 0 a 3): rodadas 4 a 6 repetem 1 a 3 com mando invertido. */
export const GROUP_SCHEDULE: Array<Array<[number, number]>> = [
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

export function applyGroupMatch(home: ContinentalTeam, away: ContinentalTeam, hg: number, ag: number) {
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

export interface DrawGroupsOptions {
  /** Clube sede: ocupa a vaga A1 (primeiro do grupo A). */
  hostId?: string
  groupCount?: number
  /** Máximo de clubes da mesma confederação por grupo (padrão 1). */
  maxPerConfed?: number
  /** Exceções por confederação (padrão: europa 2). */
  confedMax?: Record<string, number>
  maxAttempts?: number
}

/**
 * Sorteio por potes de OVER (potes de `groupCount` clubes, do maior ao menor), um clube por grupo
 * em cada pote, com limite por confederação e novas tentativas. Esgotadas as tentativas, relaxa
 * a restrição de confederação (`relaxed: true`). Grupos com id 'A', 'B', ...
 */
export function drawGroups(
  field: GroupTeam[], rng: Rng = Math.random, opts: DrawGroupsOptions = {},
): { groups: Array<{ id: string; teams: GroupTeam[] }>; relaxed: boolean } {
  const n = opts.groupCount ?? 8
  const perGroup = Math.ceil(field.length / n)
  const maxPer = opts.maxPerConfed ?? 1
  const confedMax = opts.confedMax ?? { europa: 2 }
  const attempts = opts.maxAttempts ?? 200
  const host = opts.hostId ? field.find((t) => t.id === opts.hostId) : undefined
  // A sede ocupa A1 e entra no pote 1 por direito de sede (o pote 1 traz 1 clube a menos).
  const sorted = field.filter((t) => t !== host).sort((a, b) => b.power - a.power)
  const pots: GroupTeam[][] = []
  for (let p = 0, at = 0; p < perGroup; p++) {
    const size = p === 0 && host ? n - 1 : n
    pots.push(sorted.slice(at, at + size))
    at += size
  }
  const ids = Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i))

  const attempt = (enforce: boolean): GroupTeam[][] | null => {
    const groups: GroupTeam[][] = ids.map(() => [])
    const limit = (c?: string) => (c ? confedMax[c] ?? maxPer : maxPer)
    const fits = (g: GroupTeam[], t: GroupTeam) =>
      !enforce || !t.confed || g.filter((x) => x.confed === t.confed).length < limit(t.confed)
    for (let p = 0; p < perGroup; p++) {
      const pot = shuffle(pots[p], rng)
      if (p === 0 && host) groups[0].push(host)
      for (const t of pot) {
        const open = shuffle(groups.map((_, i) => i), rng)
          .filter((i) => groups[i].length === p && !(p === 0 && host && i === 0) && fits(groups[i], t))
        if (!open.length) return null
        groups[open[0]].push(t)
      }
    }
    return groups
  }

  for (let i = 0; i < attempts; i++) {
    const g = attempt(true)
    if (g) return { groups: g.map((teams, k) => ({ id: ids[k], teams })), relaxed: false }
  }
  for (let i = 0; i < attempts; i++) {
    const g = attempt(false)
    if (g) return { groups: g.map((teams, k) => ({ id: ids[k], teams })), relaxed: true }
  }
  throw new Error('drawGroups: sorteio impossível')
}

/**
 * Joga a rodada (1 a 6, `GROUP_SCHEDULE`) de um grupo de 4 pelo OVER, aplicando a tabela.
 * `neutral`: sem mando. `skipUser`: jogos do usuário ficam de fora (o chamador aplica o placar real).
 */
export function simulateGroupRound(
  group: GroupTeam[], round: number, rng: Rng = Math.random,
  opts: { neutral?: boolean; skipUser?: boolean } = {},
): GroupMatchResult[] {
  const sched = GROUP_SCHEDULE[(round - 1) % 3]
  const swap = round > 3
  const out: GroupMatchResult[] = []
  for (const [i, j] of sched) {
    const [hi, ai] = swap ? [j, i] : [i, j]
    const home = group[hi]
    const away = group[ai]
    if (!home || !away) continue
    if (opts.skipUser && (home.isUser || away.isUser)) continue
    const s = simulateMatchScore(home.power, away.power, rng, opts.neutral ? 0 : undefined)
    applyGroupMatch(home, away, s.home, s.away)
    out.push({ round, homeId: home.id, awayId: away.id, hg: s.home, ag: s.away })
  }
  return out
}
