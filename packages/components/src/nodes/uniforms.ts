import { uniform } from 'three/tsl'
import type { Node } from 'three/webgpu'

/** A TSL uniform that follows `entry.value` every render, so the `{ value }` records a
 *  component already updates (for its GLSL material) drive its node material too. */
export function follow<N extends Node>(entry: { value: unknown }): N {
  return uniform(entry.value as never).onRenderUpdate(() => entry.value as never) as unknown as N
}
