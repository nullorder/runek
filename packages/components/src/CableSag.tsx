import { useWorld, type Vec3 } from '@runek/core'
import { cableSag } from './city/kitParts'
import { useKit } from './city/useKit'

export interface CableSagProps {
  /** The near anchor [x, y, z] in units. The cable crosses along local +Z. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. Turn about Y to aim it across the street. */
  rotation?: Vec3
  /** Accepted for the component contract. This component has no seeded variation. */
  seed?: number
  /** Distance to the far anchor, in units. */
  span?: number
  /** How far the middle hangs below the straight line, in units. */
  sag?: number
  /** How much higher (or lower, when negative) the far anchor sits, in units. */
  drop?: number
  /** Straight pieces the curve is cut into. */
  segments?: number
  /** Cable thickness, in units. */
  thickness?: number
  /** Cable color. */
  color?: string
}

/**
 * A cable sagging across a street between two anchors: a parabola cut into straight pieces.
 * Drawn by the world's shared kit meshes and left out of the world's mirrors. No collider.
 */
export function CableSag({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  span = 27,
  sag = 1.4,
  drop = 0,
  segments = 8,
  thickness = 0.04,
  color = '#141110',
}: CableSagProps) {
  const { unit } = useWorld()
  const ref = useKit(
    (kit) =>
      cableSag(kit, 0, 0, 0, span, {
        sag: sag,
        drop: drop,
        segments: Math.max(2, Math.round(segments)),
        thickness: thickness,
        color,
      }),
    [span, sag, drop, segments, thickness, color],
    [position, rotation, unit],
  )
  return <group ref={ref} position={position} rotation={rotation} scale={unit} />
}
