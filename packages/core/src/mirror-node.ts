import type { Camera, Matrix4 as Matrix4Type, Object3D, Scene } from 'three'
import { Matrix4, Texture } from 'three'
import {
  clamp,
  dot,
  float,
  mix,
  normalView,
  output,
  positionViewDirection,
  positionWorld,
  pow,
  smoothstep,
  texture,
  uniform,
  vec2,
  vec4,
} from 'three/tsl'
import {
  MeshPhysicalNodeMaterial,
  MeshStandardNodeMaterial,
  Node,
  type NodeFrame,
  NodeUpdateType,
} from 'three/webgpu'

/** What a surface borrows for one draw: the plane's reflection and how to sample it. */
export interface Borrowed {
  texture: Texture
  matrix: Matrix4Type
}

export type Borrow = (
  object: Object3D,
  renderer: unknown,
  scene: Scene,
  camera: Camera,
) => Borrowed | null

/** A node that does its work before each object using it draws: borrowing (and, first in a
 *  frame, drawing) that object's mirror plane. It adds nothing to the shader. */
class MirrorPass extends Node {
  constructor(private readonly run: (frame: NodeFrame) => void) {
    super('float')
    this.updateBeforeType = NodeUpdateType.OBJECT
  }

  updateBefore(frame: NodeFrame) {
    this.run(frame)
    return true
  }

  setup() {
    return float(0)
  }
}

/** The node (TSL) twin of `useMirrorMaterial`'s material, for `WebGPURenderer`. */
export function mirrorNodeMaterial(
  kind: 'standard' | 'physical',
  params: Record<string, unknown>,
  strength: number,
  borrow: Borrow,
) {
  const material =
    kind === 'physical'
      ? new MeshPhysicalNodeMaterial(params)
      : new MeshStandardNodeMaterial(params)
  const matrix = uniform(new Matrix4())
  const amount = uniform(0)
  const pass = new MirrorPass(({ object, renderer, scene, camera }) => {
    const plane = object && scene && camera ? borrow(object, renderer, scene, camera) : null
    amount.value = plane ? strength : 0
    if (!plane) return
    reflection.value = plane.texture
    matrix.value.copy(plane.matrix)
  })

  type F = Node<'float'>
  type V2 = Node<'vec2'>
  const projected = matrix.mul(vec4(positionWorld, 1))
  const uv = projected.xy.div(projected.w) as V2
  // The plane's matrix gives WebGL texture coordinates (v up); a WebGPU render target's v runs
  // down from the top.
  const reflection = texture(new Texture(), vec2(uv.x, uv.y.oneMinus()))
  const fadeIn = (x: F) => smoothstep(0, 0.06, x).mul(smoothstep(1, 0.94, x))
  const facing = float(1).sub(clamp(dot(normalView, positionViewDirection), 0, 1))
  const k = amount
    .add(pass as unknown as F)
    .mul(mix(0.35, 1, pow(facing, 3)))
    .mul(fadeIn(uv.x))
    .mul(fadeIn(uv.y)) as F
  // Mixed into the lit color, before the frame's tone mapping, as the GLSL does.
  const reflected = reflection.rgb as Node<'vec3'>
  material.outputNode = vec4(mix(output.rgb as Node<'vec3'>, reflected, k), output.a)
  return material
}
