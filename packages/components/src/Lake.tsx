import { useFrame } from '@react-three/fiber'
import { useWorld, type Vec3 } from '@runek/core'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface LakeProps {
  position?: Vec3
  rotation?: Vec3
  /** Water surface `[width, depth]`, in units. */
  size?: [number, number]
  colorDeep?: string
  colorShallow?: string
  waveHeight?: number
  waveSpeed?: number
  segments?: number
}

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uWaveHeight;
  uniform float uWaveSpeed;
  varying float vWave;
  void main() {
    vec3 p = position;
    float t = uTime * uWaveSpeed;
    float w1 = sin(p.x * 0.6 + t) * cos(p.y * 0.4 + t * 0.8);
    float w2 = sin(p.x * 0.2 - t * 0.7) * sin(p.y * 0.8 + t);
    vWave = (w1 + w2) * 0.5;
    p.z += vWave * uWaveHeight;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec3 uColorDeep;
  uniform vec3 uColorShallow;
  varying float vWave;
  void main() {
    float m = smoothstep(-1.0, 1.0, vWave);
    vec3 col = mix(uColorDeep, uColorShallow, m);
    col += pow(max(m - 0.6, 0.0), 2.0) * 0.6;
    gl_FragColor = vec4(col, 0.85);
  }
`

/** Procedural animated water — no textures, decorative (no collider). */
export function Lake({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = [20, 20],
  colorDeep = '#13415c',
  colorShallow = '#3f86a8',
  waveHeight = 0.12,
  waveSpeed = 1,
  segments = 64,
}: LakeProps) {
  const { unit } = useWorld()
  const w = size[0] * unit
  const d = size[1] * unit
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWaveHeight: { value: waveHeight * unit },
      uWaveSpeed: { value: waveSpeed },
      uColorDeep: { value: new THREE.Color(colorDeep) },
      uColorShallow: { value: new THREE.Color(colorShallow) },
    }),
    [waveHeight, waveSpeed, colorDeep, colorShallow, unit],
  )

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta
  })

  return (
    <mesh position={position} rotation={[-Math.PI / 2 + rotation[0], rotation[1], rotation[2]]}>
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
