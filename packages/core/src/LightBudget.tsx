import { useFrame, useThree } from '@react-three/fiber'
import { type ReactNode, useEffect, useMemo } from 'react'
import { type LightEmitter, LightPool, LightPoolContext } from './light'

/**
 * Lend a fixed set of real lights to the `useLight` emitters inside: `point` point lights and
 * `spot` spotlights, given each frame to the emitters that matter most to the view. `<World>`
 * runs one (see its `lightBudget`); use this directly only in your own `<Canvas>`.
 */
export function LightBudget({
  point = 6,
  spot = 2,
  children,
}: {
  point?: number
  spot?: number
  children?: ReactNode
}) {
  const scene = useThree((s) => s.scene)
  const emitters = useMemo(() => new Set<LightEmitter>(), [])
  const pool = useMemo(() => new LightPool(emitters, { point, spot }), [emitters, point, spot])

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
