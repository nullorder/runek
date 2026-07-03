import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type WorldComponentProps } from '@runek/core'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, DoubleSide, Quaternion, Vector3 } from 'three'

export interface TentProps extends WorldComponentProps {
  /** Width across the tent (local X), in units. */
  width?: number
  /** Depth front-to-back (local Z); the entrance faces +Z. */
  depth?: number
  /** Ridge height, in units. */
  height?: number
  /** Fabric color; defaults to the palette's `fabric`. */
  color?: string
  /** Alternate stripe color; defaults to the palette's `wall`. */
  stripeColor?: string
  /** Pole color; defaults to the palette's `woodDark`. */
  poleColor?: string
  /** Billow depth as a fraction of the width. */
  wind?: number
  /** Wind ripple speed. */
  windSpeed?: number
  /** Static inward drape of the fabric between ridge and ground, as a fraction of the width. */
  sag?: number
  /** Solid walls (the two sides + the back) you can't walk through; the front stays open. */
  collider?: boolean
}

const V = (x: number, y: number, z: number) => new Vector3(x, y, z)
const UP = new Vector3(0, 1, 0)

/**
 * An A-frame ridge tent: two sloped striped-fabric sides and a closed back, open at the front (+Z)
 * where two flaps are pinned back from the entrance. The fabric drapes inward between ridge and
 * ground and billows in the wind per-frame (pinned at the ridge and ground). The ridge pole pokes
 * out past the fabric, stayed by guy ropes to stakes at the front corners and the back. The two
 * sides and the back are solid (set `collider={false}` for a soft tent); the open front lets you
 * walk in. For a round dwelling with a conical roof, use `Hut`.
 */
