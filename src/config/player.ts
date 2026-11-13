/** OVER máximo de um atleta. Chegar nele é raríssimo: só pela cauda longa da geração (scouting/mercado), nunca por evolução. */
export const ATHLETE_MAX_OVERALL = 99

/**
 * Cauda longa da geração (só scouting e mercado): com probabilidade p90 o atleta salta para >= 90 e cada ponto
 * seguinte tem chance de subir (decai forte): P(>=90) ~ 0,6%, P(>=95) ~ 1e-4, P(99) ~ 1e-6.
 */
export const OVER_TAIL = { p90: 0.006, stepTo95: 0.45, stepTo99: 0.32 }

/** Evolução (treino/jogos): retorno decrescente acima de softStart; teto duro abaixo do máximo, então 99 só nasce na geração. */
export const EVOLUTION = { softStart: 85, hardCap: 98, exponent: 1.5 }

/** Multiplicador (0..1) do ganho de OVER por evolução: 1 até softStart, depois ((max - ovr) / (max - softStart)) ^ 1,5. */
export function evolutionFactor(overall: number): number {
  if (overall <= EVOLUTION.softStart) return 1
  if (overall >= EVOLUTION.hardCap) return 0
  return Math.pow((ATHLETE_MAX_OVERALL - overall) / (ATHLETE_MAX_OVERALL - EVOLUTION.softStart), EVOLUTION.exponent)
}

/** Prêmio de estrela: acima de STAR.from, salário e valor dobram a mais a cada STAR.doubleEvery pontos de OVER. */
export const STAR = { from: 85, doubleEvery: 10 }

/** Valor de mercado: (floor + max(0, OVER - ref)^exp x mult) x idade x potencial x estrela; arred. a step; mínimo min. */
export const VALUE = { floor: 18000, ref: 46, exp: 2.15, mult: 218, potStep: 0.02, potMaxGap: 20, min: 5000, step: 500 }

/** Fator de idade do valor: jovem até youngMax, pico entre peakFrom e peakTo, cai oldStep por ano depois (piso oldMin). */
export const VALUE_AGE = { youngMax: 1.25, youngStep: 0.03, peakFrom: 24, peakTo: 27, peak: 1.1, oldStep: 0.09, oldMin: 0.4 }

/** Contrato: cai 1 por virada; em 0 o atleta sai de graça. Renovação: luvas = valor x renewFeePerYear x anos. */
export const CONTRACT = { renewYears: 2, veteranAge: 32, veteranRenewYears: 1, maxYears: 5, renewFeePerYear: 0.025, migrationMinYears: 2 }

/** Envelhecimento na virada. Linha: perde OVER a partir de declineFrom e se aposenta em retireAge. Goleiro (GK): campos *GK. */
export const AGING = {
  declineFrom: 31, dropAt33: 2, dropAt35: 3, retireAge: 37,
  declineFromGK: 35, dropGKAt37: 2, dropGKAt40: 3, retireAgeGK: 45
}
