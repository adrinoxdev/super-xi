import { computed } from 'vue'
import type { Ref } from 'vue'
import type { CompetitionStageType, LeagueFixture, LeagueTeam } from '@/types/league'
import { computeStandings, KNOCKOUT_STAGES, SERIE_META, STAGE_NAMES, zoneBadgeClass } from '@/utils/league/leagueScheduler'
import { SERIE_TYPICAL_OVER } from '@/config'
import { buildLeagueBracketView } from '@/utils/league/leagueKnockout'
import type { LeagueClub } from './types'

export function createLeagueGetters(ctx: {
  competitionStage: Ref<CompetitionStageType>
  leagueTeams: Ref<LeagueTeam[]>
  leagueFixtures: Ref<LeagueFixture[]>
  selectedRound: Ref<number>
  club: LeagueClub
}) {
  const { competitionStage, leagueTeams, leagueFixtures, selectedRound, club } = ctx
  const clubStore = club

  const serieMeta = computed(() => SERIE_META[clubStore.division] ?? SERIE_META[4])
  const currentStageLabel = computed(() => STAGE_NAMES[competitionStage.value] ?? serieMeta.value.name)

  const leagueStandings = computed(() =>
    computeStandings(leagueTeams.value, leagueFixtures.value, competitionStage.value, clubStore.name)
  )
  const userLeagueRow = computed(() => leagueStandings.value.find((r) => r.isUser))
  const userLeagueRank = computed(() => userLeagueRow.value?.rank || 1)
  const userLeaguePoints = computed(() => userLeagueRow.value?.points || 0)

  const nextUserFixture = computed(() =>
    leagueFixtures.value.find(
      (f) => f.stage === competitionStage.value && !f.played && (f.homeId === 'user' || f.awayId === 'user')
    ) || null
  )

  const currentRound = computed(() => {
    if (nextUserFixture.value) return nextUserFixture.value.round
    const list = leagueFixtures.value.filter((f) => f.stage === competitionStage.value)
    return list.length ? Math.max(...list.map((f) => f.round)) : 1
  })

  const maxStageRounds = computed(() => {
    const list = leagueFixtures.value.filter((f) => f.stage === competitionStage.value)
    return list.length ? Math.max(...list.map((f) => f.round)) : 1
  })

  const fixturesForSelectedRound = computed(() =>
    leagueFixtures.value.filter((f) => f.stage === competitionStage.value && f.round === selectedRound.value)
  )

  const isKnockoutStage = computed(() => KNOCKOUT_STAGES.includes(competitionStage.value))

  function getTeamName(id: string): string {
    if (id === 'user') return clubStore.name
    const t = leagueTeams.value.find((x) => x.id === id)
    return t ? t.name : 'Clube'
  }

  const knockoutAggregateScore = computed(() => {
    const tie = leagueFixtures.value.filter(
      (f) => f.stage === competitionStage.value && (f.homeId === 'user' || f.awayId === 'user')
    )
    let user = 0
    let opp = 0
    let rivalId = ''
    for (const fx of tie) {
      if (fx.homeId === 'user') {
        user += fx.homeScore || 0
        opp += fx.awayScore || 0
        rivalId = fx.awayId
      } else {
        user += fx.awayScore || 0
        opp += fx.homeScore || 0
        rivalId = fx.homeId
      }
    }
    return { user, opp, rivalName: getTeamName(rivalId) }
  })

  const knockoutBracket = computed(() =>
    buildLeagueBracketView({
      division: clubStore.division,
      season: clubStore.season,
      stage: competitionStage.value,
      fixtures: leagueFixtures.value,
      teams: leagueTeams.value,
      clubName: clubStore.name
    })
  )
  const knockoutPodium = computed(() => knockoutBracket.value?.podium ?? null)

  /** Tabela da última fase de grupos: A1 na Série D, quadrangular do usuário na Série C. */
  const groupStageStandings = computed(() => {
    if (clubStore.division === 4) {
      return computeStandings(leagueTeams.value, leagueFixtures.value, 'D_GROUPS', clubStore.name)
    }
    if (clubStore.division === 3 && leagueFixtures.value.some((f) => f.stage === 'C_QUADRANGULAR')) {
      return computeStandings(leagueTeams.value, leagueFixtures.value, 'C_QUADRANGULAR', clubStore.name)
    }
    return leagueStandings.value
  })

  /** Tabela do outro quadrangular da Série C (vazia fora dele). */
  const otherQuadrangularStandings = computed(() => {
    if (clubStore.division !== 3 || !leagueFixtures.value.some((f) => f.stage === 'C_QUADRANGULAR')) return []
    const mine = leagueTeams.value.find((t) => t.id === 'user')?.group
    if (mine !== 'B' && mine !== 'C') return []
    return computeStandings(leagueTeams.value, leagueFixtures.value, 'C_QUADRANGULAR', clubStore.name, mine === 'B' ? 'C' : 'B')
  })

  const nextFixtureIsHome = computed(() => !nextUserFixture.value || nextUserFixture.value.homeId === 'user')

  const nextOpponent = computed<{ name: string; power: number; style: string }>(() => {
    if (!nextUserFixture.value) {
      const fallback = leagueTeams.value.find((t) => !t.isUser)
      return fallback || { name: 'Rival Nacional', power: typicalOver(), style: 'Equilibrado' }
    }
    const rivalId =
      nextUserFixture.value.homeId === 'user' ? nextUserFixture.value.awayId : nextUserFixture.value.homeId
    return leagueTeams.value.find((t) => t.id === rivalId) || { name: 'Adversário', power: typicalOver(), style: 'Equilibrado' }
  })

  function typicalOver(): number {
    return SERIE_TYPICAL_OVER[clubStore.division] ?? SERIE_TYPICAL_OVER[4]
  }

  function getZoneBadgeClass(rank: number): string {
    return zoneBadgeClass(competitionStage.value, rank, clubStore.division)
  }

  return {
    serieMeta,
    currentStageLabel,
    leagueStandings,
    userLeagueRow,
    userLeagueRank,
    userLeaguePoints,
    nextUserFixture,
    currentRound,
    maxStageRounds,
    fixturesForSelectedRound,
    isKnockoutStage,
    getTeamName,
    knockoutAggregateScore,
    knockoutBracket,
    knockoutPodium,
    groupStageStandings,
    otherQuadrangularStandings,
    nextFixtureIsHome,
    nextOpponent,
    typicalOver,
    getZoneBadgeClass
  }
}
