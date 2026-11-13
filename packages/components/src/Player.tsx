import { useKeyboardControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { type RapierCollider, useAfterPhysicsStep, useRapier } from '@react-three/rapier'
import {
  type AvatarView,
  Dynamic,
  type PlayerControl,
  type PlayerMotion,
  PlayerMotionContext,
  type PlayerPin,
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
import {
  type Camera,
  type Group,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
  Vector3,
} from 'three'
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

// How fast the avatar must move over the ground before its body turns to face that way (m/s),
// and how quickly it turns (per second, eased).
const TURNS_AT = 0.3
const BODY_TURN = 10
// In first person, below this ground speed (m/s), an avatar that backs up or steps aside keeps
// facing where it looks and its legs carry it the other way (`PlayerMotion.course`). Faster than
// a walk nobody does, and the body turns to run the way it goes.
const STEPS_BELOW = 2.6

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** Measure the avatar after every physics step, so a body posed later in the same frame strides
 *  with this frame's distance. The heading turns toward the direction of travel and holds when
 *  the avatar stops; `faceCamera` (first person) turns it to the camera at rest, and keeps it
 *  there while the avatar backs up or steps aside at a walk. A held body (`pin`) faces the way
 *  the hold says and reads as standing still, however its hold moves it. */
function MotionProbe({
  body,
  motion,
  faceCamera,
  held,
}: {
  body: RefObject<CustomEcctrlRigidBody | null>
  motion: { current: PlayerMotion }
  faceCamera: boolean
  held: RefObject<PlayerPin | null>
}) {
  const scene = useThree((s) => s.scene)
  const pivot = useRef<Object3D | null>(null)
  useAfterPhysicsStep((world) => {
    const rb = body.current?.group
    if (!rb) return
    const m = motion.current
    const pin = held.current
    const dt = world.timestep
    const v = rb.linvel()
    m.speed = pin ? 0 : Math.hypot(v.x, v.z)
    m.distance += m.speed * dt
    m.vertical = pin ? 0 : v.y
    // ecctrl's ground test, from its float ray.
    m.grounded = pin ? true : (rb.userData as { canJump?: boolean } | undefined)?.canJump === true
    m.pose = pin?.pose ?? null
    m.climb = pin?.climb ?? null
    pivot.current ??= findPivot(scene)
    const camera = pivot.current
    const cameraYaw = camera?.rotation.y ?? m.heading
    const ease = 1 - Math.exp(-BODY_TURN * dt)
    const going = Math.atan2(v.x, v.z)
    const stepping = faceCamera && !pin && m.speed > TURNS_AT && m.speed < STEPS_BELOW
    if (pin) m.heading += wrap(pin.yaw - m.heading) * ease
    else if (stepping) m.heading += wrap(cameraYaw - m.heading) * ease
    else if (m.speed > TURNS_AT) m.heading += wrap(going - m.heading) * ease
    else if (faceCamera) m.heading += wrap(cameraYaw - m.heading) * ease
    m.heading = wrap(m.heading)
    m.course = stepping ? wrap(going - m.heading) : 0
    m.lookYaw = wrap(cameraYaw - m.heading)
    m.lookPitch = -(camera?.children[0]?.rotation.x ?? 0)
  })
  return null
}

/** Turn the body the avatar carries to its heading. ecctrl squares the whole model to the camera
 *  pivot every frame, so this takes the pivot's yaw back out beneath it. Mounted after
 *  `CameraKeyLook`, so it sees the pivot after this frame's keyboard turn. */
function BodyFacing({
  turn,
  motion,
}: {
  turn: RefObject<Group | null>
  motion: { current: PlayerMotion }
}) {
  const scene = useThree((s) => s.scene)
  const pivot = useRef<Object3D | null>(null)
  useFrame(() => {
    pivot.current ??= findPivot(scene)
    const group = turn.current
    if (!group || !pivot.current) return
    group.rotation.y = motion.current.heading - pivot.current.rotation.y
  })
  return null
}

/** Lower the body the avatar carries onto the ground. ecctrl holds the capsule `FLOAT_HEIGHT`
 *  above it on a spring, applied as one impulse a frame against a frame's worth of gravity, so
 *  the capsule settles lower by m·g·dt / k. Dropping the body by the rest stands its feet (the
 *  capsule's bottom) on the ground at any frame rate. How far it has settled is published as the
 *  motion's `sag`, in first person too, for whoever needs the height of the feet. */
function StandOnGround({
  body,
  lift,
  motion,
  held,
}: {
  body: RefObject<CustomEcctrlRigidBody | null>
  lift: RefObject<Group | null>
  motion: { current: PlayerMotion }
  held: RefObject<PlayerPin | null>
}) {
  const { gravity } = useWorld()
  useFrame((_, dt) => {
    const rb = body.current?.group
    const group = lift.current
    if (!rb || !group) return
    const g = Math.abs(gravity[1]) * rb.gravityScale()
    const sag = (rb.mass() * g * Math.min(dt, 0.5)) / SPRING_K
    // A held body has no spring under it: its capsule is put the whole float height up.
    const drop = held.current ? FLOAT_HEIGHT : Math.max(FLOAT_HEIGHT - sag, 0)
    // Eased, so frame-time jitter doesn't shake the body.
    group.position.y += (-drop - group.position.y) * Math.min(1, dt * 8)
    motion.current.sag = FLOAT_HEIGHT + group.position.y
  })
  return null
}

/** Hold the avatar to the speed `limitSpeed` allows while something slows it. ecctrl pushes
 *  toward its own pace every frame, so the cap goes on what comes out: the speed over the ground
 *  is scaled back to the limit, and the fall is left alone. */
function SpeedLimit({
  body,
  limit,
  held,
}: {
  body: RefObject<CustomEcctrlRigidBody | null>
  limit: RefObject<number | null>
  held: RefObject<PlayerPin | null>
}) {
  useFrame(() => {
    const most = limit.current
    const rb = body.current?.group
    if (most === null || !rb || held.current) return
    const v = rb.linvel()
    const speed = Math.hypot(v.x, v.z)
    if (speed <= most) return
    const k = most / speed
    rb.setLinvel({ x: v.x * k, y: v.y, z: v.z * k }, true)
  })
  return null
}

// How fast a held body is carried to its spot: at least this many meters a second, and most of
// what is left of the way each frame, so a long reach still arrives promptly.
const CARRY_SPEED = 6
const CARRY_RATE = 14

/** Carry a held body to the spot it is held at (see `PlayerControl.pin`). The body is kinematic
 *  while held, so nothing pushes it off and it passes through what it sits on. */
function PinDriver({
  body,
  held,
  centre,
}: {
  body: RefObject<CustomEcctrlRigidBody | null>
  held: RefObject<PlayerPin | null>
  /** The capsule's centre above the feet, in world units. */
  centre: number
}) {
  const { unit } = useWorld()
  useFrame((_, dt) => {
    const pin = held.current
    const rb = body.current?.group
    if (!pin || !rb) return
    const at = rb.translation()
    const dx = pin.feet[0] - at.x
    const dy = pin.feet[1] + centre - at.y
    const dz = pin.feet[2] - at.z
    const gap = Math.hypot(dx, dy, dz)
    const step = Math.min(dt, 0.1)
    const reach = Math.max(CARRY_SPEED * unit * step, gap * (1 - Math.exp(-CARRY_RATE * step)))
    const k = gap < 1e-4 ? 1 : Math.min(1, reach / gap)
    // Ignored until the body has turned kinematic, a commit after the hold began.
    rb.setNextKinematicTranslation({ x: at.x + dx * k, y: at.y + dy * k, z: at.z + dz * k })
  })
  return null
}

// Rapier gives every collider 16 groups it belongs to and 16 it meets. The camera's casts are made
// in the last group alone, so a collider that leaves that group out of the ones it meets is one
// the camera goes straight through, while every body still runs into it.
const CAMERA_GROUP = 1 << 15
/** `collisionGroups` for a collider the third-person camera may pass through (glass, a stool, a
 *  bead curtain) while bodies still run into it. */
export const CAMERA_PASSES = ((0xffff << 16) | (0xffff & ~CAMERA_GROUP)) >>> 0
const CAMERA_CASTS = ((CAMERA_GROUP << 16) | 0xffff) >>> 0

// The camera goes back out to its distance at this rate (1/s). It comes in at once.
const BOOM_EASE = 5
// The body the avatar carries is not drawn while the camera is this close to its head, and is
// drawn again once the camera is a little further out, so it does not flicker at the edge.
const HIDE_WITHIN = 0.5
const SHOW_BEYOND = 0.65
// A post this thin both ways across (a lamp pole, a railing) does not stop the camera: going
// round one would make the view jump every time the avatar walked past it.
const SLIM = 0.25
const UPRIGHT = { x: 0, y: 0, z: 0, w: 1 }

/**
 * Holds the camera in the third-person and overhead views: out at the distance and angle
 * ecctrl's rig asks for, or as far that way as it can go before something solid.
 *
 * ecctrl keeps its own camera out of walls with a ray cast at the meshes it found when it
 * mounted. Static batching draws walls, floors and roofs as merged meshes that arrive later, and
 * moves the ones ecctrl found to a layer its ray does not test, so that camera went through them
 * and looked into the next room; overhead, it flew over roofs and showed the roof instead of the
 * avatar. This one asks the physics world, where a wall has a collider however it is drawn: a
 * ball that holds the camera's near plane is swept from the avatar's head toward where the
 * camera wants to be, and the camera stops where the ball does. ecctrl's rig still takes the
 * mouse, the wheel and the look keys.
 */
function CameraBoom({
  body,
  model,
  follow,
  lerp,
  pivotUp,
  halfHeight,
  radius,
}: {
  body: RefObject<CustomEcctrlRigidBody | null>
  /** The group that holds the visible body. */
  model: RefObject<Group | null>
  /** How fast ecctrl's pivot follows the avatar, and the camera follows a turn of the rig (1/s). */
  follow: number
  lerp: number
  /** Where ecctrl aims its pivot, above the capsule's centre. */
  pivotUp: number
  halfHeight: number
  radius: number
}) {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const { world, rapier } = useRapier()
  const { unit } = useWorld()
  const rig = useRef<Object3D | null>(null)
  const reach = useRef<number | null>(null)
  const [v] = useState(() => ({
    aim: new Vector3(),
    from: new Vector3(),
    way: new Vector3(),
    want: new Vector3(),
    dir: new Vector3(),
    ball: new rapier.Ball(0.2),
    slim: new WeakMap<RapierCollider, boolean>(),
  }))

  useFrame((_, delta) => {
    const rb = body.current?.group
    if (!rig.current?.parent) rig.current = findPivot(scene)
    const pivot = rig.current
    if (!rb || !pivot) return

    // ecctrl moves its pivot after this runs (a parent's frame callback comes after its
    // children's). Where it is about to put it is worked out here the way ecctrl does, so the
    // camera is not a frame behind the avatar.
    const dt = delta > 1 ? delta % 1 : delta
    const c = rb.translation()
    v.aim
      .set(c.x, c.y + pivotUp, c.z)
      .sub(pivot.position)
      .multiplyScalar(1 - Math.exp(-follow * dt))
      .add(pivot.position)

    // Where the rig wants the camera: its follow-cam, out behind the pivot and turned with it.
    v.want.copy(pivot.children[0].position).applyQuaternion(pivot.quaternion)
    const far = v.want.length()
    if (far < 1e-4) return
    v.want.divideScalar(far)
    const step = Math.min(dt, 0.1)
    if (reach.current === null) v.dir.copy(v.want)
    else if (v.dir.lerp(v.want, 1 - Math.exp(-lerp * step)).lengthSq() < 1e-6) v.dir.copy(v.want)
    else v.dir.normalize()

    // A ball round the camera that takes in the corners of its near plane, so nothing the ball
    // clears is cut open by that plane. Kept smaller than the capsule, so it fits wherever the
    // avatar does.
    const lens = camera as PerspectiveCamera
    const tan = lens.isPerspectiveCamera ? Math.tan((lens.fov * Math.PI) / 360) : 0
    const aspect = lens.isPerspectiveCamera ? lens.aspect : 1
    const corner = camera.near * Math.hypot(1, tan, tan * aspect)
    v.ball.radius = Math.min(corner + 0.02 * unit, radius - 0.02 * unit)

    const stops = (collider: RapierCollider) => {
      let slim = v.slim.get(collider)
      if (slim === undefined) {
        slim = false
        if (collider.shapeType() === rapier.ShapeType.Cuboid) {
          const h = collider.halfExtents()
          slim = [h.x, h.y, h.z].sort((a, b) => a - b)[1] <= (SLIM / 2) * unit
        }
        v.slim.set(collider, slim)
      }
      return !slim
    }
    const sweep = (from: Vector3, along: Vector3, most: number) => {
      const hit = world.castShape(
        from,
        UPRIGHT,
        along,
        v.ball,
        0,
        most,
        true,
        rapier.QueryFilterFlags.EXCLUDE_SENSORS,
        CAMERA_CASTS,
        undefined,
        rb,
        stops,
      )
      return hit ? Math.min(most, Math.max(0, hit.time_of_impact)) : most
    }

    // Start inside the capsule, where nothing else can be, and go to the pivot first: it trails
    // the avatar, and on a fast turn round a corner it can cut through the corner.
    v.from.set(c.x, c.y + halfHeight, c.z)
    v.way.copy(v.aim).sub(v.from)
    const gap = v.way.length()
    if (gap > 1e-4) v.from.addScaledVector(v.way.divideScalar(gap), sweep(v.from, v.way, gap))
    const room = sweep(v.from, v.dir, far)
    const was = reach.current ?? room
    const now = room < was ? room : was + (room - was) * (1 - Math.exp(-BOOM_EASE * step))
    reach.current = now
    camera.position.copy(v.from).addScaledVector(v.dir, now)
    camera.lookAt(v.way.copy(camera.position).sub(v.dir))

    // Up against the avatar's head the camera would look out through it.
    const drawn = model.current
    if (drawn?.visible && now < HIDE_WITHIN * unit) drawn.visible = false
    else if (drawn && !drawn.visible && now > SHOW_BEYOND * unit) drawn.visible = true
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
   *  the default size); the Player lowers it onto the ground beneath the floating capsule and
   *  turns it to face the way it travels (in first person, the camera's way when it stops). It is
   *  hidden in first-person view. A `Person` here walks in step with the avatar and looks where
   *  the camera looks. In world JSON, nest it as a child node of the Player. */
  children?: ReactNode
}

/** How ecctrl frames each view. `pitch` tilts the camera down (radians); a `locked` pitch can't
 *  be changed by dragging or the look keys. Outside first person the camera itself is held by
 *  `CameraBoom`, which stops it at walls, floors and roofs in both views. */
const CAMERA: Record<
  PlayerView,
  {
    distance: number
    zoom: [number, number]
    pitch: number
    locked: boolean
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
    turnVel: 0.2,
    turnSpeed: 15,
    follow: 11,
    lerp: 25,
  },
  overhead: {
    distance: -14,
    zoom: [-6, -30],
    pitch: 1,
    locked: true,
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
  // The camera turns with the pivot; the body takes the same heading from `Player`'s motion.
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
  const { avatar, player, playerControl, playerMotion, keyboard, controls, gravity } = useWorld()
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
  const motion = useRef<PlayerMotion>({
    speed: 0,
    distance: 0,
    vertical: 0,
    grounded: false,
    heading: yaw,
    lookYaw: 0,
    lookPitch: 0,
  })
  const lift = useRef<Group>(null)
  const turn = useRef<Group>(null)
  const capsule = useMaterial({ color: '#4a90d9' })
  // Something in the world holds the body in place (see `PlayerControl.pin`): where, whether the
  // body has turned kinematic for it yet, and where to put it when it is let go.
  const pin = useRef<PlayerPin | null>(null)
  const [pinned, setPinned] = useState(false)
  const holding = useRef(false)
  const exit = useRef<Vec3 | null>(null)
  const speedLimit = useRef<number | null>(null)

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

  useEffect(() => {
    if (!playerMotion) return
    const mine = motion.current
    playerMotion.current = mine
    return () => {
      if (playerMotion.current === mine) playerMotion.current = null
    }
  }, [playerMotion])

  // A teleport asked for before the body exists (just mounted, or remounting for a new view)
  // waits for it.
  const pendingTeleport = useRef<[Vec3, TeleportOptions] | null>(null)
  useEffect(() => {
    if (!playerControl) return
    const control: PlayerControl = {
      teleport(to, options = {}) {
        if (options.yaw !== undefined) motion.current.heading = options.yaw
        const moved = moveAvatar(body.current, scene, camera, to, options)
        pendingTeleport.current = moved ? null : [to, options]
      },
      pin(spot, to) {
        pin.current = spot
        if (spot) exit.current = null
        // A body that never turned kinematic can be moved straight away.
        else if (!holding.current) {
          if (to) control.teleport(to)
        } else exit.current = to ?? null
        setPinned(spot !== null)
      },
      limitSpeed(most) {
        speedLimit.current = most
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

  // The body turns kinematic or dynamic a commit after `pin` asks, and turning resets it to where
  // it was drawn last. So a body let go somewhere else is moved there here, after the turn (a
  // child's effects run before its parent's).
  useEffect(() => {
    holding.current = pinned
    if (pinned || !exit.current) return
    playerControl?.current?.teleport(exit.current)
    exit.current = null
  }, [pinned, playerControl])

  return (
    <Ecctrl
      key={mount.setup}
      ref={body}
      type={grounded && !pinned ? 'dynamic' : 'kinematicPosition'}
      disableControl={pinned}
      position={mount.at}
      mode="CameraBasedMovement"
      camInitDir={{ x: cam.pitch, y: mount.yaw }}
      characterInitDir={mount.yaw}
      // A locked capsule can't tip over; ecctrl turns only the visible model to face the way it
      // walks. Its balancing torque, applied once per rendered frame, could topple the avatar
      // when frames came slowly.
      autoBalance={false}
      {...(cam.locked ? { camUpLimit: cam.pitch, camLowLimit: cam.pitch } : {})}
      // Outside first person the camera is `CameraBoom`'s: ecctrl's rig goes on taking the mouse
      // and the wheel, and its own follow camera and wall test stay out of the way.
      disableFollowCam={!firstPerson}
      camCollision={firstPerson}
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
          <group ref={turn}>
            <PlayerMotionContext.Provider value={motion}>
              {children ?? (
                <mesh material={capsule} castShadow>
                  <capsuleGeometry args={[capsuleRadius, halfHeight * 2, 8, 16]} />
                </mesh>
              )}
            </PlayerMotionContext.Provider>
          </group>
        </group>
      </Dynamic>
      <object3D ref={eyes} position={[0, eyeOffset, 0]} />
      <CameraKeyLook pitchable={!cam.locked} />
      <BodyFacing turn={turn} motion={motion} />
      {firstPerson && <PaniniLens fov={fov} blur={peripheralBlur} />}
      {!firstPerson && (
        <CameraBoom
          body={body}
          model={lift}
          follow={cam.follow}
          lerp={cam.lerp}
          pivotUp={eyeOffset}
          halfHeight={halfHeight}
          radius={capsuleRadius}
        />
      )}
      <MotionProbe body={body} motion={motion} faceCamera={firstPerson} held={pin} />
      <StandOnGround body={body} lift={lift} motion={motion} held={pin} />
      {!grounded && <GroundGuard body={body} onGrounded={() => setGrounded(true)} />}
      <PinDriver body={body} held={pin} centre={halfHeight + capsuleRadius + FLOAT_HEIGHT} />
      <SpeedLimit body={body} limit={speedLimit} held={pin} />
    </Ecctrl>
  )
}

// Mounted wherever the viewer is when a world streams.
Player.stream = false
