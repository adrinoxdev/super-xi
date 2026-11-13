import type { Bracket, BracketTeam, BracketTie } from '@/types'
import { playLeg, propagate, simulatePhaseExceptUser } from '@/utils/bracket/bracket'
import { LEAGUE_CLUBS_POOL } from '@/utils/league/leagueScheduler'
import { TEAM_ID_BY_NAME } from '@/utils/identity/teamIdentities'

export const OLD_CUP_NAMES = ['Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final da Taça Cacique']
export const CONTINENTAL_ROUND_LABELS = ['Quartas de Final Continental', 'Semifinal Continental', 'Final Continental']

export const bracketTies = (b: Bracket): BracketTie[] => [
  ...b.rounds.flatMap((r) => r.ties),
  ...(b.thirdPlace ? [b.thirdPlace] : []),
  ...(b.side ? b.side.ties : [])
]

export function legacyRivalId(name: string): string {
  const byName = TEAM_ID_BY_NAME[name]
  if (byName) return byName
  const found = Object.values(LEAGUE_CLUBS_POOL).flat().find((c) => c.name === name)
  return found?.id ?? 'legacy_rival'
}

/** Placar do usuário (primeiro número) lido do texto do histórico; null se não houver. */
export function scoreFromText(text: string | undefined): [number, number] | null {
  const m = text ? /(\d+) x (\d+)/.exec(text) : null
  return m ? [Number(m[1]), Number(m[2])] : null
}

/** Troca o id de um time da chave por outro (mapa, confrontos e pernas). */
export function renameBracketTeam(b: Bracket, from: string, to: string, team: BracketTeam) {
  if (from !== to) {
    delete b.teams[from]
    const swap = (v: string | null) => (v === from ? to : v)
    for (const t of bracketTies(b)) {
      t.homeId = swap(t.homeId)
      t.awayId = swap(t.awayId)
      t.winnerId = swap(t.winnerId)
      t.loserId = swap(t.loserId)
      for (const l of t.legs) {
        l.homeId = swap(l.homeId) as string
        l.awayId = swap(l.awayId) as string
      }
    }
  }
  b.teams[to] = team
}

/** Fecha o confronto do usuário na fase como resultado reconstruído (legado) e simula o resto da fase. */
export function legacyUserResult(b: Bracket, roundIdx: number, userWon: boolean, score: [number, number] | null) {
  const tie = b.rounds[roundIdx]?.ties.find(
    (t) => (t.homeId === 'user' || t.awayId === 'user') && !t.winnerId && !!t.homeId && !!t.awayId
  )
  if (!tie || !tie.homeId || !tie.awayId) return
  const userIsHome = tie.homeId === 'user'
  if (score) {
    playLeg(tie, 0, userIsHome ? score[0] : score[1], userIsHome ? score[1] : score[0])
  } else if (tie.legs[0]) {
    tie.legs[0].played = true
  }
  const opp = userIsHome ? tie.awayId : tie.homeId
  tie.winnerId = userWon ? 'user' : opp
  tie.loserId = userWon ? opp : 'user'
  tie.legacy = true
  simulatePhaseExceptUser(b, roundIdx)
  propagate(b, { userHosts: true })
}
