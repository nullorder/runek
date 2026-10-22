import { useFrame, useThree } from '@react-three/fiber'
import { type Lens, useWorld } from '@runek/core'
import { useEffect, useLayoutEffect, useMemo } from 'react'
import {
  Matrix4,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three'

// A Panini projection: the view is wrapped onto a cylinder around the eye and seen from a point
// `CURVE` radii behind it. Straight ahead it matches a flat camera, verticals stay vertical,
// and the sides squeeze in instead of stretching, so it can show 140° to 200° across without
// the tunnel a flat camera gives. A flat camera can't see that wide, so the scene is drawn
// through three: ahead, left and right, each covering only the slice of the screen it serves,
// then stitched into the curve in one full-screen pass, which also blurs the periphery.

// How far behind the eye the cylinder is seen from: 0 is a flat camera (straight lines, stretched
// sides), 1 squeezes the sides most but bows horizontal lines. Halfway keeps lines gently curved.
const CURVE = 0.5
// How the view fits the screen's shape, as games do: on a 16:9 screen it is exactly `fov` across.
// Wider screens keep the same angle top to bottom and see more across (an ultrawide sees around
// you); narrower ones see less across, down to `NARROWEST` degrees, then hold that and open up top
// to bottom instead, until `MAX_VERTICAL_FOV` makes a tall screen show less across.
const REFERENCE_ASPECT = 16 / 9
const NARROWEST = 110
// The widest the view may open across, with all three cameras still covering it.
const MAX_FOV = 200
// The tallest it may open through the centre, so a tall screen narrows the view instead of
// looking down a well.
const MAX_VERTICAL_FOV = 120
// Where focus starts to fall off and where it is fully blurred, as an ellipse of angles off
// straight ahead (across, then up): wider than tall, like the eye's own field.
const FOCUS = { across: (70 * Math.PI) / 180, up: (45 * Math.PI) / 180, from: 0.5, to: 1.3 }
// Where the side cameras take over from the forward one, either side of straight ahead.
const SEAM = Math.PI / 4
// Slack around each camera's slice (in tangent units), so sampling at a seam never runs off it.
const PAD = 0.02
// Samples in the periphery blur, spread over a disc two standard deviations wide.
const TAPS = 32

/** How far across the projection plane a direction `phi` radians off straight ahead lands. */
const across = (phi: number) => ((CURVE + 1) * Math.sin(phi)) / (CURVE + Math.cos(phi))

/** The inverse of `across`: the angle off straight ahead seen at `x` across the plane. */
function angle(x: number) {
  const k = x / (CURVE + 1)
  return Math.atan(k) + Math.asin((k * CURVE) / Math.sqrt(1 + k * k))
}

const half = (degrees: number) => (degrees * Math.PI) / 360

/** The lens's half-extent on the projection plane, horizontally and vertically, for a screen
 *  `aspect` wide to its height (see `REFERENCE_ASPECT`). */
function bounds(fov: number, aspect: number): Vector2 {
  let x = (across(half(fov)) / REFERENCE_ASPECT) * aspect
  x = Math.max(x, across(half(Math.min(fov, NARROWEST))))
  x = Math.min(x, across(half(MAX_FOV)))
  const y = Math.min(x / aspect, Math.tan(half(MAX_VERTICAL_FOV)))
  return new Vector2(y * aspect, y)
}

function panini(extent: Vector2): Lens {
  return {
    project(p) {
      const h = Math.hypot(p.x, p.z)
      const phi = Math.atan2(p.x, -p.z)
      if (h < 1e-6 || CURVE + Math.cos(phi) < 0.05) return null
      const s = (CURVE + 1) / (CURVE + Math.cos(phi))
      return p.set((s * Math.sin(phi)) / extent.x, (s * p.y) / h / extent.y, 0)
    },
    unproject(ndc, target) {
      const phi = angle(ndc.x * extent.x)
      const t = (ndc.y * extent.y * (CURVE + Math.cos(phi))) / (CURVE + 1)
      return target.set(Math.sin(phi), t, -Math.cos(phi)).normalize()
    },
  }
}

interface View {
  camera: PerspectiveCamera
  /** Turns the forward camera to face this way, in camera space. */
  turn: Matrix4
  target: WebGLRenderTarget
  /** Camera-space direction → this view's clip space, for the stitching pass. */
  sample: Matrix4
  used: boolean
}

function makeView(yaw: number): View {
  const target = new WebGLRenderTarget(1, 1)
  // Marked as XR so three tone-maps and encodes each material into it exactly as it would onto
  // the screen (respecting `toneMapped: false`), stored as plain 8-bit sRGB: the stitching pass
  // then copies pixels rather than redoing the color pipeline.
  target.texture.colorSpace = SRGBColorSpace
  target.texture.internalFormat = 'RGBA8'
  ;(target as { isXRRenderTarget?: boolean }).isXRRenderTarget = true
  const camera = new PerspectiveCamera()
  camera.matrixAutoUpdate = false
  camera.matrixWorldAutoUpdate = false
  return {
    camera,
    turn: new Matrix4().makeRotationY(yaw),
    target,
    sample: new Matrix4(),
    used: true,
  }
}

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAGMENT = /* glsl */ `
uniform sampler2D uAhead;
uniform sampler2D uLeft;
uniform sampler2D uRight;
uniform mat4 uAheadM;
uniform mat4 uLeftM;
uniform mat4 uRightM;
uniform vec2 uExtent;
uniform vec2 uResolution;
uniform float uBlur;
varying vec2 vUv;

const float CURVE = ${CURVE.toFixed(4)};

vec4 look(sampler2D view, mat4 m, vec3 dir) {
  vec4 c = m * vec4(dir, 1.0);
  return texture2D(view, c.xy / c.w * 0.5 + 0.5);
}

// The direction seen at a point on the screen, one unit out from the eye's vertical axis.
vec3 ray(vec2 uv) {
  vec2 p = (uv * 2.0 - 1.0) * uExtent;
  float k = p.x / (CURVE + 1.0);
  float phi = atan(k) + asin(k * CURVE / sqrt(1.0 + k * k));
  return vec3(sin(phi), p.y * (CURVE + cos(phi)) / (CURVE + 1.0), -cos(phi));
}

vec4 seen(vec2 uv) {
  vec3 dir = ray(uv);
  float phi = atan(dir.x, -dir.z);
  if (phi > ${SEAM.toFixed(6)}) return look(uRight, uRightM, dir);
  if (phi < -${SEAM.toFixed(6)}) return look(uLeft, uLeftM, dir);
  return look(uAhead, uAheadM, dir);
}

void main() {
  // Focus falls off smoothly with the angle off straight ahead, so a wider screen shows more
  // periphery rather than a wider sharp patch.
  vec3 dir = ray(vUv);
  vec2 off = vec2(atan(dir.x, -dir.z) / ${FOCUS.across.toFixed(6)}, atan(dir.y) / ${FOCUS.up.toFixed(6)});
  float sigma = uBlur * smoothstep(${FOCUS.from.toFixed(2)}, ${FOCUS.to.toFixed(2)}, length(off));
  if (sigma < 0.35) {
    gl_FragColor = seen(vUv);
    return;
  }
  vec4 sum = vec4(0.0);
  float total = 0.0;
  for (int i = 0; i < ${TAPS}; i++) {
    float r = sqrt((float(i) + 0.5) / ${TAPS}.0) * 2.0 * sigma;
    float a = float(i) * 2.39996;
    float w = exp(-0.5 * r * r / (sigma * sigma));
    sum += seen(vUv + vec2(cos(a), sin(a)) * r / uResolution) * w;
    total += w;
  }
  gl_FragColor = sum / total;
}
`

/**
 * Draw the world through a Panini lens `fov` degrees across, in place of the camera's own flat
 * projection, while mounted, blurring toward the edges by up to `blur` CSS pixels. Takes over the
 * frame's render (a `useFrame` at priority 1), maps pointer events through the lens, and
 * publishes it as the world's `lens` so labels follow.
 */
export function PaniniLens({ fov, blur }: { fov: number; blur: number }) {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)
  const setEvents = useThree((s) => s.setEvents)
  const getState = useThree((s) => s.get)
  const { lens } = useWorld()

  const extent = useMemo(() => bounds(fov, size.width / size.height), [fov, size])
  const optics = useMemo(() => panini(extent), [extent])

  const views = useMemo(
    () => ({ ahead: makeView(0), left: makeView(SEAM * 2), right: makeView(-SEAM * 2) }),
    [],
  )
  const pass = useMemo(() => {
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uAhead: { value: views.ahead.target.texture },
        uLeft: { value: views.left.target.texture },
        uRight: { value: views.right.target.texture },
        uAheadM: { value: views.ahead.sample },
        uLeftM: { value: views.left.sample },
        uRightM: { value: views.right.sample },
        uExtent: { value: new Vector2() },
        uResolution: { value: new Vector2() },
        uBlur: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
    const quad = new Mesh(new PlaneGeometry(2, 2), material)
    quad.frustumCulled = false
    const scene = new Scene()
    scene.add(quad)
    return { scene, camera: new OrthographicCamera(), material, quad }
  }, [views])

  useEffect(
    () => () => {
      for (const view of Object.values(views)) view.target.dispose()
      pass.material.dispose()
      pass.quad.geometry.dispose()
    },
    [views, pass],
  )

  // Fit each camera's frustum to the slice of the screen it serves, and size its target so
  // straight ahead keeps the screen's pixel density.
  useLayoutEffect(() => {
    const { near, far } = camera as PerspectiveCamera
    const widest = angle(extent.x)
    const ahead = Math.min(widest, SEAM)
    // Each view's vertical reach is greatest along the screen's top edge; walk it.
    const reach = (from: number, to: number, depth: (phi: number) => number) => {
      let up = 0
      for (let i = 0; i <= 64; i++) {
        const phi = from + ((to - from) * i) / 64
        const t = (extent.y * (CURVE + Math.cos(phi))) / (CURVE + 1)
        up = Math.max(up, t / depth(phi))
      }
      return up
    }
    const sides = widest > SEAM
    const edge = 1 / Math.tan(widest)
    const spans = [
      {
        view: views.ahead,
        used: true,
        left: -Math.tan(ahead),
        right: Math.tan(ahead),
        up: reach(0, ahead, Math.cos),
      },
      {
        view: views.left,
        used: sides,
        left: edge,
        right: 1,
        up: sides ? reach(SEAM, widest, Math.sin) : 0,
      },
      {
        view: views.right,
        used: sides,
        left: -1,
        right: -edge,
        up: sides ? reach(SEAM, widest, Math.sin) : 0,
      },
    ]

    const density = (size.width * dpr) / (2 * extent.x)
    const limit = gl.capabilities.maxTextureSize
    const turned = new Matrix4()
    for (const span of spans) {
      const { view } = span
      view.used = span.used
      if (!span.used) continue
      const left = span.left - PAD
      const right = span.right + PAD
      const up = span.up + PAD
      view.target.setSize(
        Math.min(limit, Math.max(1, Math.ceil((right - left) * density))),
        Math.min(limit, Math.max(1, Math.ceil(2 * up * density))),
      )
      view.camera.near = near
      view.camera.far = far
      view.camera.projectionMatrix.makePerspective(
        left * near,
        right * near,
        up * near,
        -up * near,
        near,
        far,
      )
      view.camera.projectionMatrixInverse.copy(view.camera.projectionMatrix).invert()
      view.sample.copy(view.camera.projectionMatrix).multiply(turned.copy(view.turn).invert())
    }
    const { uniforms } = pass.material
    uniforms.uExtent.value.copy(extent)
    uniforms.uResolution.value.set(size.width * dpr, size.height * dpr)
    uniforms.uBlur.value = blur * dpr
  }, [views, pass, extent, size, dpr, camera, gl, blur])

  // Publish the lens, and aim pointer rays through it rather than the flat camera.
  useEffect(() => {
    if (lens) lens.current = optics
    const previous = getState().events.compute
    const dir = new Vector3()
    const eye = new Vector3()
    setEvents({
      compute: (event, state) => {
        state.pointer.set(
          (event.offsetX / state.size.width) * 2 - 1,
          -(event.offsetY / state.size.height) * 2 + 1,
        )
        const { camera, raycaster } = state
        optics.unproject(state.pointer, dir).transformDirection(camera.matrixWorld)
        raycaster.set(camera.getWorldPosition(eye), dir)
        raycaster.camera = camera
      },
    })
    return () => {
      if (lens?.current === optics) lens.current = null
      setEvents({ compute: previous })
    }
  }, [optics, lens, setEvents, getState])

  useFrame(({ scene }) => {
    // The controller has moved the camera this frame; nothing has folded that into its matrix.
    camera.updateMatrixWorld()
    const shadows = gl.shadowMap.autoUpdate
    const transforms = scene.matrixWorldAutoUpdate
    const target = gl.getRenderTarget()
    let first = true
    for (const view of Object.values(views)) {
      if (!view.used) continue
      view.camera.layers.mask = camera.layers.mask
      view.camera.matrixWorld.multiplyMatrices(camera.matrixWorld, view.turn)
      view.camera.matrixWorldInverse.copy(view.camera.matrixWorld).invert()
      gl.setRenderTarget(view.target)
      gl.render(scene, view.camera)
      // Shadows and transforms are the same from every side: settle them once a frame.
      if (first) {
        gl.shadowMap.autoUpdate = false
        scene.matrixWorldAutoUpdate = false
      }
      first = false
    }
    gl.shadowMap.autoUpdate = shadows
    scene.matrixWorldAutoUpdate = transforms
    gl.setRenderTarget(target)
    gl.render(pass.scene, pass.camera)
  }, 1)

  return null
}
