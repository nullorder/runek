import { useFrame } from '@react-three/fiber'
import { Dynamic, skipMirrors, useMaterial, useWorld, type Vec3 } from '@runek/core'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DataTexture,
  type InstancedMesh,
  LinearFilter,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  RGBAFormat,
  TorusGeometry,
} from 'three'
import { emissiveColor, useLadder } from './city/glow'
import { hash2 } from './city/hash'

export interface SteamVentProps {
  /** Where the steam comes out [x, y, z] in units: the middle of a manhole, or the mouth of a wall vent. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. */
  rotation?: Vec3
  /** Sets each puff apart from the next, and this vent from every other. */
  seed?: number
  /** How many puffs are in the air at once. */
  puffs?: number
  /** How high a puff rises before it is gone, in units. */
  rise?: number
  /** How far a puff has spread by then, in units. */
  spread?: number
  /** Seconds a puff takes to rise and thin out. */
  period?: number
  /** Steam color: it takes the color of the light around it. */
  color?: string
  /** How thick it is, 0 (nothing) to 1. */
  strength?: number
  /** Draw the manhole it comes from: a dark lid with a rim, `radius` across. */
  grate?: boolean
  /** Radius of the lid and of the column of steam at its foot, in units. */
  radius?: number
}

let soft: DataTexture | null = null
/** One soft round puff, drawn in code: white, with alpha falling off from the middle. */
function puffTexture(): DataTexture {
  if (soft) return soft
  const N = 64
  const data = new Uint8Array(N * N * 4)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const r = Math.hypot(x - (N - 1) / 2, y - (N - 1) / 2) / (N / 2)
      const a = Math.max(0, 1 - r)
      const v = Math.round(255 * a * a * (3 - 2 * a))
      data.set([v, v, v, 255], (y * N + x) * 4)
    }
  }
  soft = new DataTexture(data, N, N, RGBAFormat)
  soft.magFilter = soft.minFilter = LinearFilter
  soft.needsUpdate = true
  return soft
}

/**
 * Steam off a manhole or out of a kitchen vent: a column of soft puffs that rise, spread, lean a
 * little and thin away. Each puff's place is a pure function of the world clock and `seed`, so
 * every player sees the same plume and nothing is simulated.
 *
 * One instanced draw of quads that face the camera, left out of the world's mirrors, plus the lid
 * when `grate` is set. The steam is added light a little brighter than an unlit wall, so it shows
 * where a lamp or a sign is behind it and barely at all against the dark. No collider.
 */
export function SteamVent({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  puffs = 14,
  rise = 3.2,
  spread = 1.1,
  period = 4.5,
  color = '#c9d2e6',
  strength = 1,
  grate = true,
  radius = 0.42,
}: SteamVentProps) {
  const { unit, palette, now = Date.now } = useWorld()
  const ladder = useLadder()
  const mesh = useRef<InstancedMesh>(null)
  const count = Math.max(1, Math.round(puffs))
  const quad = useMemo(() => new PlaneGeometry(1, 1), [])
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        map: puffTexture(),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  )
  useEffect(
    () => () => {
      quad.dispose()
      material.dispose()
    },
    [quad, material],
  )
  const lid = useMaterial({
    slot: 'metal.bare',
    color: palette.metal,
    roughness: 0.7,
    metalness: 0.4,
  })
  // A puff at its thickest: a little over an unlit wall, so a column of them reads as haze.
  const tone = useMemo(
    () => emissiveColor(color, ladder.unlitWall[1] * 1.0 * Math.min(1, Math.max(0, strength))),
    [color, ladder.unlitWall, strength],
  )

  useEffect(() => skipMirrors(mesh.current), [])

  const at = useMemo(() => new Object3D(), [])
  const tint = useMemo(() => new Color(), [])
  useFrame(({ camera }) => {
    const m = mesh.current
    if (!m) return
    const seconds = now() / 1000
    const parent = m.parent
    for (let i = 0; i < count; i++) {
      const life = (((seconds / period + hash2(seed, i)) % 1) + 1) % 1
      // Which time round this puff is on, so each one takes a path of its own.
      const round = Math.floor(seconds / period + hash2(seed, i))
      const lean = (hash2(seed * 7 + i, round) - 0.5) * 2
      const turn = hash2(seed * 11 + i, round) * Math.PI * 2
      const out = (radius * 0.6 + spread * 0.5 * life) * unit
      at.position.set(
        Math.cos(turn) * out * 0.5 + lean * life * life * 0.5 * unit,
        rise * unit * life ** 0.8,
        Math.sin(turn) * out * 0.5,
      )
      // Face the camera, whatever the vent's own turn.
      at.quaternion.copy(camera.quaternion)
      if (parent) at.quaternion.premultiply(parent.getWorldQuaternion(scratch).invert())
      at.scale.setScalar((radius * 1.6 + spread * life) * unit)
      at.updateMatrix()
      m.setMatrixAt(i, at.matrix)
      // Thin at the mouth, thickest a third of the way up, gone at the top.
      const fade = Math.min(1, life * 5) * (1 - life) ** 1.5
      m.setColorAt(i, tint.copy(tone).multiplyScalar(fade))
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <group position={position} rotation={rotation}>
      {grate && (
        <>
          <mesh
            position={[0, 0.012 * unit, 0]}
            material={lid}
            geometry={lidGeometry(radius * unit, unit)}
            receiveShadow
          />
          <mesh
            position={[0, 0.02 * unit, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={lid}
            geometry={rimGeometry(radius * unit, unit)}
          />
        </>
      )}
      <Dynamic>
        <instancedMesh
          ref={mesh}
          args={[quad, material, count]}
          frustumCulled={false}
          renderOrder={3}
        />
      </Dynamic>
    </group>
  )
}

const scratch = new Object3D().quaternion

const lids = new Map<string, CylinderGeometry>()
function lidGeometry(radius: number, unit: number) {
  const key = `${radius.toFixed(3)}:${unit}`
  let g = lids.get(key)
  if (!g) {
    g = new CylinderGeometry(radius, radius, 0.024 * unit, 24)
    lids.set(key, g)
  }
  return g
}
const rims = new Map<string, TorusGeometry>()
function rimGeometry(radius: number, unit: number) {
  const key = `${radius.toFixed(3)}:${unit}`
  let g = rims.get(key)
  if (!g) {
    g = new TorusGeometry(radius * 1.06, 0.03 * unit, 6, 28)
    rims.set(key, g)
  }
  return g
}
