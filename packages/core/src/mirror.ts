import { useFrame, useThree } from '@react-three/fiber'
import { createContext, createElement, type ReactNode, useContext, useEffect, useMemo } from 'react'
import {
  Box3,
  type Camera,
  HalfFloatType,
  type Material,
  Matrix4,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Object3D,
  PerspectiveCamera,
  Plane,
  type Scene,
  type Texture,
  Vector2,
  Vector3,
  Vector4,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { type MaterialLook, useMaterial } from './material'

let passes = 0

/** Whether something is drawing the scene again right now (a mirror, a rift's far view). Such a
 *  pass skips anything that would start another, so their costs never multiply. */
export function inScenePass(): boolean {
  return passes > 0
}

/** Draw the scene again inside `draw`, marked as a scene pass (see `inScenePass`). */
export function scenePass(draw: () => void) {
  passes++
  try {
    draw()
  } finally {
    passes--
  }
}

/** Surfaces whose tops are closer than this (in world units) share one mirror. */
export const MIRROR_TOLERANCE = 0.02

// Shifts the mirror's near plane just past the surface, so what lies on it isn't reflected.
const CLIP_BIAS = 0.003
// A plane nothing has drawn for this many frames gives its slot back.
const IDLE_FRAMES = 300

const UP = new Vector3(0, 1, 0)
const BIAS = new Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
const eye = new Vector3()
const onPlane = new Vector3()
const mirrored = new Vector3()
const lookAt = new Vector3()
const target = new Vector3()
const rotation = new Matrix4()
const clipPlane = new Plane()
const clip = new Vector4()
const q = new Vector4()
const viewport = new Vector4()
const buffer = new Vector2()

/**
 * Point `virtual` at the reflection of what `camera` sees in a horizontal mirror at `height`
 * (three's Reflector, for a horizontal plane), with an oblique near plane on the surface so
 * nothing below it shows, and write into `matrix` the map from a world position to the texture
 * coordinates (divide by w) of what `virtual` draws there.
 */
export function aimMirror(
  camera: PerspectiveCamera,
  height: number,
  virtual: PerspectiveCamera,
  matrix: Matrix4,
) {
  eye.setFromMatrixPosition(camera.matrixWorld)
  onPlane.set(eye.x, height, eye.z)
  mirrored.subVectors(onPlane, eye).reflect(UP).negate().add(onPlane)
  rotation.extractRotation(camera.matrixWorld)
  lookAt.set(0, 0, -1).applyMatrix4(rotation).add(eye)
  target.subVectors(onPlane, lookAt).reflect(UP).negate().add(onPlane)
  virtual.position.copy(mirrored)
  virtual.up.set(0, 1, 0).applyMatrix4(rotation).reflect(UP)
  virtual.lookAt(target)
  virtual.far = camera.far
  virtual.updateMatrixWorld()
  virtual.projectionMatrix.copy(camera.projectionMatrix)
  matrix.copy(BIAS).multiply(virtual.projectionMatrix).multiply(virtual.matrixWorldInverse)

  // An oblique near plane on the surface: nothing below it shows in the reflection.
  clipPlane.setFromNormalAndCoplanarPoint(UP, onPlane).applyMatrix4(virtual.matrixWorldInverse)
  clip.set(clipPlane.normal.x, clipPlane.normal.y, clipPlane.normal.z, clipPlane.constant)
  const p = virtual.projectionMatrix.elements
  q.set(
    (Math.sign(clip.x) + p[8]) / p[0],
    (Math.sign(clip.y) + p[9]) / p[5],
    -1,
    (1 + p[10]) / p[14],
  )
  clip.multiplyScalar(2 / clip.dot(q))
  p[2] = clip.x
  p[6] = clip.y
  p[10] = clip.z + 1 - CLIP_BIAS
  p[14] = clip.w
  virtual.projectionMatrixInverse.copy(virtual.projectionMatrix).invert()
}

/** One reflection plane: the scene drawn from below it, at most once a frame. */
export class MirrorPlane {
  readonly camera = new PerspectiveCamera()
  /** World position to texture coordinates (divide by w), for the last frame drawn. */
  readonly matrix = new Matrix4()
  readonly target: WebGLRenderTarget
  /** The frame this plane was last drawn in, and last asked for. */
  drawn = -1
  used = -1
  /** Surfaces that borrowed it lately, hidden while it draws. */
  readonly borrowers = new Set<Object3D>()

  constructor(
    readonly height: number,
    private readonly scale: number,
  ) {
    this.target = new WebGLRenderTarget(1, 1, { type: HalfFloatType })
    this.target.texture.name = `runek:mirror@${height.toFixed(2)}`
  }

  get texture(): Texture {
    return this.target.texture
  }

  /** Draw the reflection of `scene` as `camera` sees it. Returns false when the camera can't
   *  see this side of the plane (or isn't a perspective camera). */
  draw(renderer: WebGLRenderer, scene: Scene, camera: Camera, frame: number): boolean {
    this.drawn = frame
    if (!(camera as PerspectiveCamera).isPerspectiveCamera) return false
    eye.setFromMatrixPosition(camera.matrixWorld)
    if (eye.y <= this.height) return false

    aimMirror(camera as PerspectiveCamera, this.height, this.camera, this.matrix)
    const virtual = this.camera
    virtual.layers.mask = camera.layers.mask

    renderer.getDrawingBufferSize(buffer)
    const w = Math.max(1, Math.round(buffer.x * this.scale))
    const h = Math.max(1, Math.round(buffer.y * this.scale))
    if (this.target.width !== w || this.target.height !== h) this.target.setSize(w, h)

    const hidden: Object3D[] = []
    for (const o of this.borrowers) {
      if (o.visible) {
        o.visible = false
        hidden.push(o)
      }
    }
    const previous = renderer.getRenderTarget()
    const xr = renderer.xr.enabled
    const shadows = renderer.shadowMap.autoUpdate
    renderer.getCurrentViewport(viewport)
    renderer.xr.enabled = false
    renderer.shadowMap.autoUpdate = false
    renderer.setRenderTarget(this.target)
    renderer.state.buffers.depth.setMask(true)
    if (!renderer.autoClear) renderer.clear()
    scenePass(() => renderer.render(scene, virtual))
    renderer.shadowMap.autoUpdate = shadows
    renderer.xr.enabled = xr
    renderer.setRenderTarget(previous)
    renderer.state.viewport(viewport)
    for (const o of hidden) o.visible = true
    return true
  }

  dispose() {
    this.target.dispose()
  }
}

/** The world's mirrors: up to `planes` reflection planes, drawn at `scale` of the screen's size. */
export class MirrorPool {
  readonly planes: MirrorPlane[] = []
  frame = 0

  constructor(
    readonly maxPlanes = 2,
    readonly scale = 0.5,
  ) {}

  /** The plane for a surface whose top is at `height`, made on first use; null once every slot
   *  is taken by other heights. */
  planeFor(height: number): MirrorPlane | null {
    for (const plane of this.planes) {
      if (Math.abs(plane.height - height) <= MIRROR_TOLERANCE) return plane
    }
    if (this.planes.length >= this.maxPlanes) return null
    const plane = new MirrorPlane(height, this.scale)
    this.planes.push(plane)
    return plane
  }

  /** Count a frame, and give back the slots of planes nothing has drawn for a while. */
  tick() {
    this.frame++
    for (let i = this.planes.length - 1; i >= 0; i--) {
      const plane = this.planes[i]
      if (this.frame - plane.used > IDLE_FRAMES) {
        plane.dispose()
        this.planes.splice(i, 1)
      }
    }
  }

  dispose() {
    for (const plane of this.planes) plane.dispose()
    this.planes.length = 0
  }
}

export const MirrorPoolContext = createContext<MirrorPool | null>(null)

/**
 * The world's reflection planes for the mirror materials inside (`useMirrorMaterial`): up to
 * `planes` distinct surface heights, each drawn once a frame at `scale` of the screen's size, and
 * only while a surface on it is in view. `<World>` runs one (see its `mirrors`); use this
 * directly only in your own `<Canvas>`.
 */
export function MirrorPlanes({
  planes = 2,
  scale = 0.5,
  children,
}: {
  planes?: number
  scale?: number
  children?: ReactNode
}) {
  const pool = useMemo(() => new MirrorPool(planes, scale), [planes, scale])
  useEffect(() => () => pool.dispose(), [pool])
  useFrame(() => pool.tick(), -1)
  return createElement(MirrorPoolContext.Provider, { value: pool }, children)
}

const box = new Box3()

/** The world height of the top of what `object` draws. */
function topOf(object: Object3D): number {
  const geometry = (
    object as { geometry?: { boundingBox: Box3 | null; computeBoundingBox(): void } }
  ).geometry
  if (!geometry) return object.getWorldPosition(eye).y
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  return box.copy(geometry.boundingBox as Box3).applyMatrix4(object.matrixWorld).max.y
}

const VERTEX_HEAD = /* glsl */ `
uniform mat4 uMirrorMatrix;
varying vec4 vMirrorUv;`
const VERTEX_BODY = /* glsl */ `
vMirrorUv = uMirrorMatrix * modelMatrix * vec4( transformed, 1.0 );`
const FRAGMENT_HEAD = /* glsl */ `
uniform sampler2D uMirror;
uniform float uMirrorStrength;
varying vec4 vMirrorUv;`
const FRAGMENT_BODY = /* glsl */ `
if ( uMirrorStrength > 0.0 ) {
  vec2 mirrorUv = vMirrorUv.xy / vMirrorUv.w;
  vec2 mirrorEdge = smoothstep( 0.0, 0.06, mirrorUv ) * smoothstep( 1.0, 0.94, mirrorUv );
  float facing = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );
  float mirrorMix = uMirrorStrength * mix( 0.35, 1.0, pow( facing, 3.0 ) ) * mirrorEdge.x * mirrorEdge.y;
  outgoingLight = mix( outgoingLight, texture2D( uMirror, mirrorUv ).rgb, mirrorMix );
}`

/**
 * A material for `look` that reflects the world above its surface at `strength` (0 to 1): a
 * polished floor, a wet street, still water. The reflection comes from the world's mirror for
 * the surface's height, shared by every reflective surface at that height and drawn once a frame
 * however many there are, so a component never renders the scene itself (CONTRACT §7). At
 * strength 0, or past the world's plane limit, it draws as `useMaterial(look)`.
 *
 * Use it on flat, upward-facing surfaces. The material is the component's own (it changes per
 * draw), so its parts aren't batched.
 *
 * ```tsx
 * const material = useMirrorMaterial({ color: palette.floor, roughness: 0.3 }, reflect)
 * ```
 */
export function useMirrorMaterial(look: MaterialLook, strength: number): Material {
  const pool = useContext(MirrorPoolContext)
  const plain = useMaterial(look)
  const gl = useThree((s) => s.gl)
  const kind = look.kind === 'physical' ? 'physical' : 'standard'
  const { kind: _kind, slot: _slot, ...params } = look
  const key = JSON.stringify(params)
  const reflective = useMemo(() => {
    if (
      !pool ||
      !(strength > 0) ||
      look.kind === 'basic' ||
      !(gl as { isWebGLRenderer?: boolean }).isWebGLRenderer
    )
      return null
    const material =
      kind === 'physical' ? new MeshPhysicalMaterial(params) : new MeshStandardMaterial(params)
    const uniforms = {
      uMirror: { value: null as Texture | null },
      uMirrorMatrix: { value: new Matrix4() },
      uMirrorStrength: { value: 0 },
    }
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>${VERTEX_HEAD}`)
        .replace('#include <project_vertex>', `#include <project_vertex>${VERTEX_BODY}`)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>${FRAGMENT_HEAD}`)
        .replace('#include <opaque_fragment>', `${FRAGMENT_BODY}\n#include <opaque_fragment>`)
    }
    material.customProgramCacheKey = () => 'runek-mirror'
    material.onBeforeRender = (renderer, scene, camera, _geometry, object) => {
      uniforms.uMirrorStrength.value = 0
      // Inside another pass (this mirror's own, another plane's, a rift's view) it draws plain,
      // and claims no plane: only what the viewer sees takes a slot.
      if (inScenePass()) return
      const plane = pool.planeFor(topOf(object))
      if (!plane) return
      plane.used = pool.frame
      plane.borrowers.add(object)
      if (plane.drawn !== pool.frame)
        plane.draw(renderer as WebGLRenderer, scene, camera, pool.frame)
      uniforms.uMirror.value = plane.texture
      uniforms.uMirrorMatrix.value.copy(plane.matrix)
      uniforms.uMirrorStrength.value = strength
    }
    return { material, uniforms }
  }, [pool, gl, kind, key, strength])

  useEffect(() => {
    if (!reflective) return
    return () => {
      for (const plane of pool?.planes ?? []) {
        for (const o of plane.borrowers)
          if ((o as { material?: unknown }).material === reflective.material)
            plane.borrowers.delete(o)
      }
      reflective.material.dispose()
    }
  }, [reflective, pool])

  return reflective?.material ?? plain
}
