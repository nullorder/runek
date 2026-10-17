import { pick, rng, sub, useSun, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'

export interface DeskLampProps extends WorldComponentProps {
  /** Shade width, in units. */
  width?: number
  /** The glass shade. Seeded (mostly library green) when unset. */
  shadeColor?: string
  /** Base, stem, and harp; defaults to the palette's `accent` (brass). */
  color?: string
  /** The light and the glowing bulb. */
  lightColor?: string
  /** Light strength. */
  intensity?: number
  /** Switched on. */
  on?: boolean
  /** Light only while the world's sun is down. */
  nightOnly?: boolean
}

const SHADES = ['#1f6b47', '#1f6b47', '#1f6b47', '#2b4f8a', '#8a2b2b', '#b8862f']

/**
 * A banker's desk lamp: a brass base and stem holding a cased glass shade over the work, with a
 * pull chain. Its origin is the foot, so it sits on a `Desk` or `Table` top, and its small light
 * pools on the desk below. `nightOnly` lights it with the world's dusk. Decorative: no collider.
 */
export function DeskLamp({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  width = 0.3,
  shadeColor,
  color,
  lightColor = '#ffe2b0',
  intensity = 3,
  on = true,
  nightOnly = false,
}: DeskLampProps) {
  const { unit, palette } = useWorld()
  const sun = useSun()
  const lit = on && (!nightOnly || !sun.day)
  const brass = color ?? palette.accent
  const W = width * unit
  const shadeR = W * 0.3
  const stemH = W * 1.05

  const shade = useMemo(() => shadeColor ?? pick(rng(sub(seed, 0)), SHADES), [seed, shadeColor])

  const metal = <meshStandardMaterial color={brass} metalness={0.75} roughness={0.3} />
  const baseH = 0.025 * unit

  return (
    <group position={position} rotation={rotation}>
      {/* an oval base: a cylinder squashed front to back */}
      <mesh position={[0, baseH / 2, 0]} scale={[1, 1, 0.62]} castShadow receiveShadow>
        <cylinderGeometry args={[W * 0.36, W * 0.4, baseH, 28]} />
        {metal}
      </mesh>
      <mesh position={[0, stemH / 2, -W * 0.06]} castShadow>
        <cylinderGeometry args={[0.008 * unit, 0.01 * unit, stemH, 10]} />
        {metal}
      </mesh>
      {/* the harp: a bar across under the shade, a short arm forward to it */}
      <mesh position={[0, stemH, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006 * unit, 0.006 * unit, W * 0.14, 8]} />
        {metal}
      </mesh>
      <group position={[0, stemH + shadeR * 0.2, W * 0.08]} rotation={[-0.18, 0, 0]}>
        {/* cased glass: a half tube lying along X, opening downward, with end caps */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[shadeR, shadeR, W, 24, 1, true, 0, Math.PI]} />
          <meshStandardMaterial
            color={shade}
            roughness={0.15}
            metalness={0.1}
            emissive={shade}
            emissiveIntensity={lit ? 0.25 : 0}
            side={2}
          />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[(s * W) / 2, 0, 0]} rotation={[0, (s * Math.PI) / 2, 0]}>
            <circleGeometry args={[shadeR, 24, 0, Math.PI]} />
            {metal}
          </mesh>
        ))}
        <mesh position={[0, -shadeR * 0.35, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012 * unit, 0.012 * unit, W * 0.7, 10]} />
          <meshStandardMaterial
            color="#fff6e0"
            emissive={lightColor}
            emissiveIntensity={lit ? 2 : 0}
            toneMapped={!lit}
          />
        </mesh>
        <mesh position={[W * 0.2, -shadeR * 0.6, shadeR * 0.95]}>
          <cylinderGeometry args={[0.002 * unit, 0.002 * unit, shadeR * 1.2, 4]} />
          {metal}
        </mesh>
        <mesh position={[W * 0.2, -shadeR * 1.22, shadeR * 0.95]}>
          <sphereGeometry args={[0.007 * unit, 8, 6]} />
          {metal}
        </mesh>
        {lit && (
          <pointLight
            position={[0, -shadeR * 0.8, 0]}
            color={lightColor}
            intensity={intensity}
            distance={3 * unit}
            decay={2}
          />
        )}
      </group>
    </group>
  )
}
