import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { rng, sub, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from 'three'
import { Sign } from './Sign'

export interface PortalProps extends WorldComponentProps {
  /**
   * Where the portal leads — a URL or app route. Kept JSON-serializable so a world
   * round-trips from data. With no `onEnter`, entering navigates here
   * (`window.location.href = to`); with `onEnter`, this is just passed through to it.
   */
  to?: string
  /**
   * Called once when the avatar (or a vehicle) enters the gate, with `to`. Optional, so
   * the component still renders and round-trips from data without it (CONTRACT §1). Use it
   * to drive an in-app transition instead of a full navigation — e.g. swap the mounted world.
   * Note: a host rendered inside `<WorldRenderer>` lives in a separate React reconciler from
   * the page, so bridge this callback out through a module-level store, not React context.
   */
  onEnter?: (to: string | undefined) => void
  /** Floating caption above the gate (e.g. the destination's name). */
  label?: string
  /** Radius of the swirling vortex around the dark core, in units. */
  radius?: number
  /** Glow / swirl color; defaults to the world palette's `accent` slot. */
  color?: string
  /** Arm the trigger. Set false for a decorative or not-yet-open gate. Default true. */
  active?: boolean
}

// rapier RigidBody types: 0 Dynamic, 1 Fixed, 2 KinematicPosition, 3 KinematicVelocity.
const FIXED = 1
// `ActiveCollisionTypes`: DEFAULT (15) covers a dynamic body (the on-foot avatar) vs anything;
// OR in KINEMATIC_FIXED (8704) so the gate also fires for a kinematic vehicle (a boat, a cart)
// against this fixed sensor. The avatar capsule is dynamic; a scripted vehicle is kinematic.
const TRIGGER_TYPES = 15 | 8704

// The vortex quad reaches past the swirl so the halo can fade out; in multiples of `radius`.
const EXTENT = 1.9
const MOTES = 80

// Everything is drawn camera-facing around the gate's center, so the hole reads as a sphere
// of darkness from any side rather than a flat disc.
const VORTEX_VERTEX = /* glsl */ `
uniform float uR;
uniform float uExtent;
varying vec2 vP;
void main() {
  vP = position.xy * uExtent;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uExtent * uR;
  gl_Position = projectionMatrix * mv;
}`

const VORTEX_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform vec3 uHot;
uniform vec3 uCool;
varying vec2 vP;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
// Rotate a point by an angle that grows toward the center: sampled noise becomes spiral arms.
vec2 twirl(vec2 p, float r, float k, float t) {
  float a = k / (r + 0.15) + t;
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c) * p;
}

void main() {
  float r = length(vP);
  const float h = 0.42;

  float arms = mix(
    fbm(twirl(vP, r, 2.2, uTime * 0.7) * 2.4 + uSeed),
    fbm(twirl(vP, r, 3.6, uTime * 1.4) * 4.2 - uSeed),
    0.45
  );
  arms = smoothstep(0.3, 0.85, arms);

  float outside = smoothstep(h - 0.012, h + 0.012, r);
  float disc = outside * exp(-(r - h) * 2.4) * (1.0 - smoothstep(0.95, 1.3, r));
  float ring = exp(-pow((r - h * 1.04) / 0.022, 2.0));
  float halo = outside * exp(-(r - h) * 1.7) * (1.0 - smoothstep(1.3, 1.9, r));
  float pulse = 0.85 + 0.15 * sin(uTime * 1.3 + r * 6.0);

  float heat = exp(-(r - h) * 5.0);
  vec3 tint = mix(uCool, uHot, clamp(heat, 0.0, 1.0));
  vec3 light = tint * (disc * arms * 3.0 + halo * 0.4 * pulse)
             + mix(uHot, vec3(1.0), 0.6) * ring * 1.6;

  // A faint wisp of light still curling inside the horizon gives the dark core depth.
  float inner = (1.0 - outside) * pow(r / h, 6.0) * arms * 0.25;
  light += uCool * inner;

  // Premultiplied: the core occludes what's behind it, the glow adds on top.
  float shadow = (1.0 - smoothstep(h, h * 1.8, r)) * 0.6;
  float alpha = max(1.0 - outside, clamp(disc * arms * 0.7 + shadow * outside, 0.0, 0.95));
  gl_FragColor = vec4(light, alpha);
}`

const MOTE_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uR;
uniform float uSize;
uniform float uHalfHeight;
attribute vec3 aMote;
varying float vFade;
void main() {
  float life = fract(aMote.y + uTime * aMote.z);
  float r = mix(1.45, 0.44, life * life);
  float a = aMote.x - 2.2 / (r + 0.15) - uTime * 0.7;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += vec2(cos(a), sin(a)) * r * uR;
  gl_Position = projectionMatrix * mv;
  vFade = smoothstep(0.0, 0.25, life) * (1.0 - smoothstep(0.85, 1.0, life));
  gl_PointSize = uSize * (0.6 + life) * projectionMatrix[1][1] * uHalfHeight / -mv.z;
}`

