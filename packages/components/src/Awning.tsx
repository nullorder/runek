import { useWorld, type Vec3 } from '@runek/core'
import { awning } from './city/kitParts'
import { useKit } from './city/useKit'

export interface AwningProps {
  /** Middle of the top edge, where it meets the wall [x, y, z] in units. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. Turn about Y so local +Z points out of the wall. */
  rotation?: Vec3
  /** Accepted for the component contract. This component has no seeded variation. */
  seed?: number
  /** Width along the wall, in units. */
  width?: number
  /** How far it reaches over the pavement, in units. */
  depth?: number
  /** How far the outer edge hangs below the wall edge, in units. */
  drop?: number
  /** Fabric color. */
  color?: string
  /** Paint the fabric in two-tone stripes. */
  stripes?: boolean
}

/**
 * A sloped fabric awning with a valance and two arms. Drawn by the world's shared kit meshes.
 * The fabric shows in reflections, the arms do not. No collider.
 */
export function Awning({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 3.4,
  depth = 1.3,
  drop = 0.45,
  color = '#5a2a1c',
  stripes = true,
}: AwningProps) {
  const { unit } = useWorld()
  const ref = useKit(
    (kit) => awning(kit, 0, 0, 0, width, { depth: depth, drop: drop, color, stripes }),
    [width, depth, drop, color, stripes],
    [position, rotation, unit],
  )
  return <group ref={ref} position={position} rotation={rotation} scale={unit} />
}
