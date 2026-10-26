import { useFrame, useThree } from '@react-three/fiber'
import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import { Group } from 'three'
import { BATCHED_LAYER, DYNAMIC_KEY, StaticBatcher } from './batching'

/** How often the batcher looks for meshes that appeared, settled, moved or left, in seconds. */
const SCAN_EVERY = 0.25

/**
 * Keep a subtree out of static batching: wrap the parts a component moves, scales, hides or
 * reshapes after mount (a clock's hands, a flag's cloth, a bobbing boat). The batcher also
 * notices parts that keep moving and leaves them out, but marking them saves the first few
 * frames of churn.
 */
export function Dynamic({ children }: { children?: ReactNode }) {
  return <group userData={{ [DYNAMIC_KEY]: true }}>{children}</group>
}

/** Runs a `StaticBatcher` over the world's scene while mounted (see `<World batching>`). */
export function StaticBatching({ cell }: { cell: number }) {
  const scene = useThree((s) => s.scene)
  const raycaster = useThree((s) => s.raycaster)
  const batcher = useMemo(() => new StaticBatcher(new Group(), cell), [cell])
  const since = useRef(SCAN_EVERY)

  // Batched parts keep their pointer events: the hover and click raycast still tests their layer.
  useEffect(() => {
    raycaster.layers.enable(BATCHED_LAYER)
    return () => raycaster.layers.disable(BATCHED_LAYER)
  }, [raycaster])

  useEffect(() => {
    scene.add(batcher.root)
    return () => {
      batcher.dispose()
      scene.remove(batcher.root)
    }
  }, [scene, batcher])

  useFrame((_, dt) => {
    since.current += dt
    if (since.current < SCAN_EVERY) return
    since.current = 0
    batcher.scan(scene)
  })

  return null
}
