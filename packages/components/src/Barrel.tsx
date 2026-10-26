import { RigidBody } from '@react-three/rapier'
import { useMaterials, useWorld, type Vec3 } from '@runek/core'

export interface BarrelProps {
  position?: Vec3
  rotation?: Vec3
  /** Accepted for the component contract; this component has no seeded variation yet. */
  seed?: number
  radius?: number
  height?: number
  /** Stave color; defaults to the world palette's `wood` slot. */
  color?: string
  /** Hoop color; defaults to the world palette's `metal` slot. */
  hoopColor?: string
}

/** A staved barrel: two frustums bellied at the middle, banded by metal hoops.
 *  A convex-hull collider matches the bulge. Crate's round sibling. */
export function Barrel({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radius = 0.35,
  height = 0.9,
  color,
  hoopColor,
}: BarrelProps) {
  const { unit, palette } = useWorld()
  const m = useMaterials({
    wood: { color: color ?? palette.wood, roughness: 0.85, flatShading: true },
    hoop: { color: hoopColor ?? palette.metal, metalness: 0.5, roughness: 0.5 },
  })
  const r = radius * unit
  const h = height * unit
  const rEnd = r * 0.82
  const seg = 14

  return (
    <RigidBody type="fixed" colliders="hull" position={position} rotation={rotation}>
      <mesh material={m.wood} castShadow receiveShadow position={[0, h / 4, 0]}>
        <cylinderGeometry args={[r, rEnd, h / 2, seg]} />
      </mesh>
      <mesh material={m.wood} castShadow receiveShadow position={[0, (3 * h) / 4, 0]}>
        <cylinderGeometry args={[rEnd, r, h / 2, seg]} />
      </mesh>
      {[0.12, 0.5, 0.88].map((f) => (
        <mesh
          key={`hoop-${f}`}
          material={m.hoop}
          position={[0, h * f, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <torusGeometry args={[f === 0.5 ? r * 1.03 : rEnd * 1.06, 0.02 * h, 6, seg]} />
        </mesh>
      ))}
    </RigidBody>
  )
}

Barrel.groundSitting = true
