import { useFrame } from '@react-three/fiber'
import { Dynamic, rng, skipMirrors, useWorld, type Vec3 } from '@runek/core'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BoxGeometry,
  type BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  type Group,
  type InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { emissiveColor, mid, useLadder } from './city/glow'

export interface FlyingTrafficProps {
  /** The middle of the lanes [x, y, z] in units, at the height of the lowest one. Lanes run along local Z. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. */
  rotation?: Vec3
  /** Deals out each car's lane, speed, paint and where on the lane it starts. */
  seed?: number
  /** How long the lanes are, in units. Cars leave one end and come in at the other, so make it
   *  longer than the fog lets anyone see. */
  length?: number
  /** How many cars fly. */
  cars?: number
  /** Lanes side by side going each way. */
  lanes?: number
  /** How far apart lanes are, side to side, in units. */
  spacing?: number
  /** Heights of the decks of lanes above `position`, in units. */
  levels?: number[]
  /** Slowest and fastest a car flies, in units a second. */
  speed?: [number, number]
}

/** What a car is painted, dark enough to read as a shape against the sky. */
const PAINTS = ['#16141c', '#1d1f22', '#2a120c', '#33363b', '#42464a']
/** The light a car throws down under itself. */
const GLOWS = ['#ffa64d', '#ff6418', '#39ff88', '#b967ff', '#f4f6fb']
const HEAD = '#dfe8ff'
const TAIL = '#ff6418'

interface Car {
  x: number
  y: number
  dir: 1 | -1
  speed: number
  offset: number
  phase: number
}

/** A box with every vertex painted `color` (linear, may be over 1). */
function lamp(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: Color,
): BufferGeometry {
  const g = new BoxGeometry(w, h, d).translate(x, y, z)
  const n = g.attributes.position.count
  const paint = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) paint.set([color.r, color.g, color.b], i * 3)
  g.setAttribute('color', new Float32BufferAttribute(paint, 3))
  return g
}

/**
 * Lanes of hovercars over a street: decks of lanes going both ways, every car an instance in
 * three shared meshes (bodies, lamps, and the light under each). Where each car is comes
 * straight from the world clock and `seed`, so every player who shares the clock sees the same
 * traffic (contract §2), and nothing is simulated or sent.
 *
 * Three draws however many cars, left out of the world's mirrors. No colliders: the lanes are
 * meant to fly over anything a body can reach.
 */
export function FlyingTraffic({
  position = [0, 40, 0],
  rotation = [0, 0, 0],
  seed = 1,
  length = 480,
  cars = 28,
  lanes = 2,
  spacing = 7,
  levels = [0, 9, 20],
  speed = [16, 34],
}: FlyingTrafficProps) {
  const { unit, now = Date.now } = useWorld()
  const ladder = useLadder()
  const root = useRef<Group>(null)
  const body = useRef<InstancedMesh>(null)
  const lamps = useRef<InstancedMesh>(null)
  const glow = useRef<InstancedMesh>(null)
  const count = Math.max(0, Math.round(cars))
  const [slow, fast] = speed
  const decks = levels.join(',')

  const fleet = useMemo<Car[]>(() => {
    const r = rng(seed)
    const heights = decks.split(',').map(Number)
    return Array.from({ length: count }, () => {
      const dir = r() < 0.5 ? 1 : -1
      const lane = Math.floor(r() * Math.max(1, lanes))
      return {
        // Each way keeps to its own side, as a road does.
        x: dir * (lane + 0.5) * spacing * unit,
        y: (heights[Math.floor(r() * heights.length)] + (r() - 0.5) * 1.6) * unit,
        dir,
        speed: (slow + r() * (fast - slow)) * unit,
        offset: r() * length * unit,
        phase: r() * Math.PI * 2,
      }
    })
  }, [seed, count, lanes, spacing, decks, slow, fast, length, unit])

  const parts = useMemo(() => {
    const u = unit
    const shell = mergeGeometries([
      new BoxGeometry(2.0 * u, 0.55 * u, 4.4 * u).translate(0, 0.5 * u, 0),
      new BoxGeometry(1.8 * u, 0.3 * u, 0.9 * u).translate(0, 0.42 * u, 2.5 * u),
      new BoxGeometry(1.7 * u, 0.5 * u, 2.0 * u).translate(0, 1.0 * u, -0.3 * u),
    ])
    const head = emissiveColor(HEAD, mid(ladder.lampLens))
    const tail = emissiveColor(TAIL, mid(ladder.signFace))
    const lights = mergeGeometries([
      lamp(0.5 * u, 0.1 * u, 0.06 * u, 0.6 * u, 0.55 * u, 2.96 * u, head),
      lamp(0.5 * u, 0.1 * u, 0.06 * u, -0.6 * u, 0.55 * u, 2.96 * u, head),
      lamp(1.9 * u, 0.08 * u, 0.06 * u, 0, 0.66 * u, -2.22 * u, tail),
    ])
    const under = new PlaneGeometry(1.7 * u, 4.0 * u).rotateX(Math.PI / 2).translate(0, 0.2 * u, 0)
    const paint = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.32, metalness: 0.7 })
    const lit = new MeshBasicMaterial({ vertexColors: true, toneMapped: false })
    const cast = new MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    })
    return { shell, lights, under, paint, lit, cast }
  }, [unit, ladder.lampLens, ladder.signFace])
  useEffect(
    () => () => {
      for (const part of Object.values(parts)) part.dispose()
    },
    [parts],
  )

  // Paint and underglow are dealt once. Only where the cars are changes from frame to frame.
  useEffect(() => {
    const r = rng(seed + 7919)
    const tint = new Color()
    for (let i = 0; i < count; i++) {
      body.current?.setColorAt(i, tint.set(PAINTS[Math.floor(r() * PAINTS.length)]))
      glow.current?.setColorAt(
        i,
        emissiveColor(GLOWS[Math.floor(r() * GLOWS.length)], ladder.shopGlass[1]),
      )
    }
    for (const mesh of [body.current, glow.current])
      if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [seed, count, ladder.shopGlass, parts])

  const at = useMemo(() => new Object3D(), [])
  useFrame(() => {
    const meshes = [body.current, lamps.current, glow.current]
    if (!meshes[0] || !meshes[1] || !meshes[2]) return
    const seconds = now() / 1000
    const span = length * unit
    for (let i = 0; i < fleet.length; i++) {
      const car = fleet[i]
      const along = (((car.offset + car.speed * seconds) % span) + span) % span
      at.position.set(
        car.x,
        car.y + Math.sin(seconds * 0.7 + car.phase) * 0.25 * unit,
        car.dir * (along - span / 2),
      )
      at.rotation.set(0, car.dir > 0 ? 0 : Math.PI, 0)
      at.updateMatrix()
      for (const mesh of meshes) mesh?.setMatrixAt(i, at.matrix)
    }
    for (const mesh of meshes) if (mesh) mesh.instanceMatrix.needsUpdate = true
  })

  // Cars overhead move every frame: a reflection of them would only trail.
  useEffect(() => skipMirrors(root.current), [count])

  if (count === 0) return null
  return (
    <Dynamic>
      <group ref={root} position={position} rotation={rotation}>
        <instancedMesh ref={body} args={[parts.shell, parts.paint, count]} frustumCulled={false} />
        <instancedMesh ref={lamps} args={[parts.lights, parts.lit, count]} frustumCulled={false} />
        <instancedMesh
          ref={glow}
          args={[parts.under, parts.cast, count]}
          frustumCulled={false}
          renderOrder={2}
        />
      </group>
    </Dynamic>
  )
}

FlyingTraffic.stream = false
