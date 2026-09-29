import type { SurfaceDef } from '@runek/core'

/** Shore's sandy top, a flat band at the origin. */
export const shoreSurface: SurfaceDef = {
  kind: 'terrain',
  build(props, { unit }) {
    const [w, d] = (props.size as [number, number] | undefined) ?? [24, 24]
    return (x, z) => (Math.abs(x) <= (w * unit) / 2 && Math.abs(z) <= (d * unit) / 2 ? 0 : null)
  },
}
