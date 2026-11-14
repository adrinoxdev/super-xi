import type { ShootoutKick } from '@/types/match'

export interface ShootoutStatus {
  user: number
  opp: number
  /** Quem cobra a seguir. */
  next: 'user' | 'opp'
  done: boolean
  winner: 'user' | 'opp' | null
}

const REGULAR_KICKS = 5

/** Situação da disputa: 5 cobranças alternadas (encerra cedo se decidida), depois morte súbita até alguém vencer. */
export function shootoutStatus(kicks: ShootoutKick[], first: 'user' | 'opp'): ShootoutStatus {
  const other = first === 'user' ? 'opp' : 'user'
  const taken = { user: 0, opp: 0 }
  const goals = { user: 0, opp: 0 }
  for (const k of kicks) {
    taken[k.side]++
    if (k.scored) goals[k.side]++
  }
  const next = taken[first] <= taken[other] ? first : other
  let winner: 'user' | 'opp' | null = null
  if (taken.user < REGULAR_KICKS || taken.opp < REGULAR_KICKS) {
    const remUser = Math.max(0, REGULAR_KICKS - taken.user)
    const remOpp = Math.max(0, REGULAR_KICKS - taken.opp)
    if (goals.user > goals.opp + remOpp) winner = 'user'
    else if (goals.opp > goals.user + remUser) winner = 'opp'
  } else if (taken.user === taken.opp && goals.user !== goals.opp) {
    winner = goals.user > goals.opp ? 'user' : 'opp'
  }
  return { user: goals.user, opp: goals.opp, next, done: winner !== null, winner }
}
