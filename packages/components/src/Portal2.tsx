import { useFrame, useThree } from '@react-three/fiber'
import { BallCollider, type RapierRigidBody, RigidBody } from '@react-three/rapier'
import { rng, sub, useWorld, type Vec3, type WorldComponentProps } from '@runek/core'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  HalfFloatType,
  type Mesh,
  type Object3D,
  PerspectiveCamera,
  Plane,
  ShaderMaterial,
  Vector3,
  Vector4,
  WebGLRenderTarget,
} from 'three'
import { Sign } from './Sign'

export interface Portal2Props extends WorldComponentProps {
  /**
   * Where the other end stands (the foot of its rift), in world coordinates. Each end shows
   * the other live through its opening, and walking into either carries you to the other.
   * Default: 8 units behind `position`.
   */
  destination?: Vec3
  /** Euler rotation of the far end, in radians: which way its caption faces. Default `rotation`. */
  destinationRotation?: Vec3
  /** Floating caption above the rift at `position` (e.g. the name of where it leads). */
  label?: string
  /** Floating caption above the rift at `destination`. */
  returnLabel?: string
  /** Radius of each opening, in units. The ragged edge breathes around it. */
  radius?: number
  /** Tint for the rims and glitter. Unset, the rims are an iridescent pink, violet and cyan film. */
  color?: string
  /**
   * Open both rifts and let them carry travelers. When false they shrink to small shimmering
   * bubbles and stay inert; flipping it to true tears them open. Default true.
   */
  active?: boolean
  /** Called after a traveler is carried through, with the foot of the end they came out of. */
  onTravel?: (arrival: Vec3) => void
}

// The quad reaches past the edge so the halo and the shed glitter have room; in multiples of `radius`.
const EXTENT = 1.7
// How far open the rifts sit while inactive: small bubbles, in multiples of `radius`.
const CLOSED = 0.18
const MOTES = 700

// The edge of a rift, shared by the window and the glitter so sparks are born right on it.
const EDGE = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uOpen;
uniform float uTurb;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.07 + 13.3; a *= 0.5; }
  return v;
}
// Sampling noise on the unit circle keeps the outline seamless all the way round.
float edge(vec2 dir) {
  float ragged = smoothstep(${CLOSED.toFixed(2)}, 1.0, uOpen) * uTurb;
  float slow = fbm(dir * 1.4 + uSeed + uTime * 0.11) - 0.5;
  float fine = noise(dir * 6.0 - uSeed + uTime * 0.7) - 0.5;
  return uOpen * (0.82 + slow * 0.55 * ragged + fine * 0.1 * ragged);
}
// Thin-film iridescence, held to the pink / violet / cyan end of the spectrum.
vec3 film(float x) {
  x = fract(x);
  vec3 c = mix(vec3(1.0, 0.08, 0.55), vec3(0.35, 0.12, 1.0), smoothstep(0.0, 0.33, x));
  c = mix(c, vec3(0.1, 0.75, 1.0), smoothstep(0.33, 0.66, x));
  return mix(c, vec3(1.0, 0.08, 0.55), smoothstep(0.66, 1.0, x));
}`

// Camera-facing around the rift's center, so it reads as a hole in space from any side.
const WINDOW_VERTEX = /* glsl */ `
uniform float uR;
varying vec2 vP;
void main() {
  vP = position.xy / uR;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * length(modelMatrix[0].xyz);
  gl_Position = projectionMatrix * mv;
}`

const WINDOW_FRAGMENT = /* glsl */ `
${EDGE}
uniform sampler2D uView;
uniform vec4 uViewport;
uniform vec3 uTint;
uniform float uTintMix;
varying vec2 vP;

