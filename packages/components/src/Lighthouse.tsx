import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import {
  Dynamic,
  useLight,
  useMaterials,
  useSun,
  useWorld,
  type WorldComponentProps,
} from '@runek/core'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, ConeGeometry, DoubleSide, type Group } from 'three'

export interface LighthouseProps extends WorldComponentProps {
  /** Height of the tower to the gallery, in units. */
  height?: number
  /** Radius at the foot, in units; it tapers to two thirds of this at the top. */
  radius?: number
  /** Bands of colour up the tower. */
  bands?: number
  color?: string
  bandColor?: string
  /** The lamp and its beams. */
  lightColor?: string
  /** How fast the beams sweep round, in radians a second. */
  speed?: number
  /** Shine only while the world's sun is down. */
  nightOnly?: boolean
}

const IRON = '#23262b'

/**
 * A lighthouse standing on its origin: a tapered tower in bands, with a door and a few small
 * windows, a gallery with a rail, a glazed lantern under a cap, and a lamp whose two beams
 * sweep round after dusk. The beams are glowing cones rather than lights; the lamp itself
 * lights its surroundings. One cylinder collider round the tower.
 */
export function Lighthouse({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  height = 12,
  radius = 1.6,
  bands = 5,
  color = '#f4f1ea',
  bandColor = '#c0392b',
  lightColor = '#fff2c4',
  speed = 0.6,
  nightOnly = true,
}: LighthouseProps) {
  const { unit } = useWorld()
  const sun = useSun()
  const lit = !nightOnly || !sun.day
  const lamp = useLight({ color: lightColor, intensity: 30, distance: 40 * unit, decay: 1.4 }, lit)
  const m = useMaterials({
    plinth: { color: '#8d8a83', roughness: 1 },
    tower: { color, roughness: 0.8 },
    band: { color: bandColor, roughness: 0.8 },
    door: { color: '#3a2a1e', roughness: 0.8 },
    iron: { color: IRON, roughness: 0.6, metalness: 0.4 },
    glass: { color: '#cfe6ee', transparent: true, opacity: 0.3, roughness: 0.05, side: DoubleSide },
    bulb: lit
      ? { color: lightColor, emissive: lightColor, emissiveIntensity: 3, toneMapped: false }
      : { color: '#d9d4ca' },
  })
  const beams = useRef<Group>(null)
  useFrame((_, dt) => {
    if (beams.current) beams.current.rotation.y += speed * Math.min(dt, 0.1)
  })

  const H = height * unit
  const R0 = radius * unit
  const R1 = R0 * 0.66
  const band = H / bands
  const rAt = (y: number) => R0 + (R1 - R0) * (y / H)
  const lanternH = 1.5 * unit
  const lanternR = R1 * 0.8
  const beamLength = 14 * unit
  // Bright at the lamp, fading to nothing at the far end: added onto the scene, black adds no light.
  const beam = useMemo(() => {
    const g = new ConeGeometry(2.2 * unit, beamLength, 24, 8, true)
    const p = g.attributes.position
    const colors = new Float32Array(p.count * 3)
    for (let i = 0; i < p.count; i++) {
      const near = (p.getY(i) / beamLength + 0.5) ** 1.6
      colors.set([near, near, near], i * 3)
    }
    g.setAttribute('color', new BufferAttribute(colors, 3))
    return g
  }, [unit, beamLength])
  useEffect(() => () => beam.dispose(), [beam])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CylinderCollider args={[H / 2, R0]} position={[0, H / 2, 0]} />
      <mesh material={m.plinth} castShadow receiveShadow position={[0, 0.2 * unit, 0]}>
        <cylinderGeometry args={[R0 * 1.25, R0 * 1.35, 0.4 * unit, 20]} />
      </mesh>
      {Array.from({ length: bands }, (_, i) => {
        const y0 = i * band
        return (
          <mesh
            key={y0}
            material={i % 2 === 0 ? m.tower : m.band}
            castShadow
            receiveShadow
            position={[0, y0 + band / 2, 0]}
          >
            <cylinderGeometry args={[rAt(y0 + band), rAt(y0), band, 24]} />
          </mesh>
        )
      })}
      <mesh material={m.door} position={[0, 1.0 * unit, rAt(1 * unit) - 0.02 * unit]}>
        <boxGeometry args={[0.8 * unit, 1.9 * unit, 0.1 * unit]} />
      </mesh>
      {[0.35, 0.6, 0.82].map((f) => (
        <mesh key={f} material={m.iron} position={[0, H * f, rAt(H * f) - 0.03 * unit]}>
          <boxGeometry args={[0.35 * unit, 0.55 * unit, 0.1 * unit]} />
        </mesh>
      ))}

      <group position={[0, H, 0]}>
        <mesh material={m.iron} castShadow receiveShadow position={[0, 0.08 * unit, 0]}>
          <cylinderGeometry args={[R1 * 1.45, R1 * 1.3, 0.16 * unit, 24]} />
        </mesh>
        <mesh material={m.iron} position={[0, 1.05 * unit, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[R1 * 1.42, 0.03 * unit, 6, 40]} />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          return (
            <mesh
              key={a}
              material={m.iron}
              position={[Math.sin(a) * R1 * 1.42, 0.6 * unit, Math.cos(a) * R1 * 1.42]}
            >
              <cylinderGeometry args={[0.02 * unit, 0.02 * unit, 0.9 * unit, 6]} />
            </mesh>
          )
        })}
        <mesh material={m.glass} position={[0, 0.16 * unit + lanternH / 2, 0]}>
          <cylinderGeometry args={[lanternR, lanternR, lanternH, 16, 1, true]} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2
          return (
            <mesh
              key={a}
              material={m.iron}
              position={[
                Math.sin(a) * lanternR,
                0.16 * unit + lanternH / 2,
                Math.cos(a) * lanternR,
              ]}
            >
              <boxGeometry args={[0.05 * unit, lanternH, 0.05 * unit]} />
            </mesh>
          )
        })}
        <mesh material={m.band} castShadow position={[0, 0.16 * unit + lanternH + 0.45 * unit, 0]}>
          <coneGeometry args={[lanternR * 1.25, 0.9 * unit, 16]} />
        </mesh>
        <mesh material={m.iron} position={[0, 0.16 * unit + lanternH + 0.98 * unit, 0]}>
          <sphereGeometry args={[0.12 * unit, 10, 8]} />
        </mesh>

        <group position={[0, 0.16 * unit + lanternH * 0.5, 0]}>
          <mesh material={m.bulb}>
            <sphereGeometry args={[0.28 * unit, 16, 12]} />
          </mesh>
          <object3D ref={lamp.ref} />
          {lit && (
            <Dynamic>
              <group ref={beams}>
                {[1, -1].map((s) => (
                  <mesh
                    key={s}
                    position={[0, 0, (s * beamLength) / 2]}
                    rotation={[(-s * Math.PI) / 2, 0, 0]}
                    geometry={beam}
                  >
                    <meshBasicMaterial
                      vertexColors
                      color={lightColor}
                      transparent
                      opacity={0.35}
                      blending={AdditiveBlending}
                      depthWrite={false}
                      side={DoubleSide}
                      toneMapped={false}
                    />
                  </mesh>
                ))}
              </group>
            </Dynamic>
          )}
        </group>
      </group>
    </RigidBody>
  )
}

Lighthouse.groundSitting = true
