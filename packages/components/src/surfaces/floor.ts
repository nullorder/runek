import type { SurfaceDef } from '@runek/core'

interface FloorShape {
  position?: unknown
  size?: [number, number]
  opening?: { x?: number; z?: number; width: number; depth: number }
}

/** Floor's slab top, minus its stairwell opening. An unplaced Floor sits at `world.ground`. */
export const floorSurface: SurfaceDef = {
  kind: 'deck',
  build(props, { unit, ground }) {
    const { position, size = [8, 8], opening } = props as FloorShape
    const top = position === undefined ? ground : 0
    const hw = (size[0] * unit) / 2
    const hd = (size[1] * unit) / 2
    const hole = opening && {
      x: (opening.x ?? 0) * unit,
      z: (opening.z ?? 0) * unit,
      hw: (opening.width * unit) / 2,
      hd: (opening.depth * unit) / 2,
    }
    return (x, z) => {
      if (Math.abs(x) > hw || Math.abs(z) > hd) return null
      if (hole && Math.abs(x - hole.x) < hole.hw && Math.abs(z - hole.z) < hole.hd) return null
      return top
    }
  },
}
