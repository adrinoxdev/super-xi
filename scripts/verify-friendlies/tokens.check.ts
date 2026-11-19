import { createChecker } from './assert'
import { formatTokenCountdown, msToNextToken, regenTokens, spendToken } from '@/utils/friendlies/tokens'

const MIN = 60 * 1000

export function run(): string[] {
  const c = createChecker()
  c.eq('30 min parado com 7: enche e zera o relogio', regenTokens({ tokens: 7, tokenTickAt: 0 }, 30 * MIN), { tokens: 10, tokenTickAt: 30 * MIN })
  c.eq('13 min com 5: +2 e guarda o resto', regenTokens({ tokens: 5, tokenTickAt: 0 }, 13 * MIN), { tokens: 7, tokenTickAt: 12 * MIN })
  c.eq('menos de 6 min: nada muda', regenTokens({ tokens: 5, tokenTickAt: 0 }, 5 * MIN), { tokens: 5, tokenTickAt: 0 })
  c.eq('relogio voltado: tokenTickAt = now', regenTokens({ tokens: 5, tokenTickAt: 1000 }, 500), { tokens: 5, tokenTickAt: 500 })
  c.eq('cheio: tokenTickAt = now', regenTokens({ tokens: 10, tokenTickAt: 0 }, 999), { tokens: 10, tokenTickAt: 999 })
  c.eq('acima do maximo volta a 10', regenTokens({ tokens: 14, tokenTickAt: 0 }, 50), { tokens: 10, tokenTickAt: 50 })
  c.eq('gastar com 10 reinicia o relogio', spendToken({ tokens: 10, tokenTickAt: 0 }, 5000), { tokens: 9, tokenTickAt: 5000 })
  c.eq('gastar com 4 mantem o relogio', spendToken({ tokens: 4, tokenTickAt: 100 }, 5000), { tokens: 3, tokenTickAt: 100 })
  c.eq('sem ficha: null', spendToken({ tokens: 0, tokenTickAt: 0 }, 1), null)
  c.eq('cheio: proxima em 0', msToNextToken({ tokens: 10, tokenTickAt: 0 }, 123), 0)
  c.eq('proxima ficha', msToNextToken({ tokens: 3, tokenTickAt: 0 }, MIN), 5 * MIN)
  c.eq('proxima nunca negativa', msToNextToken({ tokens: 3, tokenTickAt: 0 }, 99 * MIN), 0)
  c.eq('mm:ss 5 min', formatTokenCountdown(5 * MIN), '05:00')
  c.eq('mm:ss arredonda para cima', formatTokenCountdown(61001), '01:02')
  c.eq('mm:ss zero', formatTokenCountdown(0), '00:00')

  // Saneamento (save editado ou corrompido).
  c.eq('fichas NaN: estoque cheio', regenTokens({ tokens: Number.NaN, tokenTickAt: 0 }, 100), { tokens: 10, tokenTickAt: 100 })
  c.eq('fichas undefined: estoque cheio', regenTokens({ tokens: undefined as unknown as number, tokenTickAt: 0 }, 100), { tokens: 10, tokenTickAt: 100 })
  c.eq('fichas fracionadas: arredonda para baixo', regenTokens({ tokens: 7.9, tokenTickAt: 0 }, MIN), { tokens: 7, tokenTickAt: 0 })
  c.eq('relogio NaN: comeca agora', regenTokens({ tokens: 5, tokenTickAt: Number.NaN }, 13 * MIN), { tokens: 5, tokenTickAt: 13 * MIN })
  c.eq('now NaN: nada avanca', regenTokens({ tokens: 5, tokenTickAt: 0 }, Number.NaN), { tokens: 5, tokenTickAt: 0 })
  c.eq('gastar com fichas NaN', spendToken({ tokens: Number.NaN, tokenTickAt: 0 }, 5000), { tokens: 9, tokenTickAt: 5000 })
  c.eq('proxima com relogio NaN', msToNextToken({ tokens: 3, tokenTickAt: Number.NaN }, MIN), 6 * MIN)
  c.eq('proxima com now NaN', msToNextToken({ tokens: 3, tokenTickAt: 0 }, Number.NaN), 0)
  c.eq('mm:ss com NaN', formatTokenCountdown(Number.NaN), '00:00')
  return c.fails
}
