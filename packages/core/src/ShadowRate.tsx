import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Light, LightShadow, Object3D } from 'three'

type ShadowLight = Light & { shadow?: LightShadow }

// How often, in seconds, to look for shadow-casting lights when they have to be driven one by one.
const RESCAN = 1

/**
 * Redraw the shadow maps at most `rate` times a second instead of every frame. Drawing a shadow
 * map walks the whole scene for the light's camera, which costs as much as the rest of a frame's
 * CPU work in a big world; at 30 a second, moving shadows (people, the avatar) still read as
 * smooth. `Infinity` redraws every frame.
 *
 * `WebGLRenderer` has a switch for every shadow map at once. A renderer without one
 * (`WebGPURenderer`) gets the same rate through each shadow-casting light's own switch; lights are
 * picked up within a second of appearing.
 */
export function ShadowRate({ rate }: { rate: number }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const owed = useRef(Number.POSITIVE_INFINITY)
  const lights = useRef(new Set<LightShadow>())
  const sinceScan = useRef(Number.POSITIVE_INFINITY)
  const perLight = typeof gl.shadowMap?.autoUpdate !== 'boolean'

  useEffect(() => {
    if (!Number.isFinite(rate)) return
    if (perLight) {
      const held = lights.current
      sinceScan.current = Number.POSITIVE_INFINITY
      return () => {
        for (const shadow of held) shadow.autoUpdate = true
        held.clear()
      }
    }
    const map = gl.shadowMap
    map.autoUpdate = false
    map.needsUpdate = true
    return () => {
      map.autoUpdate = true
    }
  }, [gl, rate, perLight])

  useFrame((_, dt) => {
    if (!Number.isFinite(rate)) return
    if (perLight) {
      sinceScan.current += dt
      if (sinceScan.current >= RESCAN) {
        sinceScan.current = 0
        holdShadows(scene, lights.current)
      }
    }
    const period = 1 / rate
    // Accumulate, so the average holds at `rate` whatever the display's refresh; never bank more
    // than one update, so a hitch doesn't cause a burst.
    owed.current = Math.min(owed.current + dt, 2 * period)
    if (owed.current < period) return
    owed.current -= period
    if (perLight) for (const shadow of lights.current) shadow.needsUpdate = true
    else gl.shadowMap.needsUpdate = true
  })

  return null
}

/** Take over the shadows of the scene's shadow-casting lights, and let go of any that left it. */
function holdShadows(scene: Object3D, held: Set<LightShadow>) {
  const found = new Set<LightShadow>()
  scene.traverse((o) => {
    const shadow =
      (o as ShadowLight).isLight && o.castShadow ? (o as ShadowLight).shadow : undefined
    if (shadow) found.add(shadow)
  })
  for (const shadow of held) {
    if (found.has(shadow)) continue
    shadow.autoUpdate = true
    held.delete(shadow)
  }
  for (const shadow of found) {
    if (held.has(shadow)) continue
    shadow.autoUpdate = false
    shadow.needsUpdate = true
    held.add(shadow)
  }
}
