import { useClubStore } from '@/stores/club'
import { useCompetitionsStore } from '@/stores/competitions'
import { useLeagueStore } from '@/stores/league'
import { useMarketStore } from '@/stores/market'
import { useMatchStore } from '@/stores/match'
import { useScoutingStore } from '@/stores/scouting'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import { ATHLETE_ECONOMY_VERSION, BALANCE_VERSION, PROGRESSION_VERSION, migrateAthleteEconomyV1, migrateBalanceV2, migrateProgressionV3 } from '@/migrations/balanceMigration'
import { LIVE_MATCH_KEY, STORAGE_KEY } from '@/config'
import { useEconomy } from './useEconomy'
import { checkMilestones } from '@/utils/club/progression'

// Definição única em constants.ts; reexportada por compatibilidade com quem importava daqui.
export { STORAGE_KEY }

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin)
}

function base64ToUtf8(code: string): string {
  const bin = atob(code)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

export function usePersistence() {
  const club = useClubStore()
  const squad = useSquadStore()
  const scouting = useScoutingStore()
  const league = useLeagueStore()
  const market = useMarketStore()
  const competitions = useCompetitionsStore()
  const match = useMatchStore()
  const ui = useUiStore()
  const { computeOfflineReward } = useEconomy()
  // Durante o carregamento o saveGame não pode sobrescrever lastActiveAt antes da recompensa ser calculada.
  let loading = false

  function saveGame(): void {
    try {
      if (!loading) club.touchActive()
      const sc = scouting.toSave()
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          club: { ...club.toSave(), balanceVersion: BALANCE_VERSION, athleteEconomyVersion: ATHLETE_ECONOMY_VERSION, progressionVersion: PROGRESSION_VERSION },
          squad: squad.toSave(),
          scouting: { missions: sc.missions, reports: sc.reports },
          ...league.toSave(),
          transferHistory: club.transferHistory,
          trophyGallery: club.trophyGallery,
          seasonGoals: club.seasonGoals,
          seasonAssists: club.seasonAssists,
          seasonApps: club.seasonApps,
          seasonYellows: club.seasonYellows,
          seasonReds: club.seasonReds,
          careerStats: club.careerStats,
          matchHistory: match.matchHistory,
          incomingOffers: market.toSave().incomingOffers,
          youthAcademyProspects: sc.youthAcademyProspects,
          staffContracts: club.staffContracts,
          ...competitions.toSave()
        })
      )
    } catch {
      /* silencioso, igual ao protótipo */
    }
  }

  function loadGame(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      const p = JSON.parse(raw)
      if (p?.club && p?.squad?.players?.length) {
        loading = true
        club.fromSave(p.club)
        squad.fromSave(p.squad)
        scouting.fromSave({
          missions: p.scouting?.missions || [],
          reports: p.scouting?.reports || [],
          youthAcademyProspects: p.youthAcademyProspects || []
        })
        league.fromSave(p)
        club.transferHistory = p.transferHistory || []
        club.trophyGallery = p.trophyGallery || []
        club.seasonGoals = p.seasonGoals || {}
        club.seasonAssists = p.seasonAssists || {}
        club.seasonApps = p.seasonApps || {}
        club.seasonYellows = p.seasonYellows || {}
        club.seasonReds = p.seasonReds || {}
        club.careerStats = p.careerStats || {}
        match.matchHistory = p.matchHistory || []
        club.loadStaff(p)
        market.fromSave({ incomingOffers: p.incomingOffers || [] })
        competitions.fromSave({
          cupState: p.cupState,
          continentalState: p.continentalState,
          supercupState: p.supercupState,
          recopaState: p.recopaState
        })
        competitions.ensureBrackets()
        const v2Done = migrateBalanceV2({
          saved: p,
          division: club.division,
          squadPlayers: squad.players,
          scoutingReports: scouting.reports,
          youthProspects: scouting.youthAcademyProspects,
          leagueTeams: league.leagueTeams,
          cupState: competitions.cupState,
          continentalState: competitions.continentalState,
          supercupState: competitions.supercupState,
          recopaState: competitions.recopaState
        })
        migrateAthleteEconomyV1({
          saved: p,
          season: club.season,
          squadPlayers: squad.players,
          scoutingReports: scouting.reports,
          youthProspects: scouting.youthAcademyProspects
        })
        const v3Done = migrateProgressionV3({
          saved: p,
          season: club.season,
          division: club.division,
          rivalsAlreadyNew: v2Done,
          squadPlayers: squad.players,
          scoutingReports: scouting.reports,
          youthProspects: scouting.youthAcademyProspects,
          leagueTeams: league.leagueTeams,
          cupState: competitions.cupState,
          continentalState: competitions.continentalState,
          supercupState: competitions.supercupState,
          recopaState: competitions.recopaState
        })
        if (v3Done || !(club.progress.seasonStartOver > 0)) {
          club.startProgressSeason(squad.teamStrength.rating, squad.players)
          const ids = () => club.progress.milestones.map((m) => m.id)
          club.addMilestones(checkMilestones({ season: club.season, teamOver: squad.teamStrength.rating, bestPlayerOver: Math.max(0, ...squad.players.map((x) => x.overall)), existingIds: ids() }))
          for (const dv of [3, 2, 1]) {
            if (club.division <= dv) club.addMilestones(checkMilestones({ season: club.season, teamOver: 0, bestPlayerOver: 0, promotedTo: dv, existingIds: ids() }))
          }
        }
        if (v3Done) {
          ui.showToast('Nova escala de OVER: todos os números do clube e dos rivais foram ajustados. A força do seu time na série não mudou.', 'success')
          saveGame()
        }
        // Só gera lote em save sem o campo (muito antigo). Lista vazia é legítima: recarregar não renova a base.
        if (!Array.isArray(p.youthAcademyProspects)) scouting.generateYouthAcademyBatch()
        if (!league.leagueFixtures.length) league.initLeagueSeason(club.division, club.season)
        league.ensureKnockoutTies()
        league.selectedRound = league.currentRound
        loading = false
        applyOfflineReward()
        return true
      }
    } catch {
      club.resetClub()
    } finally {
      loading = false
    }
    return false
  }

  /**
   * Parte do reset do protótipo (resetCareer): remove o save e volta clube, olheiros
   * e partida ao padrão. A confirmação, initializeFreshCareer, rota e toast
   * "Nova carreira iniciada!" ficam em useSeason (T14).
   */
  function clearSave(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(LIVE_MATCH_KEY)
    } catch {
      /* ignora */
    }
    club.resetClub()
    scouting.reset()
    match.resetMatchState()
  }

  function applyOfflineReward(): void {
    const reward = computeOfflineReward()
    if (reward) {
      club.offlinePending = { amount: reward.amount, hours: reward.hours, capped: reward.capped, ...reward.text }
    } else {
      club.touchActive()
    }
  }

  function exportCareerCode(): void {
    saveGame()
    try {
      ui.backupCodeText = utf8ToBase64(localStorage.getItem(STORAGE_KEY) || '')
      ui.showToast('Código de carreira gerado!', 'success')
    } catch {
      ui.showToast('Erro ao gerar código.', 'danger')
    }
  }

  function importCareerCode(): void {
    try {
      if (!ui.backupCodeText.trim()) return
      const json = base64ToUtf8(ui.backupCodeText.trim())
      const p = JSON.parse(json)
      if (!(p?.club && p?.squad?.players?.length)) throw new Error('invalid')
      saveGame()
      const previous = localStorage.getItem(STORAGE_KEY)
      let ok = false
      try {
        localStorage.setItem(STORAGE_KEY, json)
        ok = loadGame()
      } catch {
        ok = false
      }
      if (!ok) {
        try {
          if (previous === null) localStorage.removeItem(STORAGE_KEY)
          else localStorage.setItem(STORAGE_KEY, previous)
          loadGame()
        } catch {
          /* ignora */
        }
        throw new Error('invalid')
      }
      // A partida ao vivo salva pertence à carreira anterior: não pode ser retomada sobre a importada.
      try { localStorage.removeItem(LIVE_MATCH_KEY) } catch { /* ignora */ }
      ui.showToast('Carreira importada com sucesso!', 'success')
    } catch {
      ui.showToast('Código inválido.', 'danger')
    }
  }

  return { saveGame, loadGame, clearSave, applyOfflineReward, exportCareerCode, importCareerCode }
}
