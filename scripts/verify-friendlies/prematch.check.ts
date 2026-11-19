import { createChecker } from './assert'
import type { MatchCompetition } from '@/types/match'
import { resolvePrematchCompetition, type PrematchContext } from '@/utils/match/prematchMemory'

const KNOWN: MatchCompetition[] = ['league', 'cup', 'continental', 'supercup', 'recopa', 'friendly']
const CUPS = ['cup', 'continental', 'supercup', 'recopa'] as const

function ctx(playable: MatchCompetition[], friendlyReady: boolean): PrematchContext {
  return { known: KNOWN, isPlayable: (c) => playable.includes(c), friendlyReady }
}

export function run(): string[] {
  const c = createChecker()
  const all = ctx([...CUPS], true)
  const none = ctx([], false)

  // Save antigo (sem o campo) e liga: padrão.
  c.eq('save antigo sem o campo', resolvePrematchCompetition(undefined, all), 'league')
  c.eq('campo null', resolvePrematchCompetition(null, all), 'league')
  c.eq('liga', resolvePrematchCompetition('league', all), 'league')
  c.eq('liga com tudo encerrado', resolvePrematchCompetition('league', none), 'league')

  // Copas: voltam só se ainda houver partida do usuário a jogar.
  for (const comp of CUPS) {
    c.eq(`${comp} com partida pendente`, resolvePrematchCompetition(comp, all), comp)
    c.eq(`${comp} sem partida pendente`, resolvePrematchCompetition(comp, none), 'league')
  }
  c.eq('outra copa jogavel nao salva a encerrada', resolvePrematchCompetition('continental', ctx(['cup'], true)), 'league')

  // Amistoso: só com adversário escolhido e sem desafio em andamento (órfão ou ao vivo caem na liga).
  c.eq('amistoso pronto', resolvePrematchCompetition('friendly', all), 'friendly')
  c.eq('amistoso sem adversario', resolvePrematchCompetition('friendly', ctx([...CUPS], false)), 'league')
  c.eq('amistoso nao depende das copas', resolvePrematchCompetition('friendly', ctx([], true)), 'friendly')

  // Lixo no save: nunca vira estado de partida nem lança erro.
  const junk: unknown[] = ['xyz', '', 'Cup', 'toString', 42, true, {}, { comp: 'cup' }, ['cup'], { matchState: {} }]
  junk.forEach((j, i) => c.eq(`lixo #${i} (${JSON.stringify(j)})`, resolvePrematchCompetition(j, all), 'league'))

  // A lista conhecida manda: competição fora dela não volta.
  c.eq('fora da lista conhecida', resolvePrematchCompetition('cup', { ...all, known: ['league'] }), 'league')
  return c.fails
}
