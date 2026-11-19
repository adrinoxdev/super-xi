import { createPinia, setActivePinia } from 'pinia'
import { createChecker } from './assert'
import { useFriendliesStore } from '@/stores/friendlies'
import { useClubStore } from '@/stores/club'
import { fameDelta } from '@/utils/friendlies/fame'
import { friendlyPrize, opponentOverFrom } from '@/utils/friendlies/draw'
import { emptyStats } from '@/utils/friendlies/ranking'
import { dayStart } from '@/config/time'

const H = 60 * 60 * 1000

export function run(): string[] {
  setActivePinia(createPinia())
  const c = createChecker()
  const f = useFriendliesStore()
  const club = useClubStore()
  const now = Date.now()

  c.eq('estado novo: fichas', f.tokens, 10)
  c.eq('estado novo: fama', f.fame, 0)
  c.eq('estado novo: estatisticas zeradas', f.stats, emptyStats())
  c.eq('estado novo: 100 bots', f.bots.length, 100)
  c.ok('estado novo: bots sem jogos', f.bots.every((b) => b.stats.played === 0))
  c.eq('estado novo: posicao 101', f.rank, 101)
  c.eq('estado novo: 3 sorteios', f.drawsLeft, 3)
  c.eq('ranking: linha do usuario', [f.ranking.user.rank, f.ranking.user.isUser], [101, true])
  c.ok('ranking: top 10 sem o usuario', f.ranking.top.length === 10 && f.ranking.top.every((r) => !r.isUser))

  // Simulação ao abrir a tela: sem passo não troca o array; com 2 passos cada bot soma 2 jogos.
  const before = f.bots
  f.refresh(f.botsSimAt + 30 * 60 * 1000)
  c.ok('refresh sem passo: mesmo array', f.bots === before)
  f.refresh(f.botsSimAt + 2 * H)
  c.ok('refresh com 2 passos: 2 jogos por bot', f.bots.every((b) => b.stats.played === 2))

  c.ok('1o sorteio', f.draw())
  c.eq('3 opcoes', f.options?.length, 3)
  c.ok('opcoes guardam offset, nao OVER', f.options!.every((o) => typeof o.offset === 'number' && !('over' in o)))
  c.eq('restam 2', f.drawsLeft, 2)
  c.ok('2o sorteio', f.draw())
  c.ok('3o sorteio', f.draw())
  c.ok('4o sorteio recusado', !f.draw())
  c.eq('restam 0', f.drawsLeft, 0)

  const saved = JSON.parse(JSON.stringify(f.toSave()))
  f.reset()
  c.eq('reset zera sorteios', f.drawsUsed, 0)
  f.fromSave(saved)
  c.eq('recarregar mantem o contador', f.drawsUsed, 3)
  c.eq('recarregar mantem as opcoes', f.options, saved.options)

  c.eq('beginMatch sem selecao falha', f.beginMatch(60, now), 'no-option')
  const pick = f.options![0]
  c.ok('select', f.select(pick.botId))
  c.eq('selectedOption', f.selectedOption?.botId, pick.botId)

  // Brecha de farm: estimativa com reservas (OVER 45), apito com titulares (OVER 80).
  const low = f.quote(pick, 45, now)
  c.eq('estimativa com o OVER do momento', low.oppOver, opponentOverFrom(45, pick.offset))
  const budget = club.budget
  const reputation = club.reputation
  const botFame = f.bots.find((b) => b.id === pick.botId)!.fame
  const botPlayed = f.bots.find((b) => b.id === pick.botId)!.stats.played
  c.eq('beginMatch', f.beginMatch(80, now), 'ok')
  const oppOver = opponentOverFrom(80, pick.offset)
  c.eq('OVER do rival recalculado no apito', f.active?.oppOver, oppOver)
  c.ok('apito nao usa o OVER da estimativa com reservas', f.active!.oppOver > low.oppOver)
  c.eq('userOver do apito gravado', f.active?.userOver, 80)
  c.eq('premio recalculado no apito', f.active?.prize, friendlyPrize(oppOver))
  c.eq('ficha gasta no apito', f.tokens, 9)
  c.eq('sorteios zerados no apito', f.drawsUsed, 0)
  c.eq('opcoes limpas', f.options, null)
  c.eq('selecao limpa', f.selectedBotId, null)
  c.ok('sem sorteio com amistoso em andamento', !f.draw())

  const s = f.settle(3, 1, now)
  c.ok('settle devolve resumo', !!s)
  const win = fameDelta(80, oppOver, 'win')
  c.eq('fama apos vitoria (OVERs do apito)', f.fame, win)
  c.eq('premio creditado', club.budget - budget, s?.prize)
  c.eq('premio = friendlyPrize do apito', s?.prize, friendlyPrize(oppOver))
  c.eq('reputacao intacta', club.reputation, reputation)
  c.eq('estatisticas do usuario', f.stats, { played: 1, won: 1, drawn: 0, lost: 0, gf: 3, ga: 1 })
  const botAfter = f.bots.find((b) => b.id === pick.botId)!
  c.eq('bot perde a fama aplicada', botAfter.fame, Math.max(0, botFame - win))
  c.eq('bot soma a derrota espelhada', [botAfter.stats.played, botAfter.stats.lost >= 1], [botPlayed + 1, true])
  c.eq('desafio limpo', f.active, null)
  c.eq('historico com 1', f.recent.length, 1)
  c.eq('vitoria paga contada', f.paidWins.count, 1)

  // Soma zero pelo aplicado: usuário com fama 2 perde; o piso 0 corta o delta e o bot só ganha o que o usuário perdeu.
  f.fame = 2
  c.ok('novo sorteio depois do apito', f.draw())
  const pick2 = f.options![0]
  f.select(pick2.botId)
  const bot2Fame = f.bots.find((b) => b.id === pick2.botId)!.fame
  c.eq('beginMatch 2', f.beginMatch(60, now), 'ok')
  const s2 = f.settle(0, 2, now)
  c.eq('derrota com fama 2 vai a 0', f.fame, 0)
  c.eq('resumo com o delta aplicado', s2?.fameDelta, -2)
  c.eq('bot ganha so o aplicado', f.bots.find((b) => b.id === pick2.botId)!.fame, bot2Fame + 2)
  c.eq('historico com o aplicado', f.recent[0].fameDelta, -2)
  c.eq('estatisticas somam a derrota', f.stats, { played: 2, won: 1, drawn: 0, lost: 1, gf: 3, ga: 3 })

  f.paidWins = { day: dayStart(now), count: 5 }
  c.eq('limite diario esgotado', f.paidWinsLeft(now), 0)
  c.eq('virada do dia libera', f.paidWinsLeft(now + 2 * 24 * 60 * 60 * 1000), 5)

  // Saneamento do save.
  f.fromSave({ ...saved, tokens: 99, drawsUsed: 7, options: null, fame: -5, tokenTickAt: now + 1e9, botsSimAt: now + 1e9, bots: [] })
  c.eq('tokens limitado a 10', f.tokens, 10)
  c.eq('drawsUsed 0 sem opcoes', f.drawsUsed, 0)
  c.eq('fama >= 0', f.fame, 0)
  c.ok('tokenTickAt <= now', f.tokenTickAt <= Date.now())
  c.ok('botsSimAt <= now', f.botsSimAt <= Date.now())
  c.eq('bots regenerados', f.bots.length, 100)
  f.fromSave({ ...saved, fame: Number.NaN, tokens: Number.NaN, stats: { won: Number.NaN, gf: 'x', ga: 4 } })
  c.eq('NaN: fama 0', f.fame, 0)
  c.eq('NaN: fichas no valor inicial', f.tokens, 10)
  c.eq('estatisticas invalidas saneadas', f.stats, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 4 })
  f.fromSave({ ...saved, options: saved.options.map((o: Record<string, unknown>) => ({ ...o, offset: 50 })) })
  c.ok('offset fora da faixa limitado a 11', f.options!.every((o) => o.offset === 11))

  // Save anterior a esta revisão: bots e usuário sem `stats`, opções no formato antigo (com `over`, sem `offset`).
  const legacyBots = saved.bots.map((b: Record<string, unknown>) => ({ id: b.id, name: b.name, over: b.over, fame: b.fame }))
  const legacyOptions = [{ botId: saved.bots[0].id, name: saved.bots[0].name, over: 60, fame: 1, rank: 2, prize: 0, fameWin: 1, fameDraw: 0, fameLoss: -1 }]
  f.fromSave({ ...saved, stats: undefined, bots: legacyBots, options: legacyOptions, drawsUsed: 2, selectedBotId: saved.bots[0].id })
  c.eq('legado: bots mantidos', f.bots.map((b) => b.fame), saved.bots.map((b: { fame: number }) => b.fame))
  c.ok('legado: bots com estatisticas zeradas', f.bots.every((b) => JSON.stringify(b.stats) === JSON.stringify(emptyStats())))
  c.eq('legado: usuario com estatisticas zeradas', f.stats, emptyStats())
  c.eq('legado: opcoes antigas descartadas', f.options, null)
  c.eq('legado: contador volta a 0', f.drawsUsed, 0)
  c.eq('legado: selecao limpa', f.selectedBotId, null)

  f.fromSave(undefined)
  c.eq('save antigo sem campo: estado novo', f.tokens, 10)
  f.fromSave({ v: 2 })
  c.eq('versao desconhecida: estado novo', f.fame, 0)

  f.draw()
  f.select(f.options![1].botId)
  f.beginMatch(60, now)
  c.ok('orfa resolvida', f.resolveOrphan(false))
  c.eq('orfa: desafio limpo', f.active, null)
  c.eq('orfa: ficha nao volta', f.tokens, 9)
  c.ok('sem desafio nada a resolver', !f.resolveOrphan(false))

  f.draw()
  f.select(f.options![0].botId)
  c.eq('beginMatch com OVER invalido falha', f.beginMatch(Number.NaN, now), 'invalid-over')
  c.eq('OVER invalido: ficha intacta', f.tokens, 9)

  // Desfazer o apito (a tela da partida não abriu): ficha, relógio, opções, seleção e contador voltam como estavam.
  const undoOpts = JSON.parse(JSON.stringify(f.options))
  const undoSel = f.selectedBotId
  const undoDraws = f.drawsUsed
  const undoTick = f.tokenTickAt
  c.eq('beginMatch para desfazer', f.beginMatch(60, now), 'ok')
  c.eq('ficha gasta antes de desfazer', f.tokens, 8)
  c.eq('beginMatch com desafio ativo', f.beginMatch(60, now), 'active')
  c.ok('cancelBegin', f.cancelBegin())
  c.eq('cancelBegin: ficha devolvida', f.tokens, 9)
  c.eq('cancelBegin: tokenTickAt restaurado', f.tokenTickAt, undoTick)
  c.eq('cancelBegin: desafio limpo', f.active, null)
  c.eq('cancelBegin: opcoes de volta', f.options, undoOpts)
  c.eq('cancelBegin: selecao de volta', f.selectedBotId, undoSel)
  c.eq('cancelBegin: contador de volta', f.drawsUsed, undoDraws)
  c.ok('cancelBegin sem apito pendente nao faz nada', !f.cancelBegin())

  // Sem ficha: motivo próprio (o toast certo) e nada gravado.
  f.tokens = 0
  f.tokenTickAt = now
  c.eq('beginMatch sem ficha', f.beginMatch(60, now), 'no-token')
  c.eq('sem ficha: nada gravado', f.active, null)

  // Depois do settle o apito não pode mais ser desfeito (o resultado já contou).
  f.tokens = 10
  c.eq('beginMatch para settle', f.beginMatch(60, now), 'ok')
  f.settle(1, 1, now)
  c.ok('cancelBegin depois do settle recusa', !f.cancelBegin())
  c.eq('settle repetido devolve null', f.settle(1, 1, now), null)
  return c.fails
}
