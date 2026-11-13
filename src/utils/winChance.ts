import { MATCH_SIM } from '@/utils/constants'

export interface OutcomeOptions {
  /** O usuário joga em casa. */
  isHome: boolean
  atkMod?: number
  defMod?: number
  /** A competição dá mando ao usuário (liga e continental). Padrão: true. */
  homeBonusApplies?: boolean
}

export interface OutcomeEstimate {
  win: number
  draw: number
  loss: number
  /** Derrota por 3 ou mais gols de diferença. */
  bigLoss: number
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Distribuição binomial de gols em n jogadas com probabilidade p de gol por jogada. */
function binomial(n: number, p: number): number[] {
  const out = new Array<number>(n + 1).fill(0)
  out[0] = 1
  for (let t = 0; t < n; t++) {
    for (let k = t + 1; k >= 0; k--) out[k] = out[k] * (1 - p) + (k > 0 ? out[k - 1] * p : 0)
  }
  return out
}

function outcomeForDiff(diff: number, atkMod: number, defMod: number): OutcomeEstimate {
  const M = MATCH_SIM
  const userChance = clamp((M.userChanceBase + M.slope * diff) * atkMod, M.chanceMin, M.chanceMax)
  const oppChance = clamp((M.oppChanceBase - M.slope * diff) / defMod, M.chanceMin, M.chanceMax)
  const a = binomial(M.ticks, userChance * M.userOnTarget * M.userGoal)
  const b = binomial(M.ticks, oppChance * M.oppOnTarget * M.oppGoal)
  let win = 0
  let draw = 0
  let bigLoss = 0
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      const pr = a[i] * b[j]
      if (i > j) win += pr
      else if (i === j) draw += pr
      else if (j - i >= 3) bigLoss += pr
    }
  }
  return { win, draw, loss: Math.max(0, 1 - win - draw), bigLoss }
}

/**
 * Estimativa exata (convolução) de vitória/empate/derrota, no mesmo modelo de simulateMatchTick.
 * A forma do dia entra como média de 5 pontos de -formSwing a +formSwing sobre a diferença de OVER.
 */
export function estimateOutcome(userRating: number, opponentRating: number, opts: OutcomeOptions): OutcomeEstimate {
  const atkMod = opts.atkMod ?? 1
  const defMod = opts.defMod ?? 1
  const applies = opts.homeBonusApplies ?? true
  const mando = applies ? (opts.isHome ? MATCH_SIM.homeAdvantage : -MATCH_SIM.homeAdvantage) : 0
  const base = userRating - opponentRating + mando
  const offsets = [-1, -0.5, 0, 0.5, 1]
  const acc: OutcomeEstimate = { win: 0, draw: 0, loss: 0, bigLoss: 0 }
  for (const o of offsets) {
    const r = outcomeForDiff(base + o * MATCH_SIM.formSwing, atkMod, defMod)
    acc.win += r.win / offsets.length
    acc.draw += r.draw / offsets.length
    acc.loss += r.loss / offsets.length
    acc.bigLoss += r.bigLoss / offsets.length
  }
  return acc
}
