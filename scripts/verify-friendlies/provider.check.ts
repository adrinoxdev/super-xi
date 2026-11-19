import { createChecker } from './assert'
import { createLocalBotProvider } from '@/utils/friendlies/localBotProvider'
import { generateBots } from '@/utils/friendlies/bots'
import { emptyStats } from '@/utils/friendlies/ranking'
import { mulberry32 } from '@/utils/core/random'
import type { FriendlyBot } from '@/types/friendlies'

const H = 60 * 60 * 1000

export function run(): string[] {
  const c = createChecker()
  // Bot de fama 2 montado à mão: o piso 0 é testado sempre, não só quando a semente gera um bot assim.
  const low: FriendlyBot = { id: 'fb_low', name: 'Bot Baixo', over: 50, fame: 2, stats: emptyStats() }
  let bots: FriendlyBot[] = [...generateBots(7).slice(0, 99), low]
  let simAt = 0
  let botWrites = 0
  let simWrites = 0
  const p = createLocalBotProvider({
    getBots: () => bots,
    setBots: (b) => {
      bots = b
      botWrites++
    },
    getSimAt: () => simAt,
    setSimAt: (t) => {
      simAt = t
      simWrites++
    },
    rng: mulberry32(9)
  })
  const find = (id: string) => bots.find((b) => b.id === id)!

  const view = p.ranking({ fame: 0, stats: emptyStats() })
  c.eq('ranking: usuario em 101', [view.user.rank, view.user.fame, view.user.isUser], [101, 0, true])
  c.eq('ranking: usuario fora do top 10', view.top.some((r) => r.isUser), false)

  const target = bots[0]
  p.reportResult(target.id, { userFameDelta: 15, userScore: 2, oppScore: 1 })
  c.eq('vitoria do usuario tira a fama aplicada do bot', find(target.id).fame, Math.max(0, target.fame - 15))
  c.eq('bot soma a derrota espelhada', find(target.id).stats, { played: 1, won: 0, drawn: 0, lost: 1, gf: 1, ga: 2 })
  const second = bots[1]
  p.reportResult(second.id, { userFameDelta: -5, userScore: 0, oppScore: 3 })
  c.eq('derrota do usuario da ao bot so o aplicado', find(second.id).fame, second.fame + 5)
  c.eq('bot soma a vitoria espelhada', find(second.id).stats, { played: 1, won: 1, drawn: 0, lost: 0, gf: 3, ga: 0 })
  p.reportResult('fb_low', { userFameDelta: 15, userScore: 1, oppScore: 1 })
  c.eq('fama do bot nao fica negativa (fama 2)', find('fb_low').fame, 0)
  c.eq('empate espelhado', find('fb_low').stats, { played: 1, won: 0, drawn: 1, lost: 0, gf: 1, ga: 1 })

  botWrites = 0
  simWrites = 0
  const before = bots
  p.refresh(30 * 60 * 1000)
  c.eq('refresh sem passo: nao grava nada', [botWrites, simWrites], [0, 0])
  c.ok('refresh sem passo: mesmo array', bots === before)
  p.refresh(2 * H + 5)
  c.eq('refresh avanca o relogio dos bots', simAt, 2 * H)
  c.eq('refresh grava uma vez cada', [botWrites, simWrites], [1, 1])
  c.eq('refresh soma 2 jogos por bot', find('fb_low').stats.played, 3)

  const opts = p.drawOptions({ userOver: 60, user: { fame: 0, stats: emptyStats() }, paidWinsLeft: 5 }, mulberry32(1))
  c.eq('drawOptions devolve 3', opts.length, 3)
  c.ok('opcoes sao bots da store', opts.every((o) => bots.some((b) => b.id === o.botId)))
  return c.fails
}
