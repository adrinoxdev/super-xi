import type { FriendlyBot, FriendlyDrawContext, FriendlyOption, FriendlyQuote } from '@/types/friendlies'
import { FRIENDLIES } from '@/config/friendlies'
import { clamp, shuffle, type Rng } from '@/utils/core/random'
import { fameDelta } from './fame'
import { rankedBots, userRank } from './ranking'
import { safeRng, unit } from './rng'

const round1 = (x: number) => Math.round(x * 10) / 10

/** Bônus de posição do usuário: 6 no top 10, cai linearmente até ~0 na 50ª, 0 dali para baixo. */
export function rankBonus(rank: number): number {
  const { rankBonusMax, rankBonusTop, rankBonusFrom } = FRIENDLIES.draw
  if (rank <= rankBonusTop) return rankBonusMax
  if (rank <= rankBonusFrom) return round1((rankBonusMax * (rankBonusFrom + 1 - rank)) / (rankBonusFrom + 1 - rankBonusTop))
  return 0
}

/** Deslocamento do rival gravado na opção: bônus da posição do usuário + variação uniforme em [−spread, +spread]. */
export function drawOffset(rank: number, rng: Rng): number {
  return round1(rankBonus(rank) + (unit(rng) * 2 - 1) * FRIENDLIES.draw.spread)
}

/** OVER do rival a partir do OVER do usuário e do deslocamento, limitado a [overMin, overMax]. */
export function opponentOverFrom(userOver: number, offset: number): number {
  const { overMin, overMax } = FRIENDLIES.draw
  return clamp(Math.round(userOver + offset), overMin, overMax)
}

/** Usado só em verificação. OVER do rival num sorteio direto: OVER do usuário + bônus da posição + variação. */
export function opponentOver(userOver: number, rank: number, rng: Rng): number {
  return opponentOverFrom(userOver, drawOffset(rank, rng))
}

/** Prêmio da vitória (antes do limite diário): escala com o OVER do rival, de 500 em 500. */
export function friendlyPrize(oppOver: number): number {
  const { base, refOver, perOver, min, max, step } = FRIENDLIES.prize
  return clamp(Math.round((base + (oppOver - refOver) * perOver) / step) * step, min, max)
}

/**
 * Valores de uma opção com um OVER do usuário. É a mesma conta na estimativa (cartão, PreMatch, com o OVER do momento)
 * e no apito (beginMatch, com o OVER do time que vai a campo): por isso sortear com reservas não rende rival fraco.
 */
export function quoteOption(offset: number, userOver: number, paidWinsLeft: number): FriendlyQuote {
  const oppOver = opponentOverFrom(userOver, offset)
  return {
    oppOver,
    prize: paidWinsLeft > 0 ? friendlyPrize(oppOver) : 0,
    fameWin: fameDelta(userOver, oppOver, 'win'),
    fameDraw: fameDelta(userOver, oppOver, 'draw'),
    fameLoss: fameDelta(userOver, oppOver, 'loss')
  }
}

/**
 * Candidatos do sorteio: posição a até ±span da do usuário. A janela cresce de `grow` em `grow` (mínimo 1, para não
 * travar) enquanto faltar candidato e ainda sobrar bot fora dela.
 */
export function rankPool<T extends { rank: number }>(
  ranked: readonly T[],
  uRank: number,
  need: number,
  span: number = FRIENDLIES.draw.rankWindow,
  grow: number = FRIENDLIES.draw.rankWindowGrow
): T[] {
  const step = Math.max(1, grow)
  let size = span
  let pool = ranked.filter((r) => Math.abs(r.rank - uRank) <= size)
  while (pool.length < need && pool.length < ranked.length) {
    size += step
    pool = ranked.filter((r) => Math.abs(r.rank - uRank) <= size)
  }
  return pool
}

/**
 * Um sorteio: bots distintos perto da posição do usuário, em ordem de posição. Cada opção guarda o deslocamento do
 * rival (offset), a fama e a posição do bot; o OVER do rival é calculado depois, com o OVER do usuário (quoteOption).
 */
export function drawOptions(ctx: FriendlyDrawContext & { bots: readonly FriendlyBot[] }, rng: Rng): FriendlyOption[] {
  const r = safeRng(rng)
  const need = FRIENDLIES.draw.options
  const uRank = userRank(ctx.user, ctx.bots)
  const pool = rankPool(rankedBots(ctx.bots, ctx.user), uRank, need)
  return shuffle(pool, r)
    .slice(0, need)
    .sort((a, b) => a.rank - b.rank)
    .map(({ bot, rank }) => ({ botId: bot.id, name: bot.name, fame: bot.fame, rank, offset: drawOffset(uRank, r) }))
}
