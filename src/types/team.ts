import type { CrestOrientation, CrestPattern, CrestShape } from './club'

/** Identidade visual configurada de um time (escudo + cores). Dado estatico, fora do save. */
export interface TeamIdentity {
  shortName: string
  shape: CrestShape
  primaryColor: string
  secondaryColor: string
  pattern: CrestPattern
  orientation: CrestOrientation
  stripes: number
  textColor?: string
}
