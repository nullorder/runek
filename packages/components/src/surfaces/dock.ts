import type { SurfaceDef } from '@runek/core'

/** Dock's deck top: its origin sits on the deck at the shore end, running out along local +Z. */
export const dockSurface: SurfaceDef = {
  kind: 'deck',
  build(props, { unit }) {
    const hw = (((props.width as number | undefined) ?? 3) * unit) / 2
    const length = ((props.length as number | undefined) ?? 10) * unit
    return (x, z) => (Math.abs(x) <= hw && z >= 0 && z <= length ? 0 : null)
  },
}
