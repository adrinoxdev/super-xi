import type { FriendlyOutcome } from '@/types/friendlies'
import { FRIENDLIES } from '@/config/friendlies'
import { clamp } from '@/utils/core/random'

/** Chance esperada de vitória do usuário pelo Elo sobre OVER (não sobre fama: decisão da spec §11). */
export function expectedScore(userOver: number, oppOver: number): number {
  return 1 / (1 + 10 ** ((oppOver - userOver) / FRIENDLIES.fame.scale))
}

/** Variação de fama do usuário. O bot recebe o oposto. */
export function fameDelta(userOver: number, oppOver: number, outcome: FriendlyOutcome): number {
  const { k, minWin, minLoss, drawCap } = FRIENDLIES.fame
  const e = expectedScore(userOver, oppOver)
  if (outcome === 'win') return Math.max(minWin, Math.round(k * (1 - e)))
  if (outcome === 'draw') return clamp(Math.round(k * (0.5 - e)), -drawCap, drawCap) || 0
  return -Math.max(minLoss, Math.round(k * e))
}

/** Fama nunca fica abaixo de 0 (usuário e bots). */
export function applyFame(fame: number, delta: number): number {
  return Math.max(0, fame + delta)
}

export function outcomeFromScore(userScore: number, oppScore: number): FriendlyOutcome {
  return userScore > oppScore ? 'win' : userScore === oppScore ? 'draw' : 'loss'
}

/** "+19", "0", "−11" (sinal de menos tipográfico). */
export function signedFame(n: number): string {
  if (n > 0) return `+${n}`
  if (n < 0) return `−${Math.abs(n)}`
  return '0'
}
