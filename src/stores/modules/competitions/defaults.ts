import type { ContinentalState, CupState, FinalState, MundialState } from '@/types'

export const DEFAULT_SUPERCUP_RIVAL = { name: 'Esporte Clube Estrela do Norte', power: 74 }
export const DEFAULT_RECOPA_RIVAL = { name: 'Deportivo Costa Dourada', power: 75 }

export const emptyCup = (): CupState => ({
  roundIndex: 0,
  eliminated: false,
  champion: false,
  currentRival: null,
  history: [],
  bracket: null,
  thirdPlace: false,
  finalPosition: null
})

export const emptyContinental = (): ContinentalState => ({
  qualified: false,
  tier: 'sulamericana',
  stage: 'GROUPS',
  groupRound: 1,
  eliminated: false,
  champion: false,
  teams: [],
  history: [],
  otherGroups: [],
  bracket: null,
  finalPosition: null
})

export const emptyFinal = (rival: { name: string; power: number }): FinalState => ({
  qualified: false,
  played: false,
  won: false,
  scoreText: '',
  rivalName: rival.name,
  rivalPower: rival.power
})

export const emptyMundial = (): MundialState => ({
  qualified: false,
  edition: 0,
  season: 0,
  hostId: '',
  userEntry: null,
  stage: 'GROUPS',
  groupRound: 1,
  userGroupId: '',
  groups: [],
  bracket: null,
  eliminated: false,
  champion: false,
  finalPosition: null,
  history: []
})
