export type Rng = () => number

/** murmur3's 32-bit finalizer: a bijection that spreads every input bit across the output. */
function fmix32(h: number) {
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** Deterministic seeded RNG: a given seed always yields the same sequence in [0, 1). */
export function rng(seed: number): Rng {
  // The step below barely moves a small state on its first call (seed 7's first draw was
  // 0.000001) and keeps 0 at 0, so scramble the seed first. The offset keeps 0 off 0.
  let s = fmix32((seed + 0x9e3779b9) >>> 0)
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
