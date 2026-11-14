// Hologram's beam as a TSL node material, for WebGPURenderer: the cone of light thinning toward
// the top, without the scan lines the GLSL draws.

import type { Color } from 'three'
import { float, uniform, uv } from 'three/tsl'
import { MeshBasicNodeMaterial } from 'three/webgpu'

export function beamNodeMaterial(tone: Color) {
  const material = new MeshBasicNodeMaterial()
  material.colorNode = uniform(tone.clone()).mul(float(1).sub(uv().y))
  material.fog = false
  return material
}
