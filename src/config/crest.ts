import type { CrestOrientation, CrestPattern, CrestShape } from '@/types'

export const CREST_SHAPES: Array<{ id: CrestShape; label: string }> = [
  { id: 'portugues', label: 'Português' },
  { id: 'frances', label: 'Francês' },
  { id: 'ombros', label: 'Ombros' },
  { id: 'brasao', label: 'Brasão' },
  { id: 'medalhao', label: 'Medalhão' },
  { id: 'oval', label: 'Oval' },
  { id: 'losango', label: 'Losango' },
  { id: 'coracao', label: 'Pontudo' },
  { id: 'pergaminho', label: 'Faixa curva' },
  { id: 'chanfrado', label: 'Chanfrado' }
]

export const CREST_PATTERNS: Array<{ id: CrestPattern; label: string }> = [
  { id: 'liso', label: 'Liso' },
  { id: 'listras', label: 'Listras' },
  { id: 'faixa', label: 'Faixa' },
  { id: 'metade', label: 'Metade/metade' },
  { id: 'xadrez', label: 'Xadrez' }
]

export const CREST_ORIENTATIONS: Array<{ id: CrestOrientation; label: string }> = [
  { id: 'vertical', label: 'Vertical' },
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'diagonal-esquerda', label: 'Diagonal \\' },
  { id: 'diagonal-direita', label: 'Diagonal /' }
]

export const CREST_STRIPE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 7, label: 'Fina (7)' },
  { value: 5, label: 'Média (5)' },
  { value: 3, label: 'Grossa (3)' }
]

export const CREST_COLORS: string[] = ['#059669', '#0F172A', '#DC2626', '#2563EB', '#D97706', '#7C3AED', '#FFFFFF', '#FACC15']