void main() {
  float r = length(vP);
  vec2 dir = vP / max(r, 1e-4);
  float d = r - edge(dir);
  float s = mix(0.45, 1.0, uOpen);
  float inside = 1.0 - smoothstep(-0.006 * s, 0.006 * s, d);

  // The far end is sampled in screen space, so it moves with the viewer like a real opening;
  // near the rim it bends outward a touch, like light through a soap film.
  float lens = exp(min(d, 0.0) / (0.05 * s));
  vec2 uv = (gl_FragCoord.xy - uViewport.xy) / uViewport.zw - dir * lens * 0.012;
  vec3 far = texture2D(uView, uv).rgb;
#ifdef TONE_MAPPING
  far = toneMapping(far);
#endif

  float a = atan(vP.y, vP.x);
  vec3 tint = mix(film(a * 0.32 + d * 1.2 + uTime * 0.08), uTint, uTintMix);
  far = mix(far, tint * 0.5, lens * 0.25);

  // The rim flickers along its length like plasma rather than glowing as one even line.
  float plasma = 0.55 + 0.9 * noise(dir * 14.0 + vec2(uTime * 1.7, -uTime * 1.3) + uSeed);
  float core = exp(-pow(d / (0.02 * s), 2.0)) * plasma;
  float glow = exp(-abs(d) / (0.04 * s)) * plasma;
  float halo = step(0.0, d) * exp(-pow(d / (0.2 * s), 2.0)) * 0.16;

  // Glints that twinkle in a band hugging the rim, mostly on the outside.
  vec2 g = vP * 40.0;
  vec2 id = floor(g);
  float h = hash(id + uSeed);
  vec2 off = (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.6;
  float twinkle = pow(0.5 + 0.5 * sin(uTime * (2.0 + h * 5.0) + h * 40.0), 6.0);
  float band = exp(-pow((d - 0.05 * s) / (0.1 * s), 2.0));
  float glint = step(0.6, h) * twinkle * smoothstep(0.14, 0.0, length(fract(g) - 0.5 - off)) * band;

  // Fade everything out before the edge of the quad so it never shows as a square.
  float fade = 1.0 - smoothstep(${(EXTENT * 0.75).toFixed(2)}, ${EXTENT.toFixed(2)}, r);
  vec3 light = (tint * (glow * 1.1 + halo) + vec3(1.0) * core * 1.8
             + mix(vec3(1.0), tint, 0.4) * glint * 2.5) * fade;

  // Premultiplied: the window is opaque, the rim adds over whatever is behind it.
  float alpha = max(inside, clamp((core * 0.6 + glow * 0.6 + halo * 1.2 + glint * 0.5) * fade, 0.0, 1.0));
  gl_FragColor = vec4(far * inside + light, alpha);
  #include <colorspace_fragment>
}`

const MOTE_VERTEX = /* glsl */ `
${EDGE}
uniform float uR;
uniform float uSize;
uniform float uHalfHeight;
uniform vec3 uTint;
uniform float uTintMix;
attribute vec3 aMote;
attribute vec3 aKind;
varying vec3 vColor;
void main() {
  float life = fract(aMote.y + uTime * aMote.z);
  vec2 dir = vec2(cos(aMote.x), sin(aMote.x));
  // Born on the rim, then shed outward (or, for a few, inward) and settling like glitter.
  float r = edge(dir) + aKind.z * life * mix(0.4, 1.0, uOpen);
  float a = aMote.x + life * 0.35;
  vec2 p = vec2(cos(a), sin(a)) * r - vec2(0.0, 0.3 * life * life * uOpen);
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float scale = length(modelMatrix[0].xyz);
  mv.xy += p * uR * scale;
  gl_Position = projectionMatrix * mv;

  float fade = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.55, 1.0, life));
  float twinkle = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (5.0 + aKind.y * 9.0) + aMote.y * 60.0), 3.0);
  vColor = mix(vec3(1.0), mix(film(aKind.y), uTint, uTintMix), 0.55) * fade * twinkle;
  gl_PointSize = uSize * scale * (0.4 + aKind.x) * projectionMatrix[1][1] * uHalfHeight / -mv.z;
}`

const MOTE_FRAGMENT = /* glsl */ `
varying vec3 vColor;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float spark = pow(smoothstep(0.5, 0.0, d), 2.0);
  gl_FragColor = vec4(vColor * spark * 1.6, 1.0);
}`

const POOL_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const POOL_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpen;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = pow(max(1.0 - r, 0.0), 2.2) * 0.4 * uOpen;
  gl_FragColor = vec4(uColor * a, 1.0);
}`

type Uniform<T> = { value: T }
interface Shared {
  uTime: Uniform<number>
  uOpen: Uniform<number>
  uTurb: Uniform<number>
}

