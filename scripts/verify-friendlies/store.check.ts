import { createPinia, setActivePinia } from 'pinia'
import { createChecker } from './assert'
import { useFriendliesStore } from '@/stores/friendlies'
import { useClubStore } from '@/stores/club'
import { fameDelta } from '@/utils/friendlies/fame'
import { friendlyPrize } from '@/utils/friendlies/draw'
import { dayStart } from '@/config/time'

export function run(): string[] {
  setActivePinia(createPinia())
  const c = createChecker()
  const f = useFriendliesStore()
  const club = useClubStore()
  const now = Date.now()

  c.eq('estado novo: fichas', f.tokens, 10)
  c.eq('estado novo: fama', f.fame, 0)
  c.eq('estado novo: 100 bots', f.bots.length, 100)
  c.eq('estado novo: posicao 101', f.rank, 101)
  c.eq('estado novo: 3 sorteios', f.drawsLeft, 3)

  c.ok('1o sorteio', f.draw(60, now))
  c.eq('3 opcoes', f.options?.length, 3)
  c.eq('restam 2', f.drawsLeft, 2)
  c.ok('2o sorteio', f.draw(60, now))
  c.ok('3o sorteio', f.draw(60, now))
  c.ok('4o sorteio recusado', !f.draw(60, now))
  c.eq('restam 0', f.drawsLeft, 0)

  const saved = JSON.parse(JSON.stringify(f.toSave()))
  f.reset()
  c.eq('reset zera sorteios', f.drawsUsed, 0)
  f.fromSave(saved)
  c.eq('recarregar mantem o contador', f.drawsUsed, 3)
  c.eq('recarregar mantem as opcoes', f.options?.length, 3)

  c.ok('beginMatch sem selecao falha', !f.beginMatch(60, now))
  const pick = f.options![0]
  c.ok('select', f.select(pick.botId))
  c.eq('selectedOption', f.selectedOption?.botId, pick.botId)
  const budget = club.budget
  const reputation = club.reputation
  c.ok('beginMatch', f.beginMatch(60, now))
  c.eq('ficha gasta no apito', f.tokens, 9)
  c.eq('sorteios zerados no apito', f.drawsUsed, 0)
  c.eq('opcoes limpas', f.options, null)
  c.eq('selecao limpa', f.selectedBotId, null)
  c.eq('desafio gravado', f.active?.botId, pick.botId)
  c.eq('premio fixado no apito', f.active?.prize, friendlyPrize(pick.over))
  c.ok('sem sorteio com amistoso em andamento', !f.draw(60, now))

  const s = f.settle(3, 0, now)
  c.ok('settle devolve resumo', !!s)
  c.eq('fama apos vitoria', f.fame, fameDelta(60, pick.over, 'win'))
  c.eq('premio creditado', club.budget - budget, s?.prize)
  c.eq('premio = friendlyPrize', s?.prize, friendlyPrize(pick.over))
  c.eq('reputacao intacta', club.reputation, reputation)
  c.eq('desafio limpo', f.active, null)
  c.eq('historico com 1', f.recent.length, 1)
  c.eq('vitoria paga contada', f.paidWins.count, 1)

  f.paidWins = { day: dayStart(now), count: 5 }
  c.eq('limite diario esgotado', f.paidWinsLeft(now), 0)
  c.eq('virada do dia libera', f.paidWinsLeft(now + 2 * 24 * 60 * 60 * 1000), 5)

  f.fromSave({ ...saved, tokens: 99, drawsUsed: 7, options: null, fame: -5, tokenTickAt: now + 1e9, botsSimAt: now + 1e9, bots: [] })
  c.eq('tokens limitado a 10', f.tokens, 10)
  c.eq('drawsUsed 0 sem opcoes', f.drawsUsed, 0)
  c.eq('fama >= 0', f.fame, 0)
  c.ok('tokenTickAt <= now', f.tokenTickAt <= Date.now())
  c.ok('botsSimAt <= now', f.botsSimAt <= Date.now())
  c.eq('bots regenerados', f.bots.length, 100)
  f.fromSave(undefined)
  c.eq('save antigo sem campo: estado novo', f.tokens, 10)
  f.fromSave({ v: 2 })
  c.eq('versao desconhecida: estado novo', f.fame, 0)

  f.draw(60, now)
  f.select(f.options![1].botId)
  f.beginMatch(60, now)
  c.ok('orfa resolvida', f.resolveOrphan(false))
  c.eq('orfa: desafio limpo', f.active, null)
  c.eq('orfa: ficha nao volta', f.tokens, 9)
  c.ok('sem desafio nada a resolver', !f.resolveOrphan(false))
  return c.fails
}
