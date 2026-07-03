import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type WorldComponentProps } from '@runek/core'
import { useEffect, useMemo } from 'react'
import { ConeGeometry, DoubleSide } from 'three'

export interface HutProps extends WorldComponentProps {
  /** Wall radius, in units. */
  radius?: number
  /** Wall height at the eaves, in units. */
  wallHeight?: number
  /** Conical roof height above the eaves, in units. */
  roofHeight?: number
  /** Doorway width at the front (local +Z), in units. */
  doorWidth?: number
  /** Wall color; defaults to the palette's `wall`. */
  wallColor?: string
  /** Roof color; defaults to the palette's `roof`. */
  roofColor?: string
}

/**
 * A round hut: a cylindrical wall with a front doorway under a shaggy conical thatch roof. The
 * wall is ringed by post ribs on a low stone base, the roof is seed-jittered with a ragged fringe,
 * protruding rafter tips, and a topknot finial, and a small framed window sits at the back. The
 * doorway faces local +Z. A single cylinder collider makes it a solid obstacle (the doorway is
 * visual — the hut is composed, not entered). For a square house with a gable roof, use `House`.
 */
export function Hut({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radius = 3,
  wallHeight = 2.9,
  roofHeight = 1.5,
  doorWidth = 1.3,
  wallColor,
  roofColor,
  seed = 1,
}: HutProps) {
  const { unit, palette } = useWorld()
  const wall = wallColor ?? palette.wall
  const roof = roofColor ?? palette.roof
  const post = palette.woodDark
  const R = radius * unit
  const H = wallHeight * unit
  const roofH = roofHeight * unit
  const postR = 0.1 * unit

  // Leave a gap in the wall centred on +Z (three's cylinder: x=R·sinθ, z=R·cosθ, so θ=0 is +Z).
  const half = Math.asin(Math.min(0.9, doorWidth / 2 / radius))
  const postZ = R * Math.cos(half)
  const postX = R * Math.sin(half)
  const doorH = Math.min(2 * unit, H - 0.4 * unit)

  const coneR = R * 1.28
  const slant = Math.hypot(coneR, roofH)

  // Shaggy thatch: a cone whose vertices are seed-jittered, with the rim drooping unevenly so the
  // silhouette reads as a straw fringe rather than a machined lampshade.
  const thatch = useMemo(() => {
    const g = new ConeGeometry(coneR, roofH, 20, 4)
    g.translate(0, roofH / 2, 0) // base at local y=0 (the eaves)
    const next = rng(seed)
    const amp = coneR * 0.045
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const apex = y > roofH - 0.01
      if (apex) continue
      pos.setX(i, pos.getX(i) + (next() * 2 - 1) * amp)
      pos.setZ(i, pos.getZ(i) + (next() * 2 - 1) * amp)
      const rim = y < 0.01
      pos.setY(i, y + (next() * 2 - 1) * amp * 0.6 - (rim ? next() * roofH * 0.14 : 0))
    }
    pos.needsUpdate = true
    g.computeVertexNormals()
    return g
  }, [coneR, roofH, seed])

  useEffect(() => () => thatch.dispose(), [thatch])

  // Post ribs around the wall (skipping the doorway arc) and rafter tips under the fringe.
  const ribs = useMemo(() => {
    const arc = Math.PI * 2 - half * 2 - 0.5
    return Array.from({ length: 9 }, (_, i) => half + 0.25 + (arc * (i + 0.5)) / 9)
  }, [half])
  const rafters = useMemo(() => Array.from({ length: 8 }, (_, i) => (Math.PI * 2 * i) / 8), [])
  const rafterTilt = Math.atan2(coneR, roofH)

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CylinderCollider args={[H / 2, R]} position={[0, H / 2, 0]} />

      {/* low stone base the wall sits on */}
      <mesh position={[0, 0.15 * unit, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R * 1.05, R * 1.1, 0.3 * unit, 24]} />
        <meshStandardMaterial color={palette.stone} roughness={1} flatShading />
      </mesh>

      {/* a dark interior floor, so the doorway reads as an opening into the hut */}
      <mesh position={[0, 0.31 * unit, 0]} receiveShadow>
        <cylinderGeometry args={[R * 0.94, R * 0.94, 0.06 * unit, 24]} />
        <meshStandardMaterial color={palette.bark} roughness={1} />
      </mesh>

      {/* wall: a cylindrical shell with the doorway arc omitted */}
      <mesh position={[0, H / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, H, 32, 1, true, half, Math.PI * 2 - half * 2]} />
        <meshStandardMaterial color={wall} side={DoubleSide} roughness={0.9} />
      </mesh>

      {/* wall filling above the doorway — the opening stops at the lintel */}
      <mesh position={[0, (doorH + H) / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, H - doorH, 8, 1, true, -half, half * 2]} />
        <meshStandardMaterial color={wall} side={DoubleSide} roughness={0.9} />
      </mesh>

      {/* post ribs around the wall, so it reads as timber-and-daub rather than smooth plaster */}
      {ribs.map((a) => (
        <mesh
          key={a}
          position={[Math.sin(a) * (R + 0.02 * unit), H / 2, Math.cos(a) * (R + 0.02 * unit)]}
          castShadow
        >
          <cylinderGeometry args={[0.055 * unit, 0.07 * unit, H * 0.97, 6]} />
          <meshStandardMaterial color={palette.wood} roughness={0.9} />
        </mesh>
      ))}

      {/* lintel + door posts framing the opening */}
      <mesh position={[0, doorH, postZ]} castShadow>
        <boxGeometry args={[postX * 2 + postR * 2, 0.14 * unit, postR * 2]} />
        <meshStandardMaterial color={post} roughness={0.8} />
      </mesh>
      <mesh position={[postX, doorH / 2, postZ]} castShadow>
        <cylinderGeometry args={[postR, postR, doorH, 8]} />
        <meshStandardMaterial color={post} roughness={0.8} />
      </mesh>
      <mesh position={[-postX, doorH / 2, postZ]} castShadow>
        <cylinderGeometry args={[postR, postR, doorH, 8]} />
        <meshStandardMaterial color={post} roughness={0.8} />
      </mesh>

      {/* a small framed window at the back */}
      <group rotation={[0, Math.PI, 0]}>
        <mesh position={[0, H * 0.55, R]} castShadow>
          <boxGeometry args={[0.7 * unit, 0.8 * unit, 0.06 * unit]} />
          <meshStandardMaterial color={post} roughness={0.8} />
        </mesh>
        <mesh position={[0, H * 0.55, R + 0.03 * unit]}>
          <boxGeometry args={[0.52 * unit, 0.62 * unit, 0.06 * unit]} />
          <meshStandardMaterial color={palette.bark} roughness={1} />
        </mesh>
      </group>

      {/* shaggy thatch cone, overhanging the eaves */}
      <mesh geometry={thatch} position={[0, H, 0]} castShadow>
        <meshStandardMaterial color={roof} roughness={1} flatShading side={DoubleSide} />
      </mesh>

      {/* rafter tips poking out under the fringe */}
      {rafters.map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <mesh
            position={[coneR * 0.65, H + roofH * 0.35, 0]}
            rotation={[0, 0, rafterTilt]}
            castShadow
          >
            <cylinderGeometry args={[0.04 * unit, 0.05 * unit, slant * 0.85, 6]} />
            <meshStandardMaterial color={post} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* topknot finial where the thatch is bound off */}
      <mesh position={[0, H + roofH + 0.12 * unit, 0]} castShadow>
        <cylinderGeometry args={[0.05 * unit, 0.05 * unit, 0.55 * unit, 6]} />
        <meshStandardMaterial color={post} roughness={0.9} />
      </mesh>
      <mesh position={[0, H + roofH + 0.1 * unit, 0]} castShadow>
        <coneGeometry args={[0.2 * unit, 0.3 * unit, 8]} />
        <meshStandardMaterial color={roof} roughness={1} flatShading />
      </mesh>
    </RigidBody>
  )
}
