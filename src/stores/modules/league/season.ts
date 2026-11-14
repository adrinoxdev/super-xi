import type { Ref } from 'vue'
import type { CompetitionStageType, LeagueFixture, LeagueTeam } from '@/types/league'
import { buildRoundRobin, LEAGUE_CLUBS_POOL } from '@/utils/league/leagueScheduler'
import { SERIE_TYPICAL_OVER } from '@/config'
import type { LeagueClub } from './types'

export function createSeason(ctx: {
  competitionStage: Ref<CompetitionStageType>
  leagueTeams: Ref<LeagueTeam[]>
  leagueFixtures: Ref<LeagueFixture[]>
  selectedRound: Ref<number>
  club: LeagueClub
}) {
  const { competitionStage, leagueTeams, leagueFixtures, selectedRound, club } = ctx
  const clubStore = club

  function initLeagueSeason(division: number, seasonNumber: number) {
    const pool = LEAGUE_CLUBS_POOL[division] || LEAGUE_CLUBS_POOL[4]
    const mk = (c: (typeof pool)[number], group?: string): LeagueTeam => ({
      id: c.id,
      name: c.name,
      power: c.basePower,
      style: c.style,
      isUser: false,
      ...(group ? { group } : {})
    })
    if (division === 4) {
      const grp = pool.slice(0, 5)
      const rest = pool.slice(5)
      leagueTeams.value = [
        { id: 'user', name: clubStore.name, power: SERIE_TYPICAL_OVER[4], style: 'Super XI', isUser: true, group: 'A1' },
        ...grp.map((c) => mk(c, 'A1')),
        ...rest.map((c) => mk(c, 'OUTROS'))
      ]
      competitionStage.value = 'D_GROUPS'
      leagueFixtures.value = buildRoundRobin(['user', ...grp.map((c) => c.id)], 'D_GROUPS', 'A1', true, 1)
      selectedRound.value = 1
      return
    }
    if (division === 3) {
      leagueTeams.value = [
        { id: 'user', name: clubStore.name, power: SERIE_TYPICAL_OVER[3], style: 'Super XI', isUser: true },
        ...pool.map((c) => mk(c))
      ]
      competitionStage.value = 'C_FIRST_STAGE'
      leagueFixtures.value = buildRoundRobin(leagueTeams.value.map((t) => t.id), 'C_FIRST_STAGE', undefined, false, 1)
      selectedRound.value = 1
      return
    }
    leagueTeams.value = [
      { id: 'user', name: clubStore.name, power: SERIE_TYPICAL_OVER[division] ?? SERIE_TYPICAL_OVER[1], style: 'Super XI', isUser: true },
      ...pool.map((c) => mk(c))
    ]
    competitionStage.value = 'POINTS_38'
    leagueFixtures.value = buildRoundRobin(leagueTeams.value.map((t) => t.id), 'POINTS_38', undefined, true, 1)
    selectedRound.value = 1
  }

  return { initLeagueSeason }
}
