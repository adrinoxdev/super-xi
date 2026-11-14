import type { Player, PlayerAttributes, PlayerPosition } from '@/types/player'
import { AGING, ALL_POSITIONS, ATHLETE_MAX_OVERALL, OVER_TAIL, STAR, VALUE, VALUE_AGE, WAGE, YOUTH } from '@/config'
import { clamp, pickRandom, randInt } from '@/utils/core/random'

const FIRST_NAMES = [
  'Lucas', 'Mateus', 'Gabriel', 'Rafael', 'Thiago', 'Enzo', 'Bruno', 'Caio',
  'Diego', 'Felipe', 'Gustavo', 'Henrique', 'Igor', 'João', 'Kauã', 'Leonardo',
  'Murilo', 'Nicolas', 'Otávio', 'Pedro', 'Rodrigo', 'Samuel', 'Vinícius', 'Yuri'
]

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Ferreira', 'Costa',
  'Rodrigues', 'Almeida', 'Nascimento', 'Araújo', 'Melo', 'Barbosa', 'Ribeiro',
  'Martins', 'Carvalho', 'Gomes', 'Rocha', 'Dias', 'Moreira', 'Cardoso', 'Teixeira'
]

const NATIONALITIES = ['Brasil', 'Argentina', 'Uruguai', 'Colômbia', 'Portugal', 'Espanha']


/** Prêmio de estrela (1 até STAR.from). */
export function starFactor(overall: number): number {
  return overall > STAR.from ? Math.pow(2, (overall - STAR.from) / STAR.doubleEvery) : 1
}

/** Anos de atraso da curva de valor por idade dos goleiros (idade efetiva = idade - 4, nunca abaixo do início do auge). */
const GK_VALUE_AGE_SHIFT = 4

/**
 * Fator de idade do valor de mercado. Goleiros (position === 'GK') envelhecem 4 anos mais tarde:
 * idade efetiva = max(início do auge, idade - 4), o que mantém a curva contínua (sem salto de valor).
 */
export function ageValueFactor(age: number, position?: PlayerPosition): number {
  const a = position === 'GK' && age > VALUE_AGE.peakFrom ? Math.max(VALUE_AGE.peakFrom, age - GK_VALUE_AGE_SHIFT) : age
  if (a < VALUE_AGE.peakFrom) return Math.min(VALUE_AGE.youngMax, VALUE_AGE.peak + VALUE_AGE.youngStep * (VALUE_AGE.peakFrom - a))
  if (a <= VALUE_AGE.peakTo) return VALUE_AGE.peak
  return Math.max(VALUE_AGE.oldMin, VALUE_AGE.peak - VALUE_AGE.oldStep * (a - VALUE_AGE.peakTo))
}

/** Valor de mercado atual (OVER, idade, potencial; posição opcional: goleiro tem curva de idade própria). */
export function valueForPlayer(p: { overall: number; age: number; potential: number; position?: PlayerPosition }): number {
  const base = VALUE.floor + Math.pow(Math.max(0, p.overall - VALUE.ref), VALUE.exp) * VALUE.mult
  const pot = 1 + VALUE.potStep * Math.min(VALUE.potMaxGap, Math.max(0, p.potential - p.overall))
  const raw = base * ageValueFactor(p.age, p.position) * pot * starFactor(p.overall)
  return Math.max(VALUE.min, Math.round(raw / VALUE.step) * VALUE.step)
}

/** Recalcula valor e salário a partir do OVER e da idade atuais. */
export function refreshPlayerEconomy(p: Player): void {
  p.value = valueForPlayer(p)
  p.wage = wageForOverall(p.overall)
}

/** Idade de aposentadoria: 37 para linha, 45 para goleiro. */
export function retireAgeFor(position?: PlayerPosition): number {
  return position === 'GK' ? AGING.retireAgeGK : AGING.retireAge
}

/** OVER perdido na virada pela idade (já incrementada). Linha: 31+ ; goleiro: 35+ (ver AGING). */
export function agingDrop(age: number, position?: PlayerPosition): number {
  if (position === 'GK') {
    if (age < AGING.declineFromGK) return 0
    return age >= 40 ? AGING.dropGKAt40 : age >= 37 ? AGING.dropGKAt37 : 1
  }
  if (age < AGING.declineFrom) return 0
  return age >= 35 ? AGING.dropAt35 : age >= 33 ? AGING.dropAt33 : 1
}

/** Aplica o envelhecimento: perde OVER e atributos, e o potencial passa a ser o OVER atual. */
export function applyAging(p: Player): void {
  const drop = agingDrop(p.age, p.position)
  if (drop <= 0) return
  p.overall = Math.max(30, p.overall - drop)
  for (const k of Object.keys(p.attributes) as Array<keyof PlayerAttributes>) p.attributes[k] = Math.max(25, p.attributes[k] - drop)
  p.potential = p.overall
}

