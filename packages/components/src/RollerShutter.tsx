import { useWorld, type Vec3 } from '@runek/core'
import { rollerShutter } from './city/kitParts'
import { useKit } from './city/useKit'

export interface RollerShutterProps {
  /** Bottom centre of the opening on the wall [x, y, z] in units. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. Turn about Y so local +Z points out of the wall. */
  rotation?: Vec3
  /** Accepted for the component contract. This component has no seeded variation. */
  seed?: number
  /** Width of the opening, in units. */
  width?: number
  /** Height of the opening, in units. */
  height?: number
  /** Share rolled up: 0 is down, 1 is fully open. */
  open?: number
  /** Slat color. */
  color?: string
}

/**
 * A slatted roller shutter in its housing, with side guides. Drawn by the world's shared kit
 * meshes. No collider.
 */
export function RollerShutter({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 3.4,
  height = 2.9,
  open = 0,
  color = '#6e6a62',
}: RollerShutterProps) {
  const { unit } = useWorld()
  const ref = useKit(
    (kit) => rollerShutter(kit, 0, 0, 0, width, height, { open, color }),
    [width, height, open, color],
    [position, rotation, unit],
  )
  return <group ref={ref} position={position} rotation={rotation} scale={unit} />
}