export function Tent({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 3,
  depth = 3.6,
  height = 2.2,
  color,
  stripeColor,
  poleColor,
  wind = 0.05,
  windSpeed = 2.5,
  sag = 0.03,
  collider = true,
}: TentProps) {
  const { unit, palette } = useWorld()
  const fabric = color ?? palette.fabric
  const stripe = stripeColor ?? palette.wall
  const pole = poleColor ?? palette.woodDark
  const W = width * unit
  const H = height * unit
  const D = depth * unit
  const hw = W / 2
  const hd = D / 2
  const poleR = 0.05 * unit
  const slant = Math.hypot(hw, H)
  const lean = Math.atan2(hw, H) // door-pole tilt from vertical

  // Fabric as one mesh: right slope, left slope, closed back, and two entrance flaps pinned open.
  // Each vertex carries its panel's flat normal so the per-frame billow pushes it in and out like
  // cloth; alternating cell columns are indexed into two material groups for crisp stripes.
  const { geometry, base, normals } = useMemo(() => {
    const pos: number[] = []
    const nrm: number[] = []
    const idxA: number[] = [] // fabric-colored triangles
    const idxB: number[] = [] // stripe-colored triangles
    const addQuad = (
      a: Vector3,
      b: Vector3,
      c: Vector3,
      d: Vector3,
      nu: number,
      nv: number,
      mat: 'striped' | 'fabric' | 'stripe',
    ) => {
      const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(d, a)).normalize()
      const start = pos.length / 3
      const cols = nu + 1
      for (let iv = 0; iv <= nv; iv++) {
        for (let iu = 0; iu <= nu; iu++) {
          const u = iu / nu
          const v = iv / nv
          const x = (1 - u) * (1 - v) * a.x + u * (1 - v) * b.x + u * v * c.x + (1 - u) * v * d.x
          const y = (1 - u) * (1 - v) * a.y + u * (1 - v) * b.y + u * v * c.y + (1 - u) * v * d.y
          const z = (1 - u) * (1 - v) * a.z + u * (1 - v) * b.z + u * v * c.z + (1 - u) * v * d.z
          pos.push(x, y, z)
          nrm.push(n.x, n.y, n.z)
        }
      }
      for (let iv = 0; iv < nv; iv++) {
        for (let iu = 0; iu < nu; iu++) {
          const i0 = start + iv * cols + iu
          const striped =
            mat === 'striped' ? (Math.floor(iu / 2) % 2 === 1 ? 'stripe' : 'fabric') : mat
          const out = striped === 'stripe' ? idxB : idxA
          out.push(i0, i0 + cols, i0 + 1, i0 + 1, i0 + cols, i0 + cols + 1)
        }
      }
    }

    // right slope (outward +X), left slope (outward −X), back wall (outward −Z, top collapsed)
    addQuad(V(0, H, -hd), V(0, H, hd), V(hw, 0, hd), V(hw, 0, -hd), 12, 6, 'striped')
    addQuad(V(0, H, hd), V(0, H, -hd), V(-hw, 0, -hd), V(-hw, 0, hd), 12, 6, 'striped')
    addQuad(V(-hw, 0, -hd), V(hw, 0, -hd), V(0, H, -hd), V(0, H, -hd), 8, 6, 'striped')

    // entrance flaps: the door triangle split at the ridge, each half swung out around its
    // door-pole line so the tent reads open; one flap per color for the alternating look
    const ridge = V(0, H, hd)
    const mid = V(0, 0, hd)
    for (const side of [1, -1] as const) {
      const foot = V(side * hw, 0, hd)
      const axis = new Vector3().subVectors(foot, ridge).normalize()
      const out = new Vector3()
        .subVectors(mid, ridge)
        .applyAxisAngle(axis, side * 1.15)
        .add(ridge)
      const free = V(out.x + side * hw * 0.02, out.y, out.z)
      if (side > 0) addQuad(ridge, foot, free, out, 4, 4, 'fabric')
      else addQuad(ridge, out, free, foot, 4, 4, 'stripe')
    }

    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    g.setIndex([...idxA, ...idxB])
    g.addGroup(0, idxA.length, 0)
    g.addGroup(idxA.length, idxB.length, 1)

    // static inward drape between the pinned ridge/ground/edges, so the panels read as hung cloth
    const drape = sag * W
    for (let i = 0; i < pos.length / 3; i++) {
      const y = pos[i * 3 + 1]
      const z = pos[i * 3 + 2]
      const pin = Math.sin((Math.PI * y) / H) * Math.sin((Math.PI * (z + hd)) / Math.max(D, 0.001))
      pos[i * 3] -= nrm[i * 3] * drape * Math.max(0, pin)
      pos[i * 3 + 1] -= nrm[i * 3 + 1] * drape * Math.max(0, pin)
      pos[i * 3 + 2] -= nrm[i * 3 + 2] * drape * Math.max(0, pin)
    }
    g.attributes.position = new BufferAttribute(new Float32Array(pos), 3)
    g.computeVertexNormals()
    return { geometry: g, base: Float32Array.from(pos), normals: Float32Array.from(nrm) }
  }, [W, H, D, hw, hd, sag])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state) => {
    const t = state.clock.elapsedTime * windSpeed
    const amp = wind * W
    const p = geometry.attributes.position
    for (let i = 0; i < p.count; i++) {
      const bx = base[i * 3]
      const by = base[i * 3 + 1]
      const bz = base[i * 3 + 2]
      const ripple = Math.sin(bx * 1.6 + bz * 1.2 - t) * 0.6 + Math.sin(by * 2 + bz - t * 0.7) * 0.4
      // pinned at ridge (top) and ground; billows most in the middle of the panel
      const d = ripple * amp * Math.sin((Math.PI * by) / H)
      p.setXYZ(i, bx + normals[i * 3] * d, by + normals[i * 3 + 1] * d, bz + normals[i * 3 + 2] * d)
    }
    p.needsUpdate = true
    geometry.computeVertexNormals()
  })

  // Guy ropes from the ridge-pole tips down to stakes: two framing the entrance, one at the back.
  const ridgeOver = 0.35 * unit
  const ropes = useMemo(() => {
    const make = (from: Vector3, to: Vector3) => {
      const dir = new Vector3().subVectors(to, from)
      const len = dir.length()
      const quat = new Quaternion().setFromUnitVectors(UP, dir.normalize())
      const mid = new Vector3().addVectors(from, to).multiplyScalar(0.5)
      return { mid, quat, len, stake: to }
    }
    return [
      make(V(0, H, hd + ridgeOver), V(W * 0.55, 0.05, hd + H * 0.55)),
      make(V(0, H, hd + ridgeOver), V(-W * 0.55, 0.05, hd + H * 0.55)),
      make(V(0, H, -hd - ridgeOver), V(0, 0.05, -hd - H * 0.6)),
    ]
  }, [W, H, hd, ridgeOver])

  const wallT = 0.05 * unit

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {/* solid sloped sides + back; the front (+Z) is left open for the entrance */}
      {collider && (
        <>
          <CuboidCollider
            args={[wallT, slant / 2, hd]}
            position={[hw / 2, H / 2, 0]}
            rotation={[0, 0, lean]}
          />
          <CuboidCollider
            args={[wallT, slant / 2, hd]}
            position={[-hw / 2, H / 2, 0]}
            rotation={[0, 0, -lean]}
          />
          <CuboidCollider args={[hw, H / 2, wallT]} position={[0, H / 2, -hd]} />
        </>
      )}

      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          attach="material-0"
          color={fabric}
          side={DoubleSide}
          roughness={0.95}
        />
        <meshStandardMaterial
          attach="material-1"
          color={stripe}
          side={DoubleSide}
          roughness={0.95}
        />
      </mesh>

      {/* ridge pole, poking out past the fabric at both ends */}
      <mesh position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[poleR, poleR, D + ridgeOver * 2, 8]} />
        <meshStandardMaterial color={pole} roughness={0.8} />
      </mesh>

      {/* two door poles framing the entrance (+Z) */}
      <mesh position={[hw / 2, H / 2, hd]} rotation={[0, 0, lean]} castShadow>
        <cylinderGeometry args={[poleR, poleR, slant, 8]} />
        <meshStandardMaterial color={pole} roughness={0.8} />
      </mesh>
      <mesh position={[-hw / 2, H / 2, hd]} rotation={[0, 0, -lean]} castShadow>
        <cylinderGeometry args={[poleR, poleR, slant, 8]} />
        <meshStandardMaterial color={pole} roughness={0.8} />
      </mesh>

      {/* guy ropes + stakes */}
      {ropes.map((r, i) => (
        <group key={i}>
          <mesh position={r.mid} quaternion={r.quat}>
            <cylinderGeometry args={[0.018 * unit, 0.018 * unit, r.len, 5]} />
            <meshStandardMaterial color={palette.sand} roughness={1} />
          </mesh>
          <mesh position={[r.stake.x, 0.12 * unit, r.stake.z]} castShadow>
            <cylinderGeometry args={[0.035 * unit, 0.05 * unit, 0.3 * unit, 6]} />
            <meshStandardMaterial color={pole} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </RigidBody>
  )
}
