import type { Bracket } from './bracket'

export interface CupRival {
  name: string
  power: number
  serieCode: string
}

export interface CupHistoryItem {
  roundName: string
  summary: string
  prize: number
}

export interface CupState {
  roundIndex: number
  eliminated: boolean
  champion: boolean
  currentRival: CupRival | null
  history: CupHistoryItem[]
  bracket: Bracket | null
  /** Usuário perdeu a semi e tem a disputa de 3º pendente. */
  thirdPlace: boolean
  /** Colocação final quando chega ao fim. */
  finalPosition: 1 | 2 | 3 | 4 | null
}

export type ContinentalTier = 'sulamericana' | 'libertadores'

export type ContinentalStage = 'GROUPS' | 'QF' | 'SF' | 'THIRD' | 'FINAL'

export interface ContinentalTeam {
  id: string
  name: string
  power: number
  isUser: boolean
  points: number
  played: number
  won: number
  gf: number
  ga: number
}

export interface ContinentalGroup {
  id: string                 // 'B' | 'C' | 'D' (o grupo do usuário continua em ContinentalState.teams, id 'A')
  teams: ContinentalTeam[]
}

export interface ContinentalHistoryItem {
  summary: string
  prize: number
}

export interface ContinentalState {
  qualified: boolean
  tier: ContinentalTier
  stage: ContinentalStage
  groupRound: number
  eliminated: boolean
  champion: boolean
  teams: ContinentalTeam[]
  history: ContinentalHistoryItem[]
  otherGroups: ContinentalGroup[]
  bracket: Bracket | null
  finalPosition: 1 | 2 | 3 | 4 | null
}

/** Estado de uma final de taça unica (supercopa / recopa). */
export interface FinalState {
  qualified: boolean
  played: boolean
  won: boolean
  scoreText: string
  rivalName: string
  rivalPower: number
}
