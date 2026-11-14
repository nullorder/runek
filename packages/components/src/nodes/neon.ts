// NeonSign's tubes as a TSL node material, for WebGPURenderer. It has no per-letter levels: the
// whole sign dims as one, by the mean of its tubes' levels.

import type { Color, DataTexture } from 'three'
import { texture, uniform, uv } from 'three/tsl'
import { MeshBasicNodeMaterial } from 'three/webgpu'

export function neonNodeMaterial(map: DataTexture, core: Color, halo: Color) {
  const whole = uniform(1)
  const material = new MeshBasicNodeMaterial()
  const tx = texture(map, uv())
  material.colorNode = uniform(core.clone())
    .mul(tx.r)
    .add(uniform(halo.clone()).mul(tx.g).mul(tx.g))
    .mul(whole)
  material.fog = false
  /** Set the sign's mean level for this frame. */
  const setLevel = (level: number) => {
    whole.value = level
  }
  return { material, setLevel }
}
