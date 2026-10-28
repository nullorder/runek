import { BufferAttribute, BufferGeometry } from 'three'
import { bowZ, halfBreadth, LEVEL, railY, type ShipLayout, sternZ } from '../surfaces/ship'
import { hash01, type V3 } from './mesh'

export type SailPlan = 'set' | 'furled' | 'none'

export interface Yard {
  y: number
  /** Half the yard's span. */
  half: number
  /** Carries a square sail hanging to the yard below (or the course's foot). */
  sail: boolean
}

export interface Mast {
  key: 'fore' | 'main' | 'mizzen'
  z: number
  /** Radius at the deck. */
  r: number
  top: number
  cross: number
  truck: number
  /** Half the top platform's width. */
  topHalf: number
  yards: Yard[]
}

export interface Bowsprit {
  base: V3
  tip: V3
  length: number
  angle: number
}

export interface Spanker {
  jaw: V3
  peak: V3
  tack: V3
  clew: V3
}

export interface Rig {
  masts: Mast[]
  bowsprit: Bowsprit
  spanker: Spanker | null
}

const SCALE = { fore: 0.86, main: 1, mizzen: 0.66 }

/** Which masts stand for a count: three-masted, then the mizzen goes, then the fore. */
const STEP: Record<number, Mast['key'][]> = {
  1: ['main'],
  2: ['fore', 'main'],
  3: ['fore', 'main', 'mizzen'],
}

export function rigLayout(lay: ShipLayout, count: number): Rig {
  const s = lay.shape
  const L = s.length
  const H = 0.85 * L
  const { main } = LEVEL
  const masts = STEP[Math.min(3, Math.max(1, Math.round(count)))].map((key): Mast => {
    const k = SCALE[key]
    const h = H * k
    const mizzen = key === 'mizzen'
    return {
      key,
      z: lay.masts[key],
      r: 0.45 * k,
      top: main + 0.42 * h,
      cross: main + 0.74 * h,
      truck: main + h,
      topHalf: 1.3 * k,
      yards: [
        // The mizzen's lowest yard (the crossjack) sets no sail: the spanker fills that space.
        { y: main + 0.36 * h, half: 0.25 * L * k, sail: !mizzen },
        { y: main + 0.62 * h, half: 0.19 * L * k, sail: true },
        { y: main + 0.86 * h, half: 0.13 * L * k, sail: true },
      ],
    }
  })
  const zb = bowZ(s, LEVEL.fore)
  const angle = 0.36
  const length = 0.26 * L
  const base: V3 = [0, LEVEL.fore + 0.5, zb - 2.2]
  const tip: V3 = [0, base[1] + Math.sin(angle) * length, base[2] + Math.cos(angle) * length]
  const miz = masts.find((m) => m.key === 'mizzen')
  let spanker: Spanker | null = null
  if (miz) {
    const jaw: V3 = [0, miz.top - 0.6, miz.z - miz.r]
    const gaff = 0.17 * L
    const peak: V3 = [0, jaw[1] + gaff * 0.5, jaw[2] - gaff * 0.87]
    const boomY = LEVEL.quarter + 2.3
    const tack: V3 = [0, boomY, miz.z - miz.r]
    const clew: V3 = [0, boomY, Math.max(miz.z - 0.24 * L, sternZ(s, boomY) - 1.6)]
    spanker = { jaw, peak, tack, clew }
  }
  return { masts, bowsprit: { base, tip, length, angle }, spanker }
}

/** Indexed, smooth-shaded cloth. */
class Cloth {
  readonly pos: number[] = []
  readonly idx: number[] = []

  grid(nu: number, nv: number, at: (u: number, v: number) => V3) {
    const start = this.pos.length / 3
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) this.pos.push(...at(i / nu, j / nv))
    const row = nu + 1
    for (let j = 0; j < nv; j++)
      for (let i = 0; i < nu; i++) {
        const a = start + j * row + i
        this.idx.push(a, a + 1, a + row, a + 1, a + row + 1, a + row)
      }
  }

  /** A triangle subdivided n times, its belly deepest at the centroid. */
  triangle(n: number, a: V3, b: V3, c: V3, belly: V3) {
    const start = this.pos.length / 3
    const index: number[][] = []
    for (let i = 0; i <= n; i++) {
      index.push([])
      for (let j = 0; j <= n - i; j++) {
        const la = 1 - (i + j) / n
        const lb = i / n
        const lc = j / n
        const f = 27 * la * lb * lc
        index[i].push(this.pos.length / 3 - start)
        this.pos.push(
          la * a[0] + lb * b[0] + lc * c[0] + belly[0] * f,
          la * a[1] + lb * b[1] + lc * c[1] + belly[1] * f,
          la * a[2] + lb * b[2] + lc * c[2] + belly[2] * f,
        )
      }
    }
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n - i; j++) {
        const p = start + index[i][j]
        const q = start + index[i + 1][j]
        const r = start + index[i][j + 1]
        this.idx.push(p, q, r)
        if (j < n - i - 1) this.idx.push(q, start + index[i + 1][j + 1], r)
      }
  }

  geometry() {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3))
    g.setIndex(this.idx)
    g.computeVertexNormals()
    return g
  }
}

/** Where each square sail hangs: from its yard down to the yard below, the course to a foot
 *  clear of a castle deck's heads. */
