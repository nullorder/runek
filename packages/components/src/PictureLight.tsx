import { useSun, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'
import { Object3D } from 'three'

export interface PictureLightProps extends WorldComponentProps {
  /** Length of the hood, in units. */
  width?: number
  /** How far the hood stands out from the mount, in units. */
  reach?: number
  /** How far below the mount the light falls, in units: the picture's or the shelf's height. */
  fall?: number
  /** Hood, arms, and back plate; defaults to the palette's `accent` (brass). */
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

/**
 * A picture light: a brass hood on one or two arms (two past 0.6 m), washing the face below it.
 * Its origin is the mount point on a vertical face, which it stands out from along local +Z: fix
 * it over a picture on a `Wall`, or on the top front edge of a `Bookshelf` to light the books.
 * Accepts `seed` for the contract; it has no seeded variation. Decorative: no collider.
 */
export function PictureLight({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 0.5,
  reach = 0.16,
  fall = 1.2,
  color,
  lightColor = '#ffe6c0',
  intensity = 6,
  on = true,
  nightOnly = false,
}: PictureLightProps) {
  const { unit, palette } = useWorld()
  const sun = useSun()
  const lit = on && (!nightOnly || !sun.day)
  const brass = color ?? palette.accent
  const W = width * unit
  const Z = reach * unit
  const rise = 0.06 * unit
  const hoodR = 0.035 * unit
  const arms = width > 0.6 ? [-W * 0.3, W * 0.3] : [0]
  const armLen = Math.hypot(Z, rise)
  const armTilt = Math.atan2(Z, rise)

  const target = useMemo(() => new Object3D(), [])
  const metal = <meshStandardMaterial color={brass} metalness={0.75} roughness={0.3} />

  return (
    <group position={position} rotation={rotation}>
      {arms.map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0, 0.004 * unit]}>
            <boxGeometry args={[0.05 * unit, 0.07 * unit, 0.008 * unit]} />
            {metal}
          </mesh>
          <mesh position={[0, rise / 2, Z / 2]} rotation={[armTilt, 0, 0]}>
            <cylinderGeometry args={[0.005 * unit, 0.005 * unit, armLen, 8]} />
            {metal}
          </mesh>
        </group>
      ))}
      {/* the hood: a half tube along X, opening down and back toward the face it lights */}
      <group position={[0, rise, Z]} rotation={[-0.5, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[hoodR, hoodR, W, 18, 1, true, 0, Math.PI]} />
          <meshStandardMaterial color={brass} metalness={0.75} roughness={0.3} side={2} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[(s * W) / 2, 0, 0]} rotation={[0, (s * Math.PI) / 2, 0]}>
            <circleGeometry args={[hoodR, 18, 0, Math.PI]} />
            {metal}
          </mesh>
        ))}
        <mesh position={[0, -hoodR * 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008 * unit, 0.008 * unit, W * 0.9, 8]} />
          <meshStandardMaterial
            color="#fff6e0"
            emissive={lightColor}
            emissiveIntensity={lit ? 2 : 0}
            toneMapped={!lit}
          />
        </mesh>
      </group>
      <primitive object={target} position={[0, -fall * unit * 0.6, 0]} />
      {lit && (
        <spotLight
          position={[0, rise - hoodR, Z]}
          target={target}
          color={lightColor}
          intensity={intensity}
          distance={(fall + 1) * unit}
          angle={0.9}
          penumbra={0.8}
          decay={2}
        />
      )}
    </group>
  )
}
