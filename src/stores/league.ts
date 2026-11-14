import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { CompetitionStageType, LeagueFixture, LeagueTeam } from '@/types/league'
import { useClubStore } from './club'
import { migrateLegacyKnockoutTies } from '@/migrations/legacyLeagueKnockout'
import { createLeagueGetters } from './modules/league/getters'
import { createSimulation } from './modules/league/simulation'
import { createSeason } from './modules/league/season'
import { createPostseason } from './modules/league/postseason'
import { createProgression } from './modules/league/progression'
import { createSave } from './modules/league/save'

export const useLeagueStore = defineStore('league', () => {
  const clubStore = useClubStore()

  const competitionStage = ref<CompetitionStageType>('D_GROUPS')
  const leagueTeams = ref<LeagueTeam[]>([])
  const leagueFixtures = ref<LeagueFixture[]>([])
  const selectedRound = ref(1)

  const {
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
  } = createLeagueGetters({ competitionStage, leagueTeams, leagueFixtures, selectedRound, club: clubStore })

  const { recordRoundResults, simulateOther, powerOf, completeParallelStages } = createSimulation({
    competitionStage, leagueTeams, leagueFixtures, selectedRound, currentRound, typicalOver
  })

  const { initLeagueSeason } = createSeason({
    competitionStage, leagueTeams, leagueFixtures, selectedRound, club: clubStore
  })

  const { startSerieDKnockout, startSerieCQuadrangular, generateNextStages, completeLeaguePostseason } = createPostseason({
    leagueTeams, leagueFixtures, club: clubStore, leagueStandings, simulateOther, powerOf
  })

  const { evaluateStageProgression } = createProgression({
    competitionStage, leagueFixtures, selectedRound, club: clubStore, userLeagueRank,
    startSerieDKnockout, startSerieCQuadrangular, generateNextStages, completeLeaguePostseason,
    completeParallelStages, powerOf
  })

  function ensureKnockoutTies() {
    migrateLegacyKnockoutTies({
      getStage: () => competitionStage.value,
      getFixtures: () => leagueFixtures.value,
      setFixtures: (fixtures) => { leagueFixtures.value = fixtures },
      getTeams: () => leagueTeams.value,
      simulateOther
    })
  }

  const { toSave, fromSave } = createSave({ competitionStage, leagueTeams, leagueFixtures })

  return {
    competitionStage,
    leagueTeams,
    leagueFixtures,
    selectedRound,
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
    knockoutAggregateScore,
    knockoutBracket,
    knockoutPodium,
    groupStageStandings,
    otherQuadrangularStandings,
    nextFixtureIsHome,
    nextOpponent,
    getTeamName,
    getZoneBadgeClass,
    initLeagueSeason,
    recordRoundResults,
    evaluateStageProgression,
    toSave,
    fromSave,
    ensureKnockoutTies
  }
})
