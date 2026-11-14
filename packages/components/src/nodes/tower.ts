// Tower's facade as a TSL node material, for WebGPURenderer (which cannot draw the ShaderMaterial
// in Tower.tsx). It reads the same per-vertex data and draws the same bands, bay states, window
// cells, lit shares and trims, so both renderers show the same city. It is a simpler facade:
// no box filtering of edges, no interior mapping behind glass, no decal slots (posters, stickers,
// leak streaks, cracks), no blinds or screens in rooms, no mullions, sills, storey courses or
// grime. Scene fog and tone mapping come from the node system.

import { shareMaterial } from '@runek/core'
import {
  abs,
  attribute,
  dot,
  exp,
  Fn,
  float,
  floor,
  fract,
  If,
  min,
  mix,
  mod,
  pow,
  select,
  sin,
  smoothstep,
  step,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { MeshBasicNodeMaterial, type Node } from 'three/webgpu'
import { emissiveColor } from '../city/glow'
import { SHOP_LAMPS, WINDOW_LAMPS } from '../city/towerLight'
import { towerNodeUniforms as U } from './city'

/** GLSL's classic `fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453)`. */
const hash21 = (p: Node<'vec2'>) => fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453))

/** A point along a ladder rung, spaced evenly on a log scale. */
const rung = (r: Node<'vec2'>, t: Node<'float'>) => r.x.mul(pow(r.y.div(r.x), t))

/** 1 inside [a, b]. */
const inside = (x: Node<'float'>, a: number | Node<'float'>, b: number | Node<'float'>) =>
  step(a, x).mul(step(x, b))

/** A cumulative lamp table as a select chain, black past the last share. */
function lampTable(r: Node<'float'>, table: [number, string][]) {
  let out: Node<'vec3'> = vec3(0)
  for (let i = table.length - 1; i >= 0; i--) {
    const c = emissiveColor(table[i][1], 1)
    out = select(r.lessThan(table[i][0]), vec3(c.r, c.g, c.b), out)
  }
  return out
}

/** A per-quad attribute, passed flat so packed values (the bay states) arrive exact. */
const flat = <T extends 'vec3' | 'vec4'>(name: string, type: T) => {
  const v = varying(attribute<T>(name, type)) as unknown as Node<T> & {
    setInterpolation(kind: string): unknown
  }
  v.setInterpolation('flat')
  return v as Node<T>
}

const lampOf = (hex: string) => {
  const c = emissiveColor(hex, 1)
  return vec3(c.r, c.g, c.b)
}

