import type { MatchCompetition } from '@/types/match'

/** O que a carga do save precisa saber para decidir se o pré-jogo salvo ainda vale. */
export interface PrematchContext {
  /** Competições conhecidas (COMPETITIONS_ORDER): só elas podem voltar. */
  known: readonly MatchCompetition[]
  /** A copa ainda tem partida do usuário a jogar (mesmo critério de prepareMatch: competitions.isCompetitionPlayable). */
  isPlayable: (comp: MatchCompetition) => boolean
  /** Amistoso com adversário escolhido e sem desafio em andamento (selectedOption presente e active vazio). */
  friendlyReady: boolean
}

/**
 * Competição do pré-jogo a restaurar ao carregar o save. Só aceita o identificador de uma competição
 * conhecida que ainda tenha partida a jogar; qualquer outra coisa (save antigo sem o campo, texto
 * desconhecido, objeto, copa encerrada, amistoso sem adversário ou órfão) cai na liga, o padrão.
 */
export function resolvePrematchCompetition(saved: unknown, ctx: PrematchContext): MatchCompetition {
  if (typeof saved !== 'string') return 'league'
  const comp = ctx.known.find((c) => c === saved)
  if (!comp || comp === 'league') return 'league'
  if (comp === 'friendly') return ctx.friendlyReady ? 'friendly' : 'league'
  return ctx.isPlayable(comp) ? comp : 'league'
}
