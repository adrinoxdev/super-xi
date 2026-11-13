export type TacticalMentality =
  | 'very_defensive'
  | 'defensive'
  | 'balanced'
  | 'offensive'
  | 'very_offensive'

export type FormationName =
  | '4-3-3' | '4-2-3-1' | '4-4-2' | '4-1-4-1' | '3-4-3'
  | '4-2-2-2' | '4-1-2-1-2' | '3-5-2' | '5-3-2'

export type MatchCompetition = 'league' | 'cup' | 'continental' | 'supercup' | 'recopa'

export type MatchEventType = 'info' | 'goal' | 'opp_goal' | 'sub' | 'injury' | 'comment'

export interface LiveMatchEvent {
  minute: number
  type: MatchEventType
  description: string
}

export interface MatchState {
  isRunning: boolean
  isFinished: boolean
  minute: number
  speed: 1 | 2
  userScore: number
  opponentScore: number
  subsUsed: number
  events: LiveMatchEvent[]
}

export interface MatchStats {
  userPossession: number
  userShots: number
  oppShots: number
  userShotsOnTarget: number
  oppShotsOnTarget: number
  userCorners: number
  oppCorners: number
  userFouls: number
  oppFouls: number
}

export interface LastMatchSummary {
  ticket: number
  sponsor: number
  winBonus: number
  wages: number
  net: number
  interest?: number
  maintenance?: number
  forcedSale?: { name: string; price: number } | null
  evolutions?: Array<{ name: string; overall: number }>
  /** Títulos dos marcos de progressão atingidos nesta partida. */
  milestones?: string[]
}

export interface MatchOpponent {
  name: string
  power: number
  style: string
}
