import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import {
  Dynamic,
  lazyModule,
  skipMirrors,
  useLight,
  useMaterial,
  useNodeRenderer,
  useWorld,
  type Vec3,
} from '@runek/core'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  type Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  type Material,
  ShaderMaterial,
  TorusGeometry,
} from 'three'
import { emissiveColor, glowMaterial, mid, useLadder } from './city/glow'

// The beam's node (TSL) material, loaded only under a node renderer.
const hologramNodes = lazyModule(() => import('./nodes/hologram'))

export interface HologramProps {
  /** The middle of the pedestal's foot [x, y, z] in units. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. */
  rotation?: Vec3
  /** Accepted for the component contract. Every hologram keeps the same time. */
  seed?: number
  /** Radius of the pedestal, in units. */
  radius?: number
  /** How high the middle of the figure hangs over the pedestal's foot, in units. */
  height?: number
  /** Radius of the figure, in units. */
  size?: number
  /** The beam and the figure's cage, lit at the world's `sign` and `tube` levels. */
  color?: string
  /** The rings that keep time. */
  accent?: string
  /** Seconds the slow ring takes to go round once: a district's power round, say. */
  round?: number
  /** Ask the world's light pool for a real light at the figure. */
  light?: boolean
}

const BEAM_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

// Scan lines climbing a cone of light that thins toward the top.
const BEAM_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
varying vec2 vUv;
void main() {
  float lines = 0.6 + 0.4 * step(0.5, fract(vUv.y * 40.0 - uTime * 2.0));
  gl_FragColor = vec4(uColor * (1.0 - vUv.y) * lines, 1.0);
}`

/**
 * A hologram on a pedestal: a beam of light up from a ring, and in it a cage that turns slowly
 * round three rings that keep time. The fast ring goes round once a minute, the middle one once
 * an hour and the slow one once every `round` seconds, all read off the world clock, so it is a
 * clock anyone in the city can check and every player sees it at the same angle.
 *
 * The pedestal is lit, solid and has a collider. The light parts are unlit, at the world's
 * luminance levels, left out of the world's mirrors, and drawn inside a `<Dynamic>`. Under
 * `WebGPURenderer` the beam has no scan lines.
 */
export function Hologram({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radius = 1.6,
  height = 6.5,
  size = 2.2,
  color = '#3d5bff',
  accent = '#f4f6fb',
  round = 1440,
  light = true,
}: HologramProps) {
  const { unit, palette, now = Date.now } = useWorld()
  const ladder = useLadder()
  const nodes = useNodeRenderer() ? hologramNodes() : null
  const r = radius * unit
  const s = size * unit
  const base = 0.5 * unit
  const beamH = (height + size * 0.6) * unit - base

  const metal = useMaterial({ color: palette.metal, roughness: 0.35, metalness: 0.7 })
  const rim = glowMaterial(color, mid(ladder.tubeCore))
  const ringMinute = glowMaterial(accent, ladder.signFace[1])
  const ringHour = glowMaterial(accent, mid(ladder.signFace))
  const ringRound = glowMaterial(color, ladder.signFace[1])
  const time = useMemo(() => ({ value: 0 }), [])
  const made = useMemo(() => {
    const tone = emissiveColor(color, ladder.shopGlass[0])
    let beam: Material
    if (nodes) {
      beam = nodes.beamNodeMaterial(tone)
    } else {
      beam = new ShaderMaterial({
        vertexShader: BEAM_VERT,
        fragmentShader: BEAM_FRAG,
        uniforms: { uColor: { value: tone.clone() }, uTime: time },
      })
    }
    beam.transparent = true
    beam.blending = AdditiveBlending
    beam.depthWrite = false
    beam.side = DoubleSide
    const cage = new LineBasicMaterial({
      color: emissiveColor(color, ladder.signFace[0]),
      toneMapped: false,
    })
    const core = new LineBasicMaterial({
      color: emissiveColor(accent, mid(ladder.signFace)),
      toneMapped: false,
    })
    return {
      beam,
      cage,
      core,
      pedestal: new CylinderGeometry(r, r * 1.15, base, 40),
      rim: new TorusGeometry(r * 1.02, 0.03 * unit, 8, 64),
      cone: new CylinderGeometry(r * 0.62, r * 0.94, beamH, 40, 1, true),
      shell: new EdgesGeometry(new IcosahedronGeometry(s, 1)),
      heart: new EdgesGeometry(new IcosahedronGeometry(s * 0.4, 0)),
      ring: [1.5, 1.26, 1.02].map((k) => new TorusGeometry(s * k, 0.022 * unit, 6, 120)),
    }
  }, [nodes, color, accent, ladder.shopGlass, ladder.signFace, time, r, s, base, beamH, unit])
  useEffect(
    () => () => {
      for (const part of [
        made.beam,
        made.cage,
        made.core,
        made.pedestal,
        made.rim,
        made.cone,
        made.shell,
        made.heart,
        ...made.ring,
      ]) {
        part.dispose()
      }
    },
    [made],
  )

  const figure = useRef<Group>(null)
  const cage = useRef<Group>(null)
  const core = useRef<Group>(null)
  const minute = useRef<Group>(null)
  const hour = useRef<Group>(null)
  const slow = useRef<Group>(null)
  // It turns: hidden from mirrors, so a reflection never shows it a frame behind.
  useEffect(() => skipMirrors(figure.current), [])
  const emitter = useLight({ color, intensity: 220, distance: 22 * unit, decay: 2 }, light)

  useFrame(() => {
    const seconds = now() / 1000
    time.value = seconds % 1000
    const turn = Math.PI * 2
    if (cage.current) cage.current.rotation.set(seconds * 0.05, seconds * 0.11, 0)
    if (core.current) core.current.rotation.set(seconds * -0.3, seconds * 0.45, 0)
    // Three rings, each tilted its own way and turning about the upright at its own rate.
    if (minute.current) minute.current.rotation.y = ((seconds % 60) / 60) * turn
    if (hour.current) hour.current.rotation.y = ((seconds % 3600) / 3600) * turn
    if (slow.current) slow.current.rotation.y = ((seconds % round) / round) * turn
  })

  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider args={[base / 2, r]} position={[0, base / 2, 0]} />
      </RigidBody>
      <mesh
        position={[0, base / 2, 0]}
        material={metal}
        geometry={made.pedestal}
        castShadow
        receiveShadow
      />
      <Dynamic>
        <group ref={figure}>
          <mesh
            position={[0, base + 0.02 * unit, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={rim}
            geometry={made.rim}
          />
          <mesh
            position={[0, base + beamH / 2, 0]}
            material={made.beam}
            geometry={made.cone}
            renderOrder={2}
          />
          <group position={[0, height * unit, 0]}>
            <group ref={cage}>
              <lineSegments geometry={made.shell} material={made.cage} />
            </group>
            <group ref={core}>
              <lineSegments geometry={made.heart} material={made.core} />
            </group>
            <group ref={minute}>
              <mesh
                rotation={[Math.PI / 2 - 0.5, 0, 0]}
                material={ringMinute}
                geometry={made.ring[2]}
              />
            </group>
            <group ref={hour}>
              <mesh
                rotation={[Math.PI / 2 + 0.35, 0, 0.6]}
                material={ringHour}
                geometry={made.ring[1]}
              />
            </group>
            <group ref={slow}>
              <mesh
                rotation={[Math.PI / 2 + 0.12, 0, -0.3]}
                material={ringRound}
                geometry={made.ring[0]}
              />
            </group>
            <object3D ref={emitter.ref} />
          </group>
        </group>
      </Dynamic>
    </group>
  )
}
