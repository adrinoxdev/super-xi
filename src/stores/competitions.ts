import { defineStore } from 'pinia'
import type { MatchCompetition } from '@/types/match'
import { computed, ref } from 'vue'
import type { ContinentalState, CupState, FinalState } from '@/types'
import { useClubStore } from './club'
import { DEFAULT_SUPERCUP_RIVAL, DEFAULT_RECOPA_RIVAL, emptyCup, emptyContinental, emptyFinal } from './modules/competitions/defaults'
import { createCup } from './modules/competitions/cup'
import { createFinals } from './modules/competitions/finals'
import { createContinental } from './modules/competitions/continental'
import { createSave } from './modules/competitions/save'
export type { ToastType, CompetitionToast } from './modules/competitions/types'

export const useCompetitionsStore = defineStore('competitions', () => {
  const clubStore = useClubStore()

  const cupState = ref<CupState>(emptyCup())
  const continentalState = ref<ContinentalState>(emptyContinental())
  const supercupState = ref<FinalState>(emptyFinal(DEFAULT_SUPERCUP_RIVAL))
  const recopaState = ref<FinalState>(emptyFinal(DEFAULT_RECOPA_RIVAL))
  const { cupRoundLabel, initCupForSeason, finishCupForSeason, migrateCup, applyCupResult } = createCup({
    cupState,
    club: clubStore
  })
  const { hasPendingFinal, resetFinals, qualifySupercup, qualifyRecopa, applyFinalResult } = createFinals({
    supercupState,
    recopaState,
    club: clubStore
  })

  const {
    continentalStageLabel,
    continentalStandings,
    continentalOpponent,
    initContinentalForSeason,
    finishContinentalForSeason,
    migrateContinental,
    applyContinentalResult
  } = createContinental({
    continentalState,
    club: clubStore
  })

  const hasPendingThirdPlace = computed(
    () =>
      (cupState.value.thirdPlace && isCompetitionPlayable('cup')) ||
      (continentalState.value.stage === 'THIRD' && isCompetitionPlayable('continental'))
  )

  /** Chamar depois de fromSave: saves antigos ganham a chave reconstruída (a virada de temporada troca as vigentes). */
  function ensureBrackets() {
    const cup = cupState.value
    if (!cup.bracket && (cup.currentRival || cup.eliminated || cup.champion || cup.history.length)) migrateCup()
    migrateContinental()
  }

  const { toSave, fromSave } = createSave({ cupState, continentalState, supercupState, recopaState })

  function isCompetitionPlayable(comp: MatchCompetition): boolean {
    if (comp === 'cup') {
      const c = cupState.value
      return !c.eliminated && !c.champion && !!c.currentRival
    }
    if (comp === 'continental') {
      const c = continentalState.value
      return c.qualified && !c.eliminated && !c.champion
    }
    if (comp === 'supercup') return supercupState.value.qualified && !supercupState.value.played
    if (comp === 'recopa') return recopaState.value.qualified && !recopaState.value.played
    return true
  }

  return {
    isCompetitionPlayable,
    cupState,
    continentalState,
    supercupState,
    recopaState,
    cupRoundLabel,
    continentalStageLabel,
    continentalStandings,
    continentalOpponent,
    hasPendingFinal,
    hasPendingThirdPlace,
    initCupForSeason,
    finishCupForSeason,
    initContinentalForSeason,
    finishContinentalForSeason,
    resetFinals,
    qualifySupercup,
    qualifyRecopa,
    applyCupResult,
    applyContinentalResult,
    applyFinalResult,
    toSave,
    fromSave,
    ensureBrackets
  }
})
