import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LastMatchSummary, MatchCompetition, MatchOpponent, MatchRecord, MatchState, MatchStats, TacticalMentality } from '@/types/match'
import { MENTALITIES } from '@/config'

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
    oppFouls: 0,
    userYellows: 0,
    oppYellows: 0,
    userReds: 0,
    oppReds: 0,
    userThrowIns: 0,
    oppThrowIns: 0,
    userOffsides: 0,
    oppOffsides: 0
  }
}

export const COMPETITIONS_ORDER: MatchCompetition[] = ['league', 'cup', 'continental', 'supercup', 'recopa']

interface MatchSession {
  matchState: MatchState
  matchStats: MatchStats
  showSubDrawer: boolean
  subOutId: string
  subInId: string
  lastMatchSummary: LastMatchSummary | null
  /** Adversário, mando e rótulo congelados no início: o estado das competições avança quando a partida termina. */
  snapshot: { opponent: MatchOpponent; isHome: boolean; label: string } | null
}

function newSession(): MatchSession {
  return {
    matchState: initialMatchState(),
    matchStats: initialMatchStats(),
    showSubDrawer: false,
    subOutId: '',
    subInId: '',
    lastMatchSummary: null,
    snapshot: null
  }
}

function sessionActive(s: MatchSession): boolean {
  return s.matchState.isRunning || s.matchState.isFinished || s.showSubDrawer
}

export const useMatchStore = defineStore('match', () => {
  // Cada competição tem sua própria sessão de partida: várias podem rodar ao mesmo tempo.
  const sessions = ref<Record<MatchCompetition, MatchSession>>({
    league: newSession(),
    cup: newSession(),
    continental: newSession(),
    supercup: newSession(),
    recopa: newSession()
  })
  // Competição exibida nas telas de partida.
  const activeMatchCompetition = ref<MatchCompetition>('league')
  const selectedMentality = ref<TacticalMentality>('balanced')

  const current = computed(() => sessions.value[activeMatchCompetition.value])

  // Proxies da sessão exibida: os componentes continuam lendo/escrevendo match.matchState etc.
  const matchState = computed<MatchState>({
    get: () => current.value.matchState,
    set: (v) => (current.value.matchState = v)
  })
  const matchStats = computed<MatchStats>({
    get: () => current.value.matchStats,
    set: (v) => (current.value.matchStats = v)
  })
  const showSubDrawer = computed<boolean>({
    get: () => current.value.showSubDrawer,
    set: (v) => (current.value.showSubDrawer = v)
  })
  const subOutId = computed<string>({
    get: () => current.value.subOutId,
    set: (v) => (current.value.subOutId = v)
  })
  const subInId = computed<string>({
    get: () => current.value.subInId,
    set: (v) => (current.value.subInId = v)
  })
  const lastMatchSummary = computed<LastMatchSummary | null>({
    get: () => current.value.lastMatchSummary,
    set: (v) => (current.value.lastMatchSummary = v)
  })

  const mentalityInfo = computed(() => MENTALITIES[selectedMentality.value] || MENTALITIES.balanced)
  const isMatchActive = computed(() => sessionActive(current.value))
  const isCompetitionMatchActive = (comp: MatchCompetition) => sessionActive(sessions.value[comp])
  /** Partida rodando ou pausada para trocas (não encerrada) na competição. */
  const isCompetitionLive = (comp: MatchCompetition) => {
    const s = sessions.value[comp]
    return !s.matchState.isFinished && (s.matchState.isRunning || s.showSubDrawer)
  }
  const liveCompetitions = computed(() => COMPETITIONS_ORDER.filter((c) => isCompetitionLive(c)))
  /** Competições com partida em andamento ou encerrada e ainda não fechada pelo usuário. */
  const openCompetitions = computed(() => COMPETITIONS_ORDER.filter((c) => sessionActive(sessions.value[c])))

  // Histórico de partidas concluídas (mais recente primeiro), limitado para não pesar no save.
  const MAX_HISTORY = 150
  const matchHistory = ref<MatchRecord[]>([])
  function addMatchRecord(record: MatchRecord) {
    matchHistory.value = [record, ...matchHistory.value].slice(0, MAX_HISTORY)
  }

  function resetMatchState(comp: MatchCompetition = activeMatchCompetition.value) {
    const s = sessions.value[comp]
    s.matchState = initialMatchState()
    s.showSubDrawer = false
    s.lastMatchSummary = null
    s.snapshot = null
  }

  function resetStats(comp: MatchCompetition = activeMatchCompetition.value) {
    sessions.value[comp].matchStats = initialMatchStats()
  }

  return {
    matchHistory,
    addMatchRecord,
    sessions,
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
    isCompetitionMatchActive,
    isCompetitionLive,
    liveCompetitions,
    openCompetitions,
    resetMatchState,
    resetStats
  }
})
