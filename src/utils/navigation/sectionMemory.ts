import type { MatchCompetition } from '@/types/match'

export type MatchNavId = 'league' | 'competitions' | 'friendlies'

/** A partida é subpágina: o item de navegação "dono" dela é o da competição que está sendo jogada. */
export function navIdForCompetition(comp: MatchCompetition): MatchNavId {
  if (comp === 'league') return 'league'
  if (comp === 'friendly') return 'friendlies'
  return 'competitions'
}

export interface SectionMemory {
  path: string
  /** Competição da partida, quando a última tela da seção foi o pré-jogo ou a partida. */
  comp?: MatchCompetition
}

/** Última tela visitada em cada seção que tem partida (Liga, Competições e Amistosos). Fora do estado reativo de propósito. */
export const sectionMemory: Partial<Record<MatchNavId, SectionMemory>> = {}

const MAIN_PATHS: Record<string, MatchNavId> = { '/league': 'league', '/competitions': 'competitions', '/friendlies': 'friendlies' }

/** Chamado a cada navegação: guarda onde o usuário estava dentro da seção. */
export function rememberSection(path: string, activeComp: MatchCompetition): void {
  if (path === '/match' || path === '/pre-match') {
    sectionMemory[navIdForCompetition(activeComp)] = { path, comp: activeComp }
    return
  }
  const id = MAIN_PATHS[path]
  if (id) sectionMemory[id] = { path }
}
