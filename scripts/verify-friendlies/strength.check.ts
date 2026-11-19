import { createChecker } from './assert'
import type { Player, PlayerPosition } from '@/types/player'
import { friendlyStrengthOf, isFriendlyEligible } from '@/utils/friendlies/strength'
import { opponentOverFrom } from '@/utils/friendlies/draw'

// 4-3-3 na ordem das vagas de FORMATIONS['4-3-3'].
const XI: PlayerPosition[] = ['LW', 'ST', 'RW', 'CM', 'CDM', 'CM', 'LB', 'CB', 'CB', 'RB', 'GK']

function mk(id: string, position: PlayerPosition, overall: number, extra: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    age: 25,
    nationality: 'BR',
    position,
    overall,
    potential: overall,
    attributes: { pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall, physical: overall },
    value: 0,
    wage: 0,
    form: 70,
    stamina: 100,
    contractYears: 2,
    isYouth: false,
    isLoanedOut: false,
    isLoanedIn: false,
    trainingFocus: 'balanced',
    marketStatus: 'available',
    ...extra
  }
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6

export function run(): string[] {
  const c = createChecker()
  const starters = XI.map((pos, i) => mk('t' + i, pos, 70))
  const bench = [mk('r0', 'GK', 50), mk('r1', 'CB', 50), mk('r2', 'CAM', 50)]
  const squad = [...starters, ...bench]
  const strongIds = starters.map((p) => p.id)

  const strong = friendlyStrengthOf(squad, '4-3-3', strongIds)
  c.ok('titulares na posicao: current 70', near(strong.current, 70), String(strong.current))
  c.ok('melhor escalacao 70', near(strong.best, 70), String(strong.best))
  c.ok('over = max(current, best)', near(strong.over, Math.max(strong.current, strong.best)))
  c.ok('formacao da melhor definida', strong.bestFormation !== null)

  // Time fraco no apito: ordem invertida (goleiro na ponta, atacantes na defesa).
  const weak = friendlyStrengthOf(squad, '4-3-3', [...strongIds].reverse())
  c.ok('fora de posicao derruba o current', weak.current < strong.current - 5, String(weak.current))
  c.ok('fora de posicao nao reduz o over efetivo', near(weak.over, strong.over), `${weak.over} vs ${strong.over}`)

  // Reservas no lugar dos dois zagueiros e do goleiro.
  const reserves = friendlyStrengthOf(squad, '4-3-3', [...strongIds.slice(0, 7), 'r1', 'r2', strongIds[9], 'r0'])
  c.ok('reservas derrubam o current', reserves.current < strong.current - 1, String(reserves.current))
  c.ok('reservas nao reduzem o over efetivo', near(reserves.over, strong.over), `${reserves.over} vs ${strong.over}`)

  // Formação ruim para o elenco: o piso considera todas as formações.
  const otherFormation = friendlyStrengthOf(squad, '5-3-2', strongIds)
  c.ok('formacao ruim nao reduz o over efetivo', near(otherFormation.over, strong.over), `${otherFormation.over} vs ${strong.over}`)

  // Mesmo offset do sorteio: o rival fixado no apito é o mesmo com o time fraco ou forte.
  c.eq('rival do apito igual com time fraco ou forte', opponentOverFrom(weak.over, 3.4), opponentOverFrom(strong.over, 3.4))

  // Cansaço não conta no amistoso.
  const tired = friendlyStrengthOf(squad.map((p) => ({ ...p, stamina: 30 })), '4-3-3', strongIds)
  c.ok('cansaco ignorado no current', near(tired.current, strong.current), String(tired.current))
  c.ok('cansaco ignorado no best', near(tired.best, strong.best), String(tired.best))

  // Elegibilidade: craque no banco só entra na melhor escalação se puder jogar.
  const withStar = (extra: Partial<Player>) => friendlyStrengthOf([...squad, mk('s', 'ST', 95, extra)], '4-3-3', strongIds)
  c.ok('craque saudavel no banco sobe o best', withStar({}).best > strong.best + 1, String(withStar({}).best))
  c.ok('craque lesionado fora do best', near(withStar({ injury: { matchesLeft: 2 } }).best, strong.best))
  c.ok('craque suspenso na liga fora do best', near(withStar({ suspension: { league: 1 } }).best, strong.best))
  c.ok('craque emprestado fora do best', near(withStar({ isLoanedOut: true }).best, strong.best))

  // Craque lesionado escalado: o current conta com a penalidade de lesão, o best não o usa; o over nunca fica abaixo de nenhum.
  const injuredIn = friendlyStrengthOf([...squad, mk('s', 'ST', 95, { injury: { matchesLeft: 2 } })], '4-3-3', strongIds.map((id) => (id === 't1' ? 's' : id)))
  for (const [name, s] of [['forte', strong], ['fraco', weak], ['reservas', reserves], ['lesionado escalado', injuredIn]] as const) {
    c.ok(`over >= current e >= best (${name})`, s.over >= s.current && s.over >= s.best)
  }

  c.ok('elegivel: saudavel', isFriendlyEligible(mk('a', 'CM', 60)))
  c.ok('inelegivel: lesionado', !isFriendlyEligible(mk('a', 'CM', 60, { injury: { matchesLeft: 1 } })))
  c.ok('inelegivel: suspenso em qualquer competicao', !isFriendlyEligible(mk('a', 'CM', 60, { suspension: { cup: 1 } })))
  c.ok('elegivel: suspensao zerada', isFriendlyEligible(mk('a', 'CM', 60, { suspension: { league: 0 } })))
  c.ok('inelegivel: emprestado', !isFriendlyEligible(mk('a', 'CM', 60, { isLoanedOut: true })))

  const none = friendlyStrengthOf([], '4-3-3', [])
  c.eq('sem atletas', [none.current, none.best, none.bestFormation, none.over], [0, 0, null, 0])
  return c.fails
}
