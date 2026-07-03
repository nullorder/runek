import { type AvatarView, useWorld, type Vec3 } from '@runek/core'
import Ecctrl from 'ecctrl'
import type { ReactNode } from 'react'

export type PlayerView = AvatarView

export interface PlayerProps {
  position?: Vec3
  /** Camera view. Unset defers to the world default (`<World avatar>`); falls back
   *  to first-person. An explicit value here always wins. */
  view?: PlayerView
  /** Initial camera yaw in radians (0 faces +z). */
  yaw?: number
  /** Custom avatar visual, replacing the default capsule. Size it to the capsule
   *  envelope (~1.3 units tall, centered at the character origin); it is hidden in
   *  first-person view. In world JSON, nest it as a child node of the Player. */
  children?: ReactNode
}

const CAPSULE_RADIUS = 0.3
const CAPSULE_HALF_HEIGHT = 0.35

export function Player({ position = [0, 3, 0], view, yaw = 0, children }: PlayerProps) {
  const { avatar } = useWorld()
  const firstPerson = (view ?? avatar ?? 'first') === 'first'

  return (
    <Ecctrl
      position={position}
      mode="CameraBasedMovement"
      camInitDir={{ x: 0, y: yaw }}
      capsuleRadius={CAPSULE_RADIUS}
      capsuleHalfHeight={CAPSULE_HALF_HEIGHT}
      camInitDis={firstPerson ? -0.01 : -5}
      camMinDis={firstPerson ? -0.01 : -1.5}
      camMaxDis={firstPerson ? -0.01 : -8}
      turnVelMultiplier={firstPerson ? 1 : 0.2}
      turnSpeed={firstPerson ? 100 : 15}
      camFollowMult={firstPerson ? 1000 : 11}
      camLerpMult={firstPerson ? 1000 : 25}
    >
      <group visible={!firstPerson}>
        {children ?? (
          <mesh castShadow>
            <capsuleGeometry args={[CAPSULE_RADIUS, CAPSULE_HALF_HEIGHT * 2, 8, 16]} />
            <meshStandardMaterial color="#4a90d9" />
          </mesh>
        )}
      </group>
    </Ecctrl>
  )
}
