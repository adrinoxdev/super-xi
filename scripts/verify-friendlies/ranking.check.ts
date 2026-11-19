import { createChecker } from './assert'
import { addResult, compareStanding, emptyStats, goalDiff, rankedBots, sanitizeStats, userRank } from '@/utils/friendlies/ranking'
import { FRIENDLIES, FRIENDLY_BOT_NAME_PARTS } from '@/config/friendlies'
import type { FriendlyBot, FriendlyStats } from '@/types/friendlies'

/** V vitórias, gols pró e contra; empates e derrotas opcionais. */
const st = (won: number, gf: number, ga: number, drawn = 0, lost = 0): FriendlyStats => ({ played: won + drawn + lost, won, drawn, lost, gf, ga })
const bot = (n: number, fame: number, stats: FriendlyStats = emptyStats(), name = `Bot ${n}`): FriendlyBot => ({ id: `fb_${n}`, name, over: 60, fame, stats })
const user = (fame: number, stats: FriendlyStats = emptyStats()) => ({ fame, stats })

export function run(): string[] {
  const c = createChecker()

  // Só fama (estatísticas zeradas): o mesmo comportamento de antes.
  const bots = [bot(1, 100), bot(2, 50), bot(3, 50), bot(4, 10)]
  c.eq('userRank com fama 0', userRank(user(0), bots), 5)
  c.eq('userRank: empate total favorece o usuario', userRank(user(50), bots), 2)
  c.eq('userRank acima de todos', userRank(user(500), bots), 1)
  c.eq(
    'rankedBots com usuario em 2o',
    rankedBots(bots, user(50)).map((r) => [r.bot.id, r.rank]),
    [['fb_1', 1], ['fb_2', 3], ['fb_3', 4], ['fb_4', 5]]
  )
  c.eq('rankedBots com usuario em ultimo', rankedBots(bots, user(0)).map((r) => r.rank), [1, 2, 3, 4])
  c.eq('rankedBots com usuario em 1o', rankedBots(bots, user(500)).map((r) => r.rank), [2, 3, 4, 5])

  // Desempate da liga com fama no lugar dos pontos: fama → vitórias → saldo → gols pró.
  const me = user(50, st(2, 4, 2)) // V 2, SG +2, GP 4
  const tie = [
    bot(1, 100),
    bot(2, 50, st(3, 3, 3)), // mais vitórias: acima
    bot(3, 50, st(2, 5, 2)), // mesmas V, saldo +3: acima
    bot(4, 50, st(2, 5, 3)), // mesmas V e saldo, mais gols pró: acima
    bot(5, 50, st(2, 4, 2)), // empate total: abaixo do usuário
    bot(6, 10)
  ]
  c.eq('desempate: usuario em 5o', userRank(me, tie), 5)
  c.eq(
    'desempate: ordem da tabela',
    rankedBots(tie, me).map((r) => [r.bot.id, r.rank]),
    [['fb_1', 1], ['fb_2', 2], ['fb_3', 3], ['fb_4', 4], ['fb_5', 6], ['fb_6', 7]]
  )
  c.ok('compareStanding: mais fama fica acima', compareStanding(user(60), user(50)) < 0)
  c.ok('compareStanding: fama manda sobre vitorias', compareStanding(user(51), user(50, st(9, 9, 0))) < 0)
  c.eq('compareStanding: empate total da 0', compareStanding(me, user(50, st(2, 4, 2))), 0)

  // Entre bots empatados em tudo: nome e depois id, qualquer que seja a ordem de entrada.
  const zeta = bot(8, 30, st(1, 1, 0), 'Zeta FC')
  const alfa = bot(9, 30, st(1, 1, 0), 'Alfa FC')
  c.eq('bots empatados: nome decide', rankedBots([zeta, alfa], user(0)).map((r) => r.bot.id), ['fb_9', 'fb_8'])
  c.eq('bots empatados: ordem de entrada nao importa', rankedBots([alfa, zeta], user(0)).map((r) => r.bot.id), ['fb_9', 'fb_8'])
  c.eq('mesmo nome: id decide', rankedBots([bot(11, 30, emptyStats(), 'Mesmo'), bot(10, 30, emptyStats(), 'Mesmo')], user(0)).map((r) => r.bot.id), ['fb_10', 'fb_11'])

  // Estatísticas.
  c.eq('addResult vitoria', addResult(emptyStats(), 3, 1), st(1, 3, 1))
  c.eq('addResult empate', addResult(st(1, 3, 1), 2, 2), st(1, 5, 3, 1))
  c.eq('addResult derrota', addResult(emptyStats(), 0, 2), st(0, 0, 2, 0, 1))
  c.eq('saldo', goalDiff(st(2, 5, 3)), 2)
  c.eq(
    'sanitizeStats: lixo vira 0 e played = V+E+D',
    sanitizeStats({ played: 99, won: 2.7, drawn: -1, lost: Number.NaN, gf: 3, ga: 'x' }),
    st(2, 3, 0)
  )
  c.eq('sanitizeStats: ausente', sanitizeStats(undefined), emptyStats())

  c.ok(
    'combinacoes de nome suficientes',
    FRIENDLY_BOT_NAME_PARTS.prefixes.length * FRIENDLY_BOT_NAME_PARTS.places.length >= FRIENDLIES.bots.count
  )
  c.eq('lugares sem repeticao', new Set(FRIENDLY_BOT_NAME_PARTS.places).size, FRIENDLY_BOT_NAME_PARTS.places.length)
  return c.fails
}
