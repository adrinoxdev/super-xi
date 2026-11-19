import { createChecker } from './assert'
import { drawOffset, drawOptions, friendlyPrize, opponentOver, opponentOverFrom, quoteOption, rankBonus, rankPool } from '@/utils/friendlies/draw'
import { fameDelta } from '@/utils/friendlies/fame'
import { emptyStats, rankedBots, userRank } from '@/utils/friendlies/ranking'
import { mulberry32 } from '@/utils/core/random'
import type { FriendlyBot, FriendlyStats } from '@/types/friendlies'

const st = (won: number, gf: number, ga: number, drawn = 0, lost = 0): FriendlyStats => ({ played: won + drawn + lost, won, drawn, lost, gf, ga })
const mk = (n: number, fame: number, stats: FriendlyStats = emptyStats()): FriendlyBot => ({ id: `fb_${n}`, name: `Bot ${n}`, over: 60, fame, stats })

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
  c.eq('rng 1 fora do contrato: limitado ao teto da variacao', opponentOver(60, 101, () => 1), 65)

  // Deslocamento (gravado na opção) e OVER a partir dele.
  c.eq('offset sem variacao, usuario em 101', drawOffset(101, () => 0.5), 0)
  c.eq('offset no top 10 com variacao maxima', drawOffset(1, () => 0.99999), 11)
  c.eq('opponentOverFrom soma e arredonda', opponentOverFrom(60.4, 2.3), 63)
  c.eq('opponentOverFrom teto', opponentOverFrom(95, 11), 99)
  c.eq('opponentOverFrom piso', opponentOverFrom(30, -5), 35)

  // Cotação: a mesma conta no cartão (estimativa) e no apito.
  const q = quoteOption(3, 60, 5)
  c.eq('cotacao: OVER', q.oppOver, 63)
  c.eq('cotacao: premio', q.prize, friendlyPrize(63))
  c.eq('cotacao: fama V/E/D', [q.fameWin, q.fameDraw, q.fameLoss], [fameDelta(60, 63, 'win'), fameDelta(60, 63, 'draw'), fameDelta(60, 63, 'loss')])
  c.eq('cotacao: limite esgotado zera o premio', quoteOption(3, 60, 0).prize, 0)
  c.ok('cotacao: limite desligado (Infinity) paga', quoteOption(3, 60, Number.POSITIVE_INFINITY).prize > 0)
  // Brecha de farm: o mesmo offset com OVER maior dá rival maior.
  c.eq('farm: reservas OVER 45', quoteOption(2, 45, 5).oppOver, 47)
  c.eq('farm: titulares OVER 80', quoteOption(2, 80, 5).oppOver, 82)

  // Sorteio com o usuário em 101 (100 bots com fama distinta).
  const bots: FriendlyBot[] = Array.from({ length: 100 }, (_, i) => mk(i + 1, (100 - i) * 10))
  const ctx = { user: { fame: 0, stats: emptyStats() }, bots }
  const opts = drawOptions(ctx, mulberry32(1))
  c.eq('3 opcoes', opts.length, 3)
  c.ok('bots distintos', new Set(opts.map((o) => o.botId)).size === 3)
  c.ok('janela de +-15 posicoes (usuario em 101)', opts.every((o) => o.rank >= 86 && o.rank <= 100), JSON.stringify(opts.map((o) => o.rank)))
  c.ok('ordenadas por posicao', opts[0].rank <= opts[1].rank && opts[1].rank <= opts[2].rank)
  c.ok('offset em [-5, 5] (sem bonus em 101)', opts.every((o) => o.offset >= -5 && o.offset <= 5))
  c.ok('opcao sem OVER absoluto nem premio', opts.every((o) => !('over' in o) && !('prize' in o)))
  c.ok(
    'fama e nome do proprio bot',
    opts.every((o) => {
      const b = bots.find((x) => x.id === o.botId)
      return !!b && b.fame === o.fame && b.name === o.name
    })
  )
  c.eq('deterministico com a mesma semente', drawOptions(ctx, mulberry32(1)), opts)
  c.eq('com 2 bots devolve 2', drawOptions({ ...ctx, bots: bots.slice(0, 2) }, mulberry32(4)).length, 2)

  // Usuário em 1º: candidatos nas posições 2..16 e bônus máximo no offset.
  const top = drawOptions({ user: { fame: 5000, stats: emptyStats() }, bots }, mulberry32(5))
  c.ok('usuario em 1o: posicoes 2..16', top.every((o) => o.rank >= 2 && o.rank <= 16), JSON.stringify(top.map((o) => o.rank)))
  c.ok('usuario em 1o: offset em [1, 11]', top.every((o) => o.offset >= 1 && o.offset <= 11))

  // Janela crescente: com janela 1, o usuário em 1º só alcança a posição 2; ela cresce até haver 3 candidatos.
  const ranked10 = rankedBots(bots.slice(0, 10), { fame: 5000, stats: emptyStats() })
  c.eq('janela 1 cresce de 5 em 5 ate ter 3', rankPool(ranked10, 1, 3, 1, 5).map((r) => r.rank), [2, 3, 4, 5, 6, 7])
  c.eq('passo 0 nao trava (passo minimo 1)', rankPool(ranked10, 1, 3, 1, 0).map((r) => r.rank), [2, 3, 4])
  c.eq('bots esparsos (so 2): devolve os 2 sem laco infinito', rankPool(ranked10.slice(0, 2), 1, 3, 1, 5).length, 2)

  // Desempate no sorteio: usuário empatado em fama com 2 bots, atrás de um (mais vitórias) e à frente do outro.
  const tied = [mk(1, 900), mk(2, 50, st(3, 6, 2)), mk(3, 50, st(1, 2, 1)), mk(4, 10), mk(5, 5)]
  const me = { fame: 50, stats: st(2, 4, 2) }
  c.eq('desempate: usuario em 3o', userRank(me, tied), 3)
  const table = rankedBots(tied, me)
  c.eq('desempate: rival com menos vitorias fica abaixo do usuario', table.find((r) => r.bot.id === 'fb_3')?.rank, 4)
  const tiedOpts = drawOptions({ user: me, bots: tied }, mulberry32(6))
  c.ok('desempate: posicoes das opcoes seguem a tabela', tiedOpts.every((o) => o.rank === table.find((r) => r.bot.id === o.botId)?.rank))
  return c.fails
}
