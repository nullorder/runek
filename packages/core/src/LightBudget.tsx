import { useFrame, useThree } from '@react-three/fiber'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import type { Light } from 'three'
import { type LightEmitter, LightPool, LightPoolContext } from './light'

/** Point lights when the renderer shades them in tiles: every emitter gets one. */
const TILED_POINTS = 1024

/**
 * Lend real lights to the `useLight` emitters inside. Under `WebGLRenderer`, `point` point lights
 * (default 6) and `spot` spotlights (default 2) go each frame to the emitters that matter most to
 * the view. Under `WebGPURenderer`, point lights are shaded in screen tiles (three's
 * `TiledLighting`), so every point emitter gets a light of its own, up to `point` (default 1024),
 * and spotlights are lent as before. `<World>` runs one (see its `lightBudget`); use this
 * directly only in your own `<Canvas>`.
 */
export function LightBudget({
  point,
  spot = 2,
  children,
}: {
  point?: number
  spot?: number
  children?: ReactNode
}) {
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const tiled = useTiledLighting(gl, point ?? TILED_POINTS)
  const emitters = useMemo(() => new Set<LightEmitter>(), [])
  const pool = useMemo(
    () =>
      tiled
        ? new LightPool(emitters, { point: point ?? TILED_POINTS, spot }, 'direct')
        : new LightPool(emitters, { point: point ?? 6, spot }),
    [emitters, point, spot, tiled],
  )

  useEffect(() => {
    scene.add(pool.root)
    return () => {
      scene.remove(pool.root)
      pool.dispose()
    }
  }, [scene, pool])

  // A long hitch shouldn't snap a fade; a tenth of a second is plenty to keep moving.
  useFrame(({ camera }, dt) => pool.update(camera, Math.min(dt, 0.1)))

  return <LightPoolContext.Provider value={emitters}>{children}</LightPoolContext.Provider>
}

interface LightingRenderer {
  isWebGPURenderer?: boolean
  lighting?: unknown
}

/**
 * Under `WebGPURenderer`, shade point lights in screen tiles (three's `TiledLighting`, holding up
 * to `max`), and say so once it is in place. Loaded on demand, so a WebGL world never fetches it.
 */
function useTiledLighting(gl: unknown, max: number): boolean {
  const renderer = gl as LightingRenderer
  const webgpu = renderer.isWebGPURenderer === true
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!webgpu) return
    let cancelled = false
    const previous = renderer.lighting
    Promise.all([
      import('three/addons/lighting/TiledLighting.js'),
      import('three/addons/tsl/lighting/TiledLightsNode.js'),
    ])
      .then(([{ TiledLighting }, { tiledLights }]) => {
        if (cancelled) return
        class BudgetLighting extends TiledLighting {
          createNode(lights: Light[] = []) {
            return tiledLights(max).setLights(lights)
          }
        }
        renderer.lighting = new BudgetLighting()
        setReady(true)
      })
      .catch((error) => console.warn('Runek: tiled lighting is unavailable:', error))
    return () => {
      cancelled = true
      renderer.lighting = previous
      setReady(false)
    }
  }, [renderer, webgpu, max])
  return ready
}