// Only one rift draws its far view at a time: a rift seen inside another's view keeps the
// frame it last drew rather than recursing.
let drawingView = false

// ecctrl's camera rig: a pivot at the scene root holding a single follow point.
const isCameraRig = (o: Object3D) =>
  o.type === 'Object3D' && o.children.length === 1 && o.children[0].type === 'Object3D'

/**
 * A pair of linked rifts torn in the air: ragged, breathing openings edged in iridescent light
 * and shedding glitter. Each shows the other end live and in parallax, exactly as you'd see it
 * standing there, and walking into either carries you through to the other, momentum and all.
 * Both ends are places in the same world, so use it for shortcuts you can walk (across a map,
 * up a tower, between rooms); for travel to another world or page, use `Portal`. The look is
 * procedural and asset-free (the seed shapes the edges and the glitter). Each open rift on
 * screen costs a second render of the scene, clipped to the rift's footprint.
 */
export function Portal2({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  destination,
  destinationRotation,
  label,
  returnLabel,
  radius = 1.5,
  color,
  active = true,
  onTravel,
}: Portal2Props) {
  const { unit, player } = useWorld()
  const scene = useThree((s) => s.scene)
  const get = useThree((s) => s.get)
  const R = radius * unit
  const there: Vec3 = destination ?? [position[0], position[1], position[2] - 8 * unit]

  const shared = useMemo<Shared>(
    () => ({ uTime: { value: 0 }, uOpen: { value: CLOSED }, uTurb: { value: 1 } }),
    [],
  )
  const near = useRef<Group>(null)
  const far = useRef<Group>(null)
  const nearCore = useRef<Group>(null)
  const farCore = useRef<Group>(null)
  const ends = useMemo(() => [near, far], [])
  const arrivals = useMemo(() => [new Set<number>(), new Set<number>()], [])

  useFrame(({ clock }, dt) => {
    const goal = active ? 1 : CLOSED
    const open = shared.uOpen.value
    shared.uOpen.value = open + (goal - open) * (1 - Math.exp(-dt * 1.8))
    shared.uTurb.value = 1 + 2.5 * Math.abs(goal - open)
    shared.uTime.value = clock.elapsedTime
  })

  // Carry a body from one end to the matching spot at the other, keeping its velocity. When it
  // is the avatar, its camera rig hops with it so the view doesn't sweep across the world.
  const travel = (
    body: RapierRigidBody,
    from: RefObject<Group | null>,
    to: RefObject<Group | null>,
    arrival: Vec3,
    landing: Set<number>,
  ) => {
    if (!from.current || !to.current) return
    const offset = to.current
      .getWorldPosition(new Vector3())
      .sub(from.current.getWorldPosition(new Vector3()))
    const t = body.translation()
    const was = new Vector3(t.x, t.y, t.z)
    landing.add(body.handle)
    body.setTranslation(was.clone().add(offset), true)

    const eye = player?.current?.getWorldPosition(new Vector3())
    if (eye && eye.distanceToSquared(was) < 4 * unit * unit) {
      get().camera.position.add(offset)
      for (const o of scene.children) {
        if (isCameraRig(o) && o.position.distanceToSquared(was) < 9 * unit * unit) {
          o.position.add(offset)
        }
      }
    }
    onTravel?.(arrival)
  }

  const common = { R, unit, shared, color, active, ends }
  return (
    <>
      <Rift
        {...common}
        end={near}
        core={nearCore}
        otherCore={farCore}
        at={position}
        rotation={rotation}
        seed={sub(seed, 0)}
        label={label}
        arrivals={arrivals[0]}
        onEnter={(body) => travel(body, nearCore, farCore, there, arrivals[1])}
      />
      <Rift
        {...common}
        end={far}
        core={farCore}
        otherCore={nearCore}
        at={there}
        rotation={destinationRotation ?? rotation}
        seed={sub(seed, 1)}
        label={returnLabel}
        arrivals={arrivals[1]}
        onEnter={(body) => travel(body, farCore, nearCore, position, arrivals[0])}
      />
    </>
  )
}

