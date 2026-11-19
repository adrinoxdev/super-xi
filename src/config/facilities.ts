import type { ClubUpgrades } from '@/types/club'

// Nível máximo de cada instalação.
export const FACILITY_MAX_LEVEL: Record<keyof ClubUpgrades, number> = {
  scoutingLevel: 10,
  squadCapacityLevel: 10,
  trainingCenterLevel: 5,
  medicalCenterLevel: 5,
  stadiumLevel: 10,
  financeLevel: 10
}

// Custo para subir do nível indicado pelo índice (índice 1 = sair do nível 1). O tamanho do array é o nível máximo.
export const UPGRADE_COSTS: Record<keyof ClubUpgrades, number[]> = {
  scoutingLevel: [0, 70000, 90000, 125000, 175000, 250000, 350000, 750000, 1050000, 1450000],
  squadCapacityLevel: [0, 15000, 23000, 33000, 47000, 68000, 94000, 130000, 178000, 240000],
  trainingCenterLevel: [0, 75000, 145000, 265000, 950000],
  medicalCenterLevel: [0, 70000, 130000, 235000, 900000],
  stadiumLevel: [0, 58000, 80000, 105000, 130000, 175000, 500000, 720000, 1000000, 1450000],
  financeLevel: [0, 58000, 80000, 105000, 130000, 175000, 500000, 720000, 1000000, 1450000]
}

export const FACILITIES_LIST: Array<{ key: keyof ClubUpgrades; title: string; description: string }> = [
  { key: 'scoutingLevel', title: 'Departamento de Scouting', description: 'Libera mais slots de missão, precisão e Joias Raras.' },
  { key: 'squadCapacityLevel', title: 'Alojamento & Elenco', description: 'Define o limite de atletas do elenco (de 14 a 25). Cada atleta extra paga salário a cada jogo.' },
  { key: 'trainingCenterLevel', title: 'Centro de Treinamento', description: 'Acelera a evolução dos atributos após cada jogo.' },
  { key: 'medicalCenterLevel', title: 'Departamento Médico', description: 'Acelera a recuperação de energia entre as partidas e reduz a chance e a duração das lesões.' },
  { key: 'stadiumLevel', title: 'Estádio & Sócios', description: 'Aumenta a receita fixa de bilheteria em cada partida. Rende conforme a série (teto por série). Cada nível soma manutenção por jogo.' },
  { key: 'financeLevel', title: 'Marketing & Finanças', description: 'Aumenta o valor fixo da cota de patrocínio por jogo. Rende conforme a série (teto por série). Cada nível soma manutenção por jogo.' }
]
