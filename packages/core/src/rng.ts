export type Rng = () => number

/** Deterministic seeded RNG: a given seed always yields the same sequence in [0, 1). */
export function rng(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 15), 1 | s)
    s ^= s + Math.imul(s ^ (s >>> 7), 61 | s)
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296
  }
}

export const range = (r: Rng, min: number, max: number) => min + r() * (max - min)

export const int = (r: Rng, min: number, max: number) => Math.floor(range(r, min, max + 1))

export const pick = <T>(r: Rng, items: readonly T[]): T => items[Math.floor(r() * items.length)]

/** Derive a stable child seed, so nested components stay deterministic. */
export const sub = (seed: number, n: number) => (Math.imul(seed >>> 0, 0x9e3779b1) + n) >>> 0
