import { rng } from '@runek/core'
import {
  AdditiveBlending,
  Color,
  InstancedBufferAttribute,
  type Mesh,
  Spherical,
  Vector3,
} from 'three'
import { SkyMesh } from 'three/addons/objects/SkyMesh.js'
import {
  attribute,
  cameraProjectionMatrix,
  distance,
  exp,
  float,
  modelViewMatrix,
  positionGeometry,
  sin,
  uv,
  varying,
  vec2,
  vec4,
  viewportSize,
} from 'three/tsl'
import { MeshBasicNodeMaterial, type Node, Mesh as NodeMesh } from 'three/webgpu'
import { pointQuads } from './portal'
import { follow } from './uniforms'

type F = Node<'float'>

/** The node (TSL) twin of drei's `Sky`: three's own `SkyMesh`, clouds off, at drei's size. */
export function skyMesh(scale = 1000) {
  const sky = new SkyMesh()
  sky.scale.setScalar(scale)
  sky.cloudCoverage.value = 0
  sky.mieCoefficient.value = 0.005
  sky.mieDirectionalG.value = 0.8
  return sky
}

export interface StarField {
  mesh: Mesh
  time: { value: number }
  dispose(): void
}

/**
 * The node (TSL) twin of drei's `Stars` (same shell of stars, sizes and twinkle), drawn as
 * instanced quads since WebGPU draws points a pixel wide. Seeded, where drei's are random.
 */
export function starField({
  radius = 100,
  depth = 50,
  count = 5000,
  factor = 4,
  saturation = 0,
  fade = false,
  seed = 1,
}): StarField {
  const random = rng(seed)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const at = new Vector3()
  const color = new Color()
  let r = radius + depth
  const increment = depth / count
  for (let i = 0; i < count; i++) {
    r -= increment * random()
    at.setFromSpherical(new Spherical(r, Math.acos(1 - random() * 2), random() * 2 * Math.PI))
    at.toArray(positions, i * 3)
    color.setHSL(i / count, saturation, 0.9)
    color.toArray(colors, i * 3)
    sizes[i] = (0.5 + 0.5 * random()) * factor
  }
  const geometry = pointQuads(count, {
    aStar: new InstancedBufferAttribute(positions, 3),
    aColor: new InstancedBufferAttribute(colors, 3),
    aSize: new InstancedBufferAttribute(sizes, 1),
  })

  const time = { value: 0 }
  const t = follow<F>(time)
  // As drei: the star sits at its position with w = 0.5 (twice as far, before the divide), and
  // its size in pixels shrinks with depth and breathes with time.
  const view = modelViewMatrix.mul(vec4(attribute('aStar', 'vec3') as Node<'vec3'>, 0.5))
  const size = (attribute('aSize', 'float') as F)
    .mul(float(30).div(view.z.negate()))
    .mul(sin(t.add(100)).add(3))
  const clip = cameraProjectionMatrix.mul(view)
  const offset = positionGeometry.xy.mul(size).div(viewportSize.div(2)).mul(clip.w)
  const tint = varying(attribute('aColor', 'vec3')) as Node<'vec3'>
  const d = distance(uv(), vec2(0.5))
  const opacity = fade ? float(1).div(exp(d.sub(0.25).mul(16)).add(1)) : float(1)

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  material.vertexNode = clip.add(vec4(offset, 0, 0))
  material.colorNode = vec4(tint, opacity)
  const mesh = new NodeMesh(geometry, material)
  mesh.frustumCulled = false
  return {
    mesh,
    time,
    dispose() {
      geometry.dispose()
      material.dispose()
    },
  }
}