/** Teto de venda na temporada da chegada: ninguém vende por mais do que pagou. */
export function saleCap(p: Player, amount: number, season: number): number {
  return p.acquiredSeason === season ? Math.min(amount, p.acquiredFee ?? amount) : amount
}

/** Promovido da base ainda dentro do bloqueio de venda e empréstimo. */
export function isYouthSaleLocked(p: Player, season: number): boolean {
  return p.promotedSeason !== undefined && season < p.promotedSeason + YOUTH.lockSeasons
}

/** Primeira temporada em que o promovido da base pode ser vendido ou emprestado. */
export function youthUnlockSeason(p: Player): number | null {
  return p.promotedSeason === undefined ? null : p.promotedSeason + YOUTH.lockSeasons
}

/** Salário por jogo a partir do OVER (dobra a cada WAGE.doubleEvery pontos; prêmio de estrela acima de STAR.from). */
export function wageForOverall(overall: number): number {
  const raw = WAGE.base * Math.pow(2, (overall - WAGE.refOvr) / WAGE.doubleEvery) * starFactor(overall)
  return Math.max(WAGE.min, Math.round(raw / WAGE.step) * WAGE.step)
}

export interface GeneratePlayerOptions {
  position?: PlayerPosition
  minOvr: number
  maxOvr: number
  isYouth?: boolean
  isGem?: boolean
  /** Permite a cauda longa (raro saltar acima do maxOvr, até ATHLETE_MAX_OVERALL). Só scouting e mercado. */
  tail?: boolean
}

/** Cauda longa: salta para >= 90 com baixa probabilidade e sobe ponto a ponto com decaimento forte. */
function rollTailOverall(): number | null {
  if (Math.random() >= OVER_TAIL.p90) return null
  let o = 90
  while (o < ATHLETE_MAX_OVERALL && Math.random() < (o < 95 ? OVER_TAIL.stepTo95 : OVER_TAIL.stepTo99)) o++
  return o
}

export function generatePlayer(options: GeneratePlayerOptions): Player {
  const pos = options.position ?? pickRandom(ALL_POSITIONS)
  const age = options.isYouth ? randInt(16, 19) : randInt(19, 31)
  const base = clamp(randInt(options.minOvr, options.maxOvr), 35, 93)
  const tailOvr = options.tail ? rollTailOverall() : null
  const overall = tailOvr !== null ? Math.max(base, tailOvr) : base

  let potentialBonus = options.isYouth ? randInt(10, 18) : age <= 23 ? randInt(4, 10) : randInt(0, 3)
  if (options.isGem) potentialBonus += randInt(6, 12)
  // Teto de potencial: 96 sem cauda longa; com tail vai até ATHLETE_MAX_OVERALL (99), para a evolução
  // (EVOLUTION.hardCap = 98) poder chegar ao teto de forma muito rara, só em atletas de cauda.
  const potentialCap = options.tail ? ATHLETE_MAX_OVERALL : 96
  const potential = clamp(overall + potentialBonus, overall, potentialCap)

  const v = () => randInt(-5, 6)
  const attributes: PlayerAttributes = {
    pace: clamp(overall + v(), 25, 99),
    shooting: clamp(overall + v(), 25, 99),
    passing: clamp(overall + v(), 25, 99),
    dribbling: clamp(overall + v(), 25, 99),
    defending: clamp(overall + v(), 25, 99),
    physical: clamp(overall + v(), 25, 99)
  }

  if (pos === 'ST') {
    attributes.shooting = clamp(overall + randInt(4, 9), 30, 99)
    attributes.defending = clamp(overall - randInt(18, 28), 25, 65)
  } else if (pos === 'LW' || pos === 'RW') {
    attributes.pace = clamp(overall + randInt(5, 10), 30, 99)
    attributes.dribbling = clamp(overall + randInt(4, 9), 30, 99)
  } else if (pos === 'CB') {
    attributes.defending = clamp(overall + randInt(5, 10), 30, 99)
    attributes.physical = clamp(overall + randInt(4, 9), 30, 99)
  }

  const value = valueForPlayer({ overall, age, potential, position: pos })
  const wage = wageForOverall(overall)

  return {
    id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`,
    age,
    nationality: Math.random() < 0.7 ? 'Brasil' : pickRandom(NATIONALITIES),
    position: pos,
    overall,
    potential,
    attributes,
    value,
    wage,
    form: randInt(74, 92),
    stamina: 100,
    contractYears: randInt(2, 4),
    isYouth: Boolean(options.isYouth),
    isLoanedOut: false,
    isLoanedIn: false,
    trainingFocus: 'balanced',
    marketStatus: 'available'
  }
}