import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'
import { DoubleSide, PlaneGeometry } from 'three'

export interface FlagProps extends WorldComponentProps {
  /** Pole height, in units. */
  poleHeight?: number
  /** Flag width away from the pole (the fly), in units. */
  fly?: number
  /** Flag height (the drop), in units. */
  drop?: number
  /** Ripple speed. */
  waveSpeed?: number
  /** Ripple depth as a fraction of the fly. */
  waveAmplitude?: number
  /** Cloth color; defaults to the world palette's `fabric`. */
  color?: string
  /** Pole color; defaults to the palette's `wood`. */
  poleColor?: string
}

/** A cloth flag on a pole. The cloth is a segmented plane rippled per-frame and pinned at the
 *  luff (pole side), so the wave grows toward the fly. The pole carries a thin collider; the
 *  cloth and finial are decorative. */
export function Flag({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  poleHeight = 6,
  fly = 2.4,
  drop = 1.5,
  waveSpeed = 3,
  waveAmplitude = 0.22,
  color,
  poleColor,
}: FlagProps) {
  const { unit, palette } = useWorld()
  const cloth = color ?? palette.fabric
  const pole = poleColor ?? palette.wood
  const U = unit
  const poleH = poleHeight * U
  const flyW = fly * U
  const dropH = drop * U
  const poleR = 0.07 * U

  const geo = useMemo(() => new PlaneGeometry(flyW, dropH, 18, 10), [flyW, dropH])

  useFrame((state) => {
    const t = state.clock.elapsedTime * waveSpeed
    const p = geo.attributes.position
    for (let i = 0; i < p.count; i++) {
      const u = (p.getX(i) + flyW / 2) / flyW // 0 at luff, 1 at fly
      const v = (p.getY(i) + dropH / 2) / dropH
      const ripple = Math.sin(u * 11 - t) * 0.7 + Math.sin(u * 6 + v * 4 - t * 0.8) * 0.3
      p.setZ(i, ripple * waveAmplitude * flyW * u)
    }
    p.needsUpdate = true
    geo.computeVertexNormals()
  })

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CylinderCollider args={[poleH / 2, poleR * 1.5]} position={[0, poleH / 2, 0]} />

      {/* pole */}
      <mesh position={[0, poleH / 2, 0]} castShadow>
        <cylinderGeometry args={[poleR, poleR, poleH, 8]} />
        <meshStandardMaterial color={pole} roughness={0.7} />
      </mesh>

      {/* finial */}
      <mesh position={[0, poleH + 0.06 * U, 0]} castShadow>
        <sphereGeometry args={[0.12 * U, 10, 8]} />
        <meshStandardMaterial color={pole} metalness={0.2} roughness={0.5} />
      </mesh>

      {/* cloth */}
      <mesh
        geometry={geo}
        position={[poleR + flyW / 2, poleH - dropH / 2 - 0.25 * U, 0]}
        castShadow
      >
        <meshStandardMaterial color={cloth} side={DoubleSide} roughness={0.9} />
      </mesh>
    </RigidBody>
  )
}
