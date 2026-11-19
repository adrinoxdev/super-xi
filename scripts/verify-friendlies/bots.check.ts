import { createChecker } from './assert'
import { allBotNames, generateBots, rankingView, simScore, simulateBots, userRank } from '@/utils/friendlies/bots'
import { emptyStats } from '@/utils/friendlies/ranking'
import { mulberry32 } from '@/utils/core/random'
import { FRIENDLIES } from '@/config/friendlies'
import { TEAM_ID_BY_NAME } from '@/utils/identity/teamIdentities'
import { EXTRA_D_CLUBS } from '@/utils/league/extraClubs'
import type { FriendlyBot, FriendlyStats } from '@/types/friendlies'

const H = 60 * 60 * 1000
const bot = (n: number, over: number, fame: number, stats: FriendlyStats = emptyStats(), name = `Bot ${n}`): FriendlyBot => ({ id: `fb_${n}`, name, over, fame, stats })
const row = (rank: number, id: string, name: string, fame: number, isUser = false) => ({ rank, id, name, fame, isUser, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0 })

// Toda simulação usa rng com semente (ou constante): a checagem é determinística, sem Math.random.
export function run(): string[] {
  const c = createChecker()
  const bots = generateBots(42)
  c.eq('100 bots', bots.length, 100)
  c.eq('ids fb_1..fb_100', bots.map((b) => b.id), Array.from({ length: 100 }, (_, i) => `fb_${i + 1}`))
  c.eq('nomes unicos', new Set(bots.map((b) => b.name)).size, 100)
  c.ok('OVER interno em [40, 92]', bots.every((b) => b.over >= 40 && b.over <= 92))
  c.ok('fama inicial >= 10', bots.every((b) => b.fame >= 10))
  c.ok('estatisticas iniciais zeradas', bots.every((b) => JSON.stringify(b.stats) === JSON.stringify(emptyStats())))
  c.ok('topo ~1800', bots[0].fame >= 1780 && bots[0].fame <= 1820, String(bots[0].fame))
  c.ok('10o ~1550', bots[9].fame >= 1528 && bots[9].fame <= 1568, String(bots[9].fame))
  c.ok('100o entre 10 e 21', bots[99].fame >= 10 && bots[99].fame <= 21, String(bots[99].fame))
  c.eq('mesma semente, mesmos bots', generateBots(42), bots)
  c.ok('semente diferente muda', JSON.stringify(generateBots(43)) !== JSON.stringify(bots))
  c.eq('usuario com fama 0 em 101', userRank({ fame: 0, stats: emptyStats() }, bots), 101)

  const taken = new Set([...Object.keys(TEAM_ID_BY_NAME), ...EXTRA_D_CLUBS.map((x) => x.name)].map((n) => n.toLowerCase()))
  c.ok('nenhum nome igual a clube existente', allBotNames().every((n) => !taken.has(n.toLowerCase())))

  // Relógio da simulação.
  const same = simulateBots(bots, 0, 30 * 60 * 1000, mulberry32(1))
  c.eq('menos de 1h: simAt nao anda', same.simAt, 0)
  c.ok('menos de 1h: mesmo array (sem copia)', same.bots === bots)
  c.eq('3h10: simAt = 3h', simulateBots(bots, 0, 3 * H + 10 * 60 * 1000, mulberry32(2)).simAt, 3 * H)
  c.eq('100h: excedente descartado, simAt = 100h', simulateBots(bots, 0, 100 * H, mulberry32(3)).simAt, 100 * H)
  const back = simulateBots(bots, 5 * H, 2 * H, mulberry32(4))
  c.eq('relogio voltado: simAt = now', back.simAt, 2 * H)
  c.ok('relogio voltado: mesmo array', back.bots === bots)

  // 72 passos: fama, jogos e determinismo.
  const r72 = simulateBots(bots, 0, 72 * H, mulberry32(5))
  c.ok('fama nunca negativa', r72.bots.every((b) => b.fame >= 0))
  c.ok('over interno nao muda', r72.bots.every((b, i) => b.over === bots[i].over))
  c.ok('72 passos: 72 jogos por bot', r72.bots.every((b) => b.stats.played === 72))
  c.ok('jogos = V + E + D', r72.bots.every((b) => b.stats.won + b.stats.drawn + b.stats.lost === b.stats.played))
  c.eq('deterministico com a mesma semente', simulateBots(bots, 0, 72 * H, mulberry32(5)), r72)
  c.ok('nao muta a entrada', JSON.stringify(bots) === JSON.stringify(generateBots(42)))
  const drawRate = r72.bots.reduce((n, b) => n + b.stats.drawn, 0) / (72 * bots.length)
  c.ok('empates entre 5% e 40% dos jogos', drawRate >= 0.05 && drawRate <= 0.4, String(drawRate))

  // Coerência jogo x fama: vitória sobe mais de 1, derrota cai mais de 1, empate mexe no máximo 1.
  for (let seed = 1; seed <= 30; seed++) {
    const r = simulateBots([bot(1, 60, 500)], 0, H, mulberry32(seed)).bots[0]
    const d = r.fame - 500
    const s = r.stats
    if (s.won) c.ok(`seed ${seed}: vitoria com fama subindo`, d > 1 && s.gf > s.ga, `d=${d} ${s.gf}x${s.ga}`)
    if (s.lost) c.ok(`seed ${seed}: derrota com fama caindo`, d < -1 && s.gf < s.ga, `d=${d} ${s.gf}x${s.ga}`)
    if (s.drawn) c.ok(`seed ${seed}: empate com fama quase parada`, Math.abs(d) <= 1 && s.gf === s.ga, `d=${d} ${s.gf}x${s.ga}`)
  }

  // rng 0.5 zera o ruído: só o puxão para o alvo age.
  const pulled = simulateBots([bot(1, 88, 0)], 0, 72 * H, () => 0.5)
  c.ok('puxao em direcao ao alvo (OVER 88 → 1800)', pulled.bots[0].fame > 500, String(pulled.bots[0].fame))
  // Piso no alvo: OVER 40 daria alvo −360 e afundaria o bot a 0; com o piso ele para perto de fameMinStart.
  const floored = simulateBots([bot(1, 40, 100)], 0, 72 * H, () => 0.5)
  c.ok('piso no alvo: nao afunda a 0', floored.bots[0].fame >= FRIENDLIES.bots.fameMinStart, String(floored.bots[0].fame))

  // Placar simulado.
  c.eq('placar: vitoria minima', simScore('win', () => 0), { gf: 1, ga: 0 })
  c.eq('placar: derrota maxima', simScore('loss', () => 0.99), { gf: 3, ga: 4 })
  c.eq('placar: empate', simScore('draw', () => 0.99), { gf: 2, ga: 2 })
  c.eq('placar: rng 1 fora do contrato nao estoura', simScore('win', () => 1), { gf: 4, ga: 3 })

  // Tabela de classificação.
  const small: FriendlyBot[] = [bot(1, 60, 100, emptyStats(), 'A'), bot(2, 60, 50, emptyStats(), 'B'), bot(3, 60, 50, emptyStats(), 'C'), bot(4, 60, 10, emptyStats(), 'D')]
  c.eq('rankingView', rankingView(small, { name: 'Voce', fame: 50, stats: emptyStats() }), {
    top: [row(1, 'fb_1', 'A', 100), row(2, 'user', 'Voce', 50, true), row(3, 'fb_2', 'B', 50), row(4, 'fb_3', 'C', 50), row(5, 'fb_4', 'D', 10)],
    user: row(2, 'user', 'Voce', 50, true)
  })
  c.eq(
    'rankingView com estatisticas e saldo',
    rankingView([bot(1, 60, 10, { played: 3, won: 2, drawn: 1, lost: 0, gf: 5, ga: 2 })], { name: 'Voce', fame: 0, stats: emptyStats() }).top[0],
    { rank: 1, id: 'fb_1', name: 'Bot 1', fame: 10, isUser: false, played: 3, won: 2, drawn: 1, lost: 0, gf: 5, ga: 2, gd: 3 }
  )
  c.eq('rankingView corta no top 10', rankingView(bots, { name: 'Voce', fame: 0, stats: emptyStats() }).top.length, 10)
  c.eq('rankingView usuario fora do top', rankingView(bots, { name: 'Voce', fame: 0, stats: emptyStats() }).user.rank, 101)
  return c.fails
}
