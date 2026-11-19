import { createChecker } from './assert'
import { rankedBots, userRank } from '@/utils/friendlies/ranking'
import { FRIENDLIES, FRIENDLY_BOT_NAME_PARTS } from '@/config/friendlies'
import type { FriendlyBot } from '@/types/friendlies'

const bot = (n: number, fame: number): FriendlyBot => ({ id: `fb_${n}`, name: `Bot ${n}`, over: 60, fame })

export function run(): string[] {
  const c = createChecker()
  const bots = [bot(1, 100), bot(2, 50), bot(3, 50), bot(4, 10)]
  c.eq('userRank com fama 0', userRank(0, bots), 5)
  c.eq('userRank: empate favorece o usuario', userRank(50, bots), 2)
  c.eq('userRank acima de todos', userRank(500, bots), 1)
  c.eq(
    'rankedBots com usuario em 2o',
    rankedBots(bots, 50).map((r) => [r.bot.id, r.rank]),
    [['fb_1', 1], ['fb_2', 3], ['fb_3', 4], ['fb_4', 5]]
  )
  c.eq('rankedBots com usuario em ultimo', rankedBots(bots, 0).map((r) => r.rank), [1, 2, 3, 4])
  c.eq('rankedBots com usuario em 1o', rankedBots(bots, 500).map((r) => r.rank), [2, 3, 4, 5])
  c.ok(
    'combinacoes de nome suficientes',
    FRIENDLY_BOT_NAME_PARTS.prefixes.length * FRIENDLY_BOT_NAME_PARTS.places.length >= FRIENDLIES.bots.count
  )
  c.eq('lugares sem repeticao', new Set(FRIENDLY_BOT_NAME_PARTS.places).size, FRIENDLY_BOT_NAME_PARTS.places.length)
  return c.fails
}
