import type { ContinentalTeam } from '@/types'

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
