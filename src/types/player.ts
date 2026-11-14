import type { MatchCompetition } from './match'

export type PlayerPosition =
  | 'GK'
  | 'CB' | 'LB' | 'RB'
  | 'CDM' | 'CM' | 'CAM'
  | 'LW' | 'RW'
  | 'ST'

export type TrainingFocus = 'balanced' | 'shooting' | 'pace' | 'passing' | 'defending' | 'physical'
export type MarketStatus = 'available' | 'transfer_listed' | 'untouchable'

export interface PlayerAttributes {
  pace: number
  shooting: number
  passing: number
  dribbling: number
  defending: number
  physical: number
}

export interface Player {
  id: string
  name: string
  age: number
  nationality: string
  position: PlayerPosition
  overall: number
  potential: number
  attributes: PlayerAttributes
  value: number
  wage: number
  form: number          // 40-100
  stamina: number       // 0-100
  contractYears: number
  isYouth: boolean
  isLoanedOut: boolean
  isLoanedIn: boolean
  trainingFocus: TrainingFocus
  marketStatus: MarketStatus
  /** Presente enquanto o atleta está lesionado; cai 1 por partida do clube. */
  /** Jogos de suspensão por competição: expulso na Liga só desfalca a Liga (cumpre um jogo a cada partida dela). */
  suspension?: Partial<Record<MatchCompetition, number>>
  /** Amarelos acumulados na temporada, por competição (3 geram suspensão de 1 jogo naquela competição). */
  yellowCards?: Partial<Record<MatchCompetition, number>>
  injury?: { matchesLeft: number; /** Já passou por tratamento pago nesta lesão. */ treated?: boolean }
  /** Temporada em que o atleta chegou (contratação ou promoção) e quanto custou: teto de venda nessa temporada. */
  acquiredSeason?: number
  acquiredFee?: number
}

export type LoanCandidate = Player & { loanFee: number }
