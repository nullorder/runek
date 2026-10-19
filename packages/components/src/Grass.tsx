import { useFrame } from '@react-three/fiber'
import { rng, sub, useWorld, type Vec3 } from '@runek/core'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

/** Named blade heights, from a mown lawn to reeds you can hide in. */
export type GrassHeight = 'short' | 'medium' | 'tall' | 'very-tall'

const HEIGHTS: Record<GrassHeight, number> = {
  short: 0.15,
  medium: 0.35,
  tall: 0.8,
  'very-tall': 1.5,
}

export interface GrassProps {
  position?: Vec3
  rotation?: Vec3
  /** Patch extent `[width, depth]`, in units. */
  area?: [number, number]
  count?: number
  /**
   * Blade height: a preset (`short` lawn, `medium`, `tall` meadow, `very-tall` reeds) or a
   * number in units. Taller grass grows thicker blades that lean a little. Default `medium`
   * (0.35).
   */
  height?: GrassHeight | number
  /** Defaults to the world palette's `foliage` slot. */
  color?: string
  /** Wind sway strength; 0 disables the animation. */
  sway?: number
  seed?: number
}

interface Blade {
  x: number
  z: number
  rot: number
  scale: number
  shade: number
  lean: number
}

/** Decorative instanced blades with a vertex-shader wind sway — no collider. */
export function Grass({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  area = [10, 10],
  count = 600,
  height = 'medium',
  color,
  sway = 1,
  seed = 1,
}: GrassProps) {
  const { unit, palette } = useWorld()
  const bladeColor = color ?? palette.foliage
  const w = area[0] * unit
  const d = area[1] * unit
  const meters = typeof height === 'number' ? height : (HEIGHTS[height] ?? HEIGHTS.medium)
  const h = meters * unit
  // Thicker blades for taller grass, so a reed doesn't read as a needle; `medium` is the baseline.
  const radius = 0.015 * unit * Math.min(Math.max(Math.sqrt(meters / HEIGHTS.medium), 0.8), 2)
  // Grass up to `medium` stands straight; taller blades lean up to this far, in radians.
  const maxLean = 0.35 * Math.min(Math.max((meters - HEIGHTS.medium) / 1.15, 0), 1)
  const ref = useRef<THREE.InstancedMesh>(null)

  // Shared uniform objects so the patched shader and useFrame see the same values.
  const swayUniforms = useRef({
    uTime: { value: 0 },
    uBladeHeight: { value: h },
    uSway: { value: sway * h * 0.18 },
  })
  swayUniforms.current.uBladeHeight.value = h
  swayUniforms.current.uSway.value = sway * h * 0.18

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial()
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = swayUniforms.current.uTime
      shader.uniforms.uBladeHeight = swayUniforms.current.uBladeHeight
      shader.uniforms.uSway = swayUniforms.current.uSway
      shader.vertexShader = `
        uniform float uTime;
        uniform float uBladeHeight;
        uniform float uSway;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        /* glsl */ `
        #include <begin_vertex>
        #ifdef USE_INSTANCING
          float swayPhase = instanceMatrix[3].x * 0.9 + instanceMatrix[3].z * 1.3;
          float swayAmt = clamp(position.y / uBladeHeight + 0.5, 0.0, 1.0) * uSway;
          transformed.x += sin(uTime * 1.7 + swayPhase) * swayAmt;
          transformed.z += cos(uTime * 1.2 + swayPhase) * swayAmt * 0.6;
        #endif
        `,
      )
    }
    mat.customProgramCacheKey = () => 'runek-grass-sway'
    return mat
  }, [])

  useEffect(() => () => material.dispose(), [material])

  useFrame((_, delta) => {
    if (sway > 0) swayUniforms.current.uTime.value += delta
  })

  const blades = useMemo<Blade[]>(() => {
    const next = rng(seed)
    // Its own stream, so adding lean left every seed's blade layout where it was.
    const tilt = rng(sub(seed, 1))
    return Array.from({ length: count }, () => ({
      x: (next() - 0.5) * w,
      z: (next() - 0.5) * d,
      rot: next() * Math.PI,
      scale: 0.6 + next() * 0.8,
      shade: 0.8 + next() * 0.4,
      lean: tilt() * maxLean,
    }))
  }, [w, d, count, seed, maxLean])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const base = new THREE.Color(bladeColor)
    const tint = new THREE.Color()
    const center = new THREE.Vector3()
    blades.forEach((b, i) => {
      // Lean about the blade's root, not its middle, so it stays planted.
      dummy.rotation.set(b.lean, b.rot, 0, 'YXZ')
      center.set(0, (h * b.scale) / 2, 0).applyEuler(dummy.rotation)
      dummy.position.set(b.x + center.x, center.y, b.z + center.z)
      dummy.scale.set(1, b.scale, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, tint.copy(base).multiplyScalar(b.shade))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [blades, h, bladeColor])

  return (
    <group position={position} rotation={rotation}>
      <instancedMesh
        ref={ref}
        args={[undefined, undefined, count]}
        material={material}
        castShadow
        receiveShadow
      >
        <coneGeometry args={[radius, h, 4]} />
      </instancedMesh>
    </group>
  )
}
