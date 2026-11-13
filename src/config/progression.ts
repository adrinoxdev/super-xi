import type { PlayerPosition, TrainingFocus } from '@/types'

export const TRAINING_FOCUS_OPTIONS: Array<{ value: TrainingFocus; label: string }> = [
  { value: 'balanced', label: 'Equilibrado (Todos os atributos)' },
  { value: 'shooting', label: 'Finalização & Conclusão' },
  { value: 'pace', label: 'Velocidade & Explosão' },
  { value: 'passing', label: 'Passe & Visão de Jogo' },
  { value: 'defending', label: 'Marcação & Desarme' },
  { value: 'physical', label: 'Condicionamento Físico' }
]

/** Evolução por temporada (docs/plano-progressao.md). Ganho esperado de OVER de um atleta numa temporada:
 *  seasonBase x idade x min(1, distância ao potencial / gapFull) x (1 + CT + comissão) x minutos x foco x evolutionFactor.
 *  Cada partida sorteia +1 com probabilidade = ganho / matchesPerSeason[série]. */
export const PROGRESSION = {
  seasonBase: 5.25,
  gapFull: 6,
  tcPerLevel: 0.12,
  benchShare: 0.6,
  focusBonus: 0.1,
  maxPerMatch: 0.5,
  matchesPerSeason: { 4: 22, 3: 30, 2: 44, 1: 46 } as Record<number, number>,
  ageBands: [[19, 1], [21, 0.9], [23, 0.75], [26, 0.5], [29, 0.3], [99, 0.15]] as Array<[number, number]>
}

export function progressionAgeFactor(age: number): number {
  for (const [upTo, f] of PROGRESSION.ageBands) if (age <= upTo) return f
  return 0
}

/** Foco de treino que acelera a evolução de cada posição (o atributo-chave). */
export const POSITION_KEY_FOCUS: Record<PlayerPosition, TrainingFocus> = {
  GK: 'physical', CB: 'defending', LB: 'pace', RB: 'pace', CDM: 'defending', CM: 'passing', CAM: 'passing', LW: 'pace', RW: 'pace', ST: 'shooting'
}

/** Marcos de progressão (conquistas): OVER do time e OVER individual. */
export const MILESTONES = { teamOver: [55, 60, 65, 70, 75, 80, 85, 90], playerOver: [70, 80, 90] }
