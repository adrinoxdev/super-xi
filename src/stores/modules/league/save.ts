import type { Ref } from 'vue'
import type { CompetitionStageType, LeagueFixture, LeagueSave, LeagueTeam } from '@/types/league'

export function createSave(ctx: {
  competitionStage: Ref<CompetitionStageType>
  leagueTeams: Ref<LeagueTeam[]>
  leagueFixtures: Ref<LeagueFixture[]>
}) {
  const { competitionStage, leagueTeams, leagueFixtures } = ctx

  function toSave(): LeagueSave {
    return {
      competitionStage: competitionStage.value,
      leagueTeams: leagueTeams.value,
      leagueFixtures: leagueFixtures.value
    }
  }

  function fromSave(p: Partial<LeagueSave>) {
    competitionStage.value = p.competitionStage || 'D_GROUPS'
    leagueTeams.value = p.leagueTeams || []
    leagueFixtures.value = p.leagueFixtures || []
  }

  return { toSave, fromSave }
}
