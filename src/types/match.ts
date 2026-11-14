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

export type MatchEventType =
  | 'info' | 'goal' | 'opp_goal' | 'sub' | 'injury' | 'comment' | 'penalty'
  // escanteio, apito (início, 2º tempo e fim de jogo) e cartões
  | 'corner' | 'whistle' | 'yellow' | 'red'
  // lateral, impedimento, falta perigosa, bola na trave e briga
  | 'throwin' | 'offside' | 'freekick' | 'post' | 'brawl'

export interface LiveMatchEvent {
  minute: number
  type: MatchEventType
  description: string
}

export interface ShootoutKick {
  side: 'user' | 'opp'
  scored: boolean
}

/** Disputa de pênaltis ao vivo (mata-mata empatado no tempo normal). */
export interface ShootoutState {
  kicks: ShootoutKick[]
  /** Quem bate primeiro: o mandante. */
  first: 'user' | 'opp'
  done: boolean
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
  shootout?: ShootoutState | null
  /** Minutos de acréscimo do 2º tempo, definidos aos 88' (o jogo termina em 90 + addedTime). */
  addedTime?: number
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
  /** Cartões (opcionais: partidas antigas do histórico não têm). */
  userYellows?: number
  oppYellows?: number
  userReds?: number
  oppReds?: number
  userThrowIns?: number
  oppThrowIns?: number
  userOffsides?: number
  oppOffsides?: number
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

/** Partida concluída guardada no histórico (somente leitura). */
export interface MatchRecord {
  id: string
  playedAt: number
  season: number
  competition: MatchCompetition
  label: string
  userName: string
  opponentName: string
  isHome: boolean
  userScore: number
  opponentScore: number
  mentality: string
  formation: string
  events: LiveMatchEvent[]
  stats: MatchStats
  summary: LastMatchSummary | null
  /** Pênaltis (só quando o jogo foi decidido na disputa). */
  penalties?: { user: number; opp: number } | null
}
