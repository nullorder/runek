import type { GroundIndex } from '@runek/core'
import type { Camera, Object3D, Scene, WebGLRenderer } from 'three'
import type { CameraState } from '../share/codec'
import type { Vec3 } from '../state/ops'

/** Scene objects by node id, registered by the editable wrappers (for the gizmo and framing). */
export const nodeObjects = new Map<string, Object3D>()

/** Live, per-frame things the DOM side reads without going through React state. */
export const live: {
  ground: GroundIndex | null
  camera: CameraState | null
  gl: WebGLRenderer | null
  three: { gl: WebGLRenderer; scene: Scene; camera: Camera } | null
  stats: { fps: number; calls: number; triangles: number; geometries: number; textures: number }
} = {
  ground: null,
  camera: null,
  gl: null,
  three: null,
  stats: { fps: 0, calls: 0, triangles: 0, geometries: 0, textures: 0 },
}

/** Where something dropped at (x, z) should stand: on the ground under it. */
export function dropPoint([x, , z]: Vec3): Vec3 {
  const y = live.ground?.groundAt(x, z, { kinds: ['terrain', 'deck'] }) ?? 0
  return [round(x), round(Number.isFinite(y) ? y : 0), round(z)]
}

const round = (n: number) => Math.round(n * 100) / 100

/** A PNG of the current view, rendered fresh at `scale`× the canvas resolution. */
export function snapshot(scale = 2, transparent = false): string | null {
  const three = live.three
  if (!three) return null
  const { gl, scene, camera } = three
  const ratio = gl.getPixelRatio()
  const background = scene.background
  gl.setPixelRatio(ratio * scale)
  if (transparent) scene.background = null
  gl.render(scene, camera)
  const url = gl.domElement.toDataURL('image/png')
  scene.background = background
  gl.setPixelRatio(ratio)
  gl.render(scene, camera)
  return url
}
