/** Receita por jogo depende da série; o nível da instalação acima do teto da série não rende mais. */
export const SERIE_ECONOMY: Record<number, { ticketBase: number; sponsorBase: number; levelCap: number; debtLimit: number }> = {
  4: { ticketBase: 8650, sponsorBase: 8650, levelCap: 3, debtLimit: 150000 },
  3: { ticketBase: 10520, sponsorBase: 10520, levelCap: 5, debtLimit: 250000 },
  2: { ticketBase: 13690, sponsorBase: 13690, levelCap: 7, debtLimit: 400000 },
  1: { ticketBase: 16600, sponsorBase: 16600, levelCap: 10, debtLimit: 600000 }
}

export const ECONOMY = {
  facilityStep: 0.12, awayTicketShare: 0.4, winBonusShare: 0.5, drawBonusShare: 0.2,
  debtInterestPerMatch: 0.01, forcedSaleShare: 0.7, startBudget: 150000, maintenanceRate: 0.0015
}

/** Salário por jogo: base x 2^((OVER - refOvr) / doubleEvery), arredondado a 'step', mínimo 'min'. */
export const WAGE = { base: 1000, refOvr: 49, doubleEvery: 21, min: 500, step: 25 }

/** Fator da instalação de receita: 1 + step x (min(nível, teto da série) - 1). */
export function facilityIncomeFactor(level: number, division: number): number {
  const cap = (SERIE_ECONOMY[division] ?? SERIE_ECONOMY[4]).levelCap
  return 1 + ECONOMY.facilityStep * (Math.min(level, cap) - 1)
}

/** Renda offline: fração da renda por jogo (bilheteria + patrocínio) paga por hora de ausência. Sem desconto de salários/juros. */
export const OFFLINE = { ratioPerHour: 0.06, baseCapHours: 8, capHoursPerFinanceLevel: 1, maxCapHours: 16, minMinutes: 10 }

/** Horas máximas acumuladas offline: base + bônus por nível de finanças acima do 1, limitado ao máximo. */
export function offlineCapHours(financeLevel: number): number {
  return Math.min(OFFLINE.maxCapHours, OFFLINE.baseCapHours + Math.max(0, financeLevel - 1) * OFFLINE.capHoursPerFinanceLevel)
}

/** Fórmula pura: horas (com teto) e valor; null abaixo de minMinutes. Relógio voltado = 0 ms ausente. */
export function calcOfflineReward(
  absentMs: number,
  incomePerMatch: number,
  financeLevel: number
): { hours: number; amount: number; capped: boolean } | null {
  const ms = Math.max(0, absentMs)
  if (ms < OFFLINE.minMinutes * 60000) return null
  const cap = offlineCapHours(financeLevel)
  const rawHours = ms / 3600000
  const hours = Math.min(rawHours, cap)
  return { hours, amount: Math.round(incomePerMatch * OFFLINE.ratioPerHour * hours), capped: rawHours > cap }
}
