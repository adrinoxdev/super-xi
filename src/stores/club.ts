import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CareerStatEntry,
  ClubProgress,
  ClubSave,
  Milestone,
  ClubStaff,
  ClubUpgrades,
  CrestOrientation,
  CrestPattern,
  CrestShape,
  StaffKey,
  TransferOperationType,
  TransferRecord,
  TrophyRecord
} from '@/types/club'
import type { Podium } from '@/types/bracket'
import type { Player } from '@/types/player'
import {
  ECONOMY,
  FACILITY_MAX_LEVEL,
  SERIE_ECONOMY,
  facilityIncomeFactor,
  dayStart,
  nextDayStart,
  restCost,
  SCOUTING_LEVELS,
  SQUAD_CAPACITIES,
  SQUAD_MAX_SIZE,
  MIN_SQUAD_SIZE,
  STAFF_BONUS,
  STAFF_CONTRACT_MS,
  STAFF_RENEW_WINDOW_MS,
  UPGRADE_COSTS
} from '@/config'
import {
  normalizeCrestOrientation,
  normalizeCrestPattern,
  normalizeCrestShape,
  normalizeCrestStripes,
  normalizeHex
} from '@/utils/identity/crest'

const PODIUM_ARCHIVE_MAX = 12

function defaultProgress(): ClubProgress {
  return { seasonStartOver: 0, seasonStartPlayerOver: {}, seasonGains: {}, milestones: [] }
}

function defaultUpgrades(): ClubUpgrades {
  return {
    scoutingLevel: 1,
    squadCapacityLevel: 1,
    trainingCenterLevel: 1,
    medicalCenterLevel: 1,
    stadiumLevel: 1,
    financeLevel: 1
  }
}

/** Fim de cada contrato em ms (0 = sem contrato). */
type StaffContracts = Record<StaffKey, number>

function defaultStaffContracts(): StaffContracts {
  return { assistantCoach: 0, fitnessCoach: 0, chiefScout: 0, financeDirector: 0, marketAnalyst: 0, youthCoach: 0, physio: 0 }
}

