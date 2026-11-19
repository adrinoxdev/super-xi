import { createChecker } from './assert'
import { drawOptions, friendlyPrize, opponentOver, rankBonus } from '@/utils/friendlies/draw'
import { fameDelta } from '@/utils/friendlies/fame'
import { mulberry32 } from '@/utils/core/random'
import type { FriendlyBot } from '@/types/friendlies'

export function run(): string[] {
  const c = createChecker()
  c.eq('bonus rank 1', rankBonus(1), 6)
  c.eq('bonus rank 10', rankBonus(10), 6)
  c.eq('bonus rank 11', rankBonus(11), 5.9)
  c.eq('bonus rank 30', rankBonus(30), 3.1)
  c.eq('bonus rank 50', rankBonus(50), 0.1)
  c.eq('bonus rank 51', rankBonus(51), 0)
  c.eq('bonus rank 101', rankBonus(101), 0)

  c.eq('premio OVER 50', friendlyPrize(50), 8000)
  c.eq('premio OVER 60', friendlyPrize(60), 13000)
  c.eq('premio OVER 61', friendlyPrize(61), 13500)
  c.eq('premio OVER 70', friendlyPrize(70), 18000)
  c.eq('premio OVER 84', friendlyPrize(84), 25000)
  c.eq('premio piso', friendlyPrize(40), 8000)
  c.eq('premio teto', friendlyPrize(99), 25000)

  c.eq('OVER do rival sem variacao', opponentOver(60, 101, () => 0.5), 60)
  c.eq('OVER do rival no minimo da variacao', opponentOver(60, 101, () => 0), 55)
  c.eq('OVER do rival no maximo da variacao', opponentOver(60, 101, () => 0.9999), 65)
  c.eq('OVER do rival com bonus de top 10', opponentOver(60, 5, () => 0.5), 66)
  c.eq('OVER do rival com teto 99', opponentOver(98, 1, () => 0.99), 99)
  c.eq('OVER do rival com piso 35', opponentOver(20, 101, () => 0), 35)

  const bots: FriendlyBot[] = Array.from({ length: 100 }, (_, i) => ({ id: `fb_${i + 1}`, name: `Bot ${i + 1}`, over: 60, fame: (100 - i) * 10 }))
  const ctx = { userOver: 60, userFame: 0, paidWinsLeft: 0, bots }
  const opts = drawOptions(ctx, mulberry32(1))
  c.eq('3 opcoes', opts.length, 3)
  c.ok('bots distintos', new Set(opts.map((o) => o.botId)).size === 3)
  c.ok('janela de +-15 posicoes (usuario em 101)', opts.every((o) => o.rank >= 86 && o.rank <= 100), JSON.stringify(opts.map((o) => o.rank)))
  c.ok('ordenadas por posicao', opts[0].rank <= opts[1].rank && opts[1].rank <= opts[2].rank)
  c.ok('OVER do dia em [55, 65]', opts.every((o) => o.over >= 55 && o.over <= 65))
  c.ok('premio 0 com limite esgotado', opts.every((o) => o.prize === 0))
  c.ok(
    'fama em jogo = fameDelta',
    opts.every(
      (o) => o.fameWin === fameDelta(60, o.over, 'win') && o.fameDraw === fameDelta(60, o.over, 'draw') && o.fameLoss === fameDelta(60, o.over, 'loss')
    )
  )
  c.ok('fama e nome do proprio bot', opts.every((o) => {
    const b = bots.find((x) => x.id === o.botId)
    return !!b && b.fame === o.fame && b.name === o.name
  }))
  c.eq('deterministico com a mesma semente', drawOptions(ctx, mulberry32(1)), opts)
  const paid = drawOptions({ ...ctx, paidWinsLeft: 5 }, mulberry32(2))
  c.ok('premio pago = friendlyPrize', paid.every((o) => o.prize === friendlyPrize(o.over)))
  const unlimited = drawOptions({ ...ctx, paidWinsLeft: Number.POSITIVE_INFINITY }, mulberry32(3))
  c.ok('sem limite diario paga', unlimited.every((o) => o.prize > 0))
  const few = drawOptions({ ...ctx, bots: bots.slice(0, 2) }, mulberry32(4))
  c.eq('com 2 bots devolve 2', few.length, 2)
  return c.fails
}
