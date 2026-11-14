import { router } from '@/router'
import { useClubStore } from '@/stores/club'
import { useCompetitionsStore } from '@/stores/competitions'
import { useLeagueStore } from '@/stores/league'
import { useMarketStore } from '@/stores/market'
import { useScoutingStore } from '@/stores/scouting'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import type { Podium } from '@/types/bracket'
import type { StageOutcome, StageToastType } from '@/types/league'
import { checkMilestones } from '@/utils/club/progression'
import { usePersistence } from './usePersistence'

export function useSeason() {
  const club = useClubStore()
  const squad = useSquadStore()
  const scouting = useScoutingStore()
  const league = useLeagueStore()
  const market = useMarketStore()
  const competitions = useCompetitionsStore()
  const ui = useUiStore()
  const { saveGame, clearSave } = usePersistence()

  function initializeFreshCareer(): void {
    squad.initializeDefaultSquad()
    club.resetCareerRecords()
    market.incomingOffers = []
    competitions.resetFinals()
    scouting.generateYouthAcademyBatch()
    league.initLeagueSeason(club.division, club.season)
    competitions.initCupForSeason()
    competitions.initContinentalForSeason(false)
    club.startProgressSeason(squad.teamStrength.rating, squad.players)
    saveGame()
  }

  function startNewSeason(
    nextDivision: number,
    bonusAmount: number,
    toast: string,
    toastType: StageToastType,
    trophyType: 'title' | 'promotion' | null = null,
    trophyTitle = ''
  ): void {
    const prevDiv = club.division
    const prevRank = league.userLeagueRank
    const wonCup = competitions.cupState.champion
    const wonContinental = competitions.continentalState.champion
    const wonLeagueTitle = trophyType === 'title'

    // Copa e continental não terminados viram W.O. (sem prêmio nem título); arquiva os pódios antes da virada.
    competitions.finishCupForSeason()
    competitions.finishContinentalForSeason()
    const podiums = [
      league.knockoutPodium,
      competitions.cupState.bracket?.podium,
      competitions.continentalState.bracket?.podium
    ].filter((p): p is Podium => !!p)
    club.archivePodiums(podiums)

    if (trophyType && trophyTitle) {
      club.recordTrophy(trophyType, trophyTitle, bonusAmount)
    }
    // Resumo da temporada (OVER final antes do envelhecimento) e marcos; depois os dados da temporada reiniciam.
    const finishedSeason = club.season
    const overEnd = Math.round(squad.teamStrength.rating * 10) / 10
    const gains = club.progress.seasonGains
    const gainOf = (id: string) => gains[id] || 0
    const topGains = squad.players
      .filter((p) => gainOf(p.id) > 0)
      .sort((a, b) => gainOf(b.id) - gainOf(a.id))
      .slice(0, 3)
      .map((p) => ({ name: p.name, gain: gainOf(p.id), overall: p.overall }))
    club.progress.lastSeason = {
      season: finishedSeason,
      division: prevDiv,
      overStart: club.progress.seasonStartOver,
      overEnd,
      totalGain: Object.values(gains).reduce((a, b) => a + b, 0),
      top: topGains,
      seen: false
    }
    club.addMilestones(
      checkMilestones({
        season: finishedSeason,
        teamOver: squad.teamStrength.rating,
        bestPlayerOver: Math.max(0, ...squad.players.map((p) => p.overall)),
        promotedTo: nextDivision < prevDiv ? nextDivision : undefined,
        existingIds: club.progress.milestones.map((m) => m.id)
      })
    )
    club.budget += bonusAmount
    club.season += 1
    club.division = nextDivision

    const turn = squad.applyEndOfSeason()
    const leaving = [
      ...turn.departed.map((p) => p.name + ' (fim de contrato)'),
      ...turn.retired.map((p) => p.name + ' (aposentadoria)')
    ]
    turn.departed.forEach((p) => club.recordTransfer('release', p.name, p.position, p.overall, 0))
    turn.retired.forEach((p) => club.recordTransfer('retire', p.name, p.position, p.overall, 0))
    if (leaving.length) ui.showToast('Saíram na virada: ' + leaving.join(', ') + '.', 'warning')
    club.resetSeasonGoals()
    club.tryoutsThisSeason = 0
    market.incomingOffers = []
    scouting.generateYouthAcademyBatch()
    league.initLeagueSeason(nextDivision, club.season)
    competitions.initCupForSeason()
    club.startProgressSeason(squad.teamStrength.rating, squad.players)

    if (prevDiv === 1 && prevRank <= 4) {
      competitions.initContinentalForSeason(true, 'libertadores')
    } else if ((prevDiv === 1 && prevRank <= 6) || wonCup) {
      competitions.initContinentalForSeason(true, 'sulamericana')
    } else {
      competitions.initContinentalForSeason(false)
    }

    competitions.resetFinals()
    if (wonLeagueTitle || wonCup) competitions.qualifySupercup()
    if (wonContinental) competitions.qualifyRecopa()

    saveGame()
    ui.showToast(toast, toastType)
  }

  /** Aplica o resultado de league.evaluateStageProgression() (avanço de fase ou virada). */
  function applyStageOutcome(outcome: StageOutcome | null): void {
    if (!outcome) return
    if (outcome.kind === 'advance') {
      ui.showToast(outcome.toast, outcome.toastType)
      return
    }
    startNewSeason(
      outcome.nextDivision,
      outcome.bonus,
      outcome.toast,
      outcome.toastType,
      outcome.trophyType ?? null,
      outcome.trophyTitle ?? ''
    )
  }

  async function resetCareer(): Promise<void> {
    const ok = await ui.askConfirm({
      title: 'Reiniciar carreira?',
      message: 'Todo o progresso atual será apagado e uma nova carreira começa do zero. Essa ação não pode ser desfeita.',
      confirmLabel: 'Reiniciar',
      danger: true
    })
    if (!ok) return
    clearSave()
    initializeFreshCareer()
    router.push('/')
    ui.showToast('Nova carreira iniciada!', 'success')
  }

  return { initializeFreshCareer, startNewSeason, applyStageOutcome, resetCareer }
}
