import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMaterials, useWorld, type WorldComponentProps } from '@runek/core'

export interface GlassRailProps extends WorldComponentProps {
  /** Length along local X, in units, centred on the origin. */
  width?: number
  /** To the top of the handrail, in units. */
  height?: number
  /** Glass tint. */
  glassColor?: string
  /** Shoe and handrail. Defaults to the world palette's `metal` slot. */
  color?: string
}

/**
 * A straight glass balustrade for a gallery or a mezzanine: a pane standing in a steel shoe
 * along local X, with a round handrail along its top. Its glass matches `CurvedWall`'s, so the
 * two run on from each other. One cuboid collider the height of the rail, so a player can't
 * walk off the edge it guards.
 */
export function GlassRail({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 2,
  height = 1.05,
  glassColor = '#b7d8e8',
  color,
}: GlassRailProps) {
  const { unit, palette } = useWorld()
  const m = useMaterials({
    glass: { color: glassColor, transparent: true, opacity: 0.28, roughness: 0.08 },
    steel: { color: color ?? palette.metal, roughness: 0.6 },
  })
  const W = width * unit
  const H = height * unit
  const shoeH = 0.1 * unit
  const shoeD = 0.06 * unit
  const rail = 0.025 * unit
  const paneH = H - shoeH * 0.6 - rail * 2.2

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[W / 2, H / 2, 0.05 * unit]} position={[0, H / 2, 0]} />
      <mesh material={m.steel} castShadow receiveShadow position={[0, shoeH / 2, 0]}>
        <boxGeometry args={[W, shoeH, shoeD]} />
      </mesh>
      <mesh material={m.glass} position={[0, shoeH * 0.6 + paneH / 2, 0]}>
        <boxGeometry args={[W - rail, paneH, 0.015 * unit]} />
      </mesh>
      <mesh material={m.steel} position={[0, H - rail * 1.6, 0]}>
        <boxGeometry args={[W, rail * 0.6, 0.03 * unit]} />
      </mesh>
      <mesh
        material={m.steel}
        castShadow
        position={[0, H - rail, 0]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[rail, rail, W, 12]} />
      </mesh>
    </RigidBody>
  )
}

GlassRail.groundSitting = true
