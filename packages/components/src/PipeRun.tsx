import { useWorld, type Vec3 } from '@runek/core'
import { pipeRun } from './city/kitParts'
import { useKit } from './city/useKit'

export interface PipeRunProps {
  /** Where the run starts on the wall [x, y, z] in units. It climbs along local +Y, or runs along local +X when `horizontal`. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. Turn about Y so local +Z points out of the wall. */
  rotation?: Vec3
  /** Accepted for the component contract. This component has no seeded variation. */
  seed?: number
  /** Length of the run, in units. */
  length?: number
  /** Run along the wall instead of up it. */
  horizontal?: boolean
  /** Pipe radius, in units. */
  radius?: number
  /** Pipe color. */
  color?: string
}

/**
 * A pipe or conduit run clipped to a wall, with a collar every couple of metres. Drawn by the
 * world's shared kit meshes and left out of the world's mirrors. No collider.
 */
export function PipeRun({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 6,
  horizontal = false,
  radius = 0.06,
  color = '#4a4844',
}: PipeRunProps) {
  const { unit } = useWorld()
  const ref = useKit(
    (kit) => pipeRun(kit, 0, 0, 0, length, { horizontal, radius: radius, color }),
    [length, horizontal, radius, color],
    [position, rotation, unit],
  )
  return <group ref={ref} position={position} rotation={rotation} scale={unit} />
}
