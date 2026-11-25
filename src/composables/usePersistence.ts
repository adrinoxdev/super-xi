import { useClubStore } from '@/stores/club'
import { useCompetitionsStore } from '@/stores/competitions'
import { useFriendliesStore } from '@/stores/friendlies'
import { useLeagueStore } from '@/stores/league'
import { useMarketStore } from '@/stores/market'
import { COMPETITIONS_ORDER, useMatchStore } from '@/stores/match'
import { useScoutingStore } from '@/stores/scouting'
import { useSquadStore } from '@/stores/squad'
import { useUiStore } from '@/stores/ui'
import { ATHLETE_ECONOMY_VERSION, BALANCE_VERSION, PROGRESSION_VERSION, migrateAthleteEconomyV1, migrateBalanceV2, migrateProgressionV3 } from '@/migrations/balanceMigration'
import { LIVE_MATCH_KEY, STORAGE_KEY } from '@/config'
import { useEconomy } from './useEconomy'
import { checkMilestones } from '@/utils/club/progression'
import { resolvePrematchCompetition } from '@/utils/match/prematchMemory'
import { CONTINENTAL_RIVALS, MUNDIAL_EVERY, MUNDIAL_LABEL } from '@/config/competitions'
import { cycleTarget } from '@/utils/competitions/mundialCycle'
import type { Podium, SeasonEcoRecord, TrophyRecord } from '@/types'

// Definição única em constants.ts; reexportada por compatibilidade com quem importava daqui.
export { STORAGE_KEY }

/**
 * Rótulos de título do trophyGallery reconhecidos na reconstrução (save antigo sem ecoRecords).
 * Lista única: a T15 estende com os nomes novos sem mexer na lógica.
 */
export const ECO_TITLE_LABELS: Array<{ re: RegExp; apply: (r: SeasonEcoRecord) => void }> = [
  { re: /^Campeão da Série A$/i, apply: (r) => { r.division = 1; r.leagueTitle = true; r.leagueRank = 1 } },
  { re: /^Campeão da Série B$/i, apply: (r) => { r.division = 2; r.leagueTitle = true; r.leagueRank = 1 } },
  { re: /^Campeão da Série C$/i, apply: (r) => { r.division = 3; r.leagueTitle = true; r.leagueRank = 1 } },
  { re: /^Campeão da Série D$/i, apply: (r) => { r.division = 4; r.leagueTitle = true; r.leagueRank = 1 } },
  { re: /^Campeão da Copa Condor de Ouro$/i, apply: (r) => { r.ouro = 'champion' } },
  { re: /^Campeão da Copa Condor de Prata$/i, apply: (r) => { r.prata = 'champion' } },
  { re: /^Campeão da Taça Cacique$/i, apply: (r) => { r.cup = 'champion' } },
  { re: /^Campeão da Supercopa/i, apply: (r) => { r.supercup = true } },
  { re: /^Campeão da Recopa/i, apply: (r) => { r.recopa = true } }
]

/**
 * Reconstrói o histórico do ciclo de um save sem `ecoRecords`: títulos pelo trophyGallery,
 * campeões e colocações do usuário pelo podiumArchive. Só temporadas encerradas; o que não
 * é título e não aparece em pódio fica null. Função pura (a chamada decide quando rodar).
 */
