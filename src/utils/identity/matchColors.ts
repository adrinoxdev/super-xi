import type { TeamIdentity } from '@/types/team'
import { colorDistance, contrastRatio } from '@/utils/identity/crest'

const INK = '#F1F5F9'
const CARD = '#0F2238'
const MIN_CONTRAST = 3
const MIN_DISTANCE = 110

export interface MatchColors {
  user: string
  opp: string
  /** Parte restante da barra (mostra o lado do adversario). */
  track: string
}

/**
 * Cores do painel de estatisticas. Prioriza a cor primaria de cada time; o usuario sempre
 * mantem a primaria. O adversario cai para a secundaria e depois para o tom claro (INK)
 * quando a primaria tem contraste < 3:1 com o cartao ou e parecida com a do usuario.
 */
export function pickMatchColors(
  userIdentity: Pick<TeamIdentity, 'primaryColor'>,
  oppIdentity: Pick<TeamIdentity, 'primaryColor' | 'secondaryColor'>
): MatchColors {
  const user = userIdentity.primaryColor
  const ok = (c: string) => contrastRatio(c, CARD) >= MIN_CONTRAST && colorDistance(c, user) >= MIN_DISTANCE
  const opp = [oppIdentity.primaryColor, oppIdentity.secondaryColor, INK].find(ok) ?? INK
  return { user, opp, track: opp }
}
