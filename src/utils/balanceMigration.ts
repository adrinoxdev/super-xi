import type { ContinentalTeam } from '@/types/competitions'
import type { Player } from '@/types/player'
import { CONTINENTAL_RIVALS, SERIE_TYPICAL_OVER } from '@/utils/constants'
import { EXTRA_D_CLUBS } from '@/utils/extraClubs'
import { refreshPlayerEconomy, retireAgeFor, wageForOverall } from '@/utils/generatePlayer'
import { CONTRACT } from '@/utils/constants'
import { LEAGUE_CLUBS_POOL } from '@/utils/leagueScheduler'

/** Versão do balanceamento gravada em club.balanceVersion. Saves sem o campo são anteriores ao v2. */
export const BALANCE_VERSION = 2

/** Acima disso o poder está na escala antiga (650-950); a nova vai de ~50 a 85. */
const OLD_SCALE_MIN = 120

interface Powered { id?: string; name?: string; power: number; isUser?: boolean }

/** Partes das stores que a migração toca (estrutural, para não acoplar a utilidade às stores). */
export interface BalanceMigrationCtx {
  /** Objeto do save já lido (JSON.parse), para ler club.balanceVersion. */
  saved?: { club?: { balanceVersion?: number } } | null
  division: number
  squadPlayers: Player[]
  scoutingReports: Array<{ player: Player }>
  youthProspects: Player[]
  leagueTeams: Powered[]
  cupState: { currentRival?: { name: string; power: number } | null; bracket?: { teams: Record<string, Powered> } | null }
  continentalState: { teams: ContinentalTeam[]; otherGroups?: Array<{ teams: ContinentalTeam[] }>; bracket?: { teams: Record<string, Powered> } | null }
  supercupState: { rivalName: string; rivalPower: number }
  recopaState: { rivalName: string; rivalPower: number }
}

const byId = new Map<string, number>()
const byName = new Map<string, number>()
function index(): void {
  if (byId.size) return
  const add = (id: string, name: string, p: number) => { byId.set(id, p); byName.set(name, p) }
  for (const list of Object.values(LEAGUE_CLUBS_POOL)) for (const c of list) add(c.id, c.name, c.basePower)
  for (const c of EXTRA_D_CLUBS) add(c.id, c.name, c.basePower)
  for (const c of CONTINENTAL_RIVALS) add(c.id, c.name, c.power)
  // rivais padrão de Supercopa e Recopa (competitions.ts), fora das listas
  byName.set('Esporte Clube Estrela do Norte', 74)
  byName.set('Deportivo Costa Dourada', 75)
}

/** Fórmula de reserva para rival fora das listas: 650-950 vira ~50-85. */
function fallbackOver(old: number): number {
  return Math.min(85, Math.max(50, Math.round(57 + (old - 640) * 0.08)))
}

function convert(old: number, id?: string, name?: string): number {
  index()
  const hit = (id !== undefined ? byId.get(id) : undefined) ?? (name !== undefined ? byName.get(name) : undefined)
  return hit ?? fallbackOver(old)
}

/** Time com poder antigo (ou o usuário, que recebe sempre o OVER típico). */
function fix(t: Powered, userOver: number): void {
  if (t.isUser || t.id === 'user') t.power = userOver
  else if (t.power > OLD_SCALE_MIN) t.power = convert(t.power, t.id, t.name)
}

function* allPowered(c: BalanceMigrationCtx): Generator<Powered> {
  for (const t of c.leagueTeams) yield t
  for (const t of c.continentalState.teams ?? []) yield t
  for (const g of c.continentalState.otherGroups ?? []) for (const t of g.teams) yield t
  for (const b of [c.cupState.bracket, c.continentalState.bracket])
    if (b?.teams) for (const t of Object.values(b.teams)) yield t
}

export function isOldBalanceSave(c: BalanceMigrationCtx): boolean {
  for (const t of allPowered(c)) if (!(t.isUser || t.id === 'user') && t.power > OLD_SCALE_MIN) return true
  if (c.supercupState.rivalPower > OLD_SCALE_MIN || c.recopaState.rivalPower > OLD_SCALE_MIN) return true
  return false
}

