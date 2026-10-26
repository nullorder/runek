import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

/**
 * Redraw the shadow maps at most `rate` times a second instead of every frame. Drawing a shadow
 * map walks the whole scene for the light's camera, which costs as much as the rest of a frame's
 * CPU work in a big world; at 30 a second, moving shadows (people, the avatar) still read as
 * smooth. `Infinity` redraws every frame.
 */
export function ShadowRate({ rate }: { rate: number }) {
  const gl = useThree((s) => s.gl)
  const owed = useRef(Number.POSITIVE_INFINITY)

  useEffect(() => {
    if (!Number.isFinite(rate)) return
    const map = gl.shadowMap
    map.autoUpdate = false
    map.needsUpdate = true
    return () => {
      map.autoUpdate = true
    }
  }, [gl, rate])

  useFrame((_, dt) => {
    if (!Number.isFinite(rate)) return
    const period = 1 / rate
    // Accumulate, so the average holds at `rate` whatever the display's refresh; never bank more
    // than one update, so a hitch doesn't cause a burst.
    owed.current = Math.min(owed.current + dt, 2 * period)
    if (owed.current < period) return
    owed.current -= period
    gl.shadowMap.needsUpdate = true
  })

  return null
}
