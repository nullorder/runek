import type { SurfaceDef } from '@runek/core'

interface SlabShape {
  size?: [number, number]
  shape?: 'pill' | 'disc'
  cornerRadius?: number
}

/** Slab's top: a rounded rectangle (pill) or an ellipse (disc) at the origin. */
export const slabSurface: SurfaceDef = {
  kind: 'deck',
  build(props, { unit }) {
    const { size = [8, 8], shape = 'pill', cornerRadius } = props as SlabShape
    const hw = (size[0] * unit) / 2
    const hd = (size[1] * unit) / 2
    if (shape === 'disc') {
      return (x, z) => ((x / hw) ** 2 + (z / hd) ** 2 <= 1 ? 0 : null)
    }
    const r = Math.min((cornerRadius ?? Math.min(size[0], size[1]) / 2) * unit, Math.min(hw, hd))
    return (x, z) => {
      const ax = Math.abs(x)
      const az = Math.abs(z)
      if (ax > hw || az > hd) return null
      const cx = ax - (hw - r)
      const cz = az - (hd - r)
      return cx > 0 && cz > 0 && cx * cx + cz * cz > r * r ? null : 0
    }
  },
}