/**
 * Migra um save anterior ao balanceamento v2 para a escala de OVER. Idempotente: após a conversão
 * nenhum poder passa de 120 e o save grava club.balanceVersion = 2. O caixa não é tocado.
 * Devolve true se converteu algo.
 */
export function migrateBalanceV2(c: BalanceMigrationCtx): boolean {
  if ((c.saved?.club?.balanceVersion ?? 0) >= BALANCE_VERSION) return false
  if (!isOldBalanceSave(c)) return false

  const div = c.division
  const leagueUser = SERIE_TYPICAL_OVER[div] ?? SERIE_TYPICAL_OVER[4]
  for (const t of c.leagueTeams) fix(t, leagueUser)
  for (const t of c.cupState.bracket ? Object.values(c.cupState.bracket.teams) : []) fix(t, leagueUser)
  const conUser = SERIE_TYPICAL_OVER[1]
  for (const t of c.continentalState.teams ?? []) fix(t, conUser)
  for (const g of c.continentalState.otherGroups ?? []) for (const t of g.teams) fix(t, conUser)
  if (c.continentalState.bracket) for (const t of Object.values(c.continentalState.bracket.teams)) fix(t, conUser)

  const r = c.cupState.currentRival
  if (r && r.power > OLD_SCALE_MIN) r.power = convert(r.power, undefined, r.name)
  for (const f of [c.supercupState, c.recopaState])
    if (f.rivalPower > OLD_SCALE_MIN) f.rivalPower = convert(f.rivalPower, undefined, f.rivalName)

  for (const p of c.squadPlayers) p.wage = wageForOverall(p.overall)
  for (const rep of c.scoutingReports) if (rep.player) rep.player.wage = wageForOverall(rep.player.overall)
  for (const p of c.youthProspects) p.wage = wageForOverall(p.overall)
  return true
}

/** Versão da economia do atleta gravada em club.athleteEconomyVersion (ausente = save anterior). */
export const ATHLETE_ECONOMY_VERSION = 1

export interface AthleteMigrationCtx {
  saved?: { club?: { athleteEconomyVersion?: number } } | null
  season: number
  squadPlayers: Player[]
  scoutingReports: Array<{ player: Player }>
  youthProspects: Player[]
}

/**
 * Economia do atleta v1: recalcula valor e salário pelo OVER e idade atuais, garante contrato de 2 a 5 temporadas,
 * limita a idade a retireAgeFor(posição) - 2 (37 na linha, 45 no goleiro; ninguém se aposenta sem um ano de aviso)
 * e trava a venda nesta temporada no valor antigo (sem lucro instantâneo com a revalorização).
 * Idempotente pela versão gravada.
 */
export function migrateAthleteEconomyV1(c: AthleteMigrationCtx): boolean {
  if ((c.saved?.club?.athleteEconomyVersion ?? 0) >= ATHLETE_ECONOMY_VERSION) return false
  for (const p of c.squadPlayers) {
    const oldValue = p.value
    p.age = Math.min(p.age, retireAgeFor(p.position) - 2)
    if (!p.isLoanedIn) p.contractYears = Math.min(CONTRACT.maxYears, Math.max(CONTRACT.migrationMinYears, p.contractYears || 0))
    refreshPlayerEconomy(p)
    p.acquiredSeason = c.season
    p.acquiredFee = Math.min(oldValue, p.value)
  }
  for (const r of c.scoutingReports) if (r.player) refreshPlayerEconomy(r.player)
  for (const p of c.youthProspects) refreshPlayerEconomy(p)
  return true
}

/** Versão da escala de progressão gravada em club.progressionVersion (ausente = save na escala de OVER antiga). */
export const PROGRESSION_VERSION = 3

/** Queda de OVER por série do clube (a mesma do remapeamento dos rivais): D -11, C -9, B -7, A -5. */
export const PROGRESSION_SHIFT: Record<number, number> = { 4: -11, 3: -9, 2: -7, 1: -5 }

const ATHLETE_OVER_FLOOR = 35
const ATHLETE_ATTR_FLOOR = 30
const ATHLETE_CAP = 99

