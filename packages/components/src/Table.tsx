import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'
import { ExtrudeGeometry, Shape } from 'three'

export interface TableProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  depth?: number
  height?: number
  thickness?: number
  /** Four `legs` at the corners, or `pedestal` columns on crossed feet (one, or two for a table
   *  longer than 2 units): a conference table. */
  base?: 'legs' | 'pedestal'
  /** `round` makes the short ends semicircles: a racetrack top, as conference tables have. */
  ends?: 'square' | 'round'
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}

/**
 * A table: a top on four legs, or on pedestals with rounded ends for a meeting room
 * (`<Table width={3.2} depth={1.2} base="pedestal" ends="round" />`). One cuboid collider.
 */
export function Table({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.2,
  depth = 0.8,
  height = 0.75,
  thickness = 0.05,
  base = 'legs',
  ends = 'square',
  color,
}: TableProps) {
  const { unit, palette } = useWorld()
  const woodColor = color ?? palette.wood
  const w = width * unit
  const d = depth * unit
  const h = height * unit
  const t = thickness * unit
  const leg = 0.06 * unit
  const legH = h - t
  const lx = w / 2 - leg
  const lz = d / 2 - leg
  const legs: Vec3[] = [
    [-lx, legH / 2, -lz],
    [lx, legH / 2, -lz],
    [-lx, legH / 2, lz],
    [lx, legH / 2, lz],
  ]

  // A racetrack top: straight sides joined by half circles across the depth.
  const roundTop = useMemo(() => {
    if (ends !== 'round') return null
    const rad = Math.min(d, w) / 2
    const half = Math.max(w / 2 - rad, 0)
    const s = new Shape()
    s.moveTo(-half, -rad)
    s.lineTo(half, -rad)
    s.absarc(half, 0, rad, -Math.PI / 2, Math.PI / 2, false)
    s.lineTo(-half, rad)
    s.absarc(-half, 0, rad, Math.PI / 2, (3 * Math.PI) / 2, false)
    return new ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 16 })
  }, [ends, w, d, t])

  const pedestals = w > 2 * unit ? [-w / 4, w / 4] : [0]

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[w / 2, t / 2, d / 2]} position={[0, h - t / 2, 0]} />
      {roundTop ? (
        <mesh
          geometry={roundTop}
          position={[0, h - t, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={woodColor} />
        </mesh>
      ) : (
        <mesh castShadow receiveShadow position={[0, h - t / 2, 0]}>
          <boxGeometry args={[w, t, d]} />
          <meshStandardMaterial color={woodColor} />
        </mesh>
      )}
      {base === 'legs'
        ? legs.map((p) => (
            <mesh key={`leg-${p[0].toFixed(3)}:${p[2].toFixed(3)}`} castShadow position={p}>
              <boxGeometry args={[leg, legH, leg]} />
              <meshStandardMaterial color={woodColor} />
            </mesh>
          ))
        : pedestals.map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh castShadow position={[0, legH / 2, 0]}>
                <boxGeometry args={[leg * 2.2, legH, leg * 2.2]} />
                <meshStandardMaterial color={woodColor} />
              </mesh>
              <mesh castShadow receiveShadow position={[0, 0.02 * unit, 0]}>
                <boxGeometry args={[Math.min(w * 0.4, 0.8 * unit), 0.04 * unit, leg * 1.4]} />
                <meshStandardMaterial color={woodColor} />
              </mesh>
              <mesh castShadow receiveShadow position={[0, 0.02 * unit, 0]}>
                <boxGeometry args={[leg * 1.4, 0.04 * unit, d * 0.75]} />
                <meshStandardMaterial color={woodColor} />
              </mesh>
            </group>
          ))}
    </RigidBody>
  )
}

Table.groundSitting = true
