import { useWorld, type Vec3 } from '@runek/core'
import { vent } from './city/kitParts'
import { useKit } from './city/useKit'

export interface VentProps {
  /** Bottom centre of the vent on the wall [x, y, z] in units. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. Turn about Y so local +Z points out of the wall. */
  rotation?: Vec3
  /** Accepted for the component contract. This component has no seeded variation. */
  seed?: number
  /** Width along the wall, in units. */
  width?: number
  /** Height, in units. */
  height?: number
}

/**
 * A louvred wall vent under a small hood. Drawn by the world's shared kit meshes and left out of
 * the world's mirrors. No collider.
 */
export function Vent({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 0.6,
  height = 0.45,
}: VentProps) {
  const { unit } = useWorld()
  const ref = useKit(
    (kit) => vent(kit, 0, 0, 0, { width: width, height: height }),
    [width, height],
    [position, rotation, unit],
  )
  return <group ref={ref} position={position} rotation={rotation} scale={unit} />
}
