import { useKeyboardControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import {
  type AvatarView,
  Dynamic,
  type PlayerControl,
  PlayerMotionContext,
  type TeleportOptions,
  useMaterial,
  useWorld,
  type Vec3,
} from '@runek/core'
import Ecctrl, { type CustomEcctrlRigidBody } from 'ecctrl'
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type Camera, type Group, type Object3D, type Scene, Vector3 } from 'three'
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
  /** How tall the avatar is, feet to crown, in meters: the length of its capsule. */
  height?: number
  /** The capsule's radius, in meters. */
  radius?: number
  /** Eye height above the feet, in meters: where the first-person camera sits, what the
   *  third-person camera turns about, and what others look at when they look at the player.
   *  Unset, just under the top of the capsule as it floats (about 1.4 at the default size). */
  eyeHeight?: number
  /** Top walking speed, in meters per second. */
  speed?: number
  /** Top speed while the `run` key is held, in meters per second. */
  sprintSpeed?: number
  /** How far behind the avatar the third-person camera starts, in meters; scrolling zooms from
   *  there. */
  cameraDistance?: number
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
  /** Custom avatar visual, replacing the default capsule. Size it to the capsule envelope
   *  (`height` tall, centered at the character origin, so feet go at y = -height / 2: -0.65 at
   *  the default size); the Player lowers it onto the ground beneath the floating capsule. It is
   *  hidden in first-person view. In world JSON, nest it as a child node of the Player. */
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

// ecctrl's float spring, passed explicitly because `StandOnGround` depends on both.
const FLOAT_HEIGHT = 0.3
const SPRING_K = 1.2

/** How far below `FLOAT_HEIGHT` the capsule rides at 60 fps: the spring's sag under the capsule's
 *  own weight (rapier gives a collider a density of 1), as `StandOnGround` works it out. */
function restingSag(radius: number, halfHeight: number, gravity: number) {
  const mass = Math.PI * radius * radius * (2 * halfHeight + (4 / 3) * radius)
  return (mass * gravity) / 60 / SPRING_K
}

/** Move the avatar's body, and its camera with it so the view doesn't sweep across the world.
 *  False when the body doesn't exist yet. */
function moveAvatar(
  ecctrl: CustomEcctrlRigidBody | null,
  scene: Scene,
  camera: Camera,
  to: Vec3,
  { yaw, keepVelocity = false }: TeleportOptions,
) {
  const rb = ecctrl?.group
  if (!rb) return false
  const from = rb.translation()
  const offset = new Vector3(to[0] - from.x, to[1] - from.y, to[2] - from.z)
  rb.setTranslation({ x: to[0], y: to[1], z: to[2] }, true)
  if (!keepVelocity) rb.setLinvel({ x: 0, y: 0, z: 0 }, true)

  const pivot = findPivot(scene)
  if (!pivot) return true
  pivot.position.add(offset)
  // In camera-based movement ecctrl squares the visible body to the pivot every frame, so turning
  // the pivot turns both.
  if (yaw !== undefined) pivot.rotation.y = yaw
  // Put the camera where the follow-cam wants it, so neither the jump nor a new heading is lerped.
  pivot.updateMatrixWorld(true)
  pivot.children[0].getWorldPosition(camera.position)
  camera.lookAt(pivot.position)
  return true
}

