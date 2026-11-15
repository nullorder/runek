import { useFrame, useThree } from '@react-three/fiber'
import { DYNAMIC_KEY, skipMirrors, useWorld, type WaterSample, waterAt } from '@runek/core'
import { useEffect, useState } from 'react'
import {
  AdditiveBlending,
  Color,
  DataTexture,
  DoubleSide,
  InstancedMesh,
  LinearFilter,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  RGBAFormat,
} from 'three'
import { createWake, dropAt, type Mark, ringAt, stepWake, type WakeBody } from './wake'

/** White falling off from `peak` to nothing `width` either side of it, drawn in code: at 0 a
 *  soft round dot, further out a ring. Across a square, `r` runs 0 in the middle to 1 at an edge. */
function glowTexture(peak: number, width: number): DataTexture {
  const N = 64
  const data = new Uint8Array(N * N * 4)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const r = Math.hypot(x - (N - 1) / 2, y - (N - 1) / 2) / (N / 2)
      const a = Math.max(0, 1 - Math.abs(r - peak) / width)
      const v = Math.round(255 * a * a * (3 - 2 * a))
      data.set([v, v, v, 255], (y * N + x) * 4)
    }
  }
  const texture = new DataTexture(data, N, N, RGBAFormat)
  texture.magFilter = texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

let ringMap: DataTexture | null = null
let dropMap: DataTexture | null = null

/** Light added over the water: nothing where the texture is black, and it never darkens. */
const glow = (map: DataTexture) =>
  new MeshBasicMaterial({
    map,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    fog: false,
    side: DoubleSide,
  })

// Foam: a little blue in the white. How bright a ring and a drop are at their brightest.
const FOAM = '#dcefff'
const RING_GLOW = 0.42
const DROP_GLOW = 0.8
/** How far over the water a ring is drawn, in meters, so the surface doesn't cut through it. */
const OVER = 0.03

/**
 * The rings and splashes a body leaves on water (see `water/wake.ts`), for whoever says where
 * that body is: `Player` for its avatar, `Person` for a figure on its own. `source` is read
 * every frame.
 *
 * Two instanced draws, of light added over the water, in world space, so the rings stay where
 * they were left as the body moves on: rings lying on the surface, each at the height the water
 * has there now, and drops facing the camera. Neither is drawn while it has nothing to show, and
 * both are left out of mirrors.
 */
export function WaterTrail({ source, seed = 1 }: { source: { current: WakeBody }; seed?: number }) {
  const scene = useThree((three) => three.scene)
  const { waters, unit } = useWorld()
  const [v] = useState(() => {
    const wake = createWake(seed)
    ringMap ??= glowTexture(0.86, 0.11)
    dropMap ??= glowTexture(0, 1)
    const flat = new PlaneGeometry(2, 2).rotateX(-Math.PI / 2)
    const rings = new InstancedMesh(flat, glow(ringMap), wake.rings.length)
    const drops = new InstancedMesh(new PlaneGeometry(1, 1), glow(dropMap), wake.drops.length)
    for (const mesh of [rings, drops]) {
      mesh.visible = false
      mesh.frustumCulled = false
      // After the water it lies on, which would otherwise be drawn over it.
      mesh.renderOrder = 1
      mesh.userData[DYNAMIC_KEY] = true
    }
    return {
      wake,
      rings,
      drops,
      at: new Object3D(),
      mark: { x: 0, y: 0, z: 0, size: 0, glow: 0 } as Mark,
      sample: { level: 0, swell: 0 } as WaterSample,
      foam: new Color(FOAM),
      tint: new Color(),
    }
  })

  useEffect(() => {
    const { rings, drops } = v
    scene.add(rings, drops)
    const mirrored = [skipMirrors(rings), skipMirrors(drops)]
    return () => {
      for (const restore of mirrored) restore()
      scene.remove(rings, drops)
    }
  }, [scene, v])
  useEffect(
    () => () => {
      for (const mesh of [v.rings, v.drops]) {
        mesh.geometry.dispose()
        mesh.material.dispose()
        mesh.dispose()
      }
    },
    [v],
  )

  useFrame(({ camera }, delta) => {
    const { wake, rings, drops, at, mark, tint, foam } = v
    const body = source.current
    stepWake(wake, body, Math.min(delta, 0.1), unit)

    let shown = 0
    at.quaternion.identity()
    for (const ring of wake.rings) {
      if (!ringAt(ring, wake.time, unit, mark)) continue
      // Where the water stands under the ring now: it rides the swell it was left on.
      const water = waterAt(waters, mark.x, body.y + unit, mark.z, v.sample)
      if (!water) continue
      at.position.set(mark.x, water.level + water.swell + OVER * unit, mark.z)
      at.scale.setScalar(mark.size)
      at.updateMatrix()
      rings.setMatrixAt(shown, at.matrix)
      rings.setColorAt(shown, tint.copy(foam).multiplyScalar(mark.glow * RING_GLOW))
      shown++
    }
    show(rings, shown)

    shown = 0
    at.quaternion.copy(camera.quaternion)
    for (const drop of wake.drops) {
      if (!dropAt(drop, wake.time, unit, mark)) continue
      at.position.set(mark.x, mark.y, mark.z)
      at.scale.setScalar(mark.size)
      at.updateMatrix()
      drops.setMatrixAt(shown, at.matrix)
      drops.setColorAt(shown, tint.copy(foam).multiplyScalar(mark.glow * DROP_GLOW))
      shown++
    }
    show(drops, shown)
  })
  return null
}

/** Draw the first `count` instances of `mesh`, or none of it. */
function show(mesh: InstancedMesh, count: number) {
  mesh.count = count
  mesh.visible = count > 0
  if (!count) return
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}
