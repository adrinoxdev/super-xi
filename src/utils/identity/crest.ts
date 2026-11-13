import type { CrestOrientation, CrestPattern, CrestShape, LegacyCrestShape } from '@/types/club'

/** Todos os caminhos usam viewBox 0 0 100 120. Formas genéricas, sem emblemas reais. */
export const CREST_VIEWBOX = '0 0 100 120'

export const CREST_SHAPE_PATHS: Record<CrestShape, string> = {
  portugues: 'M8 8 H92 V60 C92 92 70 108 50 116 C30 108 8 92 8 60 Z',
  frances: 'M8 8 H92 V70 C92 98 72 112 50 112 C28 112 8 98 8 70 Z',
  ombros: 'M6 16 Q28 18 50 6 Q72 18 94 16 V64 C94 92 72 108 50 116 C28 108 6 92 6 64 Z',
  brasao: 'M8 8 H36 Q50 20 64 8 H92 V58 Q92 92 50 116 Q8 92 8 58 Z',
  medalhao: 'M6 60 A44 44 0 1 0 94 60 A44 44 0 1 0 6 60 Z',
  oval: 'M12 60 A38 54 0 1 0 88 60 A38 54 0 1 0 12 60 Z',
  losango: 'M50 4 L94 60 L50 116 L6 60 Z',
  coracao:
    'M50 114 C10 82 6 52 6 34 C6 17 20 8 32 8 C42 8 48 14 50 22 C52 14 58 8 68 8 C80 8 94 17 94 34 C94 52 90 82 50 114 Z',
  pergaminho: 'M6 22 Q50 2 94 22 V92 Q50 112 6 92 Z',
  chanfrado: 'M24 8 H76 L92 24 V96 L76 112 H24 L8 96 V24 Z'
}

const LEGACY_SHAPES: Record<LegacyCrestShape, CrestShape> = {
  modern: 'chanfrado',
  classic: 'portugues',
  round: 'medalhao',
  shield: 'brasao',
  pennant: 'coracao'
}

export function normalizeCrestShape(v: unknown): CrestShape {
  if (typeof v === 'string') {
    if (v in CREST_SHAPE_PATHS) return v as CrestShape
    if (v in LEGACY_SHAPES) return LEGACY_SHAPES[v as LegacyCrestShape]
  }
  return 'portugues'
}

const PATTERNS: CrestPattern[] = ['liso', 'listras', 'faixa', 'metade', 'xadrez']
const ORIENTATIONS: CrestOrientation[] = ['vertical', 'horizontal', 'diagonal-esquerda', 'diagonal-direita']

export function normalizeCrestPattern(v: unknown): CrestPattern {
  return PATTERNS.includes(v as CrestPattern) ? (v as CrestPattern) : 'liso'
}
export function normalizeCrestOrientation(v: unknown): CrestOrientation {
  return ORIENTATIONS.includes(v as CrestOrientation) ? (v as CrestOrientation) : 'vertical'
}
export function normalizeCrestStripes(v: unknown): number {
  return v === 3 || v === 5 || v === 7 ? v : 5
}
export function normalizeHex(v: unknown, fallback: string): string {
  return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback
}

export function orientationAngle(o: CrestOrientation): number {
  return o === 'horizontal' ? 90 : o === 'diagonal-esquerda' ? -45 : o === 'diagonal-direita' ? 45 : 0
}

function channels(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]
}

export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function mixHex(a: string, b: string): string {
  const x = channels(a)
  const y = channels(b)
  return '#' + x.map((c, i) => Math.round((c + y[i]) / 2).toString(16).padStart(2, '0')).join('')
}

/** Cor de texto (preto/branco) legível sobre a cor informada. */
export function contrastText(bg: string): string {
  return luminance(bg) > 0.4 ? '#0f172a' : '#ffffff'
}

export interface CrestRect {
  x: number
  y: number
  w: number
  h: number
}

/** Retângulos da cor secundária, no espaço antes da rotação (centro em 50,60). */
export function patternRects(pattern: CrestPattern, stripes: number): CrestRect[] {
  const out: CrestRect[] = []
  if (pattern === 'listras') {
    const w = 100 / stripes
    const k = Math.ceil(80 / w)
    for (let i = -k; i < stripes + k; i++) {
      if (Math.abs(i % 2) === 1) out.push({ x: i * w, y: -100, w, h: 320 })
    }
  } else if (pattern === 'faixa') {
    out.push({ x: 33, y: -100, w: 34, h: 320 })
  } else if (pattern === 'metade') {
    out.push({ x: 50, y: -100, w: 160, h: 320 })
  } else if (pattern === 'xadrez') {
    const n = stripes >= 7 ? 6 : stripes >= 5 ? 4 : 2
    const c = 100 / n
    const k = Math.ceil(80 / c)
    for (let i = -k; i < n + k; i++) {
      for (let j = -k; j < n + k; j++) {
        if (Math.abs((i + j) % 2) === 1) out.push({ x: i * c, y: 10 + j * c, w: c, h: c })
      }
    }
  }
  return out
}

/** Razao de contraste WCAG (1 a 21) entre duas cores hex. */
export function contrastRatio(a: string, b: string): number {
  const x = luminance(a)
  const y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

/** Distancia de cor simples (redmean, 0 a ~765). Abaixo de ~110 as cores parecem a mesma. */
export function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = channels(a)
  const [r2, g2, b2] = channels(b)
  const rm = (r1 + r2) / 2
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db)
}
