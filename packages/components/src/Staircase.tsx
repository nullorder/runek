import { RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

export interface StaircaseProps {
  position?: Vec3
  rotation?: Vec3
  steps?: number
  /** Total rise, in units. Ascends along +y and +z from the origin. */
  totalHeight?: number
  width?: number
  /** Total run (depth), in units. */
  depth?: number
  color?: string
}

export function Staircase({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  steps = 6,
  totalHeight = 1.5,
  width = 1.2,
  depth = 2.4,
  color = '#9a8c78',
}: StaircaseProps) {
  const { unit } = useWorld()
  const w = width * unit
  const rise = (totalHeight * unit) / steps
  const run = (depth * unit) / steps

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
      {Array.from({ length: steps }, (_, i) => {
        const h = rise * (i + 1)
        return (
          <mesh
            key={`step-${h.toFixed(4)}`}
            castShadow
            receiveShadow
            position={[0, h / 2, run * (i + 0.5)]}
          >
            <boxGeometry args={[w, h, run]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )
      })}
    </RigidBody>
  )
}
