import type { ComputedRef, Ref } from 'vue'
import type { CompetitionStageType, LeagueFixture, LeagueTeam } from '@/types/league'
import { simulateMatchScore } from '@/utils/bracket/bracket'
import { PARALLEL_STAGES } from '@/utils/league/leagueKnockout'

export function createSimulation(ctx: {
  competitionStage: Ref<CompetitionStageType>
  leagueTeams: Ref<LeagueTeam[]>
  leagueFixtures: Ref<LeagueFixture[]>
  selectedRound: Ref<number>
  currentRound: ComputedRef<number>
  typicalOver: () => number
}) {
  const { competitionStage, leagueTeams, leagueFixtures, selectedRound, currentRound, typicalOver } = ctx

  function recordRoundResults(uGoals: number, oGoals: number) {
    const round = currentRound.value
    for (const fx of leagueFixtures.value) {
      const inStage =
        fx.stage === competitionStage.value || !!(fx.stage && PARALLEL_STAGES[competitionStage.value]?.includes(fx.stage))
      if (!inStage || fx.round !== round || fx.played) continue
      if (fx.homeId === 'user' || fx.awayId === 'user') {
        fx.homeScore = fx.homeId === 'user' ? uGoals : oGoals
        fx.awayScore = fx.awayId === 'user' ? uGoals : oGoals
        fx.played = true
      } else {
        simulateOther(fx)
      }
    }
    selectedRound.value = currentRound.value
  }

  function simulateOther(fx: LeagueFixture) {
    const h = leagueTeams.value.find((t) => t.id === fx.homeId)
    const a = leagueTeams.value.find((t) => t.id === fx.awayId)
    // Todos os jogos da IA usam a mesma curva do motor.
    const sc = simulateMatchScore(h?.power ?? typicalOver(), a?.power ?? typicalOver())
    fx.homeScore = sc.home
    fx.awayScore = sc.away
    fx.played = true
  }

  const powerOf = (id: string) => leagueTeams.value.find((t) => t.id === id)?.power ?? typicalOver()

  /** Simula as pernas restantes da fase e das paralelas, exceto jogos do usuário. */
  function completeParallelStages(stage: CompetitionStageType) {
    const stages = [stage, ...(PARALLEL_STAGES[stage] ?? [])]
    for (const fx of leagueFixtures.value) {
      if (fx.played || !fx.stage || !stages.includes(fx.stage)) continue
      if (fx.homeId === 'user' || fx.awayId === 'user') continue
      simulateOther(fx)
    }
  }

  return { recordRoundResults, simulateOther, powerOf, completeParallelStages }
}
