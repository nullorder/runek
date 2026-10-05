import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { live } from './refs'

/** Samples renderer counters into `live.stats` for the DOM overlay. */
export function StatsProbe() {
  const gl = useThree((s) => s.gl)
  const frames = useRef({ n: 0, since: performance.now() })

  useEffect(() => {
    live.gl = gl
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
      if (live.gl === gl) live.gl = null
    }
  }, [gl])

  useFrame(() => {
    const f = frames.current
    f.n++
    const now = performance.now()
    if (now - f.since > 500) {
      live.stats.fps = Math.round((f.n * 1000) / (now - f.since))
      f.n = 0
      f.since = now
    }
    live.stats.calls = gl.info.render.calls
    live.stats.triangles = gl.info.render.triangles
    live.stats.geometries = gl.info.memory.geometries
    live.stats.textures = gl.info.memory.textures
    gl.info.reset()
  }, -1000)
  return null
}

/** Keeps `live.three` pointing at the current renderer, scene and camera (for snapshots). */
export function GlProbe() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    live.gl = gl
    live.three = { gl, scene, camera }
    return () => {
      if (live.three?.gl === gl) live.three = null
    }
  }, [gl, scene, camera])
  return null
}
