import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { vendingMachine } from './city/kitParts'
import { useKit } from './city/useKit'

export interface VendingMachineProps {
  /** Middle of the back of the machine at the ground [x, y, z] in units. It faces local +Z. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. Turn about Y so local +Z points away from the wall behind it. */
  rotation?: Vec3
  /** Seeds the rows of goods in the window. */
  seed?: number
  /** Case color. */
  color?: string
  /** Lamp color of the window, lit at the world's `screen` luminance level. */
  lamp?: string
}

/**
 * A vending machine standing against a wall: a matte case and a lit window of goods. Drawn by
 * the world's shared kit meshes. The window shows in reflections. One cuboid collider.
 */
export function VendingMachine({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  color = '#3a2f45',
  lamp = '#ffcf9a',
}: VendingMachineProps) {
  const { unit } = useWorld()
  const ref = useKit(
    (kit) => vendingMachine(kit, 0, 0, 0, { seed: rng(seed)(), color, lamp }),
    [seed, color, lamp],
    [position, rotation, unit],
  )
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <group ref={ref} scale={unit} />
      <CuboidCollider
        args={[0.5 * unit, 0.93 * unit, 0.36 * unit]}
        position={[0, 0.93 * unit, 0.36 * unit]}
      />
    </RigidBody>
  )
}

VendingMachine.groundSitting = true
