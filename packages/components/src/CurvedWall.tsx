import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type WorldComponentProps } from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export type CurvedWallStyle = 'solid' | 'glass'

export interface CurvedWallProps extends WorldComponentProps {
  /** Arc centerline radius, in units. The component origin is the circle's center. */
  radius?: number
  /** Sweep angle in radians, centered on the local +Z axis. */
  arc?: number
  height?: number
  thickness?: number
  /** `glass` renders a transparent curtain wall with mullions; `solid` a plain wall. */
  style?: CurvedWallStyle
  /** Chord segments; defaults from `radius × arc`, more segments reading as smoother. */
  segments?: number
  /** Solid wall color; defaults to the world palette's `wall` slot. */
  color?: string
  /** Glass tint (glass style). */
  glassColor?: string
  /** Mullion and rail color (glass style); defaults to the palette's `metal` slot. */
  frameColor?: string
}

interface Chord {
  /** Chord midpoint angle from local +Z. */
  angle: number
  x: number
  z: number
  length: number
}

/**
 * An arc of wall around the component origin — the curved-architecture counterpart of `Wall`.
 * `solid` reads as concrete; `glass` as a floor-to-ceiling curtain wall with mullions at every
 * chord joint. Leave door gaps by composing several arcs. Chords render instanced and each
 * carries a cuboid collider, so the wall blocks like the curve it draws.
 */
export function CurvedWall({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radius = 6,
  arc = Math.PI / 2,
  height = 3,
  thickness = 0.15,
  style = 'solid',
  segments,
  color,
  glassColor = '#b7d8e8',
  frameColor,
}: CurvedWallProps) {
  const { unit, palette } = useWorld()
  const wallColor = color ?? palette.wall
  const frame = frameColor ?? palette.metal
  const R = radius * unit
  const h = height * unit
  const t = thickness * unit
  const count = segments ?? Math.min(32, Math.max(4, Math.round((R * arc) / (0.9 * unit))))
  const glass = style === 'glass'
  const chordsRef = useRef<THREE.InstancedMesh>(null)
  const mullionsRef = useRef<THREE.InstancedMesh>(null)
  const railsRef = useRef<THREE.InstancedMesh>(null)

  const { chords, joints } = useMemo(() => {
    const step = arc / count
    // A hair of overlap keeps seams closed on the outside of the curve.
    const chordLength = 2 * R * Math.sin(step / 2) + t * 0.5
    const chords: Chord[] = []
    const joints: { angle: number; x: number; z: number }[] = []
    for (let i = 0; i < count; i++) {
      const angle = -arc / 2 + (i + 0.5) * step
      chords.push({ angle, x: Math.sin(angle) * R, z: Math.cos(angle) * R, length: chordLength })
    }
    for (let i = 0; i <= count; i++) {
      const angle = -arc / 2 + i * step
      joints.push({ angle, x: Math.sin(angle) * R, z: Math.cos(angle) * R })
    }
    return { chords, joints }
  }, [R, arc, count, t])

  const railH = 0.1 * unit

  useLayoutEffect(() => {
    const mesh = chordsRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const paneH = glass ? h - railH * 2 : h
    chords.forEach((c, i) => {
      dummy.position.set(c.x, glass ? railH + paneH / 2 : h / 2, c.z)
      dummy.rotation.set(0, c.angle, 0)
      dummy.scale.set(c.length, paneH, glass ? t * 0.4 : t)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [chords, h, t, glass, railH])

  useLayoutEffect(() => {
    const mesh = mullionsRef.current
    if (!mesh || !glass) return
    const dummy = new THREE.Object3D()
    joints.forEach((j, i) => {
      dummy.position.set(j.x, h / 2, j.z)
      dummy.rotation.set(0, j.angle, 0)
      dummy.scale.set(t * 0.8, h, t * 1.2)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [joints, h, t, glass])

  useLayoutEffect(() => {
    const mesh = railsRef.current
    if (!mesh || !glass) return
    const dummy = new THREE.Object3D()
    chords.forEach((c, i) => {
      for (let level = 0; level < 2; level++) {
        dummy.position.set(c.x, level === 0 ? railH / 2 : h - railH / 2, c.z)
        dummy.rotation.set(0, c.angle, 0)
        dummy.scale.set(c.length, railH, t * 1.1)
        dummy.updateMatrix()
        mesh.setMatrixAt(i * 2 + level, dummy.matrix)
      }
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [chords, h, t, glass, railH])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {chords.map((c) => (
        <CuboidCollider
          key={c.angle.toFixed(4)}
          args={[c.length / 2, h / 2, t / 2]}
          position={[c.x, h / 2, c.z]}
          rotation={[0, c.angle, 0]}
        />
      ))}
      <instancedMesh
        key={`c${count}${style}`}
        ref={chordsRef}
        args={[undefined, undefined, count]}
        castShadow={!glass}
        receiveShadow
      >
        <boxGeometry />
        {glass ? (
          <meshStandardMaterial color={glassColor} transparent opacity={0.28} roughness={0.08} />
        ) : (
          <meshStandardMaterial color={wallColor} />
        )}
      </instancedMesh>
      {glass && (
        <>
          <instancedMesh
            key={`m${count}`}
            ref={mullionsRef}
            args={[undefined, undefined, count + 1]}
            castShadow
          >
            <boxGeometry />
            <meshStandardMaterial color={frame} roughness={0.6} />
          </instancedMesh>
          <instancedMesh
            key={`r${count}`}
            ref={railsRef}
            args={[undefined, undefined, count * 2]}
            castShadow
          >
            <boxGeometry />
            <meshStandardMaterial color={frame} roughness={0.6} />
          </instancedMesh>
        </>
      )}
    </RigidBody>
  )
}
