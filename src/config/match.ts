// Lesões: sorteadas após cada partida entre os titulares. Chance base + extra por cansaço (energia < 60).
export const INJURY = {
  baseChance: 0.015,
  fatigueChance: 0.02,
  severeChance: 0.15,
  lightMatches: [1, 3] as [number, number],
  severeMatches: [4, 8] as [number, number],
  // Redução por nível do Departamento Médico acima do 1 (chance e duração).
  medicalReductionPerLevel: 0.07,
  // Jogar lesionado custa muito overall e agrava a lesão no fim da partida (+jogos fora, até o teto).
  playingInjuredPenalty: 25,
  aggravateMatches: 2,
  aggravateCap: 12,
  // Ticks da simulação ao vivo (2 minutos de jogo cada): a chance por partida é dividida entre eles.
  matchTicks: 45
}

/** Motor de partida em unidades de OVER (média ponderada dos 11 titulares). */
export const MATCH_SIM = {
  ticks: 45, homeAdvantage: 3, slope: 0.0028, userChanceBase: 0.11, oppChanceBase: 0.10, aiChanceBase: 0.105,
  chanceMin: 0.025, chanceMax: 0.24, userOnTarget: 0.56, userGoal: 0.44, oppOnTarget: 0.52, oppGoal: 0.40,
  aiOnTarget: 0.54, aiGoal: 0.42, formSwing: 1.5, possessionPerOver: 1.2, shootoutDiv: 250, seedingNoise: 2.5
}
