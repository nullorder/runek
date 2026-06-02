import type { Vec3 } from '@runek/core'
import Ecctrl from 'ecctrl'

export type PlayerView = 'first' | 'third'

export interface PlayerProps {
  position?: Vec3
  view?: PlayerView
  /** Initial camera yaw in radians (0 faces +z). */
  yaw?: number
}

const CAPSULE_RADIUS = 0.3
const CAPSULE_HALF_HEIGHT = 0.35

export function Player({ position = [0, 3, 0], view = 'first', yaw = 0 }: PlayerProps) {
  const firstPerson = view === 'first'

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
      <mesh visible={!firstPerson} castShadow>
        <capsuleGeometry args={[CAPSULE_RADIUS, CAPSULE_HALF_HEIGHT * 2, 8, 16]} />
        <meshStandardMaterial color="#4a90d9" />
      </mesh>
    </Ecctrl>
  )
}
