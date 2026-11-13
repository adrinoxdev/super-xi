import type { Player } from '../types'
import { POS_BR_MAP, TRANSFER_LABELS } from './constants'
import { clamp } from './random'

export function formatCurrency(val: number | null | undefined): string {
  return 'R$ ' + (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatPosBR(pos: string): string {
  return POS_BR_MAP[pos] || pos
}

export function formatTransferLabel(type: string): string {
  return TRANSFER_LABELS[type] || type
}

export function getStatBarPct(a: number, b: number): number {
  const total = a + b
  if (total === 0) return 50
  return clamp(Math.round((a / total) * 100), 10, 90)
}

export function formatPitchStarterName(player: Player | null | undefined, starters: Player[]): string {
  if (!player || !player.name) return 'Vazio'
  const parts = player.name.trim().split(' ')
  if (parts.length < 2) return player.name
  const surname = parts[parts.length - 1]
  const starterSurnames = starters
    .filter((p) => p && p.name)
    .map((p) => {
      const sp = p.name.trim().split(' ')
      return sp[sp.length - 1]
    })
  const dupCount = starterSurnames.filter((sn) => sn === surname).length
  if (dupCount > 1) return parts[0][0] + '. ' + surname
  return surname
}
