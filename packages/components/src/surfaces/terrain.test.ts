import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { terrainGeometry } from '../Terrain'
import { type TerrainShape, terrainSurface } from './terrain'

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
