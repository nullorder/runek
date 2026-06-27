import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, DoubleSide, type Group } from 'three'

export interface SailboatProps extends WorldComponentProps {
  /** Hull length along local Z (bow at +Z), in units. */
  length?: number
  /** Hull maximum beam (width along X), in units. */
  beam?: number
  /** Deck height above the waterline (local y=0), in units. */
  freeboard?: number
  /** Keel depth below the waterline, in units. */
  draft?: number
  /** Mast height above the deck, in units. */
  mastHeight?: number
  /** Boom length aft of the mast, in units. */
  boomLength?: number
  /** Raise the mainsail. */
  sail?: boolean
  /** Gentle moored bobbing on the swell. */
  bob?: boolean
  /** Solid hull collider. */
  collider?: boolean
  /** Hull color; defaults to the world palette's `wood`. */
  color?: string
  /** Deck, mast, and boom color; defaults to the palette's `woodDark`. */
  trimColor?: string
  /** Sail color. */
  sailColor?: string
}

type V3 = [number, number, number]

/** A low-poly hull from stations along the keel: pointed bow, transom stern, V-section. The
 *  local origin sits at the waterline, so the deck rides at +freeboard and the keel at -draft. */
function buildHull(L: number, B: number, fb: number, dr: number): BufferGeometry {
  const N = 14
  const t0 = 0.12
  const hbMult = (t: number) => Math.sin(Math.PI * t) ** 0.6
  const rocker = (t: number) => Math.sin(Math.PI * t) ** 0.5
  const st = Array.from({ length: N }, (_, i) => {
    const t = t0 + (i / (N - 1)) * (1 - t0)
    return { z: -L / 2 + (i / (N - 1)) * L, hb: (B / 2) * hbMult(t), ky: -dr * rocker(t) }
  })
  const pos: number[] = []
  const push = (...vs: V3[]) => {
    for (const v of vs) pos.push(v[0], v[1], v[2])
  }
  for (let i = 0; i < N - 1; i++) {
    const s = st[i]
    const n = st[i + 1]
    const Ls: V3 = [-s.hb, fb, s.z]
    const Rs: V3 = [s.hb, fb, s.z]
    const Ks: V3 = [0, s.ky, s.z]
    const Ln: V3 = [-n.hb, fb, n.z]
    const Rn: V3 = [n.hb, fb, n.z]
    const Kn: V3 = [0, n.ky, n.z]
    push(Ls, Ks, Kn, Ls, Kn, Ln) // port side
    push(Rs, Rn, Kn, Rs, Kn, Ks) // starboard side
    push(Ls, Ln, Rn, Ls, Rn, Rs) // deck
  }
  const s0 = st[0]
  push([-s0.hb, fb, s0.z], [0, s0.ky, s0.z], [s0.hb, fb, s0.z]) // transom
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.computeVertexNormals()
  return g
}

function triGeo(a: V3, b: V3, c: V3): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array([...a, ...b, ...c]), 3))
  g.computeVertexNormals()
  return g
}

/** A small procedural sailboat: a station-built hull, a mast, a boom, and a swung-out mainsail.
 *  Floats at the local waterline and bobs gently on the swell. A static prop for now; the
 *  steerable variant is app-side player logic, not a new component. */
export function Sailboat({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  length = 5.5,
  beam = 2,
  freeboard = 0.5,
  draft = 0.6,
  mastHeight = 4.6,
  boomLength = 3.2,
  sail = true,
  bob = true,
  collider = true,
  color,
  trimColor,
  sailColor = '#eee6d0',
}: SailboatProps) {
  const { unit, palette } = useWorld()
  const hullColor = color ?? palette.wood
  const trim = trimColor ?? palette.woodDark
  const boat = useRef<Group>(null)

  const U = unit
  const L = length * U
  const B = beam * U
  const fb = freeboard * U
  const dr = draft * U
  const mastH = mastHeight * U
  const boomL = boomLength * U
  const goose = 0.7 * U
  const mastZ = 0.12 * L
  const boomAngle = 0.2

  const hull = useMemo(() => buildHull(L, B, fb, dr), [L, B, fb, dr])
  const main = useMemo(
    () => triGeo([0, mastH, 0], [0, goose, 0], [0, goose, -boomL]),
    [mastH, goose, boomL],
  )

  const phase = useMemo(() => rng(seed)() * Math.PI * 2, [seed])
  useFrame((state) => {
    if (!bob || !boat.current) return
    const t = state.clock.elapsedTime * 1.1 + phase
    boat.current.position.y = Math.sin(t) * 0.05 * U
    boat.current.rotation.z = Math.sin(t * 0.8) * 0.03
    boat.current.rotation.x = Math.sin(t * 0.6 + 1) * 0.02
  })

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {collider && (
        <CuboidCollider
          args={[B * 0.45, (fb + dr) / 2, L * 0.45]}
          position={[0, (fb - dr) / 2, 0]}
        />
      )}
      <group ref={boat}>
        {/* hull */}
        <mesh geometry={hull} castShadow receiveShadow>
          <meshStandardMaterial color={hullColor} side={DoubleSide} flatShading roughness={0.8} />
        </mesh>

        {/* mast */}
        <mesh position={[0, fb + mastH / 2, mastZ]} castShadow>
          <cylinderGeometry args={[0.05 * U, 0.06 * U, mastH, 8]} />
          <meshStandardMaterial color={trim} roughness={0.7} />
        </mesh>

        {/* boom + mainsail, swung out a touch and pivoting at the mast */}
        <group position={[0, fb, mastZ]} rotation={[0, boomAngle, 0]}>
          <mesh position={[0, goose, -boomL / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.04 * U, 0.04 * U, boomL, 6]} />
            <meshStandardMaterial color={trim} roughness={0.7} />
          </mesh>
          {sail && (
            <mesh geometry={main} castShadow>
              <meshStandardMaterial color={sailColor} side={DoubleSide} roughness={0.9} />
            </mesh>
          )}
        </group>
      </group>
    </RigidBody>
  )
}
