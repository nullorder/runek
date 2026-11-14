// Additive light that is not a real light: a lamp's haze cone and the pool it leaves on the
// street. One shared material per color and strength: a GLSL ShaderMaterial here, and its TSL
// twin for WebGPURenderer in nodes/haze.ts. Both work on instanced and merged geometry: they read
// only `uv`, normals and world positions.
//
// Additive light must fade into fog rather than mix toward it (mixing would add the fog color
// wherever the cone is), so they attenuate by the scene's linear fog range themselves.

import {
  AdditiveBlending,
  type Color,
  DoubleSide,
  type Material,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three'

const HAZE_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  // Lamps share one instanced mesh for their cones and one for their pools (StreetLamp.tsx), so
  // each instance brings its own place and turn.
  #ifdef USE_INSTANCING
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 n = mat3(instanceMatrix) * normal;
  #else
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec3 n = normal;
  #endif
  vec4 mv = viewMatrix * world;
  vN = normalize(normalMatrix * n);
  vV = normalize(-mv.xyz);
  vUv = uv;
  vWorld = world.xyz;
  gl_Position = projectionMatrix * mv;
}`

// The scene's linear fog range sets how far additive light carries, whatever fog chunk is in use.
export const FOG_FADE = /* glsl */ `
uniform float fogNear;
uniform float fogFar;
float hazeFog(vec3 world) {
  #ifdef USE_FOG
    return 1.0 - 0.94 * smoothstep(fogNear, fogFar, distance(world, cameraPosition));
  #else
    return 1.0;
  #endif
}`

// Brightest where the cone is seen side on through its middle, falling to nothing at the top.
const CONE_FRAG = /* glsl */ `
uniform vec3 uColor;
varying vec3 vN;
varying vec3 vV;
varying vec2 vUv;
varying vec3 vWorld;
${FOG_FADE}
void main() {
  float facing = pow(abs(dot(normalize(vN), normalize(vV))), 1.5);
  float fall = vUv.y * vUv.y;
  gl_FragColor = vec4(uColor * facing * fall * hazeFog(vWorld), 1.0);
}`

// A soft disc on the ground. It doubles in strength with distance, because near lamps usually
// hold a real light from the pool, which lights the street itself.
const POOL_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform vec2 uFade;
varying vec2 vUv;
varying vec3 vWorld;
${FOG_FADE}
void main() {
  float r = length(vUv - 0.5) * 2.0;
  float disc = (1.0 - smoothstep(0.0, 1.0, r));
  disc *= disc;
  float far = mix(0.5, 1.0, smoothstep(uFade.x, uFade.y, distance(vWorld, cameraPosition)));
  gl_FragColor = vec4(uColor * disc * far * hazeFog(vWorld), 1.0);
}`

const cache = new Map<string, Material>()

export function additive<M extends Material>(m: M): M {
  m.transparent = true
  m.blending = AdditiveBlending
  m.depthWrite = false
  return m
}

/** The haze cone under a lamp head, in `color` (linear, already scaled to its luminance). */
export function coneMaterial(color: Color): Material {
  const key = `cone:${color.r.toFixed(4)},${color.g.toFixed(4)},${color.b.toFixed(4)}`
  let m = cache.get(key)
  if (!m) {
    m = new ShaderMaterial({
      vertexShader: HAZE_VERT,
      fragmentShader: CONE_FRAG,
      uniforms: UniformsUtils.merge([UniformsLib.fog, { uColor: { value: color.clone() } }]),
      side: DoubleSide,
      fog: true,
    })
    m.name = `runek:haze:${key}`
    cache.set(key, additive(m))
  }
  return m
}

/** The pool a lamp leaves on the street, faded in between `near` and `far` meters from the eye. */
export function poolMaterial(color: Color, near: number, far: number): Material {
  const key = `pool:${color.r.toFixed(4)},${color.g.toFixed(4)},${color.b.toFixed(4)}:${near}:${far}`
  let m = cache.get(key)
  if (!m) {
    m = new ShaderMaterial({
      vertexShader: HAZE_VERT,
      fragmentShader: POOL_FRAG,
      uniforms: UniformsUtils.merge([
        UniformsLib.fog,
        { uColor: { value: color.clone() }, uFade: { value: [near, far] } },
      ]),
      fog: true,
    })
    m.polygonOffset = true
    m.polygonOffsetFactor = -2
    m.polygonOffsetUnits = -4
    m.name = `runek:haze:${key}`
    cache.set(key, additive(m))
  }
  return m
}
