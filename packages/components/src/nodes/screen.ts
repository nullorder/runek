import { dot, floor, fract, sin, sRGBTransferEOTF, uv, vec2, vec3 } from 'three/tsl'
import { MeshBasicNodeMaterial, type Node } from 'three/webgpu'
import { follow } from './uniforms'

/** The node (TSL) twin of `Screen`'s animated static, for `WebGPURenderer`: `cells` across and
 *  down, reshuffled 24 times a second, with a rolling band. */
export function staticMaterial(
  record: { uTime: { value: number }; uLevel: { value: number } },
  cells: [number, number],
) {
  const time = follow<Node<'float'>>(record.uTime)
  const level = follow<Node<'float'>>(record.uLevel)
  const hash = (p: Node<'vec2'>) => fract(sin(dot(p, vec2(12.9898, 78.233))).mul(43758.5453))
  const cell = floor(uv().mul(vec2(cells[0], cells[1]))) as Node<'vec2'>
  const n = hash(cell.add(floor(time.mul(24)).mul(vec2(1.7, 9.2))) as Node<'vec2'>)
  const band = sin(uv().y.mul(40).add(time.mul(6)))
    .mul(0.15)
    .add(0.85)
  const material = new MeshBasicNodeMaterial()
  // Written as is by the GLSL shader; undo the node pipeline's sRGB output conversion to match.
  material.colorNode = sRGBTransferEOTF(vec3(n.mul(band).mul(level))) as Node<'vec3'>
  material.toneMapped = false
  return material
}
