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
const UP = new THREE.Vector3(0, 1, 0)
// Samples along each frond's midrib, and leaflets on each side of it.
const RACHIS_STEPS = 14
const LEAFLETS = 22
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

interface Frond {
  /** Compass direction the frond grows toward. */
  yaw: number
  /** Angle above horizontal where the frond leaves the crown, in radians. */
  rise: number
  /** How far the midrib arcs down by its tip, in radians. */
  bend: number
  length: number
  color: THREE.Color
}

/**
 * A whole crown as one mesh: each frond is an arching midrib with a row of leaflets hanging off
 * either side in a shallow V, so the crown reads as feathery from any angle.
 */
function crownGeometry(fronds: Frond[]) {
  const positions: number[] = []
  const colors: number[] = []
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, ca: THREE.Color, cb = ca) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
    colors.push(ca.r, ca.g, ca.b, ca.r, ca.g, ca.b, cb.r, cb.g, cb.b)
  }

  const out = new THREE.Vector3()
  const side = new THREE.Vector3()
  for (const f of fronds) {
    out.set(Math.cos(f.yaw), 0, Math.sin(f.yaw))
    side.set(-Math.sin(f.yaw), 0, Math.cos(f.yaw))
    // Frond-local (along, up, across) to crown space.
    const at = (x: number, y: number, z: number) =>
      new THREE.Vector3().addScaledVector(out, x).addScaledVector(UP, y).addScaledVector(side, z)

    // The midrib leaves at `rise` and curls down harder toward its tip.
    const spine: { x: number; y: number; angle: number }[] = []
    let x = 0
    let y = 0
    const ds = f.length / RACHIS_STEPS
    for (let k = 0; k <= RACHIS_STEPS; k++) {
      const angle = f.rise - f.bend * (k / RACHIS_STEPS) ** 1.6
      spine.push({ x, y, angle })
      x += Math.cos(angle) * ds
      y += Math.sin(angle) * ds
    }
    const sample = (u: number) => {
      const i = Math.min(Math.floor(u * RACHIS_STEPS), RACHIS_STEPS - 1)
      const t = u * RACHIS_STEPS - i
      const a = spine[i]
      const b = spine[i + 1]
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        angle: a.angle + (b.angle - a.angle) * t,
      }
    }

    const rib = f.color.clone().offsetHSL(-0.03, -0.1, 0.06)
    const ribWidth = f.length * 0.018
    for (let k = 0; k < RACHIS_STEPS; k++) {
      const a = spine[k]
      const b = spine[k + 1]
      const wa = ribWidth * (1 - (0.7 * k) / RACHIS_STEPS)
      const wb = ribWidth * (1 - (0.7 * (k + 1)) / RACHIS_STEPS)
      const a0 = at(a.x, a.y, -wa)
      const a1 = at(a.x, a.y, wa)
      const b0 = at(b.x, b.y, -wb)
      const b1 = at(b.x, b.y, wb)
      tri(a0, b0, a1, rib)
      tri(a1, b0, b1, rib)
    }

    const tipColor = f.color.clone().offsetHSL(0.01, 0, 0.07)
    const longest = f.length * 0.3
    for (let j = 0; j < LEAFLETS; j++) {
      const u = 0.12 + (0.86 * (j + 0.5)) / LEAFLETS
      const p = sample(u)
      const reach = longest * Math.sin(Math.PI * (0.15 + 0.85 * u)) ** 0.6
      const width = longest * 0.055
      const tangent = new THREE.Vector3(Math.cos(p.angle), Math.sin(p.angle), 0)
      const below = new THREE.Vector3(Math.sin(p.angle), -Math.cos(p.angle), 0)
      for (const s of [-1, 1]) {
        // Out to the side, angled forward along the midrib, hanging below it; the outer half
        // sags further, like a leaflet bending under its own weight.
        const dir = (droop: number) =>
          new THREE.Vector3(0, 0, s * Math.cos(droop))
            .addScaledVector(below, Math.sin(droop))
            .multiplyScalar(Math.cos(0.55))
            .addScaledVector(tangent, Math.sin(0.55))
            .normalize()
        const inner = dir(0.6)
        const outer = dir(1.1)
        const base = new THREE.Vector3(p.x, p.y, 0)
        const mid = base.clone().addScaledVector(inner, reach * 0.5)
        const tip = mid.clone().addScaledVector(outer, reach * 0.5)
        const spread = tangent
          .clone()
          .addScaledVector(inner, -tangent.dot(inner))
          .normalize()
          .multiplyScalar(width)
        const B = at(base.x, base.y, base.z)
        const L = at(mid.x + spread.x, mid.y + spread.y, mid.z + spread.z)
        const R = at(mid.x - spread.x, mid.y - spread.y, mid.z - spread.z)
        const T = at(tip.x, tip.y, tip.z)
        tri(B, L, T, f.color, tipColor)
        tri(B, T, R, f.color, tipColor)
      }
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.computeVertexNormals()
  return g
}

/**
 * A coconut palm: a leaning, gently bowed trunk topped with a full crown of feathery fronds,
 * the young ones standing up and the old ones arching over and down. Trunk rings are instanced
 * and the crown is one mesh; the seed drives lean direction, frond spread, and coconut
 * placement. One trunk cylinder collider.
 */
export function Palm({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  height = 6,
  lean = 0.18,
  fronds = 16,
  frondLength = 2.8,
  trunkColor,
  frondColor,
  coconuts = true,
}: PalmProps) {
  const { unit, palette } = useWorld()
  const bark = trunkColor ?? palette.bark
  const leaf = frondColor ?? palette.foliage
  const h = height * unit
  const trunkRef = useRef<THREE.InstancedMesh>(null)

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
    // Spiralled round the crown, youngest first: the top fronds stand up, the middle ones arch
    // out and over, the oldest hang low and turn a little yellow.
    const frondPose: Frond[] = Array.from({ length: fronds }, (_, i) => {
      const age = fronds > 1 ? i / (fronds - 1) : 0.5
      return {
        color: new THREE.Color(leaf).offsetHSL(
          -0.05 * age + (next() - 0.5) * 0.02,
          0,
          0.05 * age - 0.02,
        ),
        yaw: i * GOLDEN_ANGLE + (next() - 0.5) * 0.4,
        rise: 1.15 - 1.35 * age + (next() - 0.5) * 0.25,
        bend: 0.5 + 0.95 * age + next() * 0.25,
        length: frondLength * unit * (0.7 + 0.35 * age) * (0.9 + next() * 0.2),
      }
    })
    const nuts = Array.from({ length: 3 }, () => {
      const a = next() * Math.PI * 2
      const r = 0.16 * unit
      return new THREE.Vector3(Math.cos(a) * r * 1.6, -0.12 * unit, Math.sin(a) * r * 1.6)
    })
    return { rings, crown: tip, crownYaw: yaw, nuts, frondPose }
  }, [seed, h, lean, fronds, frondLength, leaf, unit, height])

  const crownGeo = useMemo(() => crownGeometry(frondPose), [frondPose])

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
      <mesh geometry={crownGeo} position={crown} castShadow>
        <meshStandardMaterial vertexColors roughness={0.9} side={THREE.DoubleSide} flatShading />
      </mesh>
      {/* The knot of frond bases the crown grows from. */}
      <mesh position={crown} castShadow>
        <sphereGeometry args={[0.17 * unit * (height / 6), 8, 6]} />
        <meshStandardMaterial color={bark} roughness={1} flatShading />
      </mesh>
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

Palm.groundSitting = true
