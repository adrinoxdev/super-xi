import type { PlayerPosition } from '@/types'

// Limite máximo absoluto de atletas no elenco (vale para qualquer caminho de entrada).
export const SQUAD_MAX_SIZE = 25

// Começa com 14 vagas (o clube nasce com 11 atletas, sobram 3) e chega a 25 no nível 10 (máximo).
export const SQUAD_CAPACITIES: Record<number, number> = {
  1: 14,
  2: 15,
  3: 16,
  4: 17,
  5: 18,
  6: 19,
  7: 20,
  8: 21,
  9: 23,
  10: 25
}

// Elenco mínimo para vender/dispensar: é preciso manter ao menos um time completo.
export const MIN_SQUAD_SIZE = 11

// Descanso do elenco (Elenco & Tática): o custo dobra a cada uso no dia, sem teto, e volta ao valor inicial na virada do
// dia (meia-noite, horário local). Várias aplicações no mesmo dia ficam proibitivas. energy = pontos de energia
// devolvidos a todo o elenco.
export const REST = { baseCost: 6000, growth: 2, energy: 35 }
// Multiplicador do custo por série (chave = divisão: 4 = D ... 1 = A), na proporção da folha por jogo.
export const REST_SERIES_MULT: Record<number, number> = { 4: 1, 3: 1.3, 2: 2, 1: 2.6 }

// Recuperação natural: todo atleta ganha energia com o passar do tempo real, inclusive com o jogo fechado (sem teto).
// Rápida de propósito: o descanso pago fica para quem quer evoluir sem esperar.
export const STAMINA_REGEN_PER_HOUR = 20
export const STAMINA_REGEN_MS_PER_POINT = (60 * 60 * 1000) / STAMINA_REGEN_PER_HOUR

/** Custo do próximo descanso: base x série x crescimento^usos no dia, arredondado a R$ 500. Sem teto. */
export function restCost(usesToday: number, division: number): number {
  const raw = REST.baseCost * (REST_SERIES_MULT[division] ?? 1) * Math.pow(REST.growth, usesToday)
  return Math.round(raw / 500) * 500
}

export const ALL_POSITIONS: PlayerPosition[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']

export const POS_BR_MAP: Record<string, string> = {
  GK: 'GOL',
  CB: 'ZAG',
  LB: 'LE',
  RB: 'LD',
  CDM: 'VOL',
  CM: 'MC',
  CAM: 'MEI',
  LW: 'PE',
  RW: 'PD',
  ST: 'ATA'
}
