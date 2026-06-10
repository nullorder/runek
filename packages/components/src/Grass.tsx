import { useFrame } from '@react-three/fiber'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface GrassProps {
  position?: Vec3
  rotation?: Vec3
  /** Patch extent `[width, depth]`, in units. */
  area?: [number, number]
  count?: number
  height?: number
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
}

/** Decorative instanced blades with a vertex-shader wind sway — no collider. */
export function Grass({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  area = [10, 10],
  count = 600,
  height = 0.35,
  color,
  sway = 1,
  seed = 1,
}: GrassProps) {
  const { unit, palette } = useWorld()
  const bladeColor = color ?? palette.foliage
  const w = area[0] * unit
  const d = area[1] * unit
  const h = height * unit
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
    return Array.from({ length: count }, () => ({
      x: (next() - 0.5) * w,
      z: (next() - 0.5) * d,
      rot: next() * Math.PI,
      scale: 0.6 + next() * 0.8,
      shade: 0.8 + next() * 0.4,
    }))
  }, [w, d, count, seed])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const base = new THREE.Color(bladeColor)
    const tint = new THREE.Color()
    blades.forEach((b, i) => {
      dummy.position.set(b.x, (h * b.scale) / 2, b.z)
      dummy.rotation.set(0, b.rot, 0)
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
        <coneGeometry args={[0.015 * unit, h, 4]} />
      </instancedMesh>
    </group>
  )
}
