import { useWorld, type Vec3 } from '@runek/core'
import { bladeSign } from './city/kitParts'
import { useKit } from './city/useKit'

export interface BladeSignProps {
  /** Bottom of the board at the wall [x, y, z] in units. The board stands out along local +Z. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. Turn about Y so local +Z points out of the wall. */
  rotation?: Vec3
  /** Accepted for the component contract. This component has no seeded variation. */
  seed?: number
  /** The word to stack, top to bottom. Spaces are dropped. */
  text?: string
  /** Letter height in units. 0.3 reads at 20 m, 1.5 at 100 m. */
  letter?: number
  /** Lamp color of the letters and the edge tubes. */
  color?: string
  /** Gap between the wall and the board, in units. */
  gap?: number
  /** Run a tube down both edges of the board. */
  tube?: boolean
}

/**
 * A blade sign: a dark board standing out from a wall with one word stacked down both faces, in
 * the world's display font, lit at the world's `sign` luminance level. Drawn by the world's shared
 * kit meshes and shown in reflections. No collider.
 */
export function BladeSign({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  text = 'NOODLE',
  letter = 0.55,
  color = '#ff6418',
  gap = 0.3,
  tube = true,
}: BladeSignProps) {
  const { unit } = useWorld()
  const ref = useKit(
    (kit) => bladeSign(kit, 0, 0, 0, text, { letter: letter, color, gap: gap, tube }),
    [text, letter, color, gap, tube],
    [position, rotation, unit],
  )
  return <group ref={ref} position={position} rotation={rotation} scale={unit} />
}
