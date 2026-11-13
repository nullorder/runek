import type { Matrix4, Texture, Vector2 } from 'three'
import {
  asin,
  atan,
  cos,
  Fn,
  float,
  If,
  length,
  positionGeometry,
  sin,
  smoothstep,
  sqrt,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { MeshBasicNodeMaterial, type Node } from 'three/webgpu'
import { follow } from './uniforms'

type F = Node<'float'>
type V2 = Node<'vec2'>
type V3 = Node<'vec3'>
type V4 = Node<'vec4'>

export interface LensUniforms {
  uAhead: { value: Texture }
  uLeft: { value: Texture }
  uRight: { value: Texture }
  uAheadM: { value: Matrix4 }
  uLeftM: { value: Matrix4 }
  uRightM: { value: Matrix4 }
  uExtent: { value: Vector2 }
  uResolution: { value: Vector2 }
  uBlur: { value: number }
  uSeam: { value: number }
}

/**
 * The node (TSL) twin of the first-person lens's stitching pass, for `WebGPURenderer`: warps the
 * views into the Panini curve and blurs the periphery. `focus` is the falloff ellipse (radians
 * across and up, and where it starts and ends).
 */
export function lensPassMaterial(
  record: LensUniforms,
  curve: number,
  focus: { across: number; up: number; from: number; to: number },
) {
  const extent = follow<V2>(record.uExtent)
  const resolution = follow<V2>(record.uResolution)
  const blur = follow<F>(record.uBlur)
  const seam = follow<F>(record.uSeam)
  const views = (['Ahead', 'Left', 'Right'] as const).map((name) => ({
    map: record[`u${name}`].value,
    m: uniform(record[`u${name}M`].value),
  }))

  const project = (m: Node<'mat4'>, dir: V3) => {
    const c = m.mul(vec4(dir, 1))
    return c.xy.div(c.w).mul(0.5).add(0.5) as V2
  }
  // The direction seen at a point on the screen, one unit out from the eye's vertical axis.
  const ray = (at: V2) => {
    const p = at.mul(2).sub(1).mul(extent) as V2
    const k = p.x.div(curve + 1)
    const phi = atan(k).add(asin(k.mul(curve).div(sqrt(k.mul(k).add(1)))))
    return vec3(sin(phi), p.y.mul(cos(phi).add(curve)).div(curve + 1), cos(phi).negate()) as V3
  }
  // WebGPU render targets run top-down: flip the WebGL-style coordinates, and their y gradients.
  const flip = (p: V2) => vec2(p.x, p.y.oneMinus())
  const down = (g: V2) => vec2(g.x, g.y.negate())

  const look = (view: (typeof views)[number], dir: V3, nx: V3, ny: V3, sigma: F, out: V4) => {
    const at = project(view.m as unknown as Node<'mat4'>, dir)
    If(sigma.lessThan(0.35), () => {
      out.assign(texture(view.map, flip(at)).level(float(0)))
    }).Else(() => {
      const gx = project(view.m as unknown as Node<'mat4'>, nx)
        .sub(at)
        .mul(sigma) as V2
      const gy = project(view.m as unknown as Node<'mat4'>, ny)
        .sub(at)
        .mul(sigma) as V2
      const tap = (a: number, b: number) =>
        texture(view.map, flip(at.add(gx.mul(a)).add(gy.mul(b)) as V2)).grad(down(gx), down(gy))
      out.assign(
        tap(0.7, 0.28).add(tap(-0.28, 0.7)).add(tap(-0.7, -0.28)).add(tap(0.28, -0.7)).mul(0.25),
      )
    })
  }

  const shade = Fn(() => {
    const at = uv() as V2
    const dir = ray(at)
    const phi = atan(dir.x, dir.z.negate()) as F
    const off = vec2(phi.div(focus.across), atan(dir.y).div(focus.up))
    const sigma = blur.mul(smoothstep(focus.from, focus.to, length(off))) as F
    const nx = ray(at.add(vec2(float(1).div(resolution.x), 0)) as V2)
    const ny = ray(at.add(vec2(0, float(1).div(resolution.y))) as V2)
    const color = vec4(0).toVar() as unknown as V4
    If(phi.greaterThan(seam), () => look(views[2], dir, nx, ny, sigma, color))
      .ElseIf(phi.lessThan(seam.negate()), () => look(views[1], dir, nx, ny, sigma, color))
      .Else(() => look(views[0], dir, nx, ny, sigma, color))
    return color
  })

  const material = new MeshBasicNodeMaterial({ depthTest: false, depthWrite: false })
  material.vertexNode = vec4(positionGeometry.xy, 0, 1)
  // The views hold linear light; the frame's output pass tone-maps and encodes it once.
  material.colorNode = shade()
  return material
}