function towerColor(night: number) {
  return Fn(() => {
    const m = attribute<'vec2'>('aUv', 'vec2')
    const rect = flat('aRect', 'vec4')
    const cellData = flat('aCell', 'vec4')
    const look = flat('aLook', 'vec4')
    const trimColor = flat('aTrim', 'vec3')
    const wallColor = flat('aWall', 'vec3')
    const ny = attribute<'vec3'>('normal', 'vec3').y
    const n = float(night)

    const kind = rect.w
    const faceW = rect.x
    const y0 = rect.y
    const y1 = rect.z
    const sd = look.x
    const era = look.y
    const fseed = look.z
    const strips = mod(look.w, 2)
    const roofline = mod(floor(look.w.mul(0.5)), 2)
    const fasciaTube = mod(floor(look.w.mul(0.25)), 2)
    const wall = wallColor.mul(mix(float(0.35), U.wallGain, n))
    const trim = trimColor.mul(U.trim).mul(n)
    const col = vec3(wall).toVar()
    const glow = U.glow.mul(exp(m.y.max(0).negate().div(6))).mul(n)
    const side = step(abs(ny), 0.5)

    If(kind.greaterThan(5.5), () => {
      // Roof: darker, with the trim color along its edges after dusk.
      const ed = min(m, rect.xy.sub(m))
      col.assign(wall.mul(0.6).add(trim.mul(roofline).mul(step(min(ed.x, ed.y), 0.35))))
    })
      .ElseIf(kind.lessThan(0.5), () => {
        // Plain trim: slabs, cornices, parapets, rooftop boxes.
        col.assign(
          wall.mul(
            select(
              ny.greaterThan(0.5),
              float(0.75),
              select(ny.lessThan(-0.5), float(0.4), float(1)),
            ),
          ),
        )
        col.addAssign(
          trim
            .mul(roofline)
            .mul(inside(m.y, y1.sub(0.4), y1.sub(0.12)))
            .mul(side),
        )
        col.addAssign(glow.mul(side))
      })
      .ElseIf(kind.lessThan(1.5), () => {
        // Street: shop bays between piers under a fascia.
        const bayW = cellData.x
        const bi = floor(m.x.div(bayW))
        const xm = fract(m.x.div(bayW)).mul(bayW)
        const state = mod(floor(cellData.y.div(pow(float(4), bi)).add(0.01)), 4)
        const r = hash21(vec2(bi, sd.mul(13.1).add(fseed)))
        const open = inside(xm, 0.38, bayW.sub(0.38)).mul(inside(m.y, 0.38, 3.3))
        col.assign(mix(col, wall.mul(0.55), inside(m.y, 3.5, 4.38)))
        col.assign(mix(col, wall.mul(0.7), step(m.y, 0.3)))
        const lamp = lampTable(r.mul(SHOP_LAMPS[SHOP_LAMPS.length - 1][0]), SHOP_LAMPS)
          .mul(rung(U.shop, hash21(vec2(bi.add(3), sd.add(fseed.mul(5))))))
          .mul(mix(0.08, 1.0, n))
        const lit = lamp
          .mul(float(0.62).add(smoothstep(0.3, 3.3, m.y).mul(0.38)))
          .mul(mix(1, 0.35, inside(m.y, 0.38, 1.05)))
        const shutter = wall
          .mul(mix(0.9, 1.9, hash21(vec2(bi.add(11), sd))))
          .mul(mix(0.6, 1.0, step(0.32, fract(m.y.div(0.12)))))
        const dark = vec3(0.01, 0.009, 0.008).add(
          vec3(0.02, 0.012, 0.007).mul(float(1).sub(m.y.div(3.3))),
        )
        const door = inside(xm, bayW.mul(0.5).sub(0.62), bayW.mul(0.5).add(0.62))
        const blank = mix(wall, wall.mul(0.42), door.mul(step(m.y, 2.3))).add(
          lamp
            .mul(0.5)
            .mul(door)
            .mul(inside(m.y, 2.38, 2.7)),
        )
        const bay = select(
          state.lessThan(0.5),
          lit,
          select(state.lessThan(1.5), shutter, select(state.lessThan(2.5), dark, blank)),
        )
        col.assign(mix(col, bay, open))
        col.addAssign(
          trim
            .mul(fasciaTube)
            .mul(step(state, 0.5))
            .mul(inside(m.y, 3.42, 3.5))
            .mul(inside(xm, 0.2, bayW.sub(0.2))),
        )
        col.addAssign(glow)
      })
      .ElseIf(kind.lessThan(2.5), () => {
        // Service: louvres.
        col.assign(wall.mul(mix(0.45, 0.8, step(0.45, fract(m.y.div(0.16))))))
        col.addAssign(glow)
      })
      .Else(() => {
        // Windows. The cell holds (cell width, storey height, lit share, style).
        const cw = cellData.x
        const ch = cellData.y
        const style = cellData.w
        const crown = kind.greaterThan(4.5)
        const raisingCrown = crown.and(era.lessThan(0.5))
        const indexCrown = crown.and(era.greaterThan(1.5)).and(era.lessThan(2.5))
        const litP = select(indexCrown, float(1), cellData.z)
        const g = vec2(m.x.div(cw), m.y.sub(y0).div(ch))
        const cell = floor(g)
        const f = fract(g)
        const rows = floor(y1.sub(y0).div(ch).add(0.01))
        const r = hash21(cell.add(vec2(sd.mul(31.7), fseed.mul(7.3))))
        const r2 = hash21(cell.mul(1.7).add(vec2(sd, fseed.add(9.1))))
        const pane = select(
          raisingCrown,
          vec4(0.38, 0.62, 0.12, 0.9),
          select(
            indexCrown,
            vec4(0.02, 0.98, 0.1, 0.92),
            select(
              style.lessThan(0.5),
              vec4(0.2, 0.8, 0.29, 0.76),
              select(
                style.lessThan(1.5),
                vec4(0.1, 0.9, 0.3, 0.8),
                select(style.lessThan(2.5), vec4(0, 1, 0.3, 0.74), vec4(0.03, 0.97, 0.05, 0.95)),
              ),
            ),
          ),
        )
        const mask = inside(f.x, pane.x, pane.y)
          .mul(inside(f.y, pane.z, pane.w))
          .mul(step(g.y, rows))
        const on = step(float(1).sub(litP), r).mul(n)
        const lamp = select(
          indexCrown,
          lampOf('#f4f6fb').mul(rung(U.window, float(0.9))),
          lampTable(r2, WINDOW_LAMPS).mul(rung(U.window, hash21(cell.add(vec2(9.1, sd))))),
        )
          .mul(select(style.greaterThan(2.5), float(0.5), float(1)))
          .mul(0.85)
        const dark = mix(
          vec3(0.2, 0.24, 0.3),
          vec3(0.01, 0.009, 0.008).add(vec3(0.012, 0.007, 0.004).mul(float(1).sub(f.y))),
          n,
        )
        col.assign(mix(col, mix(dark, lamp, on), mask))
        col.assign(mix(col, wall.mul(1.4), step(y1.sub(0.14), m.y)))
        col.addAssign(trim.mul(roofline).mul(inside(m.y, y1.sub(0.45), y1.sub(0.1))))
        col.addAssign(
          trim
            .mul(0.85)
            .mul(strips)
            .mul(step(min(m.x, faceW.sub(m.x)), 0.22)),
        )
        col.addAssign(glow)
      })
    return col
  })()
}

const materials = new Map<number, MeshBasicNodeMaterial>()

/** One node material per (rounded) night level, shared by every tower and marked shared for the
 *  static batcher, as on WebGL. */
export function towerNodeMaterial(night: number) {
  let m = materials.get(night)
  if (!m) {
    m = new MeshBasicNodeMaterial()
    m.colorNode = towerColor(night)
    m.fog = true
    m.name = `runek:tower:${night}`
    materials.set(night, shareMaterial(m))
  }
  return m
}
