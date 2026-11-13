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
  injury?: { matchesLeft: number }
  /** Temporada em que o atleta chegou (contratação ou promoção) e quanto custou: teto de venda nessa temporada. */
  acquiredSeason?: number
  acquiredFee?: number
}

export type LoanCandidate = Player & { loanFee: number }
