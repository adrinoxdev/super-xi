import { FRIENDLIES } from '@/config/friendlies'
import { clamp } from '@/utils/core/random'

export interface TokenState {
  tokens: number
  tokenTickAt: number
}

/**
 * Saneia um estado vindo de fora (save editado, NaN, undefined): fichas inválidas = estoque cheio (mesmo padrão do
 * fromSave, onde initial = max); fichas finitas viram inteiro em [0, max]; relógio inválido = now (ou 0 se now também for).
 */
function clean(s: TokenState, now: number): TokenState {
  const { max } = FRIENDLIES.tokens
  return {
    tokens: Number.isFinite(s.tokens) ? clamp(Math.floor(s.tokens), 0, max) : max,
    tokenTickAt: Number.isFinite(s.tokenTickAt) ? s.tokenTickAt : Number.isFinite(now) ? now : 0
  }
}

/**
 * Recarga por tempo real (mesmo padrão de squad.regenStamina): soma só fichas inteiras e guarda o resto de tempo em
 * tokenTickAt. Cheio, o relógio acompanha `now` para a próxima ficha não nascer "adiantada". Relógio do sistema voltado
 * não dá ganho negativo. `now` inválido não avança nada.
 */
export function regenTokens(s: TokenState, now: number): TokenState {
  const { max, msPerToken } = FRIENDLIES.tokens
  const c = clean(s, now)
  if (!Number.isFinite(now)) return c
  if (c.tokens >= max) return { tokens: max, tokenTickAt: now }
  const n = Math.floor((now - c.tokenTickAt) / msPerToken)
  if (n <= 0) return { tokens: c.tokens, tokenTickAt: now < c.tokenTickAt ? now : c.tokenTickAt }
  const tokens = Math.min(max, c.tokens + n)
  return { tokens, tokenTickAt: tokens >= max ? now : c.tokenTickAt + n * msPerToken }
}

/** Gasta 1 ficha. Com o estoque cheio, a contagem da próxima começa agora. Sem ficha: null. */
export function spendToken(s: TokenState, now: number): TokenState | null {
  const c = clean(s, now)
  if (c.tokens <= 0) return null
  const restart = c.tokens >= FRIENDLIES.tokens.max && Number.isFinite(now)
  return { tokens: c.tokens - 1, tokenTickAt: restart ? now : c.tokenTickAt }
}

/** Milissegundos até a próxima ficha (0 com estoque cheio ou `now` inválido). */
export function msToNextToken(s: TokenState, now: number): number {
  const c = clean(s, now)
  if (c.tokens >= FRIENDLIES.tokens.max || !Number.isFinite(now)) return 0
  return Math.max(0, c.tokenTickAt + FRIENDLIES.tokens.msPerToken - now)
}

/** "mm:ss" para contadores de ficha (segundos arredondados para cima). */
export function formatTokenCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil((Number.isFinite(ms) ? ms : 0) / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