export const useClubStore = defineStore('club', () => {
  const name = ref('Super XI FC')
  const shortName = ref('SXI')
  const stadiumName = ref('Arena Super XI')
  const crestShape = ref<CrestShape>('portugues')
  const primaryColor = ref('#059669')
  const secondaryColor = ref('#ffffff')
  const crestPattern = ref<CrestPattern>('liso')
  const crestOrientation = ref<CrestOrientation>('vertical')
  const crestStripes = ref(5)
  const crestTextColor = ref('auto')
  const crestTextStroke = ref('auto')
  const reputation = ref(10)
  const budget = ref(ECONOMY.startBudget)
  const season = ref(1)
  const division = ref(4)
  const upgrades = ref<ClubUpgrades>(defaultUpgrades())
  const staffContracts = ref<StaffContracts>(defaultStaffContracts())
  // Relógio do clube: atualizado pelo ticker de scouting (1s) para os contratos expirarem sem recarregar.
  const clubNow = ref(Date.now())
  const clubStaff = computed<ClubStaff>(() => ({
    assistantCoach: staffContracts.value.assistantCoach > clubNow.value,
    fitnessCoach: staffContracts.value.fitnessCoach > clubNow.value,
    chiefScout: staffContracts.value.chiefScout > clubNow.value,
    financeDirector: staffContracts.value.financeDirector > clubNow.value,
    marketAnalyst: staffContracts.value.marketAnalyst > clubNow.value,
    youthCoach: staffContracts.value.youthCoach > clubNow.value,
    physio: staffContracts.value.physio > clubNow.value
  }))

  function staffRemainingMs(key: StaffKey): number {
    return Math.max(0, staffContracts.value[key] - clubNow.value)
  }
  const transferHistory = ref<TransferRecord[]>([])
  const trophyGallery = ref<TrophyRecord[]>([])
  const podiumArchive = ref<Podium[]>([])
  const seasonGoals = ref<Record<string, number>>({})
  const careerStats = ref<Record<string, CareerStatEntry>>({})
  const tryoutsThisSeason = ref(0)
  const progress = ref<ClubProgress>(defaultProgress())
  // Descanso do elenco: usos contados no dia de restDayStart; vira 0 sozinho quando o dia muda.
  const restDayStart = ref(0)
  const restUses = ref(0)
  const restUsesToday = computed(() => (restDayStart.value === dayStart(clubNow.value) ? restUses.value : 0))
  const restCostNow = computed(() => restCost(restUsesToday.value, division.value))
  const restResetsInMs = computed(() => Math.max(0, nextDayStart(clubNow.value) - clubNow.value))

  function registerRest() {
    clubNow.value = Date.now()
    const ds = dayStart(clubNow.value)
    if (restDayStart.value !== ds) {
      restDayStart.value = ds
      restUses.value = 0
    }
    restUses.value += 1
  }

  const maxSquadCapacity = computed(() => Math.min(SQUAD_MAX_SIZE, SQUAD_CAPACITIES[upgrades.value.squadCapacityLevel] ?? MIN_SQUAD_SIZE))
  const incomeMult = computed(() => 1 + (clubStaff.value.financeDirector ? STAFF_BONUS.financeIncome : 0))
  const serieEconomy = computed(() => SERIE_ECONOMY[division.value] ?? SERIE_ECONOMY[4])
  // Receita por jogo: base da série x fator do nível (o nível acima do teto da série não rende mais).
  const projectedStadiumIncome = computed(() =>
    Math.round(serieEconomy.value.ticketBase * facilityIncomeFactor(upgrades.value.stadiumLevel, division.value) * incomeMult.value)
  )
  const projectedSponsorIncome = computed(() =>
    Math.round(serieEconomy.value.sponsorBase * facilityIncomeFactor(upgrades.value.financeLevel, division.value) * incomeMult.value)
  )
  // Valor investido nas ampliações (soma dos custos já pagos) e manutenção por jogo (fração desse valor).
  const facilityInvestment = computed(() =>
    (Object.keys(UPGRADE_COSTS) as Array<keyof ClubUpgrades>).reduce(
      (sum, key) => sum + UPGRADE_COSTS[key].slice(1, upgrades.value[key]).reduce((a, c) => a + c, 0),
      0
    )
  )
  const maintenanceCost = computed(() => Math.round(facilityInvestment.value * ECONOMY.maintenanceRate))
  const scoutingSpec = computed(() => SCOUTING_LEVELS[upgrades.value.scoutingLevel] ?? SCOUTING_LEVELS[1])
  const accuracyWithStaff = computed(() =>
    Math.min(0.99, scoutingSpec.value.accuracy + (clubStaff.value.marketAnalyst ? STAFF_BONUS.analystAccuracy : 0))
  )
  const gemChanceWithStaff = computed(() => scoutingSpec.value.gemChance + (clubStaff.value.chiefScout ? STAFF_BONUS.scoutGemChance : 0))

  function spend(amount: number): boolean {
    if (budget.value < amount) return false
    budget.value -= amount
    return true
  }

  function earn(amount: number) {
    budget.value += amount
  }

  function recordTransfer(type: TransferOperationType, playerName: string, position: string, overall: number, amount: number) {
    transferHistory.value.unshift({
      id: 'tr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      season: season.value,
      type,
      playerName,
      position,
      overall,
      amount
    })
  }

  /** Pódios da temporada imediatamente anterior. */
  const previousPodiums = computed(() => podiumArchive.value.filter((p) => p.season === season.value - 1))

  /** Arquiva pódios (mais recente primeiro), sem duplicar competição + temporada, máximo 12. */
  function archivePodiums(podiums: Podium[]) {
    const next = [...podiumArchive.value]
    for (const p of podiums) {
      if (next.some((x) => x.competition === p.competition && x.season === p.season)) continue
      next.unshift(p)
    }
    podiumArchive.value = next.slice(0, PODIUM_ARCHIVE_MAX)
  }

  function recordTrophy(type: 'title' | 'promotion', title: string, prize: number) {
    trophyGallery.value.unshift({
      id: 'cup_' + Date.now(),
      season: season.value,
      type,
      title,
      prize
    })
  }

  function ensureCareerEntry(p: Player): CareerStatEntry {
    if (!careerStats.value[p.id]) {
      careerStats.value[p.id] = { name: p.name, position: p.position, apps: 0, goals: 0 }
    }
    return careerStats.value[p.id]
  }

  function recordGoal(player: Player) {
    seasonGoals.value[player.id] = (seasonGoals.value[player.id] || 0) + 1
    ensureCareerEntry(player).goals += 1
  }

  function revertGoal(playerId: string) {
    const sg = seasonGoals.value[playerId]
    if (sg) {
      if (sg <= 1) delete seasonGoals.value[playerId]
      else seasonGoals.value[playerId] = sg - 1
    }
    const ce = careerStats.value[playerId]
    if (ce && ce.goals > 0) ce.goals -= 1
  }

  function recordAppearance(player: Player) {
    ensureCareerEntry(player).apps += 1
  }

  function resetSeasonGoals() {
    seasonGoals.value = {}
  }

  /** Soma 1 de OVER ao ganho do atleta na temporada. */
  function recordEvolution(playerId: string, amount = 1) {
    progress.value.seasonGains[playerId] = (progress.value.seasonGains[playerId] || 0) + amount
  }

  /** Início de temporada: guarda o OVER do time e dos atletas e zera os ganhos. */
  function startProgressSeason(teamOver: number, players: Array<{ id: string; overall: number }>) {
    progress.value.seasonStartOver = Math.round(teamOver * 10) / 10
    progress.value.seasonStartPlayerOver = Object.fromEntries(players.map((p) => [p.id, p.overall]))
    progress.value.seasonGains = {}
  }

  /** Registra marcos novos; id já existente nunca se repete. Devolve só os que entraram. */
  function addMilestones(list: Milestone[]): Milestone[] {
    const added: Milestone[] = []
    for (const m of list) {
      if (progress.value.milestones.some((x) => x.id === m.id)) continue
      progress.value.milestones.push({ ...m })
      added.push(m)
    }
    return added
  }

  function getUpgradeCost(key: keyof ClubUpgrades): number {
    const lvl = upgrades.value[key]
    return UPGRADE_COSTS[key][lvl] || 0
  }

  function upgradeFacility(key: keyof ClubUpgrades): boolean {
    const lvl = upgrades.value[key]
    if (lvl >= FACILITY_MAX_LEVEL[key]) return false
    const cost = getUpgradeCost(key)
    if (budget.value < cost) return false
    budget.value -= cost
    upgrades.value[key] = lvl + 1
    reputation.value += 5
    return true
  }

  function hireStaff(key: StaffKey, cost: number): boolean {
    clubNow.value = Date.now()
    // Só renova na última janela (24h finais); evita acumular contratos longos.
    if (staffRemainingMs(key) > STAFF_RENEW_WINDOW_MS || budget.value < cost) return false
    budget.value -= cost
    staffContracts.value[key] = Math.max(clubNow.value, staffContracts.value[key]) + STAFF_CONTRACT_MS
    return true
  }

  /** Saves novos guardam o fim do contrato; saves antigos (booleano) ganham 7 dias a partir de agora. */
  function loadStaff(data: { staffContracts?: Partial<StaffContracts>; clubStaff?: Partial<ClubStaff> } | null | undefined) {
    clubNow.value = Date.now()
    const next = defaultStaffContracts()
    for (const key of Object.keys(next) as StaffKey[]) {
      const saved = data?.staffContracts?.[key]
      if (typeof saved === 'number') next[key] = saved
      else if (data?.clubStaff?.[key] === true) next[key] = clubNow.value + STAFF_CONTRACT_MS
    }
    staffContracts.value = next
  }

  function toSave(): ClubSave {
    return {
      name: name.value,
      shortName: shortName.value,
      stadiumName: stadiumName.value,
      crestShape: crestShape.value,
      primaryColor: primaryColor.value,
      secondaryColor: secondaryColor.value,
      crestPattern: crestPattern.value,
      crestOrientation: crestOrientation.value,
      crestStripes: crestStripes.value,
      crestTextColor: crestTextColor.value,
      crestTextStroke: crestTextStroke.value,
      reputation: reputation.value,
      budget: budget.value,
      season: season.value,
      division: division.value,
      upgrades: { ...upgrades.value },
      podiumArchive: [...podiumArchive.value],
      tryoutsThisSeason: tryoutsThisSeason.value,
      restDayStart: restDayStart.value,
      restUses: restUses.value,
      progress: {
        seasonStartOver: progress.value.seasonStartOver,
        seasonStartPlayerOver: { ...progress.value.seasonStartPlayerOver },
        seasonGains: { ...progress.value.seasonGains },
        lastSeason: progress.value.lastSeason
          ? { ...progress.value.lastSeason, top: progress.value.lastSeason.top.map((t) => ({ ...t })) }
          : undefined,
        milestones: progress.value.milestones.map((m) => ({ ...m }))
      }
    }
  }

  function fromSave(data: Partial<Omit<ClubSave, 'crestShape'>> & { crestShape?: string }) {
    const d: ClubSave = {
      name: 'Super XI FC',
      shortName: 'SXI',
      stadiumName: 'Arena Super XI',
      primaryColor: '#059669',
      secondaryColor: '#ffffff',
      crestPattern: 'liso',
      crestOrientation: 'vertical',
      crestStripes: 5,
      crestTextColor: 'auto',
      crestTextStroke: 'auto',
      reputation: 10,
      budget: ECONOMY.startBudget,
      season: 1,
      division: 4,
      upgrades: defaultUpgrades(),
      ...data,
      crestShape: normalizeCrestShape(data.crestShape)
    }
    name.value = d.name
    shortName.value = d.shortName
    stadiumName.value = d.stadiumName
    crestShape.value = d.crestShape
    primaryColor.value = normalizeHex(d.primaryColor, '#059669')
    secondaryColor.value = normalizeHex(d.secondaryColor, '#ffffff')
    crestPattern.value = normalizeCrestPattern(d.crestPattern)
    crestOrientation.value = normalizeCrestOrientation(d.crestOrientation)
    crestStripes.value = normalizeCrestStripes(d.crestStripes)
    crestTextColor.value = d.crestTextColor === 'auto' ? 'auto' : normalizeHex(d.crestTextColor, 'auto')
    crestTextStroke.value = normalizeHex(d.crestTextStroke, 'auto')
    reputation.value = d.reputation
    budget.value = d.budget
    season.value = d.season
    division.value = d.division
    const merged = { ...defaultUpgrades(), ...d.upgrades }
    // Save antigo ou adulterado: nenhum nível passa do máximo da instalação (nem fica abaixo de 1).
    for (const k of Object.keys(FACILITY_MAX_LEVEL) as Array<keyof ClubUpgrades>) {
      const v = Number(merged[k])
      merged[k] = Number.isFinite(v) ? Math.min(FACILITY_MAX_LEVEL[k], Math.max(1, Math.floor(v))) : 1
    }
    upgrades.value = merged
    podiumArchive.value = Array.isArray(data.podiumArchive) ? data.podiumArchive.slice(0, PODIUM_ARCHIVE_MAX) : []
    tryoutsThisSeason.value = Number.isFinite(data.tryoutsThisSeason) ? Math.max(0, Math.floor(data.tryoutsThisSeason as number)) : 0
    restDayStart.value = Number.isFinite(data.restDayStart) ? (data.restDayStart as number) : 0
    restUses.value = Number.isFinite(data.restUses) ? Math.max(0, Math.floor(data.restUses as number)) : 0
    const pr = data.progress
    const base = defaultProgress()
    progress.value = pr && typeof pr === 'object'
      ? {
          seasonStartOver: Number.isFinite(pr.seasonStartOver) ? pr.seasonStartOver : 0,
          seasonStartPlayerOver: pr.seasonStartPlayerOver && typeof pr.seasonStartPlayerOver === 'object' ? { ...pr.seasonStartPlayerOver } : base.seasonStartPlayerOver,
          seasonGains: pr.seasonGains && typeof pr.seasonGains === 'object' ? { ...pr.seasonGains } : base.seasonGains,
          lastSeason: pr.lastSeason && typeof pr.lastSeason === 'object' ? pr.lastSeason : undefined,
          milestones: Array.isArray(pr.milestones) ? pr.milestones.filter((m) => m && typeof m.id === 'string') : []
        }
      : base
  }

  function resetClub() {
    fromSave({})
  }

  function resetCareerRecords() {
    transferHistory.value = []
    trophyGallery.value = []
    podiumArchive.value = []
    seasonGoals.value = {}
    careerStats.value = {}
    progress.value = defaultProgress()
    staffContracts.value = defaultStaffContracts()
  }

  return {
    name,
    shortName,
    stadiumName,
    crestShape,
    primaryColor,
    secondaryColor,
    crestPattern,
    crestOrientation,
    crestStripes,
    crestTextColor,
    crestTextStroke,
    reputation,
    budget,
    season,
    division,
    upgrades,
    clubStaff,
    staffContracts,
    clubNow,
    staffRemainingMs,
    loadStaff,
    transferHistory,
    trophyGallery,
    seasonGoals,
    careerStats,
    tryoutsThisSeason,
    progress,
    recordEvolution,
    startProgressSeason,
    addMilestones,
    restUsesToday,
    restCostNow,
    restResetsInMs,
    registerRest,
    maxSquadCapacity,
    serieEconomy,
    facilityInvestment,
    maintenanceCost,
    projectedStadiumIncome,
    projectedSponsorIncome,
    scoutingSpec,
    gemChanceWithStaff,
    accuracyWithStaff,
    spend,
    earn,
    recordTransfer,
    podiumArchive,
    previousPodiums,
    archivePodiums,
    recordTrophy,
    recordGoal,
    recordAppearance,
    revertGoal,
    resetSeasonGoals,
    getUpgradeCost,
    upgradeFacility,
    hireStaff,
    toSave,
    fromSave,
    resetClub,
    resetCareerRecords
  }
})
