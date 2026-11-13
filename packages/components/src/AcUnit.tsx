import { rng, useWorld, type Vec3 } from '@runek/core'
import { acUnit } from './city/kitParts'
import { useKit } from './city/useKit'

export interface AcUnitProps {
  /** Where the bracket meets the wall [x, y, z] in units. The unit hangs out along local +Z. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. Turn about Y so local +Z points out of the wall. */
  rotation?: Vec3
  /** Seeds the case tone and the fan's phase. */
  seed?: number
  /** Wrap it in a wire cage. */
  cage?: boolean
}

/**
 * An outdoor AC unit on a wall bracket with its drain hose. Drawn by the world's shared kit
 * meshes, so any number of them cost no extra draw calls. Left out of the world's mirrors. No collider.
 */
export function AcUnit({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  cage = false,
}: AcUnitProps) {
  const { unit } = useWorld()
  const ref = useKit(
    (kit) => acUnit(kit, 0, 0, 0, { seed: rng(seed)(), cage }),
    [seed, cage],
    [position, rotation, unit],
  )
  return <group ref={ref} position={position} rotation={rotation} scale={unit} />
}
