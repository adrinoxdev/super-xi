import type { CompetitionStageType } from '@/types/league'

export const NEXT_D: Partial<Record<CompetitionStageType, CompetitionStageType>> = {
  D_R64: 'D_R32', D_R32: 'D_R16', D_R16: 'D_QF'
}

export const D_ALL: CompetitionStageType[] = ['D_R64', 'D_R32', 'D_R16', 'D_QF', 'D_SF', 'D_FINAL', 'D_THIRD']