const MOTE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vFade;
void main() {
  float d = length(gl_PointCoord - 0.5);
  gl_FragColor = vec4(uColor * smoothstep(0.5, 0.0, d) * vFade, 1.0);
}`

const POOL_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const POOL_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying vec2 vUv;
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float a = pow(max(1.0 - r, 0.0), 2.2) * 0.45;
  gl_FragColor = vec4(uColor * a, 1.0);
}`

/**
 * A travel gate: a swirling vortex around a lightless core, wrapped in a soft glow, that
 * fires a one-shot event when the avatar — or a vehicle — passes through it. The visual is
 * procedural and asset-free (the seed shapes the swirl and the drifting motes); the trigger
 * is a Rapier sensor. Drive transitions with the optional `onEnter` callback, or set `to` and
 * let it navigate. Use it for world-to-world travel, level/hub transitions, or in-world
 * teleports; for a single continuous space, move the camera instead.
 */
export function Portal({
  to,
  onEnter,
  label,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  radius = 2.2,
  color,
  active = true,
}: PortalProps) {
  const { unit, palette } = useWorld()
  const ink = color ?? palette.accent
  const R = radius * unit

  const vortex = useMemo(() => {
    const hot = new Color(ink)
    const cool = hot.clone().offsetHSL(0.1, 0.05, -0.12)
    return new ShaderMaterial({
      vertexShader: VORTEX_VERTEX,
      fragmentShader: VORTEX_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uR: { value: R },
        uExtent: { value: EXTENT },
        uSeed: { value: rng(sub(seed, 0))() * 100 },
        uHot: { value: hot },
        uCool: { value: cool },
      },
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      toneMapped: false,
    })
  }, [ink, R, seed])

  const motes = useMemo(() => {
    const r = rng(sub(seed, 1))
    const data = new Float32Array(MOTES * 3)
    for (let i = 0; i < MOTES; i++) {
      data[i * 3] = r() * Math.PI * 2
      data[i * 3 + 1] = r()
      data[i * 3 + 2] = 0.08 + r() * 0.14
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(MOTES * 3), 3))
    geometry.setAttribute('aMote', new BufferAttribute(data, 3))
    const material = new ShaderMaterial({
      vertexShader: MOTE_VERTEX,
      fragmentShader: MOTE_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uR: { value: R },
        uSize: { value: 0.07 * R },
        uHalfHeight: { value: 400 },
        uColor: { value: new Color(ink).lerp(new Color('#ffffff'), 0.35) },
      },
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    return { geometry, material }
  }, [ink, R, seed])

  const pool = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: POOL_VERTEX,
        fragmentShader: POOL_FRAGMENT,
        uniforms: { uColor: { value: new Color(ink) } },
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [ink],
  )

  useFrame(({ clock, size, viewport }) => {
    const t = clock.elapsedTime
    vortex.uniforms.uTime.value = t
    motes.material.uniforms.uTime.value = t
    motes.material.uniforms.uHalfHeight.value = (size.height * viewport.dpr) / 2
  })

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {/* A generous sensor around the gate; deep enough on the approach axis that a fast
          vehicle can't tunnel through between frames. Ignores Fixed bodies (terrain, props),
          so it never fires against the ground it stands on. */}
      <CuboidCollider
        sensor
        activeCollisionTypes={TRIGGER_TYPES}
        args={[R * 1.1, R + 0.6 * unit, Math.max(R, 1.6 * unit)]}
        position={[0, R, 0]}
        onIntersectionEnter={({ other }) => {
          if (!active || !other.rigidBody || other.rigidBody.bodyType() === FIXED) return
          if (onEnter) onEnter(to)
          else if (to) window.location.href = to
        }}
      />

      <group position={[0, R, 0]}>
        <mesh material={vortex} renderOrder={1}>
          <planeGeometry args={[2, 2]} />
        </mesh>
        <points
          geometry={motes.geometry}
          material={motes.material}
          frustumCulled={false}
          renderOrder={2}
        />
      </group>

      {/* Light spilling onto the ground beneath the vortex. */}
      <mesh position={[0, 0.02 * unit, 0]} rotation={[-Math.PI / 2, 0, 0]} material={pool}>
        <planeGeometry args={[R * 2.8, R * 2.8]} />
      </mesh>

      {label && (
        <Sign position={[0, R * 2 + 0.9 * unit, 0]} size={0.7} color={ink} glow>
          {label}
        </Sign>
      )}
    </RigidBody>
  )
}
