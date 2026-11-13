import type { FormationName, PlayerPosition, TacticalMentality } from '@/types'

export const FORMATIONS: Record<FormationName, Array<{ role: PlayerPosition; x: number; y: number }>> = {
  '4-3-3': [
    { role: 'LW', x: 18, y: 20 }, { role: 'ST', x: 50, y: 14 }, { role: 'RW', x: 82, y: 20 },
    { role: 'CM', x: 25, y: 44 }, { role: 'CDM', x: 50, y: 50 }, { role: 'CM', x: 75, y: 44 },
    { role: 'LB', x: 15, y: 72 }, { role: 'CB', x: 38, y: 75 }, { role: 'CB', x: 62, y: 75 }, { role: 'RB', x: 85, y: 72 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '4-2-3-1': [
    { role: 'ST', x: 50, y: 14 },
    { role: 'LW', x: 18, y: 31 }, { role: 'CAM', x: 50, y: 31 }, { role: 'RW', x: 82, y: 31 },
    { role: 'CDM', x: 35, y: 51 }, { role: 'CDM', x: 65, y: 51 },
    { role: 'LB', x: 15, y: 73 }, { role: 'CB', x: 38, y: 76 }, { role: 'CB', x: 62, y: 76 }, { role: 'RB', x: 85, y: 73 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '4-4-2': [
    { role: 'ST', x: 35, y: 16 }, { role: 'ST', x: 65, y: 16 },
    { role: 'LW', x: 16, y: 44 }, { role: 'CM', x: 38, y: 46 }, { role: 'CM', x: 62, y: 46 }, { role: 'RW', x: 84, y: 44 },
    { role: 'LB', x: 15, y: 73 }, { role: 'CB', x: 38, y: 76 }, { role: 'CB', x: 62, y: 76 }, { role: 'RB', x: 85, y: 73 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '4-1-4-1': [
    { role: 'ST', x: 50, y: 14 },
    { role: 'LW', x: 15, y: 34 }, { role: 'CM', x: 38, y: 36 }, { role: 'CM', x: 62, y: 36 }, { role: 'RW', x: 85, y: 34 },
    { role: 'CDM', x: 50, y: 54 },
    { role: 'LB', x: 15, y: 74 }, { role: 'CB', x: 38, y: 77 }, { role: 'CB', x: 62, y: 77 }, { role: 'RB', x: 85, y: 74 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '3-4-3': [
    { role: 'LW', x: 18, y: 20 }, { role: 'ST', x: 50, y: 14 }, { role: 'RW', x: 82, y: 20 },
    { role: 'LW', x: 15, y: 46 }, { role: 'CM', x: 38, y: 48 }, { role: 'CM', x: 62, y: 48 }, { role: 'RW', x: 85, y: 46 },
    { role: 'CB', x: 24, y: 75 }, { role: 'CB', x: 50, y: 77 }, { role: 'CB', x: 76, y: 75 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '4-2-2-2': [
    { role: 'ST', x: 35, y: 15 }, { role: 'ST', x: 65, y: 15 },
    { role: 'CAM', x: 26, y: 34 }, { role: 'CAM', x: 74, y: 34 },
    { role: 'CDM', x: 36, y: 53 }, { role: 'CDM', x: 64, y: 53 },
    { role: 'LB', x: 15, y: 74 }, { role: 'CB', x: 38, y: 77 }, { role: 'CB', x: 62, y: 77 }, { role: 'RB', x: 85, y: 74 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '4-1-2-1-2': [
    { role: 'ST', x: 36, y: 15 }, { role: 'ST', x: 64, y: 15 },
    { role: 'CAM', x: 50, y: 31 },
    { role: 'CM', x: 28, y: 45 }, { role: 'CM', x: 72, y: 45 },
    { role: 'CDM', x: 50, y: 58 },
    { role: 'LB', x: 15, y: 74 }, { role: 'CB', x: 38, y: 77 }, { role: 'CB', x: 62, y: 77 }, { role: 'RB', x: 85, y: 74 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '3-5-2': [
    { role: 'ST', x: 35, y: 16 }, { role: 'ST', x: 65, y: 16 },
    { role: 'CAM', x: 50, y: 34 },
    { role: 'LW', x: 14, y: 48 }, { role: 'CDM', x: 34, y: 52 }, { role: 'CDM', x: 66, y: 52 }, { role: 'RW', x: 86, y: 48 },
    { role: 'CB', x: 24, y: 75 }, { role: 'CB', x: 50, y: 77 }, { role: 'CB', x: 76, y: 75 },
    { role: 'GK', x: 50, y: 91 }
  ],
  '5-3-2': [
    { role: 'ST', x: 36, y: 17 }, { role: 'ST', x: 64, y: 17 },
    { role: 'CM', x: 28, y: 45 }, { role: 'CDM', x: 50, y: 49 }, { role: 'CM', x: 72, y: 45 },
    { role: 'LB', x: 12, y: 68 }, { role: 'CB', x: 31, y: 76 }, { role: 'CB', x: 50, y: 78 }, { role: 'CB', x: 69, y: 76 }, { role: 'RB', x: 88, y: 68 },
    { role: 'GK', x: 50, y: 91 }
  ]
}

export const MENTALITIES: Record<TacticalMentality, { label: string; atkMod: number; defMod: number }> = {
  very_defensive: { label: 'Muito Defensiva', atkMod: 0.85, defMod: 1.15 },
  defensive: { label: 'Defensiva', atkMod: 0.94, defMod: 1.08 },
  balanced: { label: 'Equilibrada', atkMod: 1.0, defMod: 1.0 },
  offensive: { label: 'Ofensiva', atkMod: 1.09, defMod: 0.93 },
  very_offensive: { label: 'Muito Ofensiva', atkMod: 1.18, defMod: 0.84 }
}
