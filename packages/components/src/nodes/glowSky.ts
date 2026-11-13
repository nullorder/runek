// GlowSky's dome as a TSL node material, for WebGPURenderer: the gradient and the city's glow on
// a closed cloud deck, without the stars, the moon or the deck parting. The far-plane trick
// becomes no depth test plus drawing first.

import { BackSide } from 'three'
import {
  dot,
  float,
  floor,
  fract,
  max,
  mix,
  normalize,
  positionLocal,
  pow,
  sin,
  smoothstep,
  uniform,
  vec2,
} from 'three/tsl'
import { MeshBasicNodeMaterial, type Node } from 'three/webgpu'
import type { SkyColors, SkyHandle } from '../GlowSky'

export function nodeSky(c: SkyColors, seed: number, clouds: boolean): SkyHandle {
  const time = uniform(0)
  const hash = (p: Node<'vec2'>) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453))
  const noise = (p: Node<'vec2'>) => {
    const i = floor(p)
    const f = fract(p)
    const u = f.mul(f).mul(float(3).sub(f.mul(2)))
    return mix(
      mix(hash(i), hash(i.add(vec2(1, 0))), u.x),
      mix(hash(i.add(vec2(0, 1))), hash(i.add(vec2(1, 1))), u.x),
      u.y,
    )
  }
  const d = normalize(positionLocal)
  const y = max(d.y, 0)
  let color = mix(uniform(c.horizon), uniform(c.zenith), pow(smoothstep(0, 0.7, y), 0.6))
  if (clouds) {
    const s = (seed % 97) * 3.1
    const p = d.xz
      .div(max(d.y, 0.05))
      .mul(1.4)
      .add(vec2(time.mul(0.01).add(s), s * 0.37))
    const cl = smoothstep(
      0.35,
      0.85,
      noise(p)
        .mul(0.6)
        .add(noise(p.mul(2.3)).mul(0.3))
        .add(noise(p.mul(5.1)).mul(0.1)),
    )
    color = color.add(
      uniform(c.glow)
        .mul(cl)
        .mul(float(1).sub(smoothstep(0, 0.8, y)))
        .mul(smoothstep(0, 0.04, y)),
    )
  }
  const material = new MeshBasicNodeMaterial()
  material.colorNode = color
  material.side = BackSide
  material.depthWrite = false
  material.depthTest = false
  material.fog = false
  material.name = 'glowsky'
  return {
    material,
    setTime: (t) => {
      time.value = t
    },
  }
}
