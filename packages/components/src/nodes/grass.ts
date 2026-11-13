import { clamp, cos, float, instanceIndex, positionLocal, sin, vec3 } from 'three/tsl'
import { MeshStandardNodeMaterial, type Node } from 'three/webgpu'
import { follow } from './uniforms'

/** The node (TSL) twin of `Grass`'s swaying blades, for `WebGPURenderer`. Each blade's phase
 *  comes from its instance index rather than its position, which reads the same in a field. */
export function grassMaterial(record: {
  uTime: { value: number }
  uBladeHeight: { value: number }
  uSway: { value: number }
}) {
  const time = follow<Node<'float'>>(record.uTime)
  const bladeHeight = follow<Node<'float'>>(record.uBladeHeight)
  const swayAmount = follow<Node<'float'>>(record.uSway)
  const phase = float(instanceIndex).mul(2.399)
  const sway = clamp(positionLocal.y.div(bladeHeight).add(0.5), 0, 1).mul(swayAmount)
  const material = new MeshStandardNodeMaterial()
  material.positionNode = positionLocal.add(
    vec3(
      sin(time.mul(1.7).add(phase)).mul(sway),
      0,
      cos(time.mul(1.2).add(phase)).mul(sway).mul(0.6),
    ),
  )
  return material
}
