import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { terrainGeometry } from '../Terrain'
import { type TerrainShape, terrainHeight, terrainSurface } from './terrain'

// The workshop's "Island cove" terrain, before it had a shore.
const COVE: TerrainShape = { size: [44, 44], relief: 3, falloff: 0.55, flatRadius: 7, seed: 12 }

// Golden tests: the query must agree with the rendered mesh (and so the trimesh collider built
// from it), not with an idealized noise field. A downward ray against the real geometry is the
// ground truth.
const SHAPES: Array<[string, TerrainShape, number]> = [
  ['rolling', { size: [40, 40], relief: 3, seed: 7 }, 1],
  [
    'steep, coarse grid',
    { size: [60, 30], relief: 70, resolution: 16, frequency: 0.09, seed: 3 },
    1,
  ],
  [
    'island with a pad',
    { size: [300, 300], relief: 4, falloff: 0.52, flatRadius: 80, seed: 11 },
    1,
  ],
  ['scaled unit', { size: [20, 20], relief: 5, resolution: 24, seed: 2 }, 2.5],
  ['island with a shore', { ...COVE, shore: 6 }, 1],
  [
    'scaled island with a shore',
    { size: [30, 30], relief: 3, falloff: 0.5, shore: 6, seed: 2 },
    2.5,
  ],
]

function rayHeight(mesh: THREE.Mesh, x: number, z: number): number | null {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 1e4, z), new THREE.Vector3(0, -1, 0))
  const hit = ray.intersectObject(mesh)[0]
  return hit ? hit.point.y : null
}

describe('terrainSurface', () => {
  for (const [name, shape, unit] of SHAPES) {
    it(`matches the rendered triangles: ${name}`, () => {
      const geo = terrainGeometry(shape, unit)
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
      mesh.updateMatrixWorld()
      const field = terrainSurface.build(shape as Record<string, unknown>, { unit, ground: 0 })

      // Every vertex.
      const pos = geo.attributes.position
      for (let i = 0; i < pos.count; i += 7) {
        expect(field(pos.getX(i), pos.getZ(i))).toBeCloseTo(pos.getY(i), 4)
      }

      // Mid-triangle points on both sides of each sampled cell's diagonal, plus random points.
      const [w, d] = (shape.size ?? [40, 40]).map((s) => s * unit)
      let s = 12345
      const rand = () => {
        s = (s * 16807) % 2147483647
        return (s - 1) / 2147483646
      }
      for (let k = 0; k < 400; k++) {
        const x = (rand() - 0.5) * w * 0.999
        const z = (rand() - 0.5) * d * 0.999
        const truth = rayHeight(mesh, x, z)
        expect(truth).not.toBeNull()
        expect(Math.abs((field(x, z) as number) - (truth as number))).toBeLessThan(0.01)
      }
    })
  }

  it('is off the terrain outside its extent', () => {
    const field = terrainSurface.build({ size: [10, 10], relief: 2 }, { unit: 1, ground: 0 })
    expect(field(6, 0)).toBeNull()
    expect(field(0, -5.01)).toBeNull()
  })

  it('reads flat terrain as a box top', () => {
    const field = terrainSurface.build({ size: [10, 10] }, { unit: 1, ground: 0 })
    expect(field(4, 4)).toBe(0)
    expect(field(6, 0)).toBeNull()
  })
})

// `[x, z, height]` recorded before `shore` existed: a world that doesn't set it keeps every
// height to the bit.
const PINNED: Array<[string, TerrainShape, number, Array<[number, number, number]>]> = [
  [
    'rolling',
    { size: [40, 40], relief: 3, seed: 7 },
    1,
    [
      [0, 0, -2.5691915560746565],
      [3.5, -8.25, -2.422234472320204],
      [-17, 12.5, -0.758471265605433],
      [19.9, 19.9, 1.2120483001580982],
    ],
  ],
  [
    'island',
    { size: [44, 44], relief: 3, falloff: 0.55, seed: 12 },
    1,
    [
      [0, 0, 1.574648448076914],
      [5, -4, 1.3140135499601833],
      [-6.5, 6.5, -0.05599064511028096],
      [0, 10.25, -3.183853823247618],
      [9, 7, -6.301590329062409],
      [-15, 2, -7],
    ],
  ],
  [
    'island with a pad',
    COVE,
    1,
    [
      [2, 3, 0],
      [7.5, 0, 0.010406006693069004],
      [-6, 6, 0.11163907046015364],
      [0, 9.5, -0.19430265029315943],
      [8, -7.25, -2.259145591153959],
      [0, 13, -5.90625],
      [16, 16, -7],
    ],
  ],
  [
    'scaled island',
    { size: [30, 20], relief: 5, resolution: 24, falloff: 0.8, flatRadius: 2, seed: 2 },
    2.5,
    [
      [4, -3, 0],
      [-11, 9.5, 2.9324007804506964],
      [0, 17.75, -6.056225105129616],
      [20.5, 3, -19.847911112776647],
      [30, -20, -22.5],
    ],
  ],
]

