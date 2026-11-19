import { createChecker } from './assert'
import { createLocalBotProvider } from '@/utils/friendlies/localBotProvider'
import { generateBots } from '@/utils/friendlies/bots'
import { mulberry32 } from '@/utils/core/random'
import type { FriendlyBot } from '@/types/friendlies'

const H = 60 * 60 * 1000

export function run(): string[] {
  const c = createChecker()
  let bots: FriendlyBot[] = generateBots(7)
  let simAt = 0
  const p = createLocalBotProvider({
    getBots: () => bots,
    setBots: (b) => (bots = b),
    getSimAt: () => simAt,
    setSimAt: (t) => (simAt = t),
    rng: mulberry32(9)
  })
  p.refresh(2 * H + 5)
  c.eq('refresh avanca o relogio dos bots', simAt, 2 * H)
  const view = p.ranking(0)
  c.eq('ranking: usuario em 101', view.user, { rank: 101, fame: 0 })
  c.eq('ranking: usuario fora do top 10', view.top.some((r) => r.isUser), false)
  const target = bots[0]
  p.reportResult(target.id, 15)
  c.eq('vitoria do usuario tira fama do bot', bots[0].fame, Math.max(0, target.fame - 15))
  const second = bots[1]
  p.reportResult(second.id, -10)
  c.eq('derrota do usuario da fama ao bot', bots[1].fame, second.fame + 10)
  const low = bots.findIndex((b) => b.fame < 5)
  if (low >= 0) {
    p.reportResult(bots[low].id, 50)
    c.eq('fama do bot nao fica negativa', bots[low].fame, 0)
  }
  const opts = p.drawOptions({ userOver: 60, userFame: 0, paidWinsLeft: 5 }, mulberry32(1))
  c.eq('drawOptions devolve 3', opts.length, 3)
  c.ok('opcoes sao bots da store', opts.every((o) => bots.some((b) => b.id === o.botId)))
  return c.fails
}
