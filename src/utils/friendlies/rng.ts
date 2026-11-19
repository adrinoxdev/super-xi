import type { Rng } from '@/utils/core/random'

/**
 * Contrato do Rng nos amistosos: devolve um número em [0, 1). `unit` garante isso mesmo com um rng fora do contrato
 * (ex.: `() => 1` num teste, ou NaN): sem o clamp, `floor(1 · n)` estoura o índice em randInt/shuffle.
 */
export function unit(rng: Rng): number {
  const x = rng()
  return Number.isFinite(x) ? Math.min(Math.max(x, 0), 1 - 1e-12) : 0
}

/** Rng que sempre respeita o contrato [0, 1): é o que se passa a `shuffle` de src/utils/core/random.ts. */
export const safeRng =
  (rng: Rng): Rng =>
  () =>
    unit(rng)

/** Inteiro uniforme em [min, max] (inclusive). */
export const randIntWith = (rng: Rng, min: number, max: number): number => Math.floor(unit(rng) * (max - min + 1)) + min
