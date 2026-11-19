import type { Player } from '@/types/player'
import type { FormationName } from '@/types/match'
import { FORMATIONS } from '@/config'
import { buildFormationSlots, calculateTeamStrength, pickBestLineup, type StrengthOpts } from '@/utils/match/calculateTeamStrength'
import { isSuspendedFor } from '@/utils/player/suspension'

// Amistoso: todos jogam como se tivessem energia 100 (spec §2.5).
const FRESH: StrengthOpts = { ignoreFatigue: true }

/** Pode jogar amistoso: sem lesão, sem suspensão em nenhuma competição e não emprestado (spec §2.4). */
export function isFriendlyEligible(p: Player): boolean {
  return !p.injury && !p.isLoanedOut && !isSuspendedFor(p, 'friendly')
}

export interface FriendlyStrength {
  /** OVER da escalação atual com energia 100, sem arredondar (força real em campo). */
  current: number
  /** OVER da melhor escalação elegível com energia 100, entre todas as formações, sem arredondar. */
  best: number
  /** Formação da melhor escalação (null sem nenhum elegível). */
  bestFormation: FormationName | null
  /** OVER efetivo do amistoso: max(current, best). Rival, prêmio e fama saem dele (spec §6). */
  over: number
}

function ratingOf(byId: Map<string, Player>, formation: FormationName, ids: string[]): number {
  const starters = ids.map((id) => byId.get(id) ?? null)
  return calculateTeamStrength(buildFormationSlots(formation, starters), undefined, FRESH).rating
}

/**
 * OVER efetivo do amistoso (spec §6). O piso da melhor escalação elegível fecha a brecha de apitar com o time mal
 * escalado (rival fraco fixado) e corrigir ao vivo com "Reorganizar" ou trocas. Todas as formações entram porque o
 * "Reorganizar" também troca de formação. O max cobre a escalação montada à mão que supera a heurística gulosa.
 */
export function friendlyStrengthOf(players: Player[], formation: FormationName, starterIds: string[]): FriendlyStrength {
  const byId = new Map(players.map((p) => [p.id, p] as const))
  const current = ratingOf(byId, formation, starterIds)
  const eligible = players.filter(isFriendlyEligible)
  let best = 0
  let bestFormation: FormationName | null = null
  if (eligible.length) {
    for (const f of Object.keys(FORMATIONS) as FormationName[]) {
      const rating = ratingOf(byId, f, pickBestLineup(eligible, f, undefined, FRESH))
      if (rating > best + 1e-9) {
        best = rating
        bestFormation = f
      }
    }
  }
  return { current, best, bestFormation, over: Math.max(current, best) }
}
