import type { ComputedRef, Ref } from 'vue'
import type {
  CompetitionStageType,
  LeagueFixture,
  StageOutcome,
  StageToastType
} from '@/types/league'
import { STAGE_NAMES } from '@/utils/league/leagueScheduler'
import { PRIZES } from '@/config'
import { PARALLEL_STAGES, resolveStageTies, stageTieResults } from '@/utils/league/leagueKnockout'
import { NEXT_D } from './stages'
import type { LeagueClub } from './types'

export function createProgression(ctx: {
  competitionStage: Ref<CompetitionStageType>
  leagueFixtures: Ref<LeagueFixture[]>
  selectedRound: Ref<number>
  club: LeagueClub
  userLeagueRank: ComputedRef<number>
  startSerieDKnockout: () => void
  startSerieCQuadrangular: () => void
  generateNextStages: (st: CompetitionStageType) => void
  completeLeaguePostseason: () => void
  completeParallelStages: (st: CompetitionStageType) => void
  powerOf: (id: string) => number
}) {
  const {
    competitionStage, leagueFixtures, selectedRound, userLeagueRank,
    startSerieDKnockout, startSerieCQuadrangular, generateNextStages,
    completeLeaguePostseason, completeParallelStages, powerOf
  } = ctx
  const clubStore = ctx.club

  function advance(toast: string, toastType: StageToastType): StageOutcome {
    selectedRound.value = 1
    return { kind: 'advance', toast, toastType }
  }

  function end(
    nextDivision: number,
    bonus: number,
    toast: string,
    toastType: StageToastType,
    trophyType?: 'title' | 'promotion',
    trophyTitle?: string
  ): StageOutcome {
    return { kind: 'endSeason', nextDivision, bonus, toast, toastType, trophyType, trophyTitle }
  }

  function evaluateStageProgression(): StageOutcome | null {
    const remaining = leagueFixtures.value.some((f) => f.stage === competitionStage.value && !f.played)
    if (remaining) return null

    const div = clubStore.division

    if (div === 4) {
      const P = PRIZES.serieD
      const st = competitionStage.value
      if (st === 'D_GROUPS') {
        if (userLeagueRank.value > 4) {
          startSerieDKnockout()
          completeLeaguePostseason()
          return end(4, P.groups, 'Eliminado na 1ª Fase da Série D. Nova temporada iniciada!', 'warning')
        }
        startSerieDKnockout()
        competitionStage.value = 'D_R64'
        return advance('Classificado ao Mata-Mata da Série D!', 'success')
      }
      completeParallelStages(st)
      for (const s of [st, ...(PARALLEL_STAGES[st] ?? [])]) resolveStageTies(leagueFixtures.value, s, powerOf)
      const mine = stageTieResults(leagueFixtures.value, st)?.find((t) => t.winnerId === 'user' || t.loserId === 'user')
      const userWon = mine?.winnerId === 'user'
      generateNextStages(st)
      const promo = 'Acesso Série D -> Série C'

      if (st === 'D_R64' || st === 'D_R32' || st === 'D_R16') {
        if (!userWon) {
          completeLeaguePostseason()
          const phasePrize = st === 'D_R64' ? P.r64 : st === 'D_R32' ? P.r32 : P.r16
          return end(4, phasePrize, 'Eliminado no Mata-Mata da Série D. Nova temporada!', 'warning')
        }
        const nextSt = NEXT_D[st] as CompetitionStageType
        competitionStage.value = nextSt
        return advance(`Avançou para: ${STAGE_NAMES[nextSt]}!`, 'success')
      }
      if (st === 'D_QF') {
        if (userWon) {
          competitionStage.value = 'D_SF'
          return advance(`Avançou para: ${STAGE_NAMES.D_SF}!`, 'success')
        }
        completeLeaguePostseason()
        return end(4, P.qf, 'Eliminado nas Quartas de Final da Série D. Tente novamente!', 'warning')
      }
      if (st === 'D_SF') {
        if (userWon) {
          competitionStage.value = 'D_FINAL'
          return advance('Na Final Nacional da Série D! Acesso garantido.', 'success')
        }
        competitionStage.value = 'D_THIRD'
        return advance('Acesso garantido! Dispute o 3º lugar da Série D.', 'success')
      }
      if (st === 'D_FINAL') {
        completeLeaguePostseason()
        return userWon
          ? end(3, P.champion, 'CAMPEÃO NACIONAL DA SÉRIE D!', 'success', 'title', 'Campeão da Série D')
          : end(3, P.runnerUp, 'Vice-campeão da Série D. Acesso garantido!', 'success', 'promotion', promo)
      }
      if (st === 'D_THIRD') {
        completeLeaguePostseason()
        return userWon
          ? end(3, P.third, '3º LUGAR NA SÉRIE D! ACESSO GARANTIDO!', 'success', 'promotion', promo)
          : end(3, P.fourth, '4º lugar na Série D. Acesso garantido!', 'success', 'promotion', promo)
      }
      return null
    }

    if (div === 3) {
      const P = PRIZES.serieC
      const st = competitionStage.value
      if (st === 'C_FIRST_STAGE') {
        const rank = userLeagueRank.value
        if (rank >= 17) {
          completeLeaguePostseason()
          return end(4, P.relegated, 'Rebaixado para a Série D.', 'danger')
        }
        if (rank > 8) {
          completeLeaguePostseason()
          return end(3, P.stayed, 'Permaneceu na Série C. Nova temporada!', 'warning')
        }
        startSerieCQuadrangular()
        competitionStage.value = 'C_QUADRANGULAR'
        return advance('Classificado ao Quadrangular do Acesso da Série C!', 'success')
      }
      if (st === 'C_QUADRANGULAR') {
        const rank = userLeagueRank.value
        generateNextStages('C_QUADRANGULAR')
        if (rank > 2) {
          completeLeaguePostseason()
          return end(3, P.quadElim, 'Eliminado no Quadrangular da Série C.', 'warning')
        }
        if (rank === 2) {
          competitionStage.value = 'C_THIRD'
          return advance('Acesso garantido! Dispute o 3º lugar da Série C.', 'success')
        }
        competitionStage.value = 'C_FINAL'
        return advance('Acesso garantido! Agora, a Final Nacional da Série C.', 'success')
      }
      if (st === 'C_FINAL' || st === 'C_THIRD') {
        completeParallelStages(st)
        for (const s of [st, ...(PARALLEL_STAGES[st] ?? [])]) resolveStageTies(leagueFixtures.value, s, powerOf)
        const mine = stageTieResults(leagueFixtures.value, st)?.find((t) => t.winnerId === 'user' || t.loserId === 'user')
        const userWon = mine?.winnerId === 'user'
        const promo = 'Acesso Série C -> Série B'
        if (st === 'C_FINAL') {
          return userWon
            ? end(2, P.champion, 'CAMPEÃO NACIONAL DA SÉRIE C!', 'success', 'title', 'Campeão da Série C')
            : end(2, P.runnerUp, 'Vice-campeão da Série C. Acesso para a Série B!', 'success', 'promotion', promo)
        }
        return userWon
          ? end(2, P.third, '3º lugar na Série C! Acesso para a Série B!', 'success', 'promotion', promo)
          : end(2, P.fourth, '4º lugar na Série C. Acesso para a Série B!', 'success', 'promotion', promo)
      }
      return null
    }

    const rank = userLeagueRank.value
    if (div === 2) {
      if (rank === 1) return end(1, PRIZES.serieB.champion, 'CAMPEÃO DA SÉRIE B! RUMO À ELITE!', 'success', 'title', 'Campeão da Série B')
      if (rank <= 4) {
        const promoPrize = rank === 2 ? PRIZES.serieB.runnerUp : rank === 3 ? PRIZES.serieB.third : PRIZES.serieB.fourth
        return end(1, promoPrize, 'ACESSO CONQUISTADO PARA A SÉRIE A!', 'success', 'promotion', 'Acesso Série B -> Série A')
      }
      if (rank >= 17) return end(3, PRIZES.serieB.relegated, 'Rebaixado para a Série C.', 'danger')
      return end(2, PRIZES.serieB.stayed, 'Temporada da Série B concluída!', 'success')
    }
    if (div === 1) {
      if (rank === 1) return end(1, PRIZES.serieA.champion, 'CAMPEÃO NACIONAL DA SÉRIE A!', 'success', 'title', 'Campeão da Série A')
      if (rank >= 17) return end(2, PRIZES.serieA.relegated, 'Rebaixado para a Série B.', 'danger')
      // 2º ao 16º: tabela por colocação; 17º em diante já saiu acima (rebaixado, 0).
      return end(1, PRIZES.serieA.byRank[rank - 1] ?? 0, `Série A concluída em ${rank}º lugar!`, 'success')
    }
    return null
  }

  return { evaluateStageProgression }
}
