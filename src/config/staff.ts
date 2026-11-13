import type { StaffKey } from '@/types'

// Contratos da comissão técnica: duram 7 dias reais e podem ser renovados na última janela.
export const STAFF_CONTRACT_DAYS = 7
export const STAFF_CONTRACT_MS = STAFF_CONTRACT_DAYS * 24 * 60 * 60 * 1000
export const STAFF_RENEW_WINDOW_MS = 24 * 60 * 60 * 1000

// Bônus da comissão (antes: +0,15 evolução, desgaste 8 e recuperação +5, +0,10 jóia, +4 base).
export const STAFF_BONUS = {
  assistantEvolution: 0.3,
  fitnessDrain: 6,
  fitnessDrainDefault: 11,
  fitnessRecovery: 10,
  scoutGemChance: 0.15,
  scoutYouthOvr: 5,
  financeIncome: 0.1,
  analystAccuracy: 0.1,
  analystSaleBonus: 0.1,
  youthCoachEvolution: 0.25,
  youthCoachMaxAge: 21,
  physioChanceMult: 0.6,
  physioDurationMult: 0.67
}

// Multiplicador do preço dos contratos por série (chave = divisão: 4 = D ... 1 = A), na proporção da receita de jogos
// por temporada (285k, 682k, 1,48M, 2,1M). Mantém o retorno do Diretor Financeiro e o peso da comissão iguais em toda série.
export const STAFF_SERIES_COST_MULT: Record<number, number> = { 4: 1, 3: 2.4, 2: 5.2, 1: 7.4 }

export function staffContractCost(baseCost: number, division: number): number {
  return Math.round((baseCost * (STAFF_SERIES_COST_MULT[division] ?? 1)) / 1000) * 1000
}

// cost = valor base de cada contrato de 7 dias na série D (multiplicado por STAFF_SERIES_COST_MULT nas séries acima).
export const STAFF_CATALOG: Array<{ key: StaffKey; title: string; cost: number; description: string }> = [
  { key: 'assistantCoach', title: 'Auxiliar Técnico', cost: 90000, description: '+30% na evolução técnica individual após as partidas.' },
  { key: 'fitnessCoach', title: 'Preparador Físico', cost: 80000, description: '-45% de desgaste físico nos 90 min e recuperação muito mais rápida.' },
  { key: 'chiefScout', title: 'Olheiro-Chefe', cost: 120000, description: '+15% de chance de Joias Raras e promessas bem melhores na Base.' },
  { key: 'financeDirector', title: 'Diretor Financeiro', cost: 110000, description: '+10% na receita de bilheteria e patrocínio em cada partida.' },
  { key: 'marketAnalyst', title: 'Analista de Mercado', cost: 85000, description: 'Relatórios de scouting 10 pontos mais precisos e +10% no valor de venda de atletas.' },
  { key: 'youthCoach', title: 'Treinador de Base', cost: 90000, description: '+25% na evolução de atletas até 21 anos após as partidas.' },
  { key: 'physio', title: 'Fisioterapeuta', cost: 85000, description: '-40% de chance de lesão e lesões 1/3 mais curtas.' }
]
