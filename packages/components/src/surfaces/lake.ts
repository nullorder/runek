import type { SurfaceDef } from '@runek/core'

const sizeOf = (props: Record<string, unknown>) =>
  (props.size as [number, number] | undefined) ?? [20, 20]

/** Lake's water plane. An unplaced Lake sits at `world.ground`. Its rim is what the world
 *  check compares against the ground: open water must not stand above its shore. */
export const lakeSurface: SurfaceDef = {
  kind: 'water',
  build(props, { unit, ground }) {
    const [w, d] = sizeOf(props)
    const level = props.position === undefined ? ground : 0
    return (x, z) => (Math.abs(x) <= (w * unit) / 2 && Math.abs(z) <= (d * unit) / 2 ? level : null)
  },
  rim(props, { unit }) {
    const [w, d] = sizeOf(props)
    const hw = (w * unit) / 2
    const hd = (d * unit) / 2
    return [
      [-hw, -hd],
      [0, -hd],
      [hw, -hd],
      [hw, 0],
      [hw, hd],
      [0, hd],
      [-hw, hd],
      [-hw, 0],
    ]
  },
}
