import { useKeyboardControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { type AvatarView, useWorld, type Vec3 } from '@runek/core'
import Ecctrl from 'ecctrl'
import { type ReactNode, useRef } from 'react'
import type { Object3D } from 'three'

export type PlayerView = AvatarView

// Keyboard look. ecctrl only moves its camera from mouse/touch/gamepad — there are no key
// actions for it — so we drive its camera rig ourselves from the `turnLeft`/`turnRight` and
// `lookUp`/`lookDown` actions in the world's controls (see `DEFAULT_CONTROLS` in `@runek/core`).
// Yaw is the pivot's `rotation.y`; pitch is the follow-cam's `rotation.x` plus a matching
// reposition along a vertical arc, exactly as ecctrl's own mouse handler does — the same math
// ecctrl runs in both views, so this works first- and third-person alike. ecctrl writes these
// only on pointer input (never per frame in CameraBasedMovement), so our additions compose
// cleanly with mouse-drag. A world whose controls omit these actions leaves the camera entirely
// to the mouse.
const TURN_SPEED = 1.8 // yaw, radians/second
const LOOK_SPEED = 1.2 // pitch, radians/second
// Pitch clamp — mirrors ecctrl's camLowLimit / camUpLimit defaults (we pass neither to Ecctrl).
const CAM_LOW = -1.3
const CAM_UP = 1.5

function CameraKeyLook() {
  const scene = useThree((s) => s.scene)
  const [, getKeys] = useKeyboardControls()
  const pivot = useRef<Object3D | null>(null)

  useFrame((_, dt) => {
    // ecctrl's camera pivot is a bare Object3D added to the scene whose single child is the
    // (childless) follow-cam, offset back along z by the camera distance. Match on that shape
    // and cache; until it mounts (or if the match ever misses) mouse-drag still turns, so a
    // miss just no-ops rather than breaking.
    if (!pivot.current) {
      pivot.current =
        scene.children.find(
          (o) =>
            o.type === 'Object3D' &&
            o.children.length === 1 &&
            o.children[0].type === 'Object3D' &&
            o.children[0].children.length === 0 &&
            // The follow-cam sits offset back along -z (the third-person camera
            // distance, or -0.01 in first person). Sign + shape identify ecctrl's
            // pivot in both views without tying keyboard look to one of them.
            o.children[0].position.x === 0 &&
            o.children[0].position.z < -0.001,
        ) ?? null
      if (!pivot.current) return
    }
    const step = Math.min(dt, 0.05)
    const keys = getKeys() as Record<string, boolean>

    // Yaw. Match mouse-drag's sign: dragging right decrements rotation.y, so ArrowRight does too.
    const turn = (keys.turnLeft ? 1 : 0) - (keys.turnRight ? 1 : 0)
    if (turn) pivot.current.rotation.y += turn * TURN_SPEED * step

    // Pitch. ArrowUp lowers the follow-cam to look up; ArrowDown raises it to look down. Repeat
    // ecctrl's mouse-pitch math on the follow-cam so the camera orbits the same vertical arc.
    const pitch = (keys.lookDown ? 1 : 0) - (keys.lookUp ? 1 : 0)
    if (pitch) {
      const cam = pivot.current.children[0]
      const vy = Math.min(Math.max(cam.rotation.x + pitch * LOOK_SPEED * step, CAM_LOW), CAM_UP)
      const dist = cam.position.length()
      cam.rotation.x = vy
      cam.position.y = -dist * Math.sin(-vy)
      cam.position.z = -dist * Math.cos(-vy)
    }
  })
  return null
}

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
      <CameraKeyLook />
    </Ecctrl>
  )
}
