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
  // Tratamento pago: corta parte dos jogos fora (uma vez por lesão). Custo por jogo cortado.
  treatmentShare: 0.5,
  treatmentCostPerMatch: 4000,
  // Ticks da simulação ao vivo (2 minutos de jogo cada): a chance por partida é dividida entre eles.
  matchTicks: 45
}

/** Motor de partida em unidades de OVER (média ponderada dos 11 titulares). */
export const MATCH_SIM = {
  /** Chance por tick (de cada time) de pênalti marcado em jogo: ~0,35 por partida no total. */
  penaltyChance: 0.004,
  /** Chance de cartão a cada falta (de cada time, ~8 faltas por partida): ~1,1 amarelo por time (cerca de 2,3 por
   *  partida) e ~0,04 vermelho direto por time (cerca de 1 a cada 12 partidas), perto do futebol de campo. */
  yellowPerFoul: 0.14,
  redPerFoul: 0.005,
  /** Lances do dia a dia, por tick e por time: lateral (~20 por time), impedimento (~3), falta perigosa a cada falta (12%),
   *  briga (~1 a cada 7 partidas) e parte das finalizações para fora que acertam a trave. Só os dois últimos mexem em
   *  cartões; nenhum altera o placar. */
  throwInChance: 0.45,
  offsideChance: 0.07,
  dangerousFreeKick: 0.12,
  brawlChance: 0.003,
  postShare: 0.12,
  /** Cobrança de falta perigosa que vira gol (soma ~0,06 gol por time e partida). */
  freeKickGoal: 0.07,
  /** Parte dos gols de cada lado que é gol contra (troca só a autoria, o placar é o mesmo). */
  ownGoalShare: 0.04,
  /** Parte dos pênaltis marcados por bola na mão, e chance de cartão amarelo nesses casos. */
  handballShare: 0.2,
  handballCard: 0.35,
  /** Intervalo entre cobranças da disputa ao vivo (ms), por velocidade. */
  shootoutKickMs: { 1: 1700, 2: 850 } as Record<1 | 2, number>,
  ticks: 45, homeAdvantage: 3, slope: 0.0028, userChanceBase: 0.11, oppChanceBase: 0.10, aiChanceBase: 0.105,
  chanceMin: 0.025, chanceMax: 0.24, userOnTarget: 0.56, userGoal: 0.44, oppOnTarget: 0.52, oppGoal: 0.40,
  aiOnTarget: 0.54, aiGoal: 0.42, formSwing: 1.5, possessionPerOver: 1.2, shootoutDiv: 250, seedingNoise: 2.5
}
