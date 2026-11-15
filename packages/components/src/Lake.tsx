import { useFrame } from '@react-three/fiber'
import { lazyModule, planeWater, useNodeRenderer, useWater, useWorld, type Vec3 } from '@runek/core'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { WaterShape } from './nodes/water'
import { lakeSurface } from './surfaces/lake'
import { swellAt, UNDERSIDE } from './surfaces/water'

// The WebGPU (TSL) twin of the shader below, loaded only under a node renderer.
const waterNodes = lazyModule(() => import('./nodes/water'))
const WATER: WaterShape = {
  freq: [0.6, 0.4, 0.2, 0.8, 1.5],
  chop: 1.6,
  eps: 0.35,
  world: false,
  sky: 0.55,
  glint: [70, 0.7],
  crest: 0.4,
  alpha: [0.78, 0.18],
  fog: false,
}
/** How far a camera under the lake sees through it, in units: murkier than the sea. */
const CLARITY = 16

export interface LakeProps {
  position?: Vec3
  rotation?: Vec3
  /** Accepted for the component contract; this component has no seeded variation yet. */
  seed?: number
  /** Water surface `[width, depth]`, in units. */
  size?: [number, number]
  /** Defaults to the world palette's `waterDeep` slot. */
  colorDeep?: string
  /** Defaults to the world palette's `waterShallow` slot. */
  colorShallow?: string
  /** Direction the sun glint comes from; pair with your Sky's `sunPosition`. */
  sunPosition?: Vec3
  waveHeight?: number
  waveSpeed?: number
  segments?: number
}

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uWaveHeight;
  uniform float uWaveSpeed;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vWave;

  float waveH(vec2 q, float t) {
    float w1 = sin(q.x * 0.6 + t) * cos(q.y * 0.4 + t * 0.8);
    float w2 = sin(q.x * 0.2 - t * 0.7) * sin(q.y * 0.8 + t);
    float w3 = sin((q.x + q.y) * 1.5 + t * 1.6) * 0.25;
    return (w1 + w2 + w3) * 0.5;
  }

  void main() {
    float t = uTime * uWaveSpeed;
    vec3 p = position;
    float h = waveH(p.xy, t);
    vWave = h;
    p.z += h * uWaveHeight;

    // finite-difference normal so the light reacts to the waves
    float eps = 0.35;
    float hx = waveH(position.xy + vec2(eps, 0.0), t);
    float hy = waveH(position.xy + vec2(0.0, eps), t);
    vec3 n = normalize(vec3(-(hx - h) * uWaveHeight / eps, -(hy - h) * uWaveHeight / eps, 1.0));
    vNormal = normalize(mat3(modelMatrix) * n);

    vWorldPos = (modelMatrix * vec4(p, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec3 uColorDeep;
  uniform vec3 uColorShallow;
  uniform vec3 uSunDir;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vWave;
  ${UNDERSIDE}
  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    float m = smoothstep(-1.0, 1.0, vWave);
    vec3 col = mix(uColorDeep, uColorShallow, m);

    // sky tint at grazing angles
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    col = mix(col, vec3(0.62, 0.78, 0.9), fresnel * 0.55);

    // sun glint
    vec3 r = reflect(-uSunDir, n);
    float glint = pow(max(dot(r, viewDir), 0.0), 70.0);
    col += vec3(1.0, 0.95, 0.85) * glint * 0.7;

    // crest brighten, as before
    col += pow(max(m - 0.6, 0.0), 2.0) * 0.4;

    float alpha = 0.78 + fresnel * 0.18;

    gl_FragColor = gl_FrontFacing
      ? vec4(col, alpha)
      : underside(n, viewDir, m, distance(cameraPosition, vWorldPos));
  }
`

/** Procedural animated water (no textures, no collider). The local origin is the water
 *  surface: place it at or below the surrounding ground so it fills a depression rather than
 *  floating (CONTRACT §10). It is water a `Player` or a `Person` swims in wherever the ground
 *  under it leaves the water over half their height, and it is drawn from below too. */
export function Lake({
  position,
  rotation = [0, 0, 0],
  size = [20, 20],
  colorDeep,
  colorShallow,
  sunPosition = [80, 30, 40],
  waveHeight = 0.12,
  waveSpeed = 1,
  segments = 64,
}: LakeProps) {
  const { unit, palette, ground } = useWorld()
  const deep = colorDeep ?? palette.waterDeep
  const shallow = colorShallow ?? palette.waterShallow
  // Surface sits at the world ground baseline by default; explicit position wins.
  const pos = position ?? [0, ground, 0]
  const w = size[0] * unit
  const d = size[1] * unit
  // By its numbers: the default is a new array every render, and new uniforms restart the waves.
  const [sunX, sunY, sunZ] = sunPosition
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWaveHeight: { value: waveHeight * unit },
      uWaveSpeed: { value: waveSpeed },
      uColorDeep: { value: new THREE.Color(deep) },
      uColorShallow: { value: new THREE.Color(shallow) },
      uSunDir: { value: new THREE.Vector3(sunX, sunY, sunZ).normalize() },
      // The fog's range, for the underside: from below, the surface is gone where the fog closes.
      uFogNear: { value: 1e6 },
      uFogFar: { value: 1e7 },
    }),
    [waveHeight, waveSpeed, deep, shallow, sunX, sunY, sunZ, unit],
  )

  // Built here, not as a `<shaderMaterial>`: react-three-fiber copies the uniforms it is handed
  // into the material, so the clock and the fog range written each frame would never reach it.
  const nodes = useNodeRenderer() ? waterNodes() : null
  const material = useMemo(
    () =>
      nodes?.waterMaterial(uniforms, WATER) ??
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        // Both sides in one draw: from below it is the surface a diver looks up at.
        side: THREE.DoubleSide,
        forceSinglePass: true,
      }),
    [nodes, uniforms],
  )
  useEffect(() => () => material.dispose(), [material])

  const meshRef = useRef<THREE.Mesh>(null)
  const water = useMemo(
    () =>
      planeWater(() => meshRef.current, [w, d], {
        wave: (lx, ly) =>
          swellAt(WATER, lx, ly, uniforms.uTime.value * uniforms.uWaveSpeed.value) *
          uniforms.uWaveHeight.value,
        color: deep,
        clarity: CLARITY * unit,
      }),
    [w, d, uniforms, deep, unit],
  )
  useWater(water)

  useFrame((state, delta) => {
    uniforms.uTime.value += delta
    const fog = state.scene.fog
    if (fog && 'near' in fog) {
      const linear = fog as THREE.Fog
      uniforms.uFogNear.value = linear.near
      uniforms.uFogFar.value = linear.far
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={pos}
      rotation={[-Math.PI / 2 + rotation[0], rotation[1], rotation[2]]}
    >
      <planeGeometry args={[w, d, segments, segments]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

Lake.surface = lakeSurface
