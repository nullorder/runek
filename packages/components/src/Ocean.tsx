import { useFrame } from '@react-three/fiber'
import { useWorld, type Vec3 } from '@runek/core'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface OceanProps {
  position?: Vec3
  rotation?: Vec3
  /** Plane size `[width, depth]`, in units. With `follow` on (the default) this patch tracks
   *  the camera, so keep it large enough to reach past the world fog. */
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
  /** Track the camera horizontally for an endless sea (default true). Set false to pin it. */
  follow?: boolean
}

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uWaveHeight;
  uniform float uWaveSpeed;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vWave;

  // Long, slow ocean swells (lower frequencies than a Lake's chop).
  float waveH(vec2 q, float t) {
    float w1 = sin(q.x * 0.045 + t) * cos(q.y * 0.035 + t * 0.8);
    float w2 = sin(q.x * 0.018 - t * 0.7) * sin(q.y * 0.06 + t);
    float w3 = sin((q.x + q.y) * 0.09 + t * 1.4) * 0.25;
    return (w1 + w2 + w3) * 0.5;
  }

  void main() {
    float t = uTime * uWaveSpeed;
    // World-space horizontal coords of the undisplaced vertex, so the swells stay put in the
    // world even as the mesh follows the camera (no swimming).
    vec2 wxz = (modelMatrix * vec4(position.x, position.y, 0.0, 1.0)).xz;
    float h = waveH(wxz, t);
    vWave = h;

    vec3 p = position;
    p.z += h * uWaveHeight;

    float eps = 1.5;
    float hx = waveH(wxz + vec2(eps, 0.0), t);
    float hy = waveH(wxz + vec2(0.0, eps), t);
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
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
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
    col = mix(col, vec3(0.62, 0.78, 0.9), fresnel * 0.5);

    // sun glint
    vec3 r = reflect(-uSunDir, n);
    float glint = pow(max(dot(r, viewDir), 0.0), 80.0);
    col += vec3(1.0, 0.95, 0.85) * glint * 0.8;

    // crest brighten
    col += pow(max(m - 0.6, 0.0), 2.0) * 0.35;

    float alpha = 0.86 + fresnel * 0.14;

    // Blend into the world's distance fog so the far sea melts into the sky/horizon.
    float fogF = smoothstep(uFogNear, uFogFar, distance(cameraPosition, vWorldPos));
    col = mix(col, uFogColor, fogF);
    alpha = mix(alpha, 1.0, fogF);

    gl_FragColor = vec4(col, alpha);
  }
`

/** Procedural animated ocean (no textures), decorative (no collider). It follows the camera
 *  horizontally so it reads as open sea to the horizon, with world-space swells that stay put
 *  as it moves and a fog blend that melts the far water into the sky. The surface sits at the
 *  world ground baseline by default (CONTRACT §10); an explicit `position` height wins. */
export function Ocean({
  position,
  rotation = [0, 0, 0],
  size = [400, 400],
  colorDeep,
  colorShallow,
  sunPosition = [80, 30, 40],
  waveHeight = 0.4,
  waveSpeed = 0.6,
  segments = 160,
  follow = true,
}: OceanProps) {
  const { unit, palette, ground } = useWorld()
  const deep = colorDeep ?? palette.waterDeep
  const shallow = colorShallow ?? palette.waterShallow
  const y = position?.[1] ?? ground
  const w = size[0] * unit
  const d = size[1] * unit
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWaveHeight: { value: waveHeight * unit },
      uWaveSpeed: { value: waveSpeed },
      uColorDeep: { value: new THREE.Color(deep) },
      uColorShallow: { value: new THREE.Color(shallow) },
      uSunDir: { value: new THREE.Vector3(...sunPosition).normalize() },
      uFogColor: { value: new THREE.Color('#ffffff') },
      uFogNear: { value: 1e6 },
      uFogFar: { value: 1e7 },
    }),
    [waveHeight, waveSpeed, deep, shallow, sunPosition, unit],
  )

  useFrame((state, delta) => {
    const mat = matRef.current
    if (mat) {
      mat.uniforms.uTime.value += delta
      // Mirror the world's distance fog so the ocean horizon matches everything else.
      const fog = state.scene.fog
      if (fog && 'near' in fog) {
        const linear = fog as THREE.Fog
        mat.uniforms.uFogColor.value.copy(linear.color)
        mat.uniforms.uFogNear.value = linear.near
        mat.uniforms.uFogFar.value = linear.far
      }
    }
    if (follow && meshRef.current) {
      meshRef.current.position.x = state.camera.position.x + (position?.[0] ?? 0)
      meshRef.current.position.z = state.camera.position.z + (position?.[2] ?? 0)
    }
  })

  const initX = follow ? 0 : (position?.[0] ?? 0)
  const initZ = follow ? 0 : (position?.[2] ?? 0)

  return (
    <mesh
      ref={meshRef}
      position={[initX, y, initZ]}
      rotation={[-Math.PI / 2 + rotation[0], rotation[1], rotation[2]]}
    >
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
