import { router } from '@/router'
import { useClubStore } from '@/stores/club'
import { useCompetitionsStore } from '@/stores/competitions'
import { useLeagueStore } from '@/stores/league'
import { useMarketStore } from '@/stores/market'
import { useMatchStore } from '@/stores/match'
import { useScoutingStore } from '@/stores/scouting'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import type { Bracket, Podium } from '@/types/bracket'
import type { EcoChampion, EcoPhase, SeasonEcoRecord } from '@/types/club'
import { MUNDIAL_EVERY } from '@/config/competitions'
import { supercupRival, recopaRival } from '@/utils/competitions/finalsRivals'
import { CONTINENTAL_RIVALS } from '@/config'
import { buildMundialField } from '@/utils/competitions/mundialField'
import { LEAGUE_CLUBS_POOL } from '@/utils/league/leagueScheduler'
import type { StageOutcome, StageToastType } from '@/types/league'
import { checkMilestones } from '@/utils/club/progression'
import { usePersistence } from './usePersistence'

/** Campeão da chave com o OVER gravado (o usuário entra com `userPower`). */
function bracketChampion(b: Bracket | null | undefined, userName: string, userPower: number): EcoChampion | null {
  const ch = b?.podium?.champion
  if (!b || !ch) return null
  if (ch.isUser) return { name: userName, power: userPower }
  return { name: ch.name, power: b.teams[ch.teamId]?.power ?? 70 }
}

/** Maior fase do usuário numa copa: título, final, semi (3º/4º), quartas (se estava nelas) ou grupos. */
function bracketPhase(b: Bracket | null | undefined, pos: 1 | 2 | 3 | 4 | null, qualified: boolean): EcoPhase | null {
  if (!qualified) return null
  if (pos === 1) return 'champion'
  if (pos === 2) return 'runnerUp'
  if (pos === 3 || pos === 4) return 'sf'
  const inQf = !!b?.rounds[0]?.ties.some((t) => t.homeId === 'user' || t.awayId === 'user')
  return inQf ? 'qf' : 'groups'
}

export function useSeason() {
  const club = useClubStore()
  const squad = useSquadStore()
  const scouting = useScoutingStore()
  const league = useLeagueStore()
  const market = useMarketStore()
  const match = useMatchStore()
  const competitions = useCompetitionsStore()
  const ui = useUiStore()
  const { saveGame, clearSave } = usePersistence()

  function initializeFreshCareer(): void {
    squad.initializeDefaultSquad()
    club.resetCareerRecords()
    market.incomingOffers = []
    match.matchHistory = []
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

    // (1) Registro do ciclo (SeasonEcoRecord) ANTES de qualquer redefinição: lê liga, Taça, Ouro/Prata e finais.
    // O vice da Série A não cabe no tipo; fica só nesta variável e vai direto ao buildMundialField (passo 4).
    const finishedSeasonNo = club.season
    const userPowerEnd = squad.teamStrength.rating
    const std = league.leagueStandings
    const aTeam = (row: { teamId: string; name: string } | undefined): EcoChampion | null => {
      if (!row) return null
      const t = league.leagueTeams.find((x) => x.id === row.teamId)
      return { name: row.name, power: row.teamId === 'user' ? userPowerEnd : t?.power ?? 70 }
    }
    let serieARunnerUp: EcoChampion | null = null
    let serieAChampion: EcoChampion | null = null
    if (prevDiv === 1) {
      serieAChampion = aTeam(std.find((r) => r.rank === 1))
      const vice = std.find((r) => r.rank === 2)
      serieARunnerUp = vice && !vice.isUser ? aTeam(vice) : null
    } else {
      // Usuário fora da A: o campeão da A é sorteado uma única vez, aqui, e fica gravado.
      const pool = LEAGUE_CLUBS_POOL[1]
      const c = pool[Math.floor(Math.random() * pool.length)]
      if (c) serieAChampion = { name: c.name, power: c.basePower }
    }
    const cont = competitions.continentalState
    const isOuro = cont.tier === 'libertadores'
    const contPhase = bracketPhase(cont.bracket, cont.finalPosition, cont.qualified)
    const contChamp = cont.qualified ? bracketChampion(cont.bracket, club.name, userPowerEnd) : null
    const cupSt = competitions.cupState
    const cupPos = cupSt.finalPosition
    // Usuário campeão continental: o campeão da outra copa não existe no estado; é sorteado uma vez e gravado.
    let otherContChamp: EcoChampion | null = null
    if (wonContinental) {
      const o = CONTINENTAL_RIVALS[Math.floor(Math.random() * CONTINENTAL_RIVALS.length)]
      if (o) otherContChamp = { name: o.name, power: o.power }
    }
    const cupRu = cupSt.bracket?.podium?.runnerUp
    const cupRunnerUp: EcoChampion | null =
      cupRu && !cupRu.isUser ? { name: cupRu.name, power: cupSt.bracket?.teams[cupRu.teamId]?.power ?? 70 } : null
    const ecoRec: SeasonEcoRecord = {
      season: finishedSeasonNo,
      division: prevDiv,
      leagueRank: prevRank,
      leagueTitle: wonLeagueTitle,
      ouro: isOuro ? contPhase : null,
      prata: !isOuro ? contPhase : null,
      cup: cupPos === 1 ? 'champion' : cupPos === 2 ? 'runnerUp' : null,
      recopa: competitions.recopaState.played && competitions.recopaState.won,
      supercup: competitions.supercupState.played && competitions.supercupState.won,
      ouroChampion: isOuro ? contChamp : otherContChamp,
      prataChampion: !isOuro ? contChamp : otherContChamp,
      cupChampion: bracketChampion(cupSt.bracket, club.name, userPowerEnd),
      serieAChampion
    }
    club.recordEcoSeason(ecoRec)

    // (2) Copa dos Continentes pendente vira W.O. e o pódio é arquivado junto com os demais.
    const mundialPodium = competitions.finishMundialForSeason()
    if (mundialPodium) podiums.push(mundialPodium)
    club.archivePodiums(podiums)
    // (3) A edição encerrada sai do estado.
    competitions.resetMundial()

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

    // (4) Temporada da edição: monta os 32 clubes; com vaga do usuário abre a edição. Fora dela, nada.
    if (club.season % MUNDIAL_EVERY === 0) {
      const field = buildMundialField({
        season: club.season,
        rng: Math.random,
        records: club.ecoRecords,
        podiumArchive: club.podiumArchive,
        userName: club.name,
        userPower: squad.teamStrength.rating,
        serieARunnerUp
      })
      competitions.openMundialEdition(field)
    }

    competitions.resetFinals()
    if (wonLeagueTitle || wonCup) competitions.qualifySupercup(supercupRival(ecoRec, wonLeagueTitle, wonCup, cupRunnerUp))
    if (wonContinental) competitions.qualifyRecopa(recopaRival(ecoRec, isOuro ? 'libertadores' : 'other'))

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
