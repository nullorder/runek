import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'
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
  trunkColor?: string
  leafColor?: string
}

interface Branch {
  id: string
  position: Vec3
  quaternion: [number, number, number, number]
  length: number
  radius: number
}

interface Leaf {
  id: string
  position: Vec3
  size: number
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
  let count = 0

  for (const ch of symbols) {
    switch (ch) {
      case 'F': {
        const len = segLen * 0.8 ** depth * (0.85 + next() * 0.3)
        const dir = UP.clone().applyQuaternion(quat)
        const start = pos.clone()
        pos = start.clone().addScaledVector(dir, len)
        const mid = start.clone().add(pos).multiplyScalar(0.5)
        const q = new THREE.Quaternion().setFromUnitVectors(UP, dir)
        branches.push({
          id: `b${count++}`,
          position: [mid.x, mid.y, mid.z],
          quaternion: [q.x, q.y, q.z, q.w],
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
        leaves.push({ id: `l${count++}`, position: [pos.x, pos.y, pos.z], size: segLen * 0.45 })
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
  leaves.push({ id: `l${count++}`, position: [pos.x, pos.y, pos.z], size: segLen * 0.45 })
  return { branches, leaves }
}

/** A single procedural tree grown from a bracketed L-system. */
export function Trees({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  iterations = 2,
  segmentLength = 0.7,
  angle = 0.5,
  trunkColor = '#5b4636',
  leafColor = '#4f7a3a',
}: TreesProps) {
  const { unit } = useWorld()
  const segLen = segmentLength * unit
  const { branches, leaves } = useMemo(
    () => buildTree(seed, iterations, segLen, angle),
    [seed, iterations, segLen, angle],
  )

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CylinderCollider args={[segLen, segLen * 0.2]} position={[0, segLen, 0]} />
      {branches.map((b) => (
        <mesh key={b.id} position={b.position} quaternion={b.quaternion} castShadow>
          <cylinderGeometry args={[b.radius * 0.7, b.radius, b.length, 5]} />
          <meshStandardMaterial color={trunkColor} />
        </mesh>
      ))}
      {leaves.map((l) => (
        <mesh key={l.id} position={l.position} castShadow>
          <icosahedronGeometry args={[l.size, 0]} />
          <meshStandardMaterial color={leafColor} flatShading />
        </mesh>
      ))}
    </RigidBody>
  )
}
