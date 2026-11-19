import type { FriendlyBot, FriendlyStanding, FriendlyStats } from '@/types/friendlies'

export const emptyStats = (): FriendlyStats => ({ played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 })

/** Saldo de gols. */
export const goalDiff = (s: FriendlyStats): number => s.gf - s.ga

const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0)

/** Estatísticas vindas do save: cada campo inteiro >= 0 (NaN, undefined e texto viram 0); played sempre = V + E + D. */
export function sanitizeStats(raw: unknown): FriendlyStats {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const won = count(o.won)
  const drawn = count(o.drawn)
  const lost = count(o.lost)
  return { played: won + drawn + lost, won, drawn, lost, gf: count(o.gf), ga: count(o.ga) }
}

/** Soma um jogo, com gols do ponto de vista de quem recebe. Não muta a entrada. */
export function addResult(s: FriendlyStats, gf: number, ga: number): FriendlyStats {
  return {
    played: s.played + 1,
    won: s.won + (gf > ga ? 1 : 0),
    drawn: s.drawn + (gf === ga ? 1 : 0),
    lost: s.lost + (gf < ga ? 1 : 0),
    gf: s.gf + gf,
    ga: s.ga + ga
  }
}

/**
 * Ordem da tabela de classificação: a mesma da liga (computeStandings em src/utils/league/leagueScheduler.ts:
 * pontos → vitórias → saldo → gols pró), com a fama no lugar dos pontos. Negativo: `a` fica acima de `b`.
 */
export function compareStanding(a: FriendlyStanding, b: FriendlyStanding): number {
  return b.fame - a.fame || b.stats.won - a.stats.won || goalDiff(b.stats) - goalDiff(a.stats) || b.stats.gf - a.stats.gf
}

/** Entre bots, depois dos critérios da liga: nome (pt-BR) e por último id. Ordem total e determinística. */
function compareBots(a: FriendlyBot, b: FriendlyBot): number {
  return compareStanding(a, b) || a.name.localeCompare(b.name, 'pt-BR') || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

/**
 * Posição do usuário: 1 + bots estritamente à frente pelos critérios da liga. Empate total favorece o usuário.
 * Vai de 1 a bots.length + 1.
 */
export function userRank(user: FriendlyStanding, bots: readonly FriendlyBot[]): number {
  return 1 + bots.filter((b) => compareStanding(b, user) < 0).length
}

/** Bots na ordem da tabela, com a posição no ranking que inclui o usuário. */
export function rankedBots(bots: readonly FriendlyBot[], user: FriendlyStanding): Array<{ bot: FriendlyBot; rank: number }> {
  const uRank = userRank(user, bots)
  return [...bots].sort(compareBots).map((bot, i) => ({ bot, rank: i + 1 >= uRank ? i + 2 : i + 1 }))
}
