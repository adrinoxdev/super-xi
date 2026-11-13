import type { Player, PlayerPosition } from '../types/player'
import type { FormationName } from '../types/match'
import { FORMATIONS, INJURY } from '@/config'
import { clamp } from './random'

export interface TeamStrengthBreakdown {
  attack: number
  midfield: number
  defense: number
  /** OVER do time arredondado (exibição). */
  total: number
  /** OVER do time sem arredondar (motor de partida). */
  rating: number
}

type PositionGroup = 'GK' | 'DEF' | 'MID' | 'ATT'
const POSITION_GROUP: Record<PlayerPosition, PositionGroup> = {
  GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LW: 'ATT', RW: 'ATT', ST: 'ATT'
}

/** Debuff de OVR por jogar fora da posição: mesma linha -4, linhas vizinhas -8, defesa x ataque -14, goleiro -30. */
export function positionPenalty(playerPos: PlayerPosition, slotRole: PlayerPosition): number {
  if (playerPos === slotRole) return 0
  const a = POSITION_GROUP[playerPos]
  const b = POSITION_GROUP[slotRole]
  if (a === 'GK' || b === 'GK') return -30
  if (a === b) return -4
  return (a === 'DEF' && b === 'ATT') || (a === 'ATT' && b === 'DEF') ? -14 : -8
}

export function getEffectiveOvr(player: Player | null, slotRole: PlayerPosition): number {
  if (!player) return 0
  const posPenalty = positionPenalty(player.position, slotRole)
  const fatiguePenalty = (player.stamina ?? 100) < 60 ? -3 : 0
  const injuryPenalty = player.injury ? -INJURY.playingInjuredPenalty : 0
  return clamp(player.overall + posPenalty + fatiguePenalty + injuryPenalty, 15, 99)
}

// Pesos por setor de cada função (os mesmos de antes). O resultado agora é média ponderada: mesma escala do OVER do atleta.
const SECTOR_WEIGHTS: Record<'atk' | 'mid' | 'def', { atk: number; mid: number; def: number }> = {
  atk: { atk: 1.15, mid: 0.25, def: 0 },
  mid: { atk: 0.35, mid: 1.1, def: 0.35 },
  def: { atk: 0, mid: 0.2, def: 1.15 }
}

export function calculateTeamStrength(
  slots: Array<{ player: Player | null; role: PlayerPosition }>
): TeamStrengthBreakdown {
  const sum = { atk: 0, mid: 0, def: 0 }
  const wsum = { atk: 0, mid: 0, def: 0 }
  for (const slot of slots) {
    const group = ['ST', 'LW', 'RW'].includes(slot.role) ? 'atk' : ['CAM', 'CM', 'CDM'].includes(slot.role) ? 'mid' : 'def'
    const w = SECTOR_WEIGHTS[group]
    const eff = slot.player ? getEffectiveOvr(slot.player, slot.role) : 0 // vaga vazia conta como 0
    for (const k of ['atk', 'mid', 'def'] as const) {
      sum[k] += eff * w[k]
      wsum[k] += w[k]
    }
  }
  const avg = (k: 'atk' | 'mid' | 'def') => (wsum[k] ? sum[k] / wsum[k] : 0)
  const totalW = wsum.atk + wsum.mid + wsum.def
  const rating = totalW ? (sum.atk + sum.mid + sum.def) / totalW : 0
  return {
    attack: Math.round(avg('atk')),
    midfield: Math.round(avg('mid')),
    defense: Math.round(avg('def')),
    total: Math.round(rating),
    rating
  }
}

export function buildFormationSlots(formation: FormationName, starters: (Player | null)[]) {
  const layout = FORMATIONS[formation] || FORMATIONS['4-3-3']
  return layout.map((slot, index) => ({
    ...slot,
    player: starters[index] ?? null
  }))
}

export function pickBestLineup(players: Player[], formation: FormationName): string[] {
  const layout = FORMATIONS[formation] || FORMATIONS['4-3-3']
  const available = players.filter((p) => !p.isLoanedOut)
  const picked: string[] = []
  for (const slot of layout) {
    const best = available
      .filter((p) => !picked.includes(p.id))
      .sort((a, b) => getEffectiveOvr(b, slot.role) - getEffectiveOvr(a, slot.role))[0]
    if (best) picked.push(best.id)
  }
  return picked
}