export function reconstructEcoRecords(args: {
  trophies: TrophyRecord[]
  podiums: Podium[]
  currentSeason: number
  currentDivision: number
  userName: string
  userPower: number
}): SeasonEcoRecord[] {
  const { trophies, podiums, currentSeason, currentDivision, userName, userPower } = args
  const blank = (season: number): SeasonEcoRecord => ({
    season, division: currentDivision, leagueRank: null, leagueTitle: false, ouro: null, prata: null, cup: null,
    recopa: false, supercup: false, ouroChampion: null, prataChampion: null, cupChampion: null, serieAChampion: null
  })
  const bySeason = new Map<number, SeasonEcoRecord>()
  const get = (s: number) => {
    let r = bySeason.get(s)
    if (!r) { r = blank(s); bySeason.set(s, r) }
    return r
  }
  const champ = (e: { name: string; isUser: boolean }, fallback: number) => {
    if (e.isUser) return { name: userName, power: userPower }
    const known = CONTINENTAL_RIVALS.find((c) => c.name === e.name)
    return { name: e.name, power: known?.power ?? fallback }
  }
  for (const t of trophies) {
    if (t.type !== 'title' || !(t.season < currentSeason)) continue
    for (const l of ECO_TITLE_LABELS) if (l.re.test(t.title.trim())) l.apply(get(t.season))
  }
  for (const p of podiums) {
    if (!(p.season < currentSeason)) continue
    if (p.competition !== 'continental' && p.competition !== 'cup') continue
    const r = get(p.season)
    const phase = p.champion.isUser ? 'champion' : p.runnerUp.isUser ? 'runnerUp' : p.third?.isUser ? 'sf' : null
    if (p.competition === 'cup') {
      if (phase === 'champion' || phase === 'runnerUp') r.cup = phase
      r.cupChampion = champ(p.champion, 70)
    } else if (/prata/i.test(p.competitionLabel)) {
      if (phase) r.prata = phase
      r.prataChampion = champ(p.champion, 74)
    } else {
      if (phase) r.ouro = phase
      r.ouroChampion = champ(p.champion, 74)
    }
  }
  return [...bySeason.values()].sort((a, b) => a.season - b.season)
}

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
  const friendlies = useFriendliesStore()
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
          ...competitions.toSave(),
          // Campo aditivo (sem trocar STORAGE_KEY nem migração numerada): saves antigos ganham estado novo no load.
          friendlies: friendlies.toSave(),
          // Campo aditivo: só o identificador da competição exibida (nunca estado de partida), para o pré-jogo voltar ao recarregar.
          prematchCompetition: match.activeMatchCompetition
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
        // Save sem ecoRecords = anterior à Copa dos Continentes: reconstrói uma única vez (depois o campo existe).
        const legacyNoEco = !Array.isArray(p.club.ecoRecords)
        if (legacyNoEco) {
          for (const r of reconstructEcoRecords({
            trophies: club.trophyGallery,
            podiums: club.podiumArchive,
            currentSeason: club.season,
            currentDivision: club.division,
            userName: club.name,
            userPower: squad.teamStrength.rating
          })) club.recordEcoSeason(r)
        }
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
          recopaState: p.recopaState,
          mundialState: p.mundialState
        })
        competitions.ensureBrackets()
        friendlies.fromSave(p.friendlies)
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
        // Aviso único: só save antigo (sem ecoRecords) vê; o saveGame logo abaixo grava ecoRecords, que é a flag persistida.
        if (legacyNoEco) {
          const next = cycleTarget(club.season)
          ui.showToast(`Nova competição: ${MUNDIAL_LABEL}, a cada ${MUNDIAL_EVERY} temporadas. Próxima edição na temporada ${next}. Seus títulos já contam para o Ranking Condor.`, 'success')
          saveGame()
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
        // Pré-jogo de copa ou amistoso volta ao recarregar se ainda houver partida a jogar; senão, liga (padrão e save antigo).
        // Partida ao vivo manda: no boot, restoreLiveMatches (App.vue) roda depois e troca a competição; num import com partida rodando, nada muda.
        if (!match.liveCompetitions.length) {
          match.activeMatchCompetition = resolvePrematchCompetition(p.prematchCompetition, {
            known: COMPETITIONS_ORDER,
            isPlayable: (c) => competitions.isCompetitionPlayable(c),
            friendlyReady: friendlies.selectedOption !== null && friendlies.active === null
          })
        }
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
    friendlies.reset()
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
      // Amistoso ao vivo no código exportado: sem partida ao vivo ele é órfão (não conta, ficha não volta).
      friendlies.resolveOrphan(false)
      saveGame()
      ui.showToast('Carreira importada com sucesso!', 'success')
    } catch {
      ui.showToast('Código inválido.', 'danger')
    }
  }

  return { saveGame, loadGame, clearSave, applyOfflineReward, exportCareerCode, importCareerCode }
}
