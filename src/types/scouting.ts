import type { Player, PlayerPosition } from './player'

export type ScoutMissionType =
  | 'local'
  | 'national'
  | 'international'
  | 'position'
  | 'youth'

export type ScoutReportStatus = 'new' | 'signed'

export interface ScoutMission {
  id: string
  type: ScoutMissionType
  title: string
  positionFocus?: PlayerPosition
  startTime: number
  duration: number
  status: 'active' | 'completed'
}

export interface ScoutReport {
  id: string
  player: Player
  estimatedOvr: number
  estimatedPotential: number
  isGem: boolean
  status: ScoutReportStatus
}
