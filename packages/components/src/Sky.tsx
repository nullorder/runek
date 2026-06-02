import { Sky as DreiSky } from '@react-three/drei'
import type { Vec3 } from '@runek/core'

export interface SkyProps {
  /** Direction of the sun; also where the bright spot appears. */
  sunPosition?: Vec3
  turbidity?: number
  rayleigh?: number
}

/** Procedural atmospheric sky (no textures). */
export function Sky({ sunPosition = [80, 30, 40], turbidity = 8, rayleigh = 1.4 }: SkyProps) {
  return <DreiSky sunPosition={sunPosition} turbidity={turbidity} rayleigh={rayleigh} />
}
