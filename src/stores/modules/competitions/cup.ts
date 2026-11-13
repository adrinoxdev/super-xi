import { computed } from 'vue'
import type { Ref } from 'vue'
import type { CupState } from '@/types'
import { PRIZES } from '@/config'
import type { Bracket, BracketTie, Podium } from '@/types'
import {
  completeBracket,
  createBracket,
  playLeg,
  propagate,
  resolveTie,
  simulatePhaseExceptUser,
  simulateTie,
  userFinalPosition,
  userPendingTie
} from '@/utils/bracket'
import { seedCup } from '@/utils/bracketSeeding'
import { formatCurrency } from '@/utils/formatCurrency'
import { migrateLegacyCup } from '@/migrations/legacyCompetitions'
import type { CompetitionToast, CompetitionsClub } from './types'

export function createCup(ctx: { cupState: Ref<CupState>; club: CompetitionsClub }) {
  const { cupState, club } = ctx
  const clubStore = club

  const cupRoundLabel = computed(() => {
    if (cupState.value.thirdPlace) return 'Disputa de 3º Lugar'
    const names = ['Oitavas de Final', 'Quartas de Final', 'Semifinal', 'Final da Taça Cacique']
    return names[cupState.value.roundIndex] || 'Final'
  })

  const CUP_ROUNDS = [
    { key: 'R16', label: 'Oitavas de Final', shortLabel: 'Oitavas', legCount: 1 as const },
    { key: 'QF', label: 'Quartas de Final', shortLabel: 'Quartas', legCount: 1 as const },
    { key: 'SF', label: 'Semifinal', shortLabel: 'Semi', legCount: 1 as const },
    { key: 'FINAL', label: 'Final', shortLabel: 'Final', legCount: 1 as const }
  ]

  function buildCupBracket(excludeId?: string): Bracket {
    let seed = seedCup(Math.random)
    // Migração: o rival do save antigo não pode aparecer duas vezes na chave.
    if (excludeId) {
      for (let i = 0; i < 300 && seed.teams.some((t) => t.id === excludeId); i++) seed = seedCup(Math.random)
    }
    const { teams, firstRound } = seed
    const user = teams.find((t) => t.id === 'user')
    if (user) user.name = clubStore.name
    const bracket = createBracket({
      competition: 'cup',
      season: clubStore.season,
      label: 'Taça Cacique',
      teams,
      rounds: CUP_ROUNDS,
      firstRound,
      thirdPlace: true,
      thirdLegCount: 1
    })
    propagate(bracket, { userHosts: true })
    return bracket
  }

  function rivalFromTie(bracket: Bracket, tie: BracketTie | null): CupState['currentRival'] {
    if (!tie) return null
    const oppId = tie.homeId === 'user' ? tie.awayId : tie.homeId
    const team = oppId ? bracket.teams[oppId] : null
    if (!team) return null
    return { name: team.name, power: team.power, serieCode: team.tag ?? '' }
  }

  function initCupForSeason() {
    const bracket = buildCupBracket()
    cupState.value = {
      roundIndex: 0,
      eliminated: false,
      champion: false,
      currentRival: rivalFromTie(bracket, userPendingTie(bracket)),
      history: [],
      bracket,
      thirdPlace: false,
      finalPosition: null
    }
  }

  /** Fim da temporada: copa não concluída vira W.O. do usuário e o resto da chave é simulado. */
  function finishCupForSeason(): Podium | null {
    const cup = cupState.value
    if (!cup.bracket) return null
    if (!cup.bracket.podium) {
      cup.bracket.teams.user.name = clubStore.name
      completeBracket(cup.bracket, Math.random, { forfeitUser: true })
    }
    if (!cup.champion) cup.eliminated = true
    cup.thirdPlace = false
    cup.currentRival = null
    cup.finalPosition = cup.finalPosition ?? userFinalPosition(cup.bracket)
    return cup.bracket.podium
  }

  // ---- Migração de saves antigos (sem chave) ----

  function migrateCup() {
    migrateLegacyCup(cupState.value, { getClubName: () => clubStore.name, buildCupBracket, rivalFromTie })
  }

  function applyCupResult(uGoals: number, oGoals: number, clubName: string): CompetitionToast {
    const cup = cupState.value
    if (!cup.bracket) migrateCup()
    const b = cup.bracket
    if (!b) return { toast: 'Competição já encerrada.', toastType: 'warning' }
    b.teams.user.name = clubName
    const tie = userPendingTie(b)
    if (!tie) return { toast: 'Competição já encerrada.', toastType: 'warning' }
    const isThird = tie === b.thirdPlace
    const idx = tie.roundIndex
    const rivalName = cup.currentRival?.name ?? ''
    const userIsHome = tie.homeId === 'user'
    playLeg(tie, 0, userIsHome ? uGoals : oGoals, userIsHome ? oGoals : uGoals)
    resolveTie(tie, b.teams, Math.random, 0.55)
    const userWon = tie.winnerId === 'user'
    let scoreLabel = `${uGoals} x ${oGoals}`
    if (tie.penalties) {
      const pu = userIsHome ? tie.penalties.home : tie.penalties.away
      const po = userIsHome ? tie.penalties.away : tie.penalties.home
      scoreLabel += ` (Pênaltis ${pu}x${po}: ${userWon ? 'Classificado' : 'Eliminado'})`
    }
    const summary = `${clubName} ${scoreLabel} ${rivalName}`
    const final = b.rounds[b.rounds.length - 1].ties[0]
    if (isThird) simulateTie(final, b.teams)
    else simulatePhaseExceptUser(b, idx)
    propagate(b, { userHosts: true })

    const finish = (position: 1 | 2 | 3 | 4) => {
      cup.finalPosition = position
      cup.thirdPlace = false
      cup.currentRival = null
    }

    if (isThird) {
      const prize = userWon ? PRIZES.cup.thirdWin : PRIZES.cup.thirdLoss
      clubStore.earn(prize)
      cup.history.unshift({ roundName: 'Disputa de 3º Lugar', summary, prize })
      cup.eliminated = true
      finish(userWon ? 3 : 4)
      return userWon
        ? {
            toast: `3º LUGAR NA TAÇA CACIQUE! Cota: ${formatCurrency(prize)}`,
            toastType: 'success'
          }
        : { toast: '4º lugar na Taça Cacique.', toastType: 'info' }
    }

    const roundName = b.rounds[idx].label
    if (!userWon) {
      if (idx === 3) {
        const prize = PRIZES.cup.finalLoss
        clubStore.earn(prize)
        cup.history.unshift({ roundName, summary, prize })
        cup.eliminated = true
        finish(2)
        return { toast: 'Vice-campeão da Taça Cacique.', toastType: 'info' }
      }
      cup.history.unshift({ roundName, summary, prize: 0 })
      if (idx === 2) {
        cup.thirdPlace = true
        cup.currentRival = rivalFromTie(b, userPendingTie(b))
        return { toast: 'Eliminado na semifinal. Dispute o 3º lugar!', toastType: 'warning' }
      }
      cup.eliminated = true
      completeBracket(b)
      cup.currentRival = null
      return { toast: 'Eliminado da Taça Cacique.', toastType: 'warning' }
    }

    const prize = PRIZES.cup.rounds[idx]
    clubStore.earn(prize)
    cup.history.unshift({ roundName, summary, prize })
    if (idx >= 3) {
      cup.champion = true
      cup.currentRival = null
      cup.finalPosition = 1
      clubStore.recordTrophy('title', 'Campeão da Taça Cacique', prize)
      return { toast: 'CAMPEÃO DA TAÇA CACIQUE!', toastType: 'success' }
    }
    cup.roundIndex += 1
    cup.currentRival = rivalFromTie(b, userPendingTie(b))
    return {
      toast: `Classificado na Taça Cacique! Cota: ${formatCurrency(prize)}`,
      toastType: 'success'
    }
  }

  return { cupRoundLabel, buildCupBracket, rivalFromTie, initCupForSeason, finishCupForSeason, migrateCup, applyCupResult }
}
