import { FRIENDLIES } from '@/config/friendlies'

export interface TokenState {
  tokens: number
  tokenTickAt: number
}

/**
 * Recarga por tempo real (mesmo padrão de squad.regenStamina): soma só fichas inteiras e guarda o resto de tempo em
 * tokenTickAt. Cheio, o relógio acompanha `now` para a próxima ficha não nascer "adiantada". Relógio do sistema voltado
 * não dá ganho negativo.
 */
export function regenTokens(s: TokenState, now: number): TokenState {
  const { max, msPerToken } = FRIENDLIES.tokens
  if (s.tokens >= max) return { tokens: max, tokenTickAt: now }
  const n = Math.floor((now - s.tokenTickAt) / msPerToken)
  if (n <= 0) return { tokens: s.tokens, tokenTickAt: now < s.tokenTickAt ? now : s.tokenTickAt }
  const tokens = Math.min(max, s.tokens + n)
  return { tokens, tokenTickAt: tokens >= max ? now : s.tokenTickAt + n * msPerToken }
}

/** Gasta 1 ficha. Com o estoque cheio, a contagem da próxima começa agora. Sem ficha: null. */
export function spendToken(s: TokenState, now: number): TokenState | null {
  if (s.tokens <= 0) return null
  return { tokens: s.tokens - 1, tokenTickAt: s.tokens >= FRIENDLIES.tokens.max ? now : s.tokenTickAt }
}

/** Milissegundos até a próxima ficha (0 com estoque cheio). */
export function msToNextToken(s: TokenState, now: number): number {
  if (s.tokens >= FRIENDLIES.tokens.max) return 0
  return Math.max(0, s.tokenTickAt + FRIENDLIES.tokens.msPerToken - now)
}

/** "mm:ss" para contadores de ficha (segundos arredondados para cima). */
export function formatTokenCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