export interface ProgressionMigrationCtx {
  saved?: { club?: { progressionVersion?: number } } | null
  season: number
  division: number
  /** true se a V2 acabou de converter os rivais para a escala nova nesta carga (então rivais não se deslocam de novo). */
  rivalsAlreadyNew: boolean
  squadPlayers: Player[]
  scoutingReports: Array<{ player: Player }>
  youthProspects: Player[]
  leagueTeams: Powered[]
  cupState: { currentRival?: { name: string; power: number } | null; bracket?: { teams: Record<string, Powered> } | null }
  continentalState: { teams: ContinentalTeam[]; otherGroups?: Array<{ teams: ContinentalTeam[] }>; bracket?: { teams: Record<string, Powered> } | null }
  supercupState: { rivalName: string; rivalPower: number }
  recopaState: { rivalName: string; rivalPower: number }
}

function shiftPlayer(p: Player, d: number): void {
  const clampN = (v: number, lo: number) => Math.min(ATHLETE_CAP, Math.max(lo, Math.round(v)))
  p.overall = clampN(p.overall + d, ATHLETE_OVER_FLOOR)
  p.potential = Math.max(p.overall, clampN(p.potential + d, ATHLETE_OVER_FLOOR))
  if (p.attributes) {
    for (const k of Object.keys(p.attributes) as Array<keyof typeof p.attributes>) p.attributes[k] = clampN(p.attributes[k] + d, ATHLETE_ATTR_FLOOR)
  }
  refreshPlayerEconomy(p)
}

/**
 * Progressão v3: reescala um save de OVER antigo (D 61, C 66, B 71, A 76 típicos) para a escala nova
 * (D 50, C 57, B 64, A 71): tudo cai o deslocamento da série atual, então a diferença de OVER entre o usuário e
 * cada rival da série fica idêntica. Idade, contrato e caixa não mudam. Idempotente pela versão gravada.
 * Devolve true se migrou (o chamador mostra o aviso único).
 */
export function migrateProgressionV3(c: ProgressionMigrationCtx): boolean {
  if ((c.saved?.club?.progressionVersion ?? 0) >= PROGRESSION_VERSION) return false
  const d = PROGRESSION_SHIFT[c.division] ?? PROGRESSION_SHIFT[4]
  const dCon = PROGRESSION_SHIFT[1]
  // Save sem versão mas já na escala nova (criado entre as mudanças): média dos rivais perto do típico novo.
  const typ = SERIE_TYPICAL_OVER[c.division] ?? SERIE_TYPICAL_OVER[4]
  const rv = c.leagueTeams.filter((t) => !(t.isUser || t.id === 'user'))
  const mean = rv.length ? rv.reduce((a, t) => a + t.power, 0) / rv.length : typ - d
  if (!c.rivalsAlreadyNew && mean < typ - d / 2) return false

  for (const p of c.squadPlayers) {
    shiftPlayer(p, d)
    if (p.acquiredFee !== undefined && p.acquiredSeason === c.season) p.acquiredFee = Math.min(p.acquiredFee, p.value)
  }
  for (const r of c.scoutingReports) if (r.player) shiftPlayer(r.player, d)
  for (const p of c.youthProspects) shiftPlayer(p, d)

  if (!c.rivalsAlreadyNew) {
    index()
    const lookup = (id: string | undefined, name: string | undefined): number | undefined =>
      (id !== undefined ? byId.get(id) : undefined) ?? (name !== undefined ? byName.get(name) : undefined)
    const shiftTo = (t: Powered, delta: number, useList: boolean) => {
      const isUser = t.isUser || t.id === 'user'
      const hit = !isUser && useList ? lookup(t.id, t.name) : undefined
      t.power = hit ?? t.power + delta
    }
    for (const t of c.leagueTeams) t.power += d
    if (c.cupState.bracket) for (const t of Object.values(c.cupState.bracket.teams)) shiftTo(t, d, true)
    for (const t of c.continentalState.teams ?? []) shiftTo(t, dCon, true)
    for (const g of c.continentalState.otherGroups ?? []) for (const t of g.teams) shiftTo(t, dCon, true)
    if (c.continentalState.bracket) for (const t of Object.values(c.continentalState.bracket.teams)) shiftTo(t, dCon, true)
    const r = c.cupState.currentRival
    if (r) r.power = lookup(undefined, r.name) ?? r.power + d
    for (const f of [c.supercupState, c.recopaState]) f.rivalPower = lookup(undefined, f.rivalName) ?? f.rivalPower + dCon
  }
  return true
}
