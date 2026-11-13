import type { Texture } from 'three'
import { MeshToonNodeMaterial } from 'three/webgpu'

/** The node (TSL) twin of a drawn `Person`'s two-tone material, for `WebGPURenderer`. It has no
 *  rim of light, and the figure no ink line: both are GLSL patches. */
export function toonMaterial(gradientMap: Texture) {
  return new MeshToonNodeMaterial({ vertexColors: true, gradientMap })
}
