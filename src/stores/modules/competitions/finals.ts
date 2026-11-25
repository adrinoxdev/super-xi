import { computed } from 'vue'
import type { Ref } from 'vue'
import type { FinalState } from '@/types'
import { CONTINENTAL_RIVALS, PRIZES } from '@/config'
import { formatCurrency } from '@/utils/format/formatCurrency'
import { LEAGUE_CLUBS_POOL } from '@/utils/league/leagueScheduler'
import { pickRandom, randInt } from '@/utils/core/random'
import type { FinalRival } from '@/utils/competitions/finalsRivals'
import { DEFAULT_SUPERCUP_RIVAL, DEFAULT_RECOPA_RIVAL, emptyFinal } from './defaults'
import type { CompetitionToast, CompetitionsClub } from './types'

export function createFinals(ctx: {
  supercupState: Ref<FinalState>
  recopaState: Ref<FinalState>
  club: CompetitionsClub
}) {
  const { supercupState, recopaState, club } = ctx

  const hasPendingFinal = computed(
    () =>
      (supercupState.value.qualified && !supercupState.value.played) ||
      (recopaState.value.qualified && !recopaState.value.played)
  )

  function resetFinals() {
    supercupState.value = emptyFinal(DEFAULT_SUPERCUP_RIVAL)
    recopaState.value = emptyFinal(DEFAULT_RECOPA_RIVAL)
  }

  function qualifySupercup(rival?: FinalRival | null) {
    if (rival) {
      supercupState.value = {
        qualified: true, played: false, won: false, scoreText: '',
        rivalName: rival.name, rivalPower: rival.power, rivalOrigin: rival.origin
      }
      return
    }
    const pick = pickRandom(LEAGUE_CLUBS_POOL[1])
    supercupState.value = {
      qualified: true,
      played: false,
      won: false,
      scoreText: '',
      rivalName: pick.name,
      rivalPower: pick.basePower
    }
  }

  function qualifyRecopa(rival?: FinalRival | null) {
    if (rival) {
      recopaState.value = {
        qualified: true, played: false, won: false, scoreText: '',
        rivalName: rival.name, rivalPower: rival.power, rivalOrigin: rival.origin
      }
      return
    }
    const pick = pickRandom(CONTINENTAL_RIVALS)
    recopaState.value = {
      qualified: true,
      played: false,
      won: false,
      scoreText: '',
      rivalName: pick.name,
      rivalPower: pick.power
    }
  }

  function applyFinalResult(
    kind: 'supercup' | 'recopa',
    uGoals: number,
    oGoals: number,
    userPens?: { user: number; opp: number } | null
  ): CompetitionToast {
    const isSuper = kind === 'supercup'
    const state = isSuper ? supercupState : recopaState
    const titlePrize = isSuper ? PRIZES.supercup.champion : PRIZES.recopa.champion
    const runnerUpPrize = isSuper ? PRIZES.supercup.runnerUp : PRIZES.recopa.runnerUp
    const titleName = isSuper ? 'Campeão da Supercopa Soberana' : 'Campeão da Recopa Condor'
    let userWon = uGoals > oGoals
    let scoreText = `${uGoals} x ${oGoals}`
    if (uGoals === oGoals && userPens) {
      userWon = userPens.user > userPens.opp
      scoreText += ` (${userPens.user}x${userPens.opp} pên.)`
    } else if (uGoals === oGoals) {
      const uPen = 4 + randInt(0, 1)
      userWon = Math.random() < 0.56
      const oPen = userWon ? uPen - 1 : uPen + 1
      scoreText += ` (${uPen}x${oPen} pên.)`
    }
    state.value.played = true
    state.value.won = userWon
    state.value.scoreText = scoreText
    if (userWon) {
      club.earn(titlePrize)
      club.recordTrophy('title', titleName, titlePrize)
      return {
        toast: `${titleName.toUpperCase()}! Prêmio: ${formatCurrency(titlePrize)}!`,
        toastType: 'success'
      }
    }
    club.earn(runnerUpPrize)
    return { toast: `Vice-campeão (${scoreText}). Prêmio: ${formatCurrency(runnerUpPrize)}.`, toastType: 'info' }
  }

  return { hasPendingFinal, resetFinals, qualifySupercup, qualifyRecopa, applyFinalResult }
}
