export const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

export const pickRandom = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)]

export const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val))

/** Gerador de números em [0, 1). Injetável nas funções com sorteio. */
export type Rng = () => number

/** PRNG determinístico (semente fixa dá sequência fixa). */
export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Embaralha uma cópia (Fisher-Yates). */
export const shuffle = <T>(arr: readonly T[], rng: Rng = Math.random): T[] => {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}
