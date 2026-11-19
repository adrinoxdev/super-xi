import { createChecker } from './assert'
import { allBotNames, generateBots, rankingView, simulateBots, userRank } from '@/utils/friendlies/bots'
import { TEAM_ID_BY_NAME } from '@/utils/identity/teamIdentities'
import { EXTRA_D_CLUBS } from '@/utils/league/extraClubs'
import { emptyStats } from '@/utils/friendlies/ranking'
import type { FriendlyBot } from '@/types/friendlies'

const H = 60 * 60 * 1000

export function run(): string[] {
  const c = createChecker()
  const bots = generateBots(42)
  c.eq('100 bots', bots.length, 100)
  c.eq('ids fb_1..fb_100', bots.map((b) => b.id), Array.from({ length: 100 }, (_, i) => `fb_${i + 1}`))
  c.eq('nomes unicos', new Set(bots.map((b) => b.name)).size, 100)
  c.ok('OVER interno em [40, 92]', bots.every((b) => b.over >= 40 && b.over <= 92))
  c.ok('fama inicial >= 10', bots.every((b) => b.fame >= 10))
  c.ok('topo ~1800', bots[0].fame >= 1780 && bots[0].fame <= 1820, String(bots[0].fame))
  c.ok('10o ~1550', bots[9].fame >= 1528 && bots[9].fame <= 1568, String(bots[9].fame))
  c.ok('100o entre 10 e 21', bots[99].fame >= 10 && bots[99].fame <= 21, String(bots[99].fame))
  c.eq('mesma semente, mesmos bots', generateBots(42), bots)
  c.ok('semente diferente muda', JSON.stringify(generateBots(43)) !== JSON.stringify(bots))
  c.eq('usuario com fama 0 em 101', userRank({ fame: 0, stats: emptyStats() }, bots), 101)

  const taken = new Set([...Object.keys(TEAM_ID_BY_NAME), ...EXTRA_D_CLUBS.map((x) => x.name)].map((n) => n.toLowerCase()))
  c.ok('nenhum nome igual a clube existente', allBotNames().every((n) => !taken.has(n.toLowerCase())))

  const same = simulateBots(bots, 0, 30 * 60 * 1000, () => 0.5)
  c.eq('menos de 1h: simAt nao anda', same.simAt, 0)
  c.eq('menos de 1h: bots iguais', same.bots, bots)
  c.eq('3h10: simAt = 3h', simulateBots(bots, 0, 3 * H + 10 * 60 * 1000, Math.random).simAt, 3 * H)
  c.eq('100h: excedente descartado, simAt = 100h', simulateBots(bots, 0, 100 * H, Math.random).simAt, 100 * H)
  c.eq('relogio voltado: simAt = now', simulateBots(bots, 5 * H, 2 * H, Math.random).simAt, 2 * H)
  c.ok('fama nunca negativa', simulateBots(bots, 0, 72 * H, Math.random).bots.every((b) => b.fame >= 0))
  c.ok('over interno nao muda', simulateBots(bots, 0, 72 * H, Math.random).bots.every((b, i) => b.over === bots[i].over))
  // rng 0.5 zera o ruído: só o puxão para o alvo age (OVER 88 → alvo 1800).
  const pulled = simulateBots([{ id: 'fb_1', name: 'X', over: 88, fame: 0 }], 0, 72 * H, () => 0.5)
  c.ok('puxao em direcao ao alvo', pulled.bots[0].fame > 500, String(pulled.bots[0].fame))
  c.ok('nao muta a entrada', bots[0].fame === generateBots(42)[0].fame)

  const small: FriendlyBot[] = [
    { id: 'fb_1', name: 'A', over: 60, fame: 100, stats: emptyStats() },
    { id: 'fb_2', name: 'B', over: 60, fame: 50, stats: emptyStats() },
    { id: 'fb_3', name: 'C', over: 60, fame: 50, stats: emptyStats() },
    { id: 'fb_4', name: 'D', over: 60, fame: 10, stats: emptyStats() }
  ]
  const row = (rank: number, id: string, name: string, fame: number, isUser = false) => ({ rank, id, name, fame, isUser, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0 })
  c.eq('rankingView', rankingView(small, { name: 'Voce', fame: 50, stats: emptyStats() }), {
    top: [row(1, 'fb_1', 'A', 100), row(2, 'user', 'Voce', 50, true), row(3, 'fb_2', 'B', 50), row(4, 'fb_3', 'C', 50), row(5, 'fb_4', 'D', 10)],
    user: row(2, 'user', 'Voce', 50, true)
  })
  c.eq('rankingView corta no top 10', rankingView(bots, { name: 'Voce', fame: 0, stats: emptyStats() }).top.length, 10)
  c.eq('rankingView usuario fora do top', rankingView(bots, { name: 'Voce', fame: 0, stats: emptyStats() }).user.rank, 101)
  return c.fails
}
