import type { MatchRecord } from '@/types/match'

export type MatchOutcome = 'win' | 'draw' | 'loss'

export function outcomeOf(m: Pick<MatchRecord, 'userScore' | 'opponentScore' | 'penalties'>): MatchOutcome {
  if (m.userScore === m.opponentScore && m.penalties) return m.penalties.user > m.penalties.opp ? 'win' : 'loss'
  return m.userScore > m.opponentScore ? 'win' : m.userScore === m.opponentScore ? 'draw' : 'loss'
}

/** Placar com pênaltis, por exemplo "1 x 1 (4 x 3 pên.)". */
export function scoreText(m: Pick<MatchRecord, 'userScore' | 'opponentScore' | 'penalties'>): string {
  const base = `${m.userScore} x ${m.opponentScore}`
  return m.penalties ? `${base} (${m.penalties.user} x ${m.penalties.opp} pên.)` : base
}

export const OUTCOME_UI: Record<MatchOutcome, { letter: string; label: string; cls: string }> = {
  win: { letter: 'V', label: 'Vitória', cls: 'bg-emeraldpro text-night' },
  draw: { letter: 'E', label: 'Empate', cls: 'bg-subtle text-ink-muted border border-borderline' },
  loss: { letter: 'D', label: 'Derrota', cls: 'bg-dangerpro text-night' }
}

export const COMPETITION_NAMES: Record<MatchRecord['competition'], string> = {
  league: 'Liga',
  cup: 'Taça Cacique',
  continental: 'Continental',
  supercup: 'Supercopa',
  recopa: 'Recopa',
  mundial: 'Copa dos Continentes',
  friendly: 'Amistoso'
}