export function squareSails(rig: Rig) {
  const out: { z: number; yt: number; yb: number; top: number; bottom: number }[] = []
  for (const m of rig.masts) {
    m.yards.forEach((yd, i) => {
      if (!yd.sail) return
      const below = m.yards[i - 1]
      out.push({
        z: m.z + m.r + 0.25,
        yt: yd.y,
        yb: below ? below.y + 0.3 : LEVEL.main + 4.2,
        top: yd.half * 0.96,
        bottom: below ? below.half * 0.94 : yd.half * 1.02,
      })
    })
  }
  return out
}

/** Every set sail as one geometry: square sails bellied forward, the spanker and the jibs
 *  bellied to port. The seed varies each sail's belly. */
export function buildSails(rig: Rig, seed: number): BufferGeometry {
  const cloth = new Cloth()
  squareSails(rig).forEach((sq, i) => {
    const belly = (0.55 + 0.4 * hash01(i, 3, seed)) * (sq.top / 9)
    cloth.grid(10, 6, (u, v) => {
      const x = -1 + 2 * u
      const half = sq.bottom + (sq.top - sq.bottom) * v
      const roach = (1 - v) * 0.35 * Math.sin(Math.PI * u)
      const y = sq.yb + (sq.yt - sq.yb) * v + roach
      const bag = Math.sin(Math.PI * u) ** 0.8 * Math.sin(Math.PI * (1 - v) * 0.85)
      return [x * half, y, sq.z + belly * bag]
    })
  })
  const sp = rig.spanker
  if (sp) {
    const belly = 0.6 + 0.3 * hash01(40, 3, seed)
    cloth.grid(6, 6, (u, v) => {
      const lerp = (a: V3, b: V3, t: number): V3 => [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
      ]
      const foot = lerp(sp.tack, sp.clew, u)
      const head = lerp(sp.jaw, sp.peak, u)
      const p = lerp(foot, head, v)
      p[0] += belly * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
      return p
    })
  }
  const fore = rig.masts.find((m) => m.key === 'fore') ?? rig.masts[0]
  const { tip, base } = rig.bowsprit
  const stay = (from: V3, to: V3, t: number): V3 => [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ]
  const head: V3 = [0, fore.cross, fore.z]
  const mid: V3 = stay(base, tip, 0.45)
  const inner: V3 = [0, fore.top, fore.z]
  const jibs: [V3, V3][] = [
    [stay(tip, head, 0.06), stay(tip, head, 0.6)],
    [stay(mid, inner, 0.06), stay(mid, inner, 0.62)],
  ]
  jibs.forEach(([tack, peak], i) => {
    const clew: V3 = [0, tack[1] - 0.4 - i * 0.6, tack[2] - 0.62 * (tack[2] - peak[2])]
    const belly = 0.45 + 0.3 * hash01(50 + i, 3, seed)
    cloth.triangle(6, tack, peak, clew, [belly, 0, 0])
  })
  return cloth.geometry()
}

/** Shrouds with ratlines, stays, backstays, lifts and braces: one line-segment list. */
export function buildRigging(lay: ShipLayout, rig: Rig): Float32Array {
  const s = lay.shape
  const seg: number[] = []
  const line = (a: V3, b: V3) => seg.push(...a, ...b)
  const lerp = (a: V3, b: V3, t: number): V3 => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
  const channel = (side: number, z: number): V3 => {
    const zc = Math.max(sternZ(s, LEVEL.quarter) + 1, z)
    const y = railY(s, zc) - 0.15
    return [side * (halfBreadth(s, zc, y) + 0.35), y, zc]
  }
  for (const m of rig.masts) {
    const n = m.key === 'mizzen' ? 4 : 6
    for (const side of [1, -1]) {
      const head: V3 = [side * m.topHalf * 0.9, m.top, m.z]
      const feet = Array.from({ length: n }, (_, k) => channel(side, m.z - 2.6 + k * 0.8))
      for (const f of feet) line(head, f)
      const low = Math.max(...feet.map((f) => f[1])) + 0.5
      for (let y = low; y < m.top - 0.8; y += 0.42) {
        const pts = feet.map((f) => lerp(f, head, (y - f[1]) / (head[1] - f[1])))
        for (let k = 0; k < pts.length - 1; k++) line(pts[k], pts[k + 1])
      }
      for (let k = -1; k <= 1; k++)
        line([side * 0.35, m.cross, m.z], [side * m.topHalf, m.top, m.z + k * 0.5])
      for (const dz of [5.4, 6.6]) line([side * 0.3, m.cross, m.z], channel(side, m.z - dz))
      for (const yd of m.yards) {
        const end: V3 = [side * yd.half, yd.y, m.z + m.r]
        line([0, yd.y + 2.2, m.z], end)
        line(end, channel(side, m.z - 7.5))
      }
    }
  }
  const by = Object.fromEntries(rig.masts.map((m) => [m.key, m])) as Partial<
    Record<Mast['key'], Mast>
  >
  const { tip, base } = rig.bowsprit
  const first = by.fore ?? by.main
  if (first) {
    line([0, first.top, first.z], lerp(base, tip, 0.45))
    line([0, first.cross, first.z], tip)
    line([0, first.truck - 0.5, first.z], tip)
  }
  if (by.main && by.fore) {
    line([0, by.main.top, by.main.z], [0, LEVEL.main + 1, by.fore.z - 0.6])
    line([0, by.main.cross, by.main.z], [0, by.fore.top, by.fore.z])
  }
  if (by.mizzen && by.main) {
    line([0, by.mizzen.top, by.mizzen.z], [0, LEVEL.main + 3.5, by.main.z])
    line([0, by.mizzen.cross, by.mizzen.z], [0, by.main.top, by.main.z])
  }
  line(tip, [0, 1.2, bowZ(s, 1.2)])
  return new Float32Array(seg)
}
