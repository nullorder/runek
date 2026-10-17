import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { range, rng, sub, useSun, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo, useRef } from 'react'
import type { Group, PointLight } from 'three'

export interface TikiTorchProps extends WorldComponentProps {
  /** Height to the top of the head, in units. */
  height?: number
  /** Bamboo pole and joints. */
  color?: string
  /** Woven head and bindings. Defaults to the palette's `bark`. */
  headColor?: string
  /** The outer flame. */
  flameColor?: string
  /** Light strength; it flickers around this. */
  intensity?: number
  /** Burning, or cold. */
  on?: boolean
  /** Burn only while the world's sun is down. */
  nightOnly?: boolean
}

/**
 * A bamboo tiki torch: a jointed pole with a seeded lean, a woven head bound in cord, and an
 * animated flame with a warm flickering light, for a beachfront path or a garden at dusk.
 * `nightOnly` lights it only after sunset. One thin cuboid collider.
 */
export function TikiTorch({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  height = 1.7,
  color,
  headColor,
  flameColor = '#ff7a1a',
  intensity = 6,
  on = true,
  nightOnly = false,
}: TikiTorchProps) {
  const { unit, palette } = useWorld()
  const sun = useSun()
  const lit = on && (!nightOnly || !sun.day)
  const pole = color ?? '#b89a5e'
  const head = headColor ?? palette.bark
  const H = height * unit
  const flameRef = useRef<Group>(null)
  const lightRef = useRef<PointLight>(null)

  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    const headH = range(r, 0.22, 0.3) * unit
    const poleH = H - headH
    const joints = Math.max(2, Math.round(poleH / (range(r, 0.35, 0.5) * unit)))
    return {
      lean: [range(r, -0.04, 0.04), 0, range(r, -0.04, 0.04)] as [number, number, number],
      headH,
      headR: range(r, 0.07, 0.09) * unit,
      flare: range(r, 1.1, 1.35),
      poleH,
      joints: Array.from({ length: joints - 1 }, (_, i) => ((i + 1) / joints) * poleH),
      bands: 2 + Math.floor(r() * 2),
      phase: r() * 10,
    }
  }, [seed, H, unit])

  useFrame(({ clock }) => {
    if (!lit) return
    const t = clock.elapsedTime + look.phase
    const n = Math.sin(t * 11) * 0.5 + Math.sin(t * 19 + 1) * 0.3 + Math.sin(t * 7 + 2) * 0.2
    if (flameRef.current) {
      flameRef.current.scale.set(1 - n * 0.08, 1 + n * 0.22, 1 - n * 0.08)
      flameRef.current.rotation.z = n * 0.08
    }
    if (lightRef.current) lightRef.current.intensity = intensity * (1 + n * 0.25)
  })

  const poleR = 0.022 * unit
  const { headH, headR, poleH } = look

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[poleR * 2, H / 2, poleR * 2]} position={[0, H / 2, 0]} />
      <group rotation={look.lean}>
        <mesh position={[0, poleH / 2, 0]} castShadow>
          <cylinderGeometry args={[poleR, poleR * 1.15, poleH, 10]} />
          <meshStandardMaterial color={pole} roughness={0.7} />
        </mesh>
        {look.joints.map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <torusGeometry args={[poleR * 1.05, poleR * 0.25, 6, 12]} />
            <meshStandardMaterial color={pole} roughness={0.8} />
          </mesh>
        ))}
        {/* the woven head flares from the pole to its rim, bound with cord */}
        <mesh position={[0, poleH + headH / 2, 0]} castShadow>
          <cylinderGeometry args={[headR * look.flare, headR * 0.55, headH, 10, 1, true]} />
          <meshStandardMaterial color={head} roughness={1} side={2} flatShading />
        </mesh>
        {Array.from({ length: look.bands }, (_, i) => {
          const k = (i + 0.5) / look.bands
          return (
            <mesh key={k} position={[0, poleH + headH * k, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry
                args={[headR * (0.55 + (look.flare - 0.55) * k) * 1.02, 0.006 * unit, 5, 14]}
              />
              <meshStandardMaterial color={pole} roughness={0.9} />
            </mesh>
          )
        })}
        <mesh position={[0, poleH + headH * 0.92, 0]}>
          <cylinderGeometry
            args={[headR * look.flare * 0.92, headR * look.flare * 0.92, 0.01 * unit, 10]}
          />
          <meshStandardMaterial color="#1a1410" roughness={1} />
        </mesh>
        {lit && (
          <>
            <group ref={flameRef} position={[0, poleH + headH, 0]}>
              <mesh position={[0, headR * 1.3, 0]}>
                <coneGeometry args={[headR * 0.9, headR * 2.8, 9]} />
                <meshBasicMaterial
                  color={flameColor}
                  transparent
                  opacity={0.85}
                  toneMapped={false}
                />
              </mesh>
              <mesh position={[0, headR * 0.9, 0]}>
                <coneGeometry args={[headR * 0.5, headR * 1.8, 9]} />
                <meshBasicMaterial color="#ffd84d" transparent opacity={0.9} toneMapped={false} />
              </mesh>
            </group>
            <pointLight
              ref={lightRef}
              position={[0, poleH + headH + headR * 2, 0]}
              color="#ff9a3c"
              intensity={intensity}
              distance={8 * unit}
              decay={2}
            />
          </>
        )}
      </group>
    </RigidBody>
  )
}

TikiTorch.groundSitting = true