interface RiftProps {
  end: RefObject<Group | null>
  /** The center of this rift and of the other one; the view and travel follow their world positions. */
  core: RefObject<Group | null>
  otherCore: RefObject<Group | null>
  ends: RefObject<Group | null>[]
  at: Vec3
  rotation: Vec3
  R: number
  unit: number
  seed: number
  label?: string
  color?: string
  active: boolean
  shared: Shared
  arrivals: Set<number>
  onEnter: (body: RapierRigidBody) => void
}

function Rift({
  end,
  core,
  otherCore,
  ends,
  at,
  rotation,
  R,
  unit,
  seed,
  label,
  color,
  active,
  shared,
  arrivals,
  onEnter,
}: RiftProps) {
  const pane = useRef<Mesh>(null)

  const view = useMemo(() => {
    const camera = new PerspectiveCamera()
    camera.matrixAutoUpdate = false
    camera.matrixWorldAutoUpdate = false
    return {
      camera,
      target: new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 }),
      viewport: new Vector4(),
      clip: new Plane(),
      forward: new Vector3(),
      point: new Vector3(),
      here: new Vector3(),
      there: new Vector3(),
    }
  }, [])
  useEffect(() => () => view.target.dispose(), [view])

  const tint = useMemo(() => new Color(color ?? '#ffffff'), [color])
  const tintMix = color ? 0.65 : 0
  const own = useMemo(() => ({ uSeed: { value: rng(seed)() * 100 } }), [seed])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: WINDOW_VERTEX,
        fragmentShader: WINDOW_FRAGMENT,
        uniforms: {
          ...shared,
          ...own,
          uR: { value: R },
          uView: { value: view.target.texture },
          uViewport: { value: view.viewport },
          uTint: { value: tint },
          uTintMix: { value: tintMix },
        },
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
      }),
    [shared, own, R, view, tint, tintMix],
  )

  const motes = useMemo(() => {
    const r = rng(sub(seed, 1))
    const mote = new Float32Array(MOTES * 3)
    const kind = new Float32Array(MOTES * 3)
    for (let i = 0; i < MOTES; i++) {
      mote[i * 3] = r() * Math.PI * 2
      mote[i * 3 + 1] = r()
      mote[i * 3 + 2] = 0.12 + r() * 0.3
      kind[i * 3] = r() * r()
      kind[i * 3 + 1] = r()
      kind[i * 3 + 2] = r() < 0.2 ? -0.08 - r() * 0.12 : 0.1 + r() * 0.55
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(MOTES * 3), 3))
    geometry.setAttribute('aMote', new BufferAttribute(mote, 3))
    geometry.setAttribute('aKind', new BufferAttribute(kind, 3))
    const material = new ShaderMaterial({
      vertexShader: MOTE_VERTEX,
      fragmentShader: MOTE_FRAGMENT,
      uniforms: {
        ...shared,
        ...own,
        uR: { value: R },
        uSize: { value: 0.05 * R },
        uHalfHeight: { value: 400 },
        uTint: { value: tint },
        uTintMix: { value: tintMix },
      },
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    return { geometry, material }
  }, [shared, own, R, seed, tint, tintMix])

  const pool = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: POOL_VERTEX,
        fragmentShader: POOL_FRAGMENT,
        uniforms: { uColor: { value: new Color(color ?? '#c86bff') }, uOpen: shared.uOpen },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [color, shared],
  )

  useFrame(({ size, viewport }) => {
    motes.material.uniforms.uHalfHeight.value = (size.height * viewport.dpr) / 2
  })

  // Draw the other end just before this window draws, with whatever camera is drawing it, so
  // the view never lags the viewer by a frame and is skipped whenever the rift is culled.
  useEffect(() => {
    const mesh = pane.current
    if (!mesh) return
    mesh.onBeforeRender = (renderer, scene, camera) => {
      if (drawingView || !core.current || !otherCore.current) return
      drawingView = true
      core.current.getWorldPosition(view.here)
      otherCore.current.getWorldPosition(view.there)
      const scale = core.current.getWorldScale(view.point).x
      const target = renderer.getRenderTarget()
      const xr = renderer.xr.enabled
      const shadows = renderer.shadowMap.autoUpdate
      const planes = renderer.clippingPlanes
      renderer.getCurrentViewport(view.viewport)
      const w = view.viewport.z
      const h = view.viewport.w
      view.target.setSize(w, h)

      // The viewer's camera, carried to the other end.
      const eye = view.camera
      eye.projectionMatrix.copy(camera.projectionMatrix)
      eye.projectionMatrixInverse.copy(camera.projectionMatrixInverse)
      eye.matrixWorld.copy(camera.matrixWorld)
      const m = eye.matrixWorld.elements
      m[12] += view.there.x - view.here.x
      m[13] += view.there.y - view.here.y
      m[14] += view.there.z - view.here.z
      eye.matrixWorldInverse.copy(eye.matrixWorld).invert()

      // Cut away whatever stands between the carried camera and the far rift (a wall the viewer
      // isn't actually behind), keeping a rift's radius of what's just in front of it.
      view.forward.set(-m[8], -m[9], -m[10]).normalize()
      view.point.copy(view.there).addScaledVector(view.forward, -R * scale)
      view.clip.setFromNormalAndCoplanarPoint(view.forward, view.point)

      // Only shade the pixels this rift covers on screen.
      const c = view.point.copy(view.here).applyMatrix4(camera.matrixWorldInverse)
      const extent = R * EXTENT * scale
      if (-c.z > extent) {
        const p = camera.projectionMatrix.elements
        const rx = ((extent * p[0]) / -c.z) * (w / 2)
        const ry = ((extent * p[5]) / -c.z) * (h / 2)
        c.applyMatrix4(camera.projectionMatrix)
        const x = Math.max(0, Math.floor((c.x * 0.5 + 0.5) * w - rx))
        const y = Math.max(0, Math.floor((c.y * 0.5 + 0.5) * h - ry))
        view.target.scissor.set(x, y, Math.ceil(2 * rx), Math.ceil(2 * ry))
        view.target.scissorTest = true
      } else {
        view.target.scissorTest = false
      }

      for (const e of ends) if (e.current) e.current.visible = false
      renderer.xr.enabled = false
      renderer.shadowMap.autoUpdate = false
      renderer.clippingPlanes = [view.clip]
      renderer.setRenderTarget(view.target)
      renderer.state.buffers.depth.setMask(true)
      if (!renderer.autoClear) renderer.clear()
      renderer.render(scene, eye)
      renderer.clippingPlanes = planes
      renderer.shadowMap.autoUpdate = shadows
      renderer.xr.enabled = xr
      renderer.setRenderTarget(target)
      renderer.state.viewport(view.viewport)
      for (const e of ends) if (e.current) e.current.visible = true
      drawingView = false
    }
    return () => {
      mesh.onBeforeRender = () => {}
    }
  }, [view, ends, core, otherCore, R])

  const extent = R * EXTENT

  return (
    <RigidBody type="fixed" colliders={false} position={at} rotation={rotation}>
      {/* A sensor filling the opening, the same from every side. Only dynamic bodies (the
          avatar, loose props) travel; one that just arrived isn't sent back until it steps out. */}
      <BallCollider
        sensor
        args={[Math.max(R * 0.8, 0.6 * unit)]}
        position={[0, R, 0]}
        onIntersectionEnter={({ other: o }) => {
          const body = o.rigidBody
          if (!active || !body?.isDynamic() || arrivals.has(body.handle)) return
          onEnter(body)
        }}
        onIntersectionExit={({ other: o }) => {
          if (o.rigidBody) arrivals.delete(o.rigidBody.handle)
        }}
      />

      <group ref={end}>
        <group ref={core} position={[0, R, 0]}>
          <mesh ref={pane} material={material} renderOrder={1}>
            <planeGeometry args={[extent * 2, extent * 2]} />
          </mesh>
          <points
            geometry={motes.geometry}
            material={motes.material}
            frustumCulled={false}
            renderOrder={2}
          />
        </group>

        <mesh position={[0, 0.02 * unit, 0]} rotation={[-Math.PI / 2, 0, 0]} material={pool}>
          <planeGeometry args={[R * 2.6, R * 2.6]} />
        </mesh>

        {label && (
          <Sign position={[0, R * 2 + 0.7 * unit, 0]} size={0.6} color={color ?? '#e9b8ff'} glow>
            {label}
          </Sign>
        )}
      </group>
    </RigidBody>
  )
}
