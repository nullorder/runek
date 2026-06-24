import { useFrame } from '@react-three/fiber'
import { currentHours, sunState, useWorld, type Vec3 } from '@runek/core'
import { useState } from 'react'
import { Color } from 'three'

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

// Sun tint across the day: warm at the horizon, near-white at noon, cool moonlight at night.
const NOON = new Color('#fff4e0')
const HORIZON = new Color('#ff9a55')
const MOON = new Color('#9fb2e6')

function sunTint(day: boolean, elevation: number): string {
  if (!day) return `#${MOON.getHexString()}`
  return `#${HORIZON.clone().lerp(NOON, elevation).getHexString()}`
}

/**
 * A drop-in sun + sky/ground fill rig. Pair with `<World lights={false}>`. With no
 * explicit sun props it tracks the world's time-of-day: the sun's position, tint,
 * and intensity follow `<World time>` / `timezone` (golden hour, blue hour, dim
 * moonlight). Any prop you set wins over the time-derived value.
 */
export function LightRig({
  sunPosition,
  sunColor,
  sunIntensity,
  ambient,
  skyColor = '#bcd4ff',
  groundColor = '#4a4030',
  shadows = true,
  shadowRange = 30,
}: LightRigProps) {
  const { time } = useWorld()

  const [hours, setHours] = useState(() => currentHours(time))
  useFrame(() => {
    if (!time.live) return
    const h = currentHours(time)
    setHours((prev) => (Math.abs(h - prev) > 0.02 ? h : prev))
  })

  const sun = sunState(hours)
  const e = sun.elevation

  const position = sunPosition ?? sun.position
  const color = sunColor ?? sunTint(sun.day, e)
  const intensity = sunIntensity ?? (sun.day ? 0.3 + 1.4 * e : 0.08)
  const amb = ambient ?? (sun.day ? 0.18 + 0.22 * e : 0.1)
  const hemiIntensity = sun.day ? 0.25 + 0.45 * e : 0.15

  return (
    <>
      <hemisphereLight color={skyColor} groundColor={groundColor} intensity={hemiIntensity} />
      <ambientLight intensity={amb} />
      <directionalLight
        position={position}
        color={color}
        intensity={intensity}
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
