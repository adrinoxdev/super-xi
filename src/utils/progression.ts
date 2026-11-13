import { MILESTONES } from '@/utils/constants'
import type { Milestone } from '@/types/club'

export interface MilestoneState {
  season: number
  /** OVER (rating) do time agora. */
  teamOver: number
  /** Maior OVER entre os atletas do elenco. */
  bestPlayerOver: number
  /** Série para a qual o clube acabou de subir (3 = C, 2 = B, 1 = A); omitido sem subida. */
  promotedTo?: number
  /** Marcos já registrados (ids). */
  existingIds: ReadonlyArray<string>
}

const SERIE_LETTER: Record<number, string> = { 3: 'C', 2: 'B', 1: 'A' }

/** Puro: devolve só os marcos ainda não registrados. Cada id aparece uma vez. */
export function checkMilestones(state: MilestoneState): Milestone[] {
  const have = new Set(state.existingIds)
  const out: Milestone[] = []
  const add = (id: string, title: string) => {
    if (have.has(id)) return
    have.add(id)
    out.push({ id, season: state.season, title })
  }
  for (const t of MILESTONES.teamOver) {
    if (state.teamOver >= t) add('team_' + t, 'OVER ' + t + ' do time')
  }
  for (const t of MILESTONES.playerOver) {
    if (state.bestPlayerOver >= t) add('player_' + t, 'Primeiro atleta com OVER ' + t)
  }
  const letter = state.promotedTo !== undefined ? SERIE_LETTER[state.promotedTo] : undefined
  if (letter) add('promotion_' + letter, 'Primeira subida para a Série ' + letter)
  return out
}

/** Catálogo completo de marcos (id e título), na ordem de exibição; usado para mostrar os que faltam. */
export function milestoneCatalog(): Array<{ id: string; title: string; kind: 'team' | 'player' | 'promotion'; target?: number }> {
  return [
    ...MILESTONES.teamOver.map((t) => ({ id: 'team_' + t, title: 'OVER ' + t + ' do time', kind: 'team' as const, target: t })),
    ...MILESTONES.playerOver.map((t) => ({ id: 'player_' + t, title: 'Primeiro atleta com OVER ' + t, kind: 'player' as const, target: t })),
    ...(['C', 'B', 'A'] as const).map((l) => ({ id: 'promotion_' + l, title: 'Primeira subida para a Série ' + l, kind: 'promotion' as const }))
  ]
}
