import type { MatchCompetition } from '@/types/match'
import type { Player } from '@/types/player'

/** Nome curto de cada competição para avisos de suspensão. */
export const COMP_SHORT: Record<MatchCompetition, string> = {
  league: 'Liga',
  cup: 'Taça Cacique',
  continental: 'Copa Condor',
  supercup: 'Supercopa',
  recopa: 'Recopa'
}

const ORDER = Object.keys(COMP_SHORT) as MatchCompetition[]

/** O atleta está suspenso para a próxima partida desta competição? */
export function isSuspendedFor(p: Pick<Player, 'suspension'>, comp: MatchCompetition): boolean {
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