export function Player({
  position = [0, 3, 0],
  view,
  yaw = 0,
  height = 1.3,
  radius = 0.3,
  eyeHeight,
  speed = 2.5,
  sprintSpeed = 5,
  cameraDistance = 5,
  fov = 140,
  peripheralBlur = 4,
  children,
}: PlayerProps) {
  const { avatar, player, playerControl, keyboard, controls, gravity } = useWorld()
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const wanted = view ?? avatar ?? 'first'
  const [current, setCurrent] = useState<PlayerView>(wanted)
  useEffect(() => setCurrent(wanted), [wanted])
  const firstPerson = current === 'first'
  const cam = useMemo(() => {
    if (current !== 'third') return CAMERA[current]
    const far = Math.max(cameraDistance, 0.5)
    return {
      ...CAMERA.third,
      distance: -far,
      zoom: [Math.max(CAMERA.third.zoom[0], -far), Math.min(CAMERA.third.zoom[1], -far)],
    } satisfies (typeof CAMERA)[PlayerView]
  }, [current, cameraDistance])
  const eyes = useRef<Object3D>(null)
  const body = useRef<CustomEcctrlRigidBody>(null)
  const [grounded, setGrounded] = useState(false)
  const motion = useRef({ speed: 0 })
  const lift = useRef<Group>(null)
  const capsule = useMaterial({ color: '#4a90d9' })

  const capsuleRadius = Math.min(Math.max(radius, 0.05), height / 2)
  const halfHeight = Math.max(height / 2 - capsuleRadius, 0.01)
  // ecctrl's camera turns about a point `halfHeight + radius / 2` above the capsule's centre, plus
  // `camTargetPos`. An `eyeHeight` is from the feet, which stand `FLOAT_HEIGHT` (less the spring's
  // sag) below the capsule's bottom.
  const centre = FLOAT_HEIGHT - restingSag(capsuleRadius, halfHeight, Math.abs(gravity[1]))
  const eyeOffset =
    eyeHeight === undefined
      ? halfHeight + capsuleRadius / 2
      : eyeHeight - centre - halfHeight - capsuleRadius
  const camTarget = useMemo(
    () => ({ x: 0, y: eyeOffset - halfHeight - capsuleRadius / 2, z: 0 }),
    [eyeOffset, halfHeight, capsuleRadius],
  )

  // ecctrl reads its camera and capsule setup once, at mount, so a new view or size remounts it:
  // from where the avatar stands now, facing the way the camera faced. The old camera pivot is
  // taken out of the scene so nothing finds it again.
  const setup = `${current}:${halfHeight}:${capsuleRadius}:${cam.distance}`
  const [mount, setMount] = useState({ setup, at: position, yaw })
  useLayoutEffect(() => {
    if (mount.setup === setup) return
    const pivot = findPivot(scene)
    const t = body.current?.group?.translation()
    pivot?.removeFromParent()
    setMount({
      setup,
      at: t ? [t.x, t.y, t.z] : mount.at,
      yaw: pivot?.rotation.y ?? mount.yaw,
    })
  }, [setup, scene, mount])

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
    // A new view or size remounts ecctrl, and with it the anchor.
  }, [player, mount.setup])

  // A teleport asked for before the body exists (just mounted, or remounting for a new view)
  // waits for it.
  const pendingTeleport = useRef<[Vec3, TeleportOptions] | null>(null)
  useEffect(() => {
    if (!playerControl) return
    const control: PlayerControl = {
      teleport(to, options = {}) {
        const moved = moveAvatar(body.current, scene, camera, to, options)
        pendingTeleport.current = moved ? null : [to, options]
      },
    }
    playerControl.current = control
    return () => {
      if (playerControl.current === control) playerControl.current = null
    }
  }, [playerControl, scene, camera])
  useFrame(() => {
    const queued = pendingTeleport.current
    if (!queued) return
    if (moveAvatar(body.current, scene, camera, ...queued)) {
      pendingTeleport.current = null
    }
  })

  return (
    <Ecctrl
      key={mount.setup}
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
      capsuleRadius={capsuleRadius}
      capsuleHalfHeight={halfHeight}
      floatHeight={FLOAT_HEIGHT}
      springK={SPRING_K}
      maxVelLimit={speed}
      sprintMult={speed > 0 ? sprintSpeed / speed : 1}
      camTargetPos={camTarget}
      camInitDis={cam.distance}
      camMinDis={cam.zoom[0]}
      camMaxDis={cam.zoom[1]}
      turnVelMultiplier={cam.turnVel}
      turnSpeed={cam.turnSpeed}
      camFollowMult={cam.follow}
      camLerpMult={cam.lerp}
    >
      <Dynamic>
        <group ref={lift} visible={!firstPerson} position={[0, -FLOAT_HEIGHT, 0]}>
          <PlayerMotionContext.Provider value={motion}>
            {children ?? (
              <mesh material={capsule} castShadow>
                <capsuleGeometry args={[capsuleRadius, halfHeight * 2, 8, 16]} />
              </mesh>
            )}
          </PlayerMotionContext.Provider>
        </group>
      </Dynamic>
      <object3D ref={eyes} position={[0, eyeOffset, 0]} />
      <CameraKeyLook pitchable={!cam.locked} />
      {firstPerson && <PaniniLens fov={fov} blur={peripheralBlur} />}
      {!firstPerson && <MotionProbe body={body} motion={motion} />}
      {!firstPerson && <StandOnGround body={body} lift={lift} />}
      {!grounded && <GroundGuard body={body} onGrounded={() => setGrounded(true)} />}
    </Ecctrl>
  )
}
