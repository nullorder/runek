import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type WorldComponentProps } from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface PalmProps extends WorldComponentProps {
  /** Trunk height, in units. */
  height?: number
  /** Sideways lean of the crown, as a fraction of height. */
  lean?: number
  /** Frond count. */
  fronds?: number
  /** Frond length, in units. */
  frondLength?: number
  /** Defaults to the world palette's `bark` slot. */
  trunkColor?: string
  /** Defaults to the world palette's `foliage` slot. */
  frondColor?: string
  /** Grow a coconut cluster under the crown. */
  coconuts?: boolean
}

const TRUNK_SEGMENTS = 7
const FROND_STEPS = 6
const UP = new THREE.Vector3(0, 1, 0)

/** Tapering ribbon that arcs out along +X and droops — one frond, folded to a shallow V. */
function frondGeometry(length: number, width: number) {
  const positions: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= FROND_STEPS; i++) {
    const t = i / FROND_STEPS
    const x = t * length
    const droop = t * t * length * 0.55
    const w = width * (1 - t * 0.85)
    const fold = w * 0.45
    positions.push(x, -droop + fold, -w, x, -droop, 0, x, -droop + fold, w)
  }
  for (let i = 0; i < FROND_STEPS; i++) {
    const a = i * 3
    indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4)
    indices.push(a + 1, a + 4, a + 2, a + 2, a + 4, a + 5)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

/**
 * A coconut palm: a leaning, gently bowed trunk topped with a crown of drooping fronds.
 * Trunk rings and fronds are instanced; the seed drives lean direction, frond spread, and
 * coconut placement. One trunk cylinder collider.
 */
export function Palm({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  height = 6,
  lean = 0.18,
  fronds = 11,
  frondLength = 2.2,
  trunkColor,
  frondColor,
  coconuts = true,
}: PalmProps) {
  const { unit, palette } = useWorld()
  const bark = trunkColor ?? palette.bark
  const leaf = frondColor ?? palette.foliage
  const h = height * unit
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const frondsRef = useRef<THREE.InstancedMesh>(null)

  const { rings, crown, crownYaw, nuts, frondPose } = useMemo(() => {
    const next = rng(seed)
    const yaw = next() * Math.PI * 2
    const bow = lean * h
    const tip = new THREE.Vector3(Math.cos(yaw) * bow, h, Math.sin(yaw) * bow)
    const ctrl = new THREE.Vector3(Math.cos(yaw) * bow * 0.15, h * 0.55, Math.sin(yaw) * bow * 0.15)
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), ctrl, tip)
    const rings: { pos: THREE.Vector3; quat: THREE.Quaternion; len: number; r: number }[] = []
    for (let i = 0; i < TRUNK_SEGMENTS; i++) {
      const t0 = i / TRUNK_SEGMENTS
      const t1 = (i + 1) / TRUNK_SEGMENTS
      const a = curve.getPoint(t0)
      const b = curve.getPoint(t1)
      const dir = b.clone().sub(a)
      const len = dir.length() * 1.15 // overlap hides the joints
      rings.push({
        pos: a.clone().add(b).multiplyScalar(0.5),
        quat: new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()),
        len,
        r: (0.16 - 0.07 * t0) * unit * (height / 6),
      })
    }
    const frondPose = Array.from({ length: fronds }, (_, i) => ({
      yaw: (i / fronds) * Math.PI * 2 + (next() - 0.5) * 0.5,
      pitch: 0.15 + next() * 0.75,
      scale: 0.8 + next() * 0.35,
    }))
    const nuts = Array.from({ length: 3 }, () => {
      const a = next() * Math.PI * 2
      const r = 0.16 * unit
      return new THREE.Vector3(Math.cos(a) * r * 1.6, -0.12 * unit, Math.sin(a) * r * 1.6)
    })
    return { rings, crown: tip, crownYaw: yaw, nuts, frondPose }
  }, [seed, h, lean, fronds, unit, height])

  const frondGeo = useMemo(
    () => frondGeometry(frondLength * unit, 0.28 * unit * (frondLength / 2.2)),
    [frondLength, unit],
  )

  useLayoutEffect(() => {
    const mesh = trunkRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    rings.forEach((ring, i) => {
      dummy.position.copy(ring.pos)
      dummy.quaternion.copy(ring.quat)
      dummy.scale.set(ring.r, ring.len, ring.r)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [rings])

  useLayoutEffect(() => {
    const mesh = frondsRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    frondPose.forEach((f, i) => {
      dummy.position.copy(crown)
      dummy.rotation.set(0, -f.yaw, -f.pitch, 'YXZ')
      dummy.scale.setScalar(f.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [frondPose, crown])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CylinderCollider args={[h / 2, 0.2 * unit]} position={[0, h / 2, 0]} />
      <instancedMesh
        key={`t${rings.length}`}
        ref={trunkRef}
        args={[undefined, undefined, rings.length]}
        castShadow
      >
        <cylinderGeometry args={[0.82, 1, 1, 7]} />
        <meshStandardMaterial color={bark} roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh
        key={`f${fronds}`}
        ref={frondsRef}
        args={[frondGeo, undefined, fronds]}
        castShadow
      >
        <meshStandardMaterial color={leaf} roughness={0.9} side={THREE.DoubleSide} flatShading />
      </instancedMesh>
      {coconuts && (
        <group position={[crown.x, crown.y, crown.z]} rotation={[0, -crownYaw, 0]}>
          {nuts.map((n, i) => (
            <mesh key={`${i * 7}`} position={n} castShadow>
              <sphereGeometry args={[0.11 * unit, 8, 6]} />
              <meshStandardMaterial color="#6b5233" roughness={1} />
            </mesh>
          ))}
        </group>
      )}
    </RigidBody>
  )
}
