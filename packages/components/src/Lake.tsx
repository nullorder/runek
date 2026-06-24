import { useFrame } from '@react-three/fiber'
import { useWorld, type Vec3 } from '@runek/core'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface LakeProps {
  position?: Vec3
  rotation?: Vec3
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
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vWave;

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

    gl_FragColor = vec4(col, 0.78 + fresnel * 0.18);
  }
`

/** Procedural animated water (no textures), decorative (no collider). The local
 *  origin is the water surface: place it at or below the surrounding ground so it
 *  fills a depression rather than floating (CONTRACT §10). */
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
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWaveHeight: { value: waveHeight * unit },
      uWaveSpeed: { value: waveSpeed },
      uColorDeep: { value: new THREE.Color(deep) },
      uColorShallow: { value: new THREE.Color(shallow) },
      uSunDir: { value: new THREE.Vector3(...sunPosition).normalize() },
    }),
    [waveHeight, waveSpeed, deep, shallow, sunPosition, unit],
  )

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta
  })

  return (
    <mesh position={pos} rotation={[-Math.PI / 2 + rotation[0], rotation[1], rotation[2]]}>
      <planeGeometry args={[w, d, segments, segments]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        transparent
      />
    </mesh>
  )
}
