import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type WorldComponentProps } from '@runek/core'
import { useRef } from 'react'
import type { Group, MeshStandardMaterial } from 'three'
import { Sign } from './Sign'

export interface PortalProps extends WorldComponentProps {
  /**
   * Where the portal leads — a URL or app route. Kept JSON-serializable so a world
   * round-trips from data. With no `onEnter`, entering navigates here
   * (`window.location.href = to`); with `onEnter`, this is just passed through to it.
   */
  to?: string
  /**
   * Called once when the avatar (or a vehicle) enters the gate, with `to`. Optional, so
   * the component still renders and round-trips from data without it (CONTRACT §1). Use it
   * to drive an in-app transition instead of a full navigation — e.g. swap the mounted world.
   * Note: a host rendered inside `<WorldRenderer>` lives in a separate React reconciler from
   * the page, so bridge this callback out through a module-level store, not React context.
   */
  onEnter?: (to: string | undefined) => void
  /** Floating caption above the gate (e.g. the destination's name). */
  label?: string
  /** Ring radius, in units. */
  radius?: number
  /** Glow / ring color; defaults to the world palette's `accent` slot. */
  color?: string
  /** Arm the trigger. Set false for a decorative or not-yet-open gate. Default true. */
  active?: boolean
}

// rapier RigidBody types: 0 Dynamic, 1 Fixed, 2 KinematicPosition, 3 KinematicVelocity.
const FIXED = 1
// `ActiveCollisionTypes`: DEFAULT (15) covers a dynamic body (the on-foot avatar) vs anything;
// OR in KINEMATIC_FIXED (8704) so the gate also fires for a kinematic vehicle (a boat, a cart)
// against this fixed sensor. The avatar capsule is dynamic; a scripted vehicle is kinematic.
const TRIGGER_TYPES = 15 | 8704

/**
 * A travel gate: a glowing ring that fires a one-shot event when the avatar — or a vehicle —
 * passes through it. The visual is procedural and asset-free; the trigger is a Rapier sensor.
 * Drive transitions with the optional `onEnter` callback, or set `to` and let it navigate.
 * Use it for world-to-world travel, level/hub transitions, or in-world teleports; for a single
 * continuous space, move the camera instead.
 */
export function Portal({
  to,
  onEnter,
  label,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radius = 2.2,
  color,
  active = true,
}: PortalProps) {
  const { unit, palette } = useWorld()
  const ink = color ?? palette.accent
  const R = radius * unit

  const ring = useRef<Group>(null)
  const ringMat = useRef<MeshStandardMaterial>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ring.current) ring.current.rotation.y = t * 0.6
    if (ringMat.current) ringMat.current.emissiveIntensity = 1.4 + Math.sin(t * 2) * 0.5
  })

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {/* A generous sensor around the gate; deep enough on the approach axis that a fast
          vehicle can't tunnel through between frames. Ignores Fixed bodies (terrain, props),
          so it never fires against the ground it stands on. */}
      <CuboidCollider
        sensor
        activeCollisionTypes={TRIGGER_TYPES}
        args={[R * 1.1, R + 0.6 * unit, Math.max(R, 1.6 * unit)]}
        position={[0, R, 0]}
        onIntersectionEnter={({ other }) => {
          if (!active || !other.rigidBody || other.rigidBody.bodyType() === FIXED) return
          if (onEnter) onEnter(to)
          else if (to) window.location.href = to
        }}
      />

      {/* Spinning glow ring, standing on the surface and facing the approach (local ±Z). */}
      <group ref={ring} position={[0, R, 0]}>
        <mesh castShadow>
          <torusGeometry args={[R, 0.12 * R, 14, 56]} />
          <meshStandardMaterial
            ref={ringMat}
            color={ink}
            emissive={ink}
            emissiveIntensity={1.4}
            roughness={0.35}
            metalness={0.1}
          />
        </mesh>
      </group>

      {/* Soft beam rising from the ring — a no-bloom glow marker visible from afar. */}
      <mesh position={[0, R * 1.4, 0]}>
        <cylinderGeometry args={[R * 0.82, R * 0.82, R * 2.8, 24, 1, true]} />
        <meshBasicMaterial color={ink} transparent opacity={0.12} depthWrite={false} />
      </mesh>

      {label && (
        <Sign position={[0, R * 2 + 0.9 * unit, 0]} size={0.7} color={ink} glow>
          {label}
        </Sign>
      )}
    </RigidBody>
  )
}
