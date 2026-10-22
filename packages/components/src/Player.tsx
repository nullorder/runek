import { useKeyboardControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { type AvatarView, PlayerMotionContext, useWorld, type Vec3 } from '@runek/core'
import Ecctrl, { type CustomEcctrlRigidBody } from 'ecctrl'
import { type ReactNode, type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Group, Object3D, Scene } from 'three'
import { PaniniLens } from './player/PaniniLens'

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

/**
 * ecctrl's camera pivot: a bare Object3D added to the scene whose single child is the (childless)
 * follow-cam, offset back along -z by the camera distance (or -0.01 in first person). Sign and
 * shape identify it in every view without tying anything to one of them.
 */
function findPivot(scene: Scene): Object3D | null {
  return (
    scene.children.find(
      (o) =>
        o.type === 'Object3D' &&
        o.children.length === 1 &&
        o.children[0].type === 'Object3D' &&
        o.children[0].children.length === 0 &&
        o.children[0].position.x === 0 &&
        o.children[0].position.z < -0.001,
    ) ?? null
  )
}

function CameraKeyLook({ pitchable }: { pitchable: boolean }) {
  const scene = useThree((s) => s.scene)
  const [, getKeys] = useKeyboardControls()
  const pivot = useRef<Object3D | null>(null)

  useFrame((_, dt) => {
    // Cached once found; until it mounts (or if the match ever misses) mouse-drag still turns, so
    // a miss just no-ops rather than breaking.
    if (!pivot.current) {
      pivot.current = findPivot(scene)
      if (!pivot.current) return
    }
    const step = Math.min(dt, 0.05)
    const keys = getKeys() as Record<string, boolean>

    // Yaw. Match mouse-drag's sign: dragging right decrements rotation.y, so ArrowRight does too.
    const turn = (keys.turnLeft ? 1 : 0) - (keys.turnRight ? 1 : 0)
    if (turn) pivot.current.rotation.y += turn * TURN_SPEED * step

    // Pitch. ArrowUp lowers the follow-cam to look up; ArrowDown raises it to look down. Repeat
    // ecctrl's mouse-pitch math on the follow-cam so the camera orbits the same vertical arc.
    const pitch = pitchable ? (keys.lookDown ? 1 : 0) - (keys.lookUp ? 1 : 0) : 0
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

/** Publish the avatar's horizontal speed, so the body it carries walks in step. */
function MotionProbe({
  body,
  motion,
}: {
  body: RefObject<CustomEcctrlRigidBody | null>
  motion: { current: { speed: number } }
}) {
  useFrame(() => {
    const v = body.current?.group?.linvel()
    motion.current.speed = v ? Math.hypot(v.x, v.z) : 0
  })
  return null
}

/** Lower the body the avatar carries onto the ground. ecctrl holds the capsule `FLOAT_HEIGHT`
 *  above it on a spring, applied as one impulse a frame against a frame's worth of gravity, so
 *  the capsule settles lower by m·g·dt / k. Dropping the body by the rest stands its feet (the
 *  capsule's bottom) on the ground at any frame rate. */
function StandOnGround({
  body,
  lift,
}: {
  body: RefObject<CustomEcctrlRigidBody | null>
  lift: RefObject<Group | null>
}) {
  const { gravity } = useWorld()
  useFrame((_, dt) => {
    const rb = body.current?.group
    const group = lift.current
    if (!rb || !group) return
    const g = Math.abs(gravity[1]) * rb.gravityScale()
    const sag = (rb.mass() * g * Math.min(dt, 0.5)) / SPRING_K
    const drop = Math.max(FLOAT_HEIGHT - sag, 0)
    // Eased, so frame-time jitter doesn't shake the body.
    group.position.y += (-drop - group.position.y) * Math.min(1, dt * 8)
  })
  return null
}

// How long the avatar waits for ground to appear beneath it before it falls anyway (spawning
// over open water, say), in seconds.
const GROUND_WAIT = 0.5

/** Hold the avatar kinematic until a ray straight down hits a collider, so it can't drop
 *  through ground whose collider arrives a commit or two after the avatar's body. */
function GroundGuard({
  body,
  onGrounded,
}: {
  body: RefObject<CustomEcctrlRigidBody | null>
  onGrounded: () => void
}) {
  const { world, rapier } = useRapier()
  const waited = useRef(0)
  const done = useRef(false)

  useFrame((_, dt) => {
    const rb = body.current?.group
    if (done.current || !rb) return
    waited.current += dt
    const at = rb.translation()
    const ray = new rapier.Ray(at, { x: 0, y: -1, z: 0 })
    const hit = world.castRay(ray, 1000, true, undefined, undefined, undefined, rb)
    if (hit || waited.current > GROUND_WAIT) {
      done.current = true
      onGrounded()
    }
  })
  return null
}

export interface PlayerProps {
  position?: Vec3
  /** Accepted for the component contract; this component has no seeded variation yet. */
  seed?: number
  /** Camera view: `first` (through the avatar's eyes), `third` (behind it), or `overhead` (high
   *  above at a fixed tilt, following it; scroll zooms, WASD walks relative to the screen). Unset
   *  defers to the world default (`<World avatar>`); falls back to first-person. An explicit value
   *  here always wins. A world `view` control (e.g. `controls: { view: ['KeyV'] }`) cycles the
   *  three at runtime. */
  view?: PlayerView
  /** Initial camera yaw in radians (0 faces +z). */
  yaw?: number
  /** How wide the first-person view is, in degrees across, on a 16:9 screen. The default,
   *  140, takes in most of what both eyes see, so the world wraps around you instead of
   *  sitting behind a window. Like most games it follows the screen's shape, not its size: a
   *  wider screen (an ultrawide or curved monitor) keeps the same angle top to bottom and sees
   *  more across, up to 200°; a narrower one sees less across, down to 110°, then holds that
   *  and opens up top to bottom, until a tall phone screen just shows less across. It is drawn
   *  through a gently curved (Panini) lens: true to life straight ahead, the sides squeezed in
   *  rather than stretched as a flat camera would. Third-person and overhead keep the world
   *  camera's own lens. */
  fov?: number
  /** How blurred the very edge of the first-person view is, in CSS pixels, easing to sharp
   *  toward the centre the way peripheral vision does; turn to look at something and it comes
   *  into focus. 0 turns it off. */
  peripheralBlur?: number
  /** Custom avatar visual, replacing the default capsule. Size it to the capsule
   *  envelope (1.3 units tall, centered at the character origin, so feet go at y = -0.65);
   *  the Player lowers it onto the ground beneath the floating capsule. It is hidden in
   *  first-person view. In world JSON, nest it as a child node of the Player. */
  children?: ReactNode
}

/** How ecctrl frames each view. `pitch` tilts the camera down (radians); a `locked` pitch can't
 *  be changed by dragging or the look keys. */
const CAMERA: Record<
  PlayerView,
  {
    distance: number
    zoom: [number, number]
    pitch: number
    locked: boolean
    collision: boolean
    turnVel: number
    turnSpeed: number
    follow: number
    lerp: number
  }
> = {
  first: {
    distance: -0.01,
    zoom: [-0.01, -0.01],
    pitch: 0,
    locked: false,
    collision: true,
    turnVel: 1,
    turnSpeed: 100,
    follow: 1000,
    lerp: 1000,
  },
  third: {
    distance: -5,
    zoom: [-1.5, -8],
    pitch: 0,
    locked: false,
    collision: true,
    turnVel: 0.2,
    turnSpeed: 15,
    follow: 11,
    lerp: 25,
  },
  // Walls would pull the camera in toward the avatar, so overhead flies over them.
  overhead: {
    distance: -14,
    zoom: [-6, -30],
    pitch: 1,
    locked: true,
    collision: false,
    turnVel: 0.2,
    turnSpeed: 15,
    follow: 8,
    lerp: 20,
  },
}
const VIEWS: PlayerView[] = ['first', 'third', 'overhead']

const CAPSULE_RADIUS = 0.3
const CAPSULE_HALF_HEIGHT = 0.35
// ecctrl's float spring, passed explicitly because `StandOnGround` depends on both.
const FLOAT_HEIGHT = 0.3
const SPRING_K = 1.2
// Where the avatar's eyes sit on the capsule: what others look at when they look at the player.
const EYE_HEIGHT = 0.5

export function Player({
  position = [0, 3, 0],
  view,
  yaw = 0,
  fov = 140,
  peripheralBlur = 4,
  children,
}: PlayerProps) {
  const { avatar, player, keyboard, controls } = useWorld()
  const scene = useThree((s) => s.scene)
  const wanted = view ?? avatar ?? 'first'
  const [current, setCurrent] = useState<PlayerView>(wanted)
  useEffect(() => setCurrent(wanted), [wanted])
  const firstPerson = current === 'first'
  const cam = CAMERA[current]
  const eyes = useRef<Object3D>(null)
  const body = useRef<CustomEcctrlRigidBody>(null)
  const [grounded, setGrounded] = useState(false)
  const motion = useRef({ speed: 0 })
  const lift = useRef<Group>(null)

  // ecctrl reads its camera setup once, at mount, so a new view remounts it: from where the
  // avatar stands now, facing the way the camera faced. The old camera pivot is taken out of the
  // scene so nothing finds it again.
  const [mount, setMount] = useState({ view: current, at: position, yaw })
  useLayoutEffect(() => {
    if (mount.view === current) return
    const pivot = findPivot(scene)
    const t = body.current?.group?.translation()
    pivot?.removeFromParent()
    setMount({
      view: current,
      at: t ? [t.x, t.y, t.z] : mount.at,
      yaw: pivot?.rotation.y ?? mount.yaw,
    })
  }, [current, scene, mount])

  useEffect(() => {
    const keys = controls.view
    if (!keyboard || !keys?.length) return
    // One step per press: the page's key repeat arrives as more keydowns.
    const held = new Set<string>()
    const onDown = (event: Event) => {
      const { code } = event as KeyboardEvent
      if (!keys.includes(code) || held.has(code)) return
      held.add(code)
      setCurrent((v) => VIEWS[(VIEWS.indexOf(v) + 1) % VIEWS.length])
    }
    const onUp = (event: Event) => held.delete((event as KeyboardEvent).code)
    keyboard.addEventListener('keydown', onDown)
    keyboard.addEventListener('keyup', onUp)
    return () => {
      keyboard.removeEventListener('keydown', onDown)
      keyboard.removeEventListener('keyup', onUp)
    }
  }, [keyboard, controls])

  // Publish the avatar so the world can react to the player rather than the camera. Only clear
  // the slot if it's still ours, so a remount elsewhere isn't wiped by this unmount.
  useEffect(() => {
    if (!player) return
    const anchor = eyes.current
    player.current = anchor
    return () => {
      if (player.current === anchor) player.current = null
    }
    // A view change remounts ecctrl, and with it the anchor.
  }, [player, mount.view])

  return (
    <Ecctrl
      key={mount.view}
      ref={body}
      type={grounded ? 'dynamic' : 'kinematicPosition'}
      position={mount.at}
      mode="CameraBasedMovement"
      camInitDir={{ x: cam.pitch, y: mount.yaw }}
      characterInitDir={mount.yaw}
      // A locked capsule can't tip over; ecctrl turns only the visible model to face the way it
      // walks. Its balancing torque, applied once per rendered frame, could topple the avatar
      // when frames came slowly.
      autoBalance={false}
      {...(cam.locked ? { camUpLimit: cam.pitch, camLowLimit: cam.pitch } : {})}
      camCollision={cam.collision}
      capsuleRadius={CAPSULE_RADIUS}
      capsuleHalfHeight={CAPSULE_HALF_HEIGHT}
      floatHeight={FLOAT_HEIGHT}
      springK={SPRING_K}
      camInitDis={cam.distance}
      camMinDis={cam.zoom[0]}
      camMaxDis={cam.zoom[1]}
      turnVelMultiplier={cam.turnVel}
      turnSpeed={cam.turnSpeed}
      camFollowMult={cam.follow}
      camLerpMult={cam.lerp}
    >
      <group ref={lift} visible={!firstPerson} position={[0, -FLOAT_HEIGHT, 0]}>
        <PlayerMotionContext.Provider value={motion}>
          {children ?? (
            <mesh castShadow>
              <capsuleGeometry args={[CAPSULE_RADIUS, CAPSULE_HALF_HEIGHT * 2, 8, 16]} />
              <meshStandardMaterial color="#4a90d9" />
            </mesh>
          )}
        </PlayerMotionContext.Provider>
      </group>
      <object3D ref={eyes} position={[0, EYE_HEIGHT, 0]} />
      <CameraKeyLook pitchable={!cam.locked} />
      {firstPerson && <PaniniLens fov={fov} blur={peripheralBlur} />}
      {!firstPerson && <MotionProbe body={body} motion={motion} />}
      {!firstPerson && <StandOnGround body={body} lift={lift} />}
      {!grounded && <GroundGuard body={body} onGrounded={() => setGrounded(true)} />}
    </Ecctrl>
  )
}
