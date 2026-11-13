import type { BracketTeam, ContinentalGroup, ContinentalTeam } from '@/types'
import { CONTINENTAL_RIVALS, MATCH_SIM, SERIE_TYPICAL_OVER } from '@/utils/constants'
import { LEAGUE_CLUBS_POOL } from '@/utils/leagueScheduler'
import { mulberry32, shuffle } from '@/utils/random'
import type { Rng } from '@/utils/random'

/** Taça Cacique: sorteio por potes (A=4, B=4, C=4, D=3). Primeiro par: ['user', D1]. */
export function seedCup(rng: Rng): { teams: BracketTeam[]; firstRound: Array<[string, string]> } {
  const draw = (div: number, n: number, tag: string): BracketTeam[] =>
    shuffle(LEAGUE_CLUBS_POOL[div], rng)
      .slice(0, n)
      .map((c) => ({ id: c.id, name: c.name, power: c.basePower, tag }))
  const A = draw(1, 4, 'Série A')
  const B = draw(2, 4, 'Série B')
  const C = draw(3, 4, 'Série C')
  const D = draw(4, 3, 'Série D')
  const user: BracketTeam = { id: 'user', name: 'Seu clube', power: 0 }
  const firstRound: Array<[string, string]> = [
    ['user', D[0].id],
    [C[0].id, D[1].id],
    [B[0].id, C[1].id],
    [B[1].id, C[2].id],
    [A[0].id, D[2].id],
    [A[1].id, C[3].id],
    [A[2].id, B[2].id],
    [A[3].id, B[3].id]
  ]
  return { teams: [user, ...A, ...B, ...C, ...D], firstRound }
}

function mkTeam(id: string, name: string, power: number, isUser: boolean): ContinentalTeam {
  return { id, name, power, isUser, points: 0, played: 0, won: 0, gf: 0, ga: 0 }
}

/** Continental: grupo A (usuário no índice 0 + 3 rivais) e grupos B, C, D com 4 clubes cada. */
export function seedContinentalGroups(
  userName: string,
  rng: Rng
): { groupA: ContinentalTeam[]; others: ContinentalGroup[] } {
  const rivals = shuffle(CONTINENTAL_RIVALS, rng)
  const groupA = [
    mkTeam('user', userName, SERIE_TYPICAL_OVER[1], true),
    ...rivals.slice(0, 3).map((r) => mkTeam(r.id, r.name, r.power, false))
  ]
  const top7 = [...LEAGUE_CLUBS_POOL[1]].sort((a, b) => b.basePower - a.basePower).slice(0, 7)
  const rest = shuffle(
    [
      ...rivals.slice(3).map((r) => mkTeam(r.id, r.name, r.power, false)),
      ...top7.map((c) => mkTeam(c.id, c.name, c.basePower, false))
    ],
    rng
  )
  const others: ContinentalGroup[] = ['B', 'C', 'D'].map((id, g) => ({
    id,
    teams: rest.slice(g * 4, g * 4 + 4)
  }))
  return { groupA, others }
}

export const CONTINENTAL_QF_TEMPLATE: Array<[string, string]> = [
  ['1º Grupo A', '2º Grupo B'],
  ['1º Grupo C', '2º Grupo D'],
  ['1º Grupo B', '2º Grupo A'],
  ['1º Grupo D', '2º Grupo C']
]

/** Recebe os ids de cada grupo já ordenados (1º primeiro) e devolve as quartas na ordem do modelo. */
export function seedContinentalQuarterFinals(
  sortedGroups: Record<'A' | 'B' | 'C' | 'D', string[]>
): Array<[string, string]> {
  const g = sortedGroups
  return [
    [g.A[0], g.B[1]],
    [g.C[0], g.D[1]],
    [g.B[0], g.A[1]],
    [g.D[0], g.C[1]]
  ]
}

/** Modelo de sorteio da Série D (rótulos '1º A1'...), determinístico por temporada. */
export function serieDDrawTemplate(season: number): Array<[string, string]> {
  const rng = mulberry32(season * 7919 + 4)
  const pot1: string[] = []
  const pot2: string[] = []
  for (let g = 1; g <= 16; g++) {
    pot1.push(`1º A${g}`, `2º A${g}`)
    pot2.push(`3º A${g}`, `4º A${g}`)
  }
  const grp = (l: string) => l.slice(l.indexOf('A'))
  const p2 = shuffle(pot2, rng)
  // Conflito: troca com o próximo (i+1, i+2...) cuja troca não gere novo par do mesmo grupo.
  for (let i = 0; i < 32; i++) {
    if (grp(pot1[i]) !== grp(p2[i])) continue
    for (let k = 1; k < 32; k++) {
      const j = (i + k) % 32
      if (grp(pot1[i]) !== grp(p2[j]) && grp(pot1[j]) !== grp(p2[i])) {
        ;[p2[i], p2[j]] = [p2[j], p2[i]]
        break
      }
    }
  }
  const pairs = pot1.map((l, i): [string, string] => [l, p2[i]])
  return shuffle(pairs, rng)
}

/** R64 da Série D: cada par vem como [mandanteDaVolta, visitante]; o usuário, se presente, é o primeiro. */
export function seedSerieDR64(args: {
  season: number
  a1Top4: string[]
  virtualPool: string[]
  teams: Record<string, { power: number }>
  rng: Rng
}): { pairs: Array<[string, string]>; tags: Record<string, string> } {
  const { season, a1Top4, virtualPool, teams, rng } = args
  const byLabel: Record<string, string> = {}
  const tags: Record<string, string> = {}
  const place = (label: string, id: string) => {
    byLabel[label] = id
    tags[id] = label
  }
  a1Top4.forEach((id, k) => place(`${k + 1}º A1`, id))
  const shuffled = shuffle(virtualPool, rng)
  for (let g = 0; g < 15; g++) {
    const grp = shuffled
      .slice(g * 4, g * 4 + 4)
      .map((id) => ({ id, s: (teams[id]?.power ?? 0) + rng() * MATCH_SIM.seedingNoise }))
      .sort((a, b) => b.s - a.s)
    grp.forEach((t, k) => place(`${k + 1}º A${g + 2}`, t.id))
  }
  const pairs = serieDDrawTemplate(season).map(([a, b]): [string, string] => {
    const home = byLabel[a]
    const away = byLabel[b]
    return away === 'user' ? [away, home] : [home, away]
  })
  return { pairs, tags }
}

/** Série C: final e 3º lugar entre os quadrangulares (modelo exibido desde a 1ª fase). */
export const SERIE_C_FINAL_TEMPLATE: Array<[string, string]> = [
  ['1º Grupo B', '1º Grupo C'],
  ['2º Grupo B', '2º Grupo C']
]
