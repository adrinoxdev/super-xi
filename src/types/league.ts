export type CompetitionStageType =
  | 'D_GROUPS' | 'D_R64' | 'D_R32' | 'D_R16' | 'D_QF' | 'D_SF' | 'D_FINAL' | 'D_THIRD'
  | 'C_FIRST_STAGE' | 'C_QUADRANGULAR' | 'C_FINAL' | 'C_THIRD'
  | 'POINTS_38'

export interface LeagueTeam {
  id: string
  name: string
  power: number
  style: string
  isUser: boolean
  tag?: string // origem no chaveamento da Série D ('2º A7'); opcional, saves antigos não têm
  group?: string // 'MM' = clube que só entra no mata-mata da Série D
}

export interface LeagueFixture {
  id?: string
  stage?: CompetitionStageType
  group?: string
  round: number
  homeId: string
  awayId: string
  homeScore: number | null
  awayScore: number | null
  played: boolean
  tie?: number               // índice do confronto na fase (mata-mata)
  leg?: 1 | 2                // 1 = ida, 2 = volta; ausente em jogo único
  homePens?: number | null   // pênaltis, só no último jogo do confronto, relativos ao mandante deste jogo
  awayPens?: number | null
}

export interface LeagueStandingRow {
  rank: number
  teamId: string
  name: string
  isUser: boolean
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  gd: number
  points: number
}

export type StageToastType = 'success' | 'warning' | 'danger' | 'info'

export type StageOutcome =
  | { kind: 'advance'; toast: string; toastType: StageToastType }
  | {
      kind: 'endSeason'
      nextDivision: number
      bonus: number
      toast: string
      toastType: StageToastType
      trophyType?: 'title' | 'promotion'
      trophyTitle?: string
    }

export interface LeagueSave {
  competitionStage: CompetitionStageType
  leagueTeams: LeagueTeam[]
  leagueFixtures: LeagueFixture[]
}
