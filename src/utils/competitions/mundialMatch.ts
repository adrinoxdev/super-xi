import type { MundialState } from '@/types/competitions'

export const MUNDIAL_NAME = 'Copa dos Continentes'

/** Rótulo da partida do usuário: "Grupo C, 1ª rodada" nos grupos; no mata-mata, o nome da fase vindo do store. */
export function mundialMatchLabel(m: Pick<MundialState, 'stage' | 'userGroupId' | 'groupRound'>, knockoutLabel: string): string {
  if (m.stage === 'GROUPS') return `${MUNDIAL_NAME} • Grupo ${m.userGroupId}, ${m.groupRound}ª rodada`
  return `${MUNDIAL_NAME} • ${knockoutLabel}`
}

/** Pênaltis só no mata-mata (nos grupos o empate vale 1 ponto). */
export function mundialNeedsShootout(m: Pick<MundialState, 'stage'>, u: number, o: number): boolean {
  return u === o && m.stage !== 'GROUPS'
}
