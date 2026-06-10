import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface TreesProps {
  position?: Vec3
  rotation?: Vec3
  seed?: number
  iterations?: number
  /** Base branch length, in units. */
  segmentLength?: number
  /** Branching angle, in radians. */
  angle?: number
  /** Defaults to the world palette's `bark` slot. */
  trunkColor?: string
  /** Defaults to the world palette's `foliage` slot. */
  leafColor?: string
}

interface Branch {
  position: THREE.Vector3
  quaternion: THREE.Quaternion
  length: number
  radius: number
}

interface Leaf {
  position: THREE.Vector3
  size: number
  /** Per-leaf brightness multiplier for color variation. */
  shade: number
}

const AXIOM = 'F'
const RULE = 'FF[+F][-F][&F][^F]'
const UP = new THREE.Vector3(0, 1, 0)
const YAW_AXIS = new THREE.Vector3(0, 0, 1)
const PITCH_AXIS = new THREE.Vector3(1, 0, 0)

function expand(iterations: number): string {
  let s = AXIOM
  for (let i = 0; i < iterations; i++) s = s.replace(/F/g, RULE)
  return s
}

function buildTree(seed: number, iterations: number, segLen: number, angle: number) {
  const symbols = expand(iterations)
  const next = rng(seed)
  const jitter = () => (next() - 0.5) * angle * 0.5
  const branches: Branch[] = []
  const leaves: Leaf[] = []
  const stack: { pos: THREE.Vector3; quat: THREE.Quaternion; depth: number }[] = []
  const delta = new THREE.Quaternion()
  let pos = new THREE.Vector3()
  let quat = new THREE.Quaternion()
  let depth = 0

  const addLeaf = (at: THREE.Vector3) => {
    leaves.push({ position: at.clone(), size: segLen * 0.45, shade: 0.8 + next() * 0.4 })
  }

  for (const ch of symbols) {
    switch (ch) {
      case 'F': {
        const len = segLen * 0.8 ** depth * (0.85 + next() * 0.3)
        const dir = UP.clone().applyQuaternion(quat)
        const start = pos.clone()
        pos = start.clone().addScaledVector(dir, len)
        const mid = start.clone().add(pos).multiplyScalar(0.5)
        branches.push({
          position: mid,
          quaternion: new THREE.Quaternion().setFromUnitVectors(UP, dir),
          length: len,
          radius: segLen * 0.12 * 0.7 ** depth,
        })
        break
      }
      case '+':
        quat.multiply(delta.setFromAxisAngle(YAW_AXIS, angle + jitter()))
        break
      case '-':
        quat.multiply(delta.setFromAxisAngle(YAW_AXIS, -angle + jitter()))
        break
      case '&':
        quat.multiply(delta.setFromAxisAngle(PITCH_AXIS, angle + jitter()))
        break
      case '^':
        quat.multiply(delta.setFromAxisAngle(PITCH_AXIS, -angle + jitter()))
        break
      case '[':
        stack.push({ pos: pos.clone(), quat: quat.clone(), depth })
        depth++
        break
      case ']': {
        addLeaf(pos)
        const saved = stack.pop()
        if (saved) {
          pos = saved.pos
          quat = saved.quat
          depth = saved.depth
        }
        break
      }
    }
  }
  addLeaf(pos)
  return { branches, leaves }
}

/**
 * A single procedural tree grown from a bracketed L-system.
 * Branches and leaves render as one instanced mesh each, so a forest stays cheap.
 */
export function Trees({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  iterations = 2,
  segmentLength = 0.7,
  angle = 0.5,
  trunkColor,
  leafColor,
}: TreesProps) {
  const { unit, palette } = useWorld()
  const bark = trunkColor ?? palette.bark
  const foliage = leafColor ?? palette.foliage
  const segLen = segmentLength * unit
  const branchesRef = useRef<THREE.InstancedMesh>(null)
  const leavesRef = useRef<THREE.InstancedMesh>(null)

  const { branches, leaves } = useMemo(
    () => buildTree(seed, iterations, segLen, angle),
    [seed, iterations, segLen, angle],
  )

  useLayoutEffect(() => {
    const mesh = branchesRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    branches.forEach((b, i) => {
      dummy.position.copy(b.position)
      dummy.quaternion.copy(b.quaternion)
      dummy.scale.set(b.radius, b.length, b.radius)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.count = branches.length
    mesh.instanceMatrix.needsUpdate = true
  }, [branches])

  useLayoutEffect(() => {
    const mesh = leavesRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const base = new THREE.Color(foliage)
    const tint = new THREE.Color()
    leaves.forEach((leaf, i) => {
      dummy.position.copy(leaf.position)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(leaf.size)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, tint.copy(base).multiplyScalar(leaf.shade))
    })
    mesh.count = leaves.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [leaves, foliage])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CylinderCollider args={[segLen, segLen * 0.2]} position={[0, segLen, 0]} />
      <instancedMesh
        key={`b${branches.length}`}
        ref={branchesRef}
        args={[undefined, undefined, branches.length]}
        castShadow
      >
        {/* unit cylinder, tapered; instances scale x/z by radius and y by length */}
        <cylinderGeometry args={[0.7, 1, 1, 5]} />
        <meshStandardMaterial color={bark} roughness={0.95} />
      </instancedMesh>
      <instancedMesh
        key={`l${leaves.length}`}
        ref={leavesRef}
        args={[undefined, undefined, leaves.length]}
        castShadow
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial flatShading />
      </instancedMesh>
    </RigidBody>
  )
}
