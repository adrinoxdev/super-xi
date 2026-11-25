import type { MatchCompetition } from '@/types/match'
import type { Player } from '@/types/player'

/** Nome curto de cada competição para avisos de suspensão. */
export const COMP_SHORT: Record<MatchCompetition, string> = {
  league: 'Liga',
  cup: 'Taça Cacique',
  continental: 'Copa Condor',
  supercup: 'Supercopa',
  recopa: 'Recopa',
  mundial: 'Copa dos Continentes',
  friendly: 'Amistoso'
}

// Amistoso não tem suspensão própria: fora da lista para suspensionsOf/yellowsOf não mostrarem "suspenso no Amistoso".
const ORDER = (Object.keys(COMP_SHORT) as MatchCompetition[]).filter((c) => c !== 'friendly')

/** O atleta está suspenso para a próxima partida desta competição? No amistoso: suspenso em qualquer competição. */
export function isSuspendedFor(p: Pick<Player, 'suspension'>, comp: MatchCompetition): boolean {
  if (comp === 'friendly') return Object.values(p.suspension ?? {}).some((n) => (n ?? 0) > 0)
  return (p.suspension?.[comp] ?? 0) > 0
}

/** Suspensões ativas do atleta, uma por competição. */
export function suspensionsOf(p: Pick<Player, 'suspension'>): Array<{ comp: MatchCompetition; label: string; games: number }> {
  return ORDER.filter((c) => isSuspendedFor(p, c)).map((c) => ({ comp: c, label: COMP_SHORT[c], games: p.suspension![c]! }))
}

/** Amarelos acumulados por competição (só as que têm cartão). */
export function yellowsOf(p: Pick<Player, 'yellowCards'>): Array<{ comp: MatchCompetition; label: string; count: number }> {
  return ORDER.filter((c) => (p.yellowCards?.[c] ?? 0) > 0).map((c) => ({ comp: c, label: COMP_SHORT[c], count: p.yellowCards![c]! }))
}

/** Ex.: "Liga (2 jogos) • Taça Cacique (1 jogo)". */
export function suspensionText(p: Pick<Player, 'suspension'>): string {
  return suspensionsOf(p)
    .map((s) => `${s.label} (${s.games} ${s.games === 1 ? 'jogo' : 'jogos'})`)
    .join(' • ')
}
