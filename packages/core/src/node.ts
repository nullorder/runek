import { useThree } from '@react-three/fiber'
import { use } from 'react'

/**
 * Whether the world draws with a node-based renderer (three's `WebGPURenderer`), where a GLSL
 * `ShaderMaterial` or an `onBeforeCompile` patch doesn't compile. A component that writes a
 * shader picks its node (TSL) material when this is true.
 */
export function useNodeRenderer(): boolean {
  return useThree((s) => (s.gl as { isWebGPURenderer?: boolean }).isWebGPURenderer === true)
}

/**
 * A module loaded the first time it's asked for, and suspended on while it loads: for the node
 * (TSL) half of a component, so a WebGL world never downloads `three/webgpu`. Make it once at
 * module level and call it while rendering, only on the node path:
 *
 * ```tsx
 * const waterNodes = lazyModule(() => import('./nodes/water'))
 * // in the component:
 * const nodes = useNodeRenderer() ? waterNodes() : null
 * ```
 */
export function lazyModule<T>(load: () => Promise<T>): () => T {
  let loading: Promise<T> | undefined
  return () => {
    loading ??= load()
    return use(loading)
  }
}
