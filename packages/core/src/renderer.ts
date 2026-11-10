import type { GLProps } from '@react-three/fiber'

type RendererFactory = Extract<GLProps, (...args: never[]) => unknown>

/** Fold `preserveDrawingBuffer` into whatever form of renderer the app passed. An instance is
 *  already configured, so it goes through as it is. */
export function glProps(renderer: GLProps | undefined, preserveDrawingBuffer: boolean): GLProps {
  if (!renderer) return { preserveDrawingBuffer }
  if (typeof renderer === 'function') {
    const factory = renderer as RendererFactory
    return ((defaults: Parameters<RendererFactory>[0]) =>
      factory({ ...defaults, preserveDrawingBuffer })) as GLProps
  }
  if ('render' in renderer) return renderer
  return { preserveDrawingBuffer, ...renderer }
}
