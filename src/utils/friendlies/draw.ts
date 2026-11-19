import type { FriendlyBot, FriendlyDrawContext, FriendlyOption } from '@/types/friendlies'
import { FRIENDLIES } from '@/config/friendlies'
import { clamp, shuffle, type Rng } from '@/utils/core/random'
import { fameDelta } from './fame'
import { rankedBots, userRank } from './ranking'

const round1 = (x: number) => Math.round(x * 10) / 10

/** Bônus de posição do usuário: 6 no top 10, cai linearmente até ~0 na 50ª, 0 dali para baixo. */
export function rankBonus(rank: number): number {
  const { rankBonusMax, rankBonusTop, rankBonusFrom } = FRIENDLIES.draw
  if (rank <= rankBonusTop) return rankBonusMax
  if (rank <= rankBonusFrom) return round1((rankBonusMax * (rankBonusFrom + 1 - rank)) / (rankBonusFrom + 1 - rankBonusTop))
  return 0
}

/** OVER do dia do rival: OVER do usuário + bônus da posição do usuário + variação uniforme em [−5, +5]. */
export function opponentOver(userOver: number, rank: number, rng: Rng): number {
  const { spread, overMin, overMax } = FRIENDLIES.draw
  return clamp(Math.round(userOver + rankBonus(rank) + (rng() * 2 - 1) * spread), overMin, overMax)
}

/** Prêmio da vitória (antes do limite diário): escala com o OVER do rival, de 500 em 500. */
export function friendlyPrize(oppOver: number): number {
  const { base, refOver, perOver, min, max, step } = FRIENDLIES.prize
  return clamp(Math.round((base + (oppOver - refOver) * perOver) / step) * step, min, max)
}

/**
 * Um sorteio: bots distintos a até ±15 posições do usuário (a janela cresce de 5 em 5 se faltar bot), em ordem de
 * posição. O cartão mostra a fama e a posição do bot e o OVER do dia (não o `over` interno).
 */
export function drawOptions(ctx: FriendlyDrawContext & { bots: readonly FriendlyBot[] }, rng: Rng): FriendlyOption[] {
  const { rankWindow, rankWindowGrow, options } = FRIENDLIES.draw
  const uRank = userRank(ctx.user, ctx.bots)
  const ranked = rankedBots(ctx.bots, ctx.user)
  let windowSize = rankWindow
  let pool = ranked.filter((r) => Math.abs(r.rank - uRank) <= windowSize)
  while (pool.length < options && pool.length < ranked.length) {
    windowSize += rankWindowGrow
    pool = ranked.filter((r) => Math.abs(r.rank - uRank) <= windowSize)
  }
  const picked = shuffle(pool, rng)
    .slice(0, options)
    .sort((a, b) => a.rank - b.rank)
  const capped = ctx.paidWinsLeft <= 0
  return picked.map(({ bot, rank }) => {
    const over = opponentOver(ctx.userOver, uRank, rng)
    return {
      botId: bot.id,
      name: bot.name,
      over,
      fame: bot.fame,
      rank,
      prize: capped ? 0 : friendlyPrize(over),
      fameWin: fameDelta(ctx.userOver, over, 'win'),
      fameDraw: fameDelta(ctx.userOver, over, 'draw'),
      fameLoss: fameDelta(ctx.userOver, over, 'loss')
    }
  })
}
