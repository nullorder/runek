import { Sky as DreiSky, Stars } from '@react-three/drei'
import { useSun, type Vec3 } from '@runek/core'

export interface SkyProps {
  /** Accepted for the component contract; this component has no seeded variation yet. */
  seed?: number
  /** Direction of the sun; also where the bright spot appears. Set this to pin the
   *  sky to a fixed sun and bypass the world's day/night cycle. */
  sunPosition?: Vec3
  turbidity?: number
  rayleigh?: number
  /** Background when the sun is below the horizon. */
  nightColor?: string
}

/**
 * Procedural atmospheric sky (no textures). With no explicit `sunPosition` it
 * follows the world's time-of-day (`<World time>` / `timezone`): the sun arcs
 * overhead by day, and at night the dome swaps to a dark sky with a procedural
 * starfield. Pass `sunPosition` to pin a fixed sun and opt out of the cycle.
 */
export function Sky({
  sunPosition,
  turbidity = 8,
  rayleigh = 1.4,
  nightColor = '#04060e',
}: SkyProps) {
  const sun = useSun()
  if (sunPosition) {
    return <DreiSky sunPosition={sunPosition} turbidity={turbidity} rayleigh={rayleigh} />
  }

  if (!sun.day) {
    return (
      <>
        <color attach="background" args={[nightColor]} />
        <Stars radius={80} depth={50} count={2500} factor={4} saturation={0} fade speed={0.4} />
      </>
    )
  }
  return <DreiSky sunPosition={sun.position} turbidity={turbidity} rayleigh={rayleigh} />
}
