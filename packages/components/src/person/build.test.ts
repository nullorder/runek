import { DEFAULT_PALETTE } from '@runek/core'
import { describe, expect, it } from 'vitest'
import { buildFigure } from './build'
import { finish } from './sdf'
import { BONES } from './shape'
import { resolveFigure } from './spec'

const spec = resolveFigure(
  { seed: 7, style: 'stylized', kind: 'merchant', age: 'adult' },
  DEFAULT_PALETTE,
  1,
).spec

describe('buildFigure', () => {
  const far = finish(buildFigure(spec, 'far'))

  it('is deterministic', () => {
    const again = finish(buildFigure(spec, 'far'))
    expect(again.parts.map((p) => p.name)).toEqual(far.parts.map((p) => p.name))
    for (let i = 0; i < far.parts.length; i++)
      expect(Array.from(again.parts[i].positions)).toEqual(Array.from(far.parts[i].positions))
  })

  it('builds a coarse figure: skin, every garment layer, hair, and the hat', () => {
    const names = far.parts.map((p) => p.name)
    expect(names[0]).toBe('skin')
    for (const l of spec.layers) expect(names.some((n) => n.startsWith(`${l.type}#`))).toBe(true)
    expect(names).toContain('hat')
    expect(far.triangles).toBeGreaterThan(5000)
    expect(far.triangles).toBeLessThan(40000)
  })

  it('stands on the ground and reaches its height', () => {
    let lo = Infinity
    let hi = -Infinity
    for (const p of far.parts)
      for (let i = 1; i < p.positions.length; i += 3) {
        lo = Math.min(lo, p.positions[i])
        hi = Math.max(hi, p.positions[i])
      }
    expect(lo).toBeGreaterThan(-0.02)
    expect(lo).toBeLessThan(0.03)
    expect(hi).toBeGreaterThan(spec.height * 0.95)
  })

  it('normalizes skin weights over valid bones', () => {
    for (const p of far.parts) {
      for (let v = 0; v < p.skinWeight.length; v += 4) {
        const sum =
          p.skinWeight[v] + p.skinWeight[v + 1] + p.skinWeight[v + 2] + p.skinWeight[v + 3]
        expect(sum).toBeCloseTo(1, 4)
      }
      for (const b of p.skinIndex) expect(b).toBeLessThan(BONES.length)
      for (const i of p.indices) expect(i).toBeLessThan(p.positions.length / 3)
    }
  })
})
