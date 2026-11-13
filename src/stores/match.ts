import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LastMatchSummary, MatchCompetition, MatchState, MatchStats, TacticalMentality } from '@/types/match'
import { MENTALITIES } from '@/utils/constants'

function initialMatchState(): MatchState {
  return {
    isRunning: false,
    isFinished: false,
    minute: 0,
    speed: 1,
    userScore: 0,
    opponentScore: 0,
    subsUsed: 0,
    events: []
  }
}

function initialMatchStats(): MatchStats {
  return {
    userPossession: 50,
    userShots: 0,
    oppShots: 0,
    userShotsOnTarget: 0,
    oppShotsOnTarget: 0,
    userCorners: 0,
    oppCorners: 0,
    userFouls: 0,
    oppFouls: 0
  }
}

export const useMatchStore = defineStore('match', () => {
  const activeMatchCompetition = ref<MatchCompetition>('league')
  const selectedMentality = ref<TacticalMentality>('balanced')
  const matchState = ref<MatchState>(initialMatchState())
  const matchStats = ref<MatchStats>(initialMatchStats())
  const showSubDrawer = ref(false)
  const subOutId = ref('')
  const subInId = ref('')
  const lastMatchSummary = ref<LastMatchSummary | null>(null)

  const mentalityInfo = computed(() => MENTALITIES[selectedMentality.value] || MENTALITIES.balanced)
  const isMatchActive = computed(
    () => matchState.value.isRunning || matchState.value.isFinished || showSubDrawer.value
  )

  function resetMatchState() {
    matchState.value = initialMatchState()
    showSubDrawer.value = false
    lastMatchSummary.value = null
  }

  function resetStats() {
    matchStats.value = initialMatchStats()
  }

  return {
    activeMatchCompetition,
    selectedMentality,
    matchState,
    matchStats,
    showSubDrawer,
    subOutId,
    subInId,
    lastMatchSummary,
    mentalityInfo,
    isMatchActive,
    resetMatchState,
    resetStats
  }
})
