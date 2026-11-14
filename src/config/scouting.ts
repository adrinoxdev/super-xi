import type { ScoutMissionType } from '@/types'

export const SCOUTING_LEVELS: Record<number, {
  slots: number
  maxOvr: number
  accuracy: number
  gemChance: number
  timeMult: number
}> = {
  // maxOvr sobe 3 por nível: relatórios saem em [maxOvr-12, maxOvr] (Internacional soma +3/+4).
  // Atletas de 85+ só aparecem a partir do nível 9 e só em missão Internacional.
  1: { slots: 1, maxOvr: 61, accuracy: 0.60, gemChance: 0.06, timeMult: 1.0 },
  2: { slots: 1, maxOvr: 64, accuracy: 0.65, gemChance: 0.08, timeMult: 0.98 },
  3: { slots: 2, maxOvr: 67, accuracy: 0.70, gemChance: 0.10, timeMult: 0.96 },
  4: { slots: 2, maxOvr: 70, accuracy: 0.75, gemChance: 0.12, timeMult: 0.93 },
  5: { slots: 2, maxOvr: 73, accuracy: 0.80, gemChance: 0.15, timeMult: 0.90 },
  6: { slots: 3, maxOvr: 76, accuracy: 0.84, gemChance: 0.18, timeMult: 0.86 },
  7: { slots: 3, maxOvr: 79, accuracy: 0.88, gemChance: 0.21, timeMult: 0.82 },
  8: { slots: 3, maxOvr: 82, accuracy: 0.91, gemChance: 0.25, timeMult: 0.78 },
  9: { slots: 4, maxOvr: 85, accuracy: 0.94, gemChance: 0.29, timeMult: 0.74 },
  10: { slots: 4, maxOvr: 88, accuracy: 0.97, gemChance: 0.33, timeMult: 0.70 }
}

/** Peneiras na base permitidas por temporada. */
export const MAX_TRYOUTS_PER_SEASON = 3

/**
 * Categorias de base. Oferta curta de propósito: 1 promessa grátis por temporada e peneiras mais fracas.
 * Promovido da base só pode ser vendido ou emprestado a partir de `lockSeasons` temporadas depois (evita farm de revenda).
 */
export const YOUTH = {
  batchOvr: [45, 53] as const,
  batchGemChance: 0.3,
  tryoutOvr: [45, 52] as const,
  tryoutGemChance: 0.25,
  lockSeasons: 2
}

export const SCOUT_MISSIONS: Array<{
  type: ScoutMissionType
  title: string
  cost: number
  durationSec: number
  minLevel: number
  description: string
}> = [
  {
    type: 'local',
    title: 'Scouting Local',
    cost: 8000,
    durationSec: 1800,
    minLevel: 1,
    description: 'Busca rápida na região. Baixo custo para compor elenco.'
  },
  {
    type: 'position',
    title: 'Por Posição',
    cost: 15000,
    durationSec: 7200,
    minLevel: 1,
    description: 'Procura atletas só da posição escolhida abaixo.'
  },
  {
    type: 'youth',
    title: 'Base',
    cost: 18000,
    durationSec: 10800,
    minLevel: 1,
    description: 'Promessas jovens com alto potencial de evolução.'
  },
  {
    type: 'national',
    title: 'Scouting Nacional',
    cost: 36000,
    durationSec: 21600,
    minLevel: 1,
    description: 'Dois talentos das divisões nacionais, com qualidade mais consistente que as buscas básicas.'
  },
  {
    type: 'international',
    title: 'Internacional',
    cost: 55000,
    durationSec: 43200,
    minLevel: 6,
    description: 'Craques estrangeiros com alta chance de Joias Raras.'
  }
]

/**
 * Faixa de OVR dos relatórios de cada missão, relativa ao OVR máximo do nível de Scouting (M): de M+lo a M+hi.
 * Fonte única: o sorteio (scouting.ts) e o card da missão leem daqui. Tier mais caro e demorado entrega qualidade maior.
 */
export const SCOUT_OVR_OFFSETS: Record<ScoutMissionType, [number, number]> = {
  local: [-16, -3],
  position: [-12, 0],
  youth: [-12, 0],
  national: [-7, 2],
  international: [-3, 4]
}

/** Relatórios gerados por missão. */
export const SCOUT_REPORT_COUNT: Record<ScoutMissionType, number> = {
  local: 1,
  position: 1,
  youth: 1,
  national: 2,
  international: 2
}
