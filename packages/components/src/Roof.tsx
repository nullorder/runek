import { RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'
import { ExtrudeGeometry, Shape } from 'three'

export type RoofStyle = 'flat' | 'gable'

export interface RoofProps {
  position?: Vec3
  rotation?: Vec3
  /** `[width, depth]` in units. The roof rests with its base at the component origin. */
  size?: [number, number]
  style?: RoofStyle
  /** Ridge height for a gable roof, in units. */
  peak?: number
  thickness?: number
  overhang?: number
  /** Cap the triangular gable ends so the attic isn't open to the outside. */
  ends?: boolean
  /** Defaults to the world palette's `roof` slot. */
  color?: string
  /** Gable end caps; defaults to the world palette's `wall` slot. */
  endColor?: string
}

export function Roof({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = [8, 8],
  style = 'gable',
  peak = 1.6,
  thickness = 0.18,
  overhang = 0.3,
  ends = true,
  color,
  endColor,
}: RoofProps) {
  const { unit, palette } = useWorld()
  const roofColor = color ?? palette.roof
  const w = size[0] * unit + overhang * 2 * unit
  const d = size[1] * unit + overhang * 2 * unit
  const t = thickness * unit
  const ridge = peak * unit
  const gabled = style === 'gable'

  // Gable end cap: a triangular prism spanning the un-overhung depth, apex at the
  // ridge. The base sits inside the roof's eave overhang, so it lands on the walls.
  const innerHalfD = (size[1] / 2) * unit
  const endGeometry = useMemo(() => {
    if (!gabled || !ends) return null
    const shape = new Shape()
    shape.moveTo(-innerHalfD, 0)
    shape.lineTo(innerHalfD, 0)
    shape.lineTo(0, ridge)
    shape.closePath()
    return new ExtrudeGeometry(shape, { depth: t, bevelEnabled: false })
  }, [gabled, ends, innerHalfD, ridge, t])

  if (!gabled) {
    return (
      <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
        <mesh castShadow receiveShadow position={[0, t / 2, 0]}>
          <boxGeometry args={[w, t, d]} />
          <meshStandardMaterial color={roofColor} />
        </mesh>
      </RigidBody>
    )
  }

  const slope = Math.hypot(d / 2, ridge)
  const angle = Math.atan2(ridge, d / 2)
  const capX = (size[0] / 2) * unit

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
      <mesh castShadow receiveShadow position={[0, ridge / 2, d / 4]} rotation={[angle, 0, 0]}>
        <boxGeometry args={[w, t, slope]} />
        <meshStandardMaterial color={roofColor} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, ridge / 2, -d / 4]} rotation={[-angle, 0, 0]}>
        <boxGeometry args={[w, t, slope]} />
        <meshStandardMaterial color={roofColor} />
      </mesh>
      {endGeometry &&
        [capX, -capX].map((x) => (
          <mesh
            key={x}
            castShadow
            receiveShadow
            geometry={endGeometry}
            position={[x - t / 2, 0, 0]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <meshStandardMaterial color={endColor ?? palette.wall} />
          </mesh>
        ))}
    </RigidBody>
  )
}
