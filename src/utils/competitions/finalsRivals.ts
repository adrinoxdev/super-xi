import type { EcoChampion, SeasonEcoRecord } from '@/types/club'

export interface FinalRival {
  name: string
  power: number
  /** Etiqueta de origem exibida no painel (ex.: 'Campeão da Taça Cacique'). */
  origin: string
}

const make = (c: EcoChampion | null | undefined, origin: string): FinalRival | null =>
  c ? { name: c.name, power: c.power, origin } : null

/**
 * Rival real da Supercopa. Usuário campeão da liga enfrenta o campeão da Taça; campeão da Taça (não usuário)
 * enfrenta o campeão da Série A; campeão das duas enfrenta o vice da Taça. Sem dado: null (o chamador sorteia).
 */
export function supercupRival(
  record: SeasonEcoRecord | null | undefined,
  userWonLeague: boolean,
  userWonCup: boolean,
  cupRunnerUp?: EcoChampion | null
): FinalRival | null {
  if (!record) return null
  if (userWonLeague && userWonCup) return make(cupRunnerUp, 'Vice da Taça Cacique') ?? make(record.serieAChampion, 'Campeão da Série A')
  if (userWonLeague) return make(record.cupChampion, 'Campeão da Taça Cacique')
  if (userWonCup) return make(record.serieAChampion, 'Campeão da Série A')
  return null
}

/** Rival real da Recopa: o campeão gravado da outra copa continental. userTier: 'libertadores' = Ouro. */
export function recopaRival(record: SeasonEcoRecord | null | undefined, userTier: string): FinalRival | null {
  if (!record) return null
  return userTier === 'libertadores'
    ? make(record.prataChampion, 'Campeão da Copa Condor de Prata')
    : make(record.ouroChampion, 'Campeão da Copa Condor de Ouro')
}
