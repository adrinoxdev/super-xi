import { EXTRA_D_CLUBS } from '@/utils/league/extraClubs'
import { LEAGUE_CLUBS_POOL } from '@/utils/league/leagueScheduler'

let styleByName: Map<string, string> | null = null

/** Estilo de jogo de um clube pelo nome (ligas e extras da Série D); null se o jogo não conhece o clube. */
export function clubStyleByName(name: string): string | null {
  if (!styleByName) {
    styleByName = new Map<string, string>()
    for (const clubs of Object.values(LEAGUE_CLUBS_POOL)) for (const c of clubs) styleByName.set(c.name, c.style)
    for (const c of EXTRA_D_CLUBS) styleByName.set(c.name, c.style)
  }
  return styleByName.get(name) ?? null
}
