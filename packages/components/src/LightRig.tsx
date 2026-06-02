import type { Vec3 } from '@runek/core'

export interface LightRigProps {
  sunPosition?: Vec3
  sunColor?: string
  sunIntensity?: number
  ambient?: number
  skyColor?: string
  groundColor?: string
  shadows?: boolean
  /** Half-extent of the shadow camera frustum, in units. */
  shadowRange?: number
}

/** A drop-in sun + sky/ground fill rig. Pair with `<World lights={false}>`. */
export function LightRig({
  sunPosition = [12, 18, 8],
  sunColor = '#fff4e0',
  sunIntensity = 1.7,
  ambient = 0.35,
  skyColor = '#bcd4ff',
  groundColor = '#4a4030',
  shadows = true,
  shadowRange = 30,
}: LightRigProps) {
  return (
    <>
      <hemisphereLight color={skyColor} groundColor={groundColor} intensity={0.7} />
      <ambientLight intensity={ambient} />
      <directionalLight
        position={sunPosition}
        color={sunColor}
        intensity={sunIntensity}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-camera-left={-shadowRange}
        shadow-camera-right={shadowRange}
        shadow-camera-top={shadowRange}
        shadow-camera-bottom={-shadowRange}
      />
    </>
  )
}