/** The steepest stretch, in degrees, of the band an avatar wades through: from 0.3 above the
 *  world ground to 1.5 below it, walked along radii of the collider's own triangles. */
function steepestShore(shape: TerrainShape, unit: number): number {
  const field = terrainSurface.build(shape as Record<string, unknown>, { unit, ground: 0 })
  const half = (Math.min(...(shape.size ?? [40, 40])) * unit) / 2
  const step = 0.25 * unit
  let steepest = 0
  for (let a = 0; a < 360; a += 5) {
    const dx = Math.cos((a * Math.PI) / 180)
    const dz = Math.sin((a * Math.PI) / 180)
    for (let r = 0; r + step < half; r += step) {
      const near = field(dx * r, dz * r) as number
      const far = field(dx * (r + step), dz * (r + step)) as number
      if (Math.max(near, far) > 0.3 * unit || Math.min(near, far) < -1.5 * unit) continue
      steepest = Math.max(steepest, Math.atan(Math.abs(far - near) / step))
    }
  }
  return (steepest * 180) / Math.PI
}

describe('terrainHeight', () => {
  for (const [name, shape, unit, points] of PINNED) {
    it(`keeps its heights without a shore: ${name}`, () => {
      const height = terrainHeight(shape, unit)
      for (const [x, z, h] of points) expect(height(x, z)).toBe(h)
    })
  }

  it('reads a shore only on an island', () => {
    const rolling: TerrainShape = { size: [40, 40], relief: 3, seed: 7 }
    const plain = terrainHeight(rolling, 1)
    const shored = terrainHeight({ ...rolling, shore: 6 }, 1)
    const cove = terrainHeight(COVE, 1)
    const zeroed = terrainHeight({ ...COVE, shore: 0 }, 1)
    for (const [x, z] of [
      [0, 0],
      [3.5, -8.25],
      [0, 9.5],
      [-12, 11],
    ]) {
      expect(shored(x, z)).toBe(plain(x, z))
      expect(zeroed(x, z)).toBe(cove(x, z))
    }
  })

  describe('shore', () => {
    it('turns a coast too steep to walk into a beach', () => {
      expect(steepestShore(COVE, 1)).toBeGreaterThan(45)
      expect(steepestShore({ ...COVE, shore: 6 }, 1)).toBeLessThan(25)
      // No pad, more relief, a scaled unit: the land is cut down to meet the beach.
      const hilly: TerrainShape = { size: [60, 60], relief: 6, falloff: 0.5, shore: 6, seed: 4 }
      expect(steepestShore(hilly, 1)).toBeLessThan(25)
      expect(steepestShore(hilly, 2.5)).toBeLessThan(25)
    })

    it('keeps the build pad flat and still sinks to the deep at the rim', () => {
      const height = terrainHeight({ ...COVE, shore: 6 }, 1)
      expect(height(0, 0)).toBe(0)
      expect(height(-4, 5)).toBe(0)
      expect(height(0, 21.9)).toBe(-7)
      expect(height(-15.5, 15.5)).toBe(-7)
    })

    it('starts the beach at the edge of a pad wider than the land', () => {
      const height = terrainHeight({ ...COVE, flatRadius: 12, shore: 6 }, 1)
      expect(height(0, 11.9)).toBe(0)
      expect(height(0, 15)).toBeCloseTo(0.4 - 1, 6)
      expect(height(0, 18)).toBeCloseTo(-1.6, 6)
    })
  })
})
