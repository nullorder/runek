import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, type RapierRigidBody, RigidBody } from '@react-three/rapier'
import {
  PlayerMotionContext,
  rng,
  sub,
  useWorld,
  type Vec3,
  type WorldComponentProps,
} from '@runek/core'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { type Group, type Object3D, Vector3 } from 'three'
import type { BuiltFigure, Lod } from './person/build'
import {
  type GaitState,
  PhysicsRouteDriver,
  RouteDriver,
  type WalkRoute,
} from './person/RouteDriver'
import { attach, createRig, skinnedMeshes } from './person/rig'
import { buildRoute, type RouteLoop, wanderPoints } from './person/route'
import { figureKey, requestFigure } from './person/scheduler'
import { ARM_SPREAD, shapeFigure } from './person/shape'
import { type PersonSkinName, resolveFigure } from './person/spec'
import type {
  PersonAccessory,
  PersonAge,
  PersonBodySpec,
  PersonBuild,
  PersonDetail,
  PersonFaceSpec,
  PersonFacialHair,
  PersonGarment,
  PersonGender,
  PersonHair,
  PersonHairSpec,
  PersonHat,
  PersonKind,
  PersonOutfit,
  PersonPose,
  PersonSkin,
  PersonStyle,
} from './person/types'
import { Sign } from './Sign'

export { PERSON_SKINS, type PersonSkinName } from './person/spec'
export type {
  PersonAccessory,
  PersonAge,
  PersonBodySpec,
  PersonBuild,
  PersonDetail,
  PersonFaceSpec,
  PersonFacialHair,
  PersonGarment,
  PersonGarmentType,
  PersonGender,
  PersonHair,
  PersonHairSpec,
  PersonHat,
  PersonKind,
  PersonNose,
  PersonOutfit,
  PersonPose,
  PersonSkin,
  PersonStyle,
} from './person/types'

export interface PersonProps extends WorldComponentProps {
  /** Proportion and face template: `stylized` (default) is an animated-film look with a big
   *  head and eyes, small features, and slender limbs; `realistic` keeps canonical human
   *  proportions; `anime` pushes the eyes and legs further. */
  style?: PersonStyle
  /** Role preset: fills `outfit`, `hat`, and `accessories` unless you set them. */
  kind?: PersonKind
  /** Silhouette cues only; every trait it influences stays overridable. Seeded when unset. */
  gender?: PersonGender
  /** Head-to-body ratio, stature, and (for `elder`) a stooped spine. */
  age?: PersonAge
  /** The body: `build`, skin `tone`, and `height`. The flat props below are shorthands for
   *  the same fields; when both are set, this object wins. */
  body?: PersonBodySpec
  /** The face, part by part: eye color and size, brow color and weight, nose shape, lip
   *  color and fullness, blush. */
  face?: PersonFaceSpec
  /** Clothing layers, inner to outer, each with its own type, color, and options. The order
   *  decides the fit: a shirt listed before the jeans is tucked in. Replaces `outfit`; `[]`
   *  is the bare base body (a smooth mannequin). */
  clothes?: PersonGarment[]
  /** Standing height, in units. Every other measurement derives from it. */
  height?: number
  /** Limb thickness and torso depth. Seeded when unset. */
  build?: PersonBuild
  /** Skin color; seeded from a curated set of tones when unset. */
  skinTone?: string
  /** Cosmetic loadout: a preset name from `PERSON_SKINS` (e.g. `"winter"`) or a custom
   *  `PersonSkin` bundle. Individual props win over it. Plain JSON either way, so an editor
   *  or an in-world UI can swap a figure's whole look by writing this one prop. */
  skin?: PersonSkinName | PersonSkin
  /** A style name, or `{ style, color }`. */
  hair?: PersonHair | PersonHairSpec
  hairColor?: string
  facialHair?: PersonFacialHair
  /** One-word outfit; expands to a `clothes` stack (e.g. `tunic`: trousers, tunic, shoes). */
  outfit?: PersonOutfit
  /** Outermost top's color; defaults to a seeded shade of a palette slot. A garment's own
   *  `color` wins over it. */
  topColor?: string
  /** Bottoms' color; defaults to a seeded shade of the palette's `woodDark`, `stone`, or `metal`. */
  bottomColor?: string
  /** Footwear color; defaults to the palette's `metal`. */
  shoeColor?: string
  hat?: PersonHat
  accessories?: PersonAccessory[]
  /** Static joint set. `wave` also animates the raised forearm. */
  pose?: PersonPose
  /** Walk these waypoints, relative to `position` and turning with `rotation`, in units.
   *  Height follows the ground; a waypoint's y lifts the figure above it. */
  patrol?: Vec3[]
  /** Wander a seeded loop of five points within this radius of `position`, in units. `patrol`
   *  wins when both are set. */
  wander?: number
  /** Walking speed, in units per second. Defaults by age: child 1.0, adult 1.3, elder 0.8. */
  speed?: number
  /** Seconds held at each waypoint. Walking always stands; the authored `pose` plays here. */
  pause?: number
  /** `loop` walks from the last waypoint back to the first; `pingpong` retraces the route. */
  loop?: RouteLoop
  /** Walk-cycle speed, in units per second, for a figure something else moves (a cart, a
   *  script). Unset, a route drives it, and a `Player`'s body walks at the avatar's speed. */
  gait?: number
  /** Breathing, weight shift, and blinking. */
  idle?: boolean
  /** Turn the head (and eyes) toward the player's avatar (or the camera, when no `Player` is
   *  mounted) when it comes within `lookRadius`. */
  lookAt?: boolean
  /** How close the avatar must be for `lookAt` to engage, in units. */
  lookRadius?: number
  /** Floating name above the head. */
  label?: string
  /** Capsule collider, so the figure is something you bump into. */
  collider?: boolean
  /** Render as a bare visual with no `RigidBody`: for a parent that owns the physics
   *  (e.g. as `Player`'s third-person avatar). When false, `collider` is ignored. */
  physics?: boolean
  /** `auto` builds the full-detail mesh only within ~10 units of the camera; `high` always;
   *  `low` never. */
  detail?: PersonDetail
}

const WALK_SPEED: Record<PersonAge, number> = { child: 1, adult: 1.3, elder: 0.8 }
/** Walking speed (m/s) at which the walk cycle reaches full swing. */
const CRUISE = 1.3
/** Full detail builds inside LOD_IN units of the camera and drops past LOD_OUT. */
const LOD_IN = 10
const LOD_OUT = 13
const MAX_YAW = 1.2
const MAX_PITCH = 0.4
const EYE_REACH = 0.35

const isInside = (o: Object3D, ancestor: Object3D) => {
  for (let p = o.parent; p; p = p.parent) if (p === ancestor) return true
  return false
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** Keep a build of `lod` while `want` holds; `null` until it's ready. */
function useBuild(
  spec: Parameters<typeof requestFigure>[0],
  key: string,
  lod: Lod,
  want: boolean,
  distance: { current: number },
) {
  const [built, setBuilt] = useState<BuiltFigure | null>(null)
  useEffect(() => {
    if (!want) {
      setBuilt(null)
      return
    }
    let live = true
    const cancel = requestFigure(
      spec,
      key,
      lod,
      () => distance.current,
      (b) => {
        if (live) setBuilt(b)
      },
    )
    return () => {
      live = false
      cancel()
    }
    // `spec` is identified by `key`.
  }, [key, lod, want, distance])
  return built && want ? built : null
}

/**
 * A procedural person: a sculpted, clothed, skinned figure generated from a seed.
 *
 * The body is one continuous surface grown from a few dozen smooth primitives on an 18-bone
 * skeleton (no seams at the joints), with a sculpted face, real eyelids, and eyeballs that
 * follow you. Clothes, hair, and hats are layers over it, each fitted to the body by offsetting
 * its surface, so any garment fits any build, age, or style. Skin weights come from the same
 * primitives, so the whole figure bends as one.
 *
 * Every trait resolves the same way: a part object (`body`, `face`, `hair`, `clothes`) wins, then
 * the flat shorthand prop, then the `skin` bundle, then the `kind` preset, then a seeded roll.
 * So `<Person seed={3} />` is a complete villager and each prop narrows it.
 *
 * `position` is the spawn point. Give it a `patrol` (waypoints) or a `wander` radius and it
 * walks: where it is on the route is a function of the clock and the seed, so every viewer sees
 * it in the same place, and it steps around the player and other walkers in its way. It stands
 * on one capsule collider, kinematic while it walks. Pass `physics={false}` for a bare visual,
 * which is how it becomes `Player`'s third-person body (walking in step with the avatar):
 * `<Player><Person physics={false} height={1.3} position={[0, -0.65, 0]} /></Player>`.
 *
 * Meshes build in the background a few milliseconds per frame, coarse first; the full-detail
 * mesh only builds near the camera. Identical figures share one build.
 */
export function Person({
  position,
  rotation = [0, 0, 0],
  seed = 1,
  style = 'stylized',
  kind = 'villager',
  gender,
  age = 'adult',
  body,
  face,
  clothes,
  height,
  build,
  skinTone,
  skin,
  hair,
  hairColor,
  facialHair,
  outfit,
  topColor,
  bottomColor,
  shoeColor,
  hat,
  accessories,
  pose = 'stand',
  patrol,
  wander,
  speed,
  pause = 1.5,
  loop = 'loop',
  gait,
  idle = true,
  lookAt = true,
  lookRadius = 9,
  label,
  collider = true,
  physics = true,
  detail = 'auto',
}: PersonProps) {
  const { unit, palette, ground, player } = useWorld()
  const avatarMotion = useContext(PlayerMotionContext)
  // A placed figure stands on the world's ground baseline; a bare visual is positioned by
  // whatever parent owns it (a `Player` capsule, a vehicle), so it starts at its own origin.
  const at: Vec3 = position ?? (physics ? [0, ground, 0] : [0, 0, 0])

  const traits = JSON.stringify([
    seed,
    style,
    kind,
    gender,
    age,
    body,
    face,
    clothes,
    height,
    build,
    skinTone,
    skin,
    hair,
    hairColor,
    facialHair,
    outfit,
    topColor,
    bottomColor,
    shoeColor,
    hat,
    accessories,
  ])
  const { spec, motion } = useMemo(
    () =>
      resolveFigure(
        {
          seed,
          style,
          kind,
          gender,
          age,
          body,
          face,
          clothes,
          height,
          build,
          skinTone,
          skin,
          hair,
          hairColor,
          facialHair,
          outfit,
          topColor,
          bottomColor,
          shoeColor,
          hat,
          accessories,
        },
        palette,
        unit,
      ),
    [traits, palette, unit],
  )
  const key = useMemo(() => figureKey(spec), [spec])
  // Joints and landmarks only: cheap, and the same for every level of detail.
  const shape = useMemo(() => shapeFigure(spec), [key])
  const rig = useMemo(() => createRig(shape.joints), [shape])
  const marks = shape.marks

  // The route is node-local geometry like any other: waypoints scale by `unit` and turn with the
  // node. Wander points come from their own seed stream so they don't reshuffle the figure.
  const patrolKey = patrol && JSON.stringify(patrol)
  const route = useMemo<WalkRoute | null>(() => {
    const points = patrol ?? (wander ? wanderPoints(wander, sub(seed, 1)) : undefined)
    if (!points || points.length < 2) return null
    const built = buildRoute(
      points.map(([x, y, z]) => [x * unit, y * unit, z * unit]),
      { speed: (speed ?? WALK_SPEED[age]) * unit, pause, loop },
    )
    if (!built.period) return null
    return { ...built, phase: rng(sub(seed, 2))() * built.period }
  }, [patrolKey, wander, seed, speed, age, pause, loop, unit])

  // ---- level of detail -------------------------------------------------------------------------
  const distance = useRef(Number.POSITIVE_INFINITY)
  const [close, setClose] = useState(false)
  const wantNear = detail === 'high' || (detail === 'auto' && close)
  // The coarse build always comes first (it's quick), so a figure is never missing for long.
  const far = useBuild(spec, key, 'far', true, distance)
  const near = useBuild(spec, key, 'near', wantNear, distance)
  const active = near ?? far

  const meshes = useMemo(() => (active ? skinnedMeshes(active, rig) : null), [active, rig])
  useEffect(() => {
    if (!meshes) return
    for (const m of meshes.meshes) rig.group.add(m)
    return meshes.dispose
  }, [meshes, rig])

  const parts = useMemo(
    () =>
      attach(
        rig,
        shape,
        shape.joints,
        spec.colors.eye,
        spec.colors.skin,
        spec.colors.metal,
        spec.colors.wood,
      ),
    [rig, shape, spec.colors],
  )
  useEffect(() => parts.dispose, [parts])
  const detailed = active?.lod === 'near'
  const shown = active !== null
  useEffect(() => {
    for (const l of parts.lids) l.visible = detailed
    for (const e of parts.eyes) e.visible = shown
    for (const o of parts.props) o.visible = shown
  }, [parts, detailed, shown])

  const root = useRef<Group>(null)
  const nameTag = useRef<Group>(null)
  const nodeFrame = useRef<Group>(null)
  const walker = useRef<Group>(null)
  const facing = useRef<Group>(null)
  const bodyRef = useRef<RapierRigidBody>(null)
  const scratch = useMemo(() => new Vector3(), [])
  const walk = useRef<GaitState>({ speed: 0, distance: 0 })
  // Eased blend weights: `stride` is how far into the walk cycle the limbs are (0 standing, 1
  // full swing); `posed` how far into the authored pose (walking always stands).
  const blend = useRef({ stride: 0, posed: 1 })

  const H = spec.height
  const p = useMemo(() => {
    const sit = pose === 'sit'
    return {
      sit,
      drop: sit ? -(marks.hipY - marks.thigh * 0.92) : 0,
      spineX: motion.stoop + (pose === 'work' ? 0.42 : pose === 'lean' ? -0.14 : sit ? 0.06 : 0),
      armX: pose === 'work' ? -0.7 : sit ? -0.25 : 0,
      armZ: pose === 'lean' ? 0.1 : 0.02,
      elbow: pose === 'work' ? -0.6 : sit ? -0.5 : -0.18,
      thighX: sit ? -Math.PI / 2 : 0,
      shinX: sit ? Math.PI / 2.1 : 0,
      wave: pose === 'wave',
    }
  }, [pose, marks, motion.stoop])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const k = 1 - Math.exp(-7 * dt)
    const b = rig.bones

    if (root.current) {
      distance.current =
        root.current.getWorldPosition(scratch).distanceTo(state.camera.position) / unit
      if (detail === 'auto') {
        if (!close && distance.current < LOD_IN) setClose(true)
        else if (close && distance.current > LOD_OUT) setClose(false)
      }
    }

    // Walking speed comes from the route, else an explicit `gait`, else the carrying `Player`.
    // Off-route, distance is integrated so the stride phase still tracks the feet.
    const w = walk.current
    if (!route) {
      w.speed = gait ?? avatarMotion?.current.speed ?? 0
      w.distance += w.speed * dt
    }
    const bl = blend.current
    const moving = w.speed > 0.05 * unit
    bl.stride += (Math.min(w.speed / (CRUISE * unit), 1) - bl.stride) * (1 - Math.exp(-10 * dt))
    bl.posed += ((moving ? 0 : 1) - bl.posed) * (1 - Math.exp(-8 * dt))
    const s = bl.stride
    const q = bl.posed
    const waving = p.wave && q > 0.5
    // Stride phase from distance walked: one full cycle (two steps) per 0.8 body heights.
    const phase = (w.distance / (0.8 * H)) * Math.PI * 2
    const swing = Math.sin(phase) * s * Math.min(0.3 + 0.2 * (w.speed / unit), 0.7)
    const bob = s * 0.012 * H * (Math.abs(Math.cos(phase)) - 0.6)
    const breath = idle ? Math.sin(t * 1.6 + motion.phase) : 0
    const sway = idle ? Math.sin(t * 0.42 + motion.phase) * (1 - s) : 0

    b.root.position.y = p.drop * q + breath * 0.003 * H + bob
    b.pelvis.rotation.z = sway * 0.022
    const lean = motion.stoop + (p.spineX - motion.stoop) * q + s * 0.05
    b.spine.rotation.x = lean * 0.45
    b.chest.rotation.set(lean * 0.55 + breath * 0.012, swing * 0.18, -sway * 0.012)
    // Opposite arm to leg: an arm swings back as its leg reaches forward.
    b['upperArm.L'].rotation.set(p.armX * q - sway * 0.06 + swing * 0.7, 0, p.armZ - ARM_SPREAD)
    b['foreArm.L'].rotation.set(p.elbow * q - 0.18 * (1 - q) - s * 0.25, 0, 0)
    if (waving) {
      // Upper arm out just above level, forearm raised and rocking at the elbow.
      b['upperArm.R'].rotation.set(-0.25, 0, ARM_SPREAD - 1.75)
      b['foreArm.R'].rotation.set(0, 0, -1.15 - Math.sin(t * 6) * 0.35)
    } else {
      b['upperArm.R'].rotation.set(p.armX * q + sway * 0.06 - swing * 0.7, 0, ARM_SPREAD - p.armZ)
      b['foreArm.R'].rotation.set(p.elbow * q - 0.18 * (1 - q) - s * 0.25, 0, 0)
    }
    // Legs: the thigh swings (negative X is forward), and the knee flexes while that leg travels
    // forward, which is what lifts the foot clear of the ground.
    const knee = (side: number) => s * (0.12 + 0.6 * Math.max(0, Math.cos(phase + side)))
    b['thigh.L'].rotation.x = p.thighX * q - swing
    b['thigh.R'].rotation.x = p.thighX * q + swing
    b['shin.L'].rotation.x = p.shinX * q + knee(0)
    b['shin.R'].rotation.x = p.shinX * q + knee(Math.PI)
    b['foot.L'].rotation.x = -knee(0) * 0.3
    b['foot.R'].rotation.x = -knee(Math.PI) * 0.3

    // Blink: the lid sweeps down over the eye and back.
    if (parts.lids.length) {
      const blink = (t + motion.blinkPhase) % motion.blinkEvery
      const closed = idle && blink < 0.14 ? Math.sin((blink / 0.14) * Math.PI) : 0
      for (const lid of parts.lids) lid.rotation.x = -0.95 + closed * 1.75
    }

    // Head tracking: the target in the head's own parent space gives yaw and pitch directly. The
    // target is the player's avatar when a `Player` is mounted (in third person the camera trails
    // behind it), else the camera. Outside the radius, or behind the shoulder, the head eases back
    // to neutral; the eyes lead the head and cover what it can't. A figure that *is* the avatar's
    // body has nobody to watch.
    const h = b.head
    if (h.rotation.order !== 'YXZ') h.rotation.order = 'YXZ'
    let yaw = idle ? sway * 0.05 : 0
    let pitch = 0
    let wanted = 0
    let tracking = false
    const avatar = player?.current
    const self = avatar?.parent != null && isInside(h, avatar.parent)
    if (lookAt && h.parent && !self) {
      if (avatar) avatar.getWorldPosition(scratch)
      else scratch.copy(state.camera.position)
      h.parent.worldToLocal(scratch).sub(h.position)
      const flat = Math.hypot(scratch.x, scratch.z)
      wanted = Math.atan2(scratch.x, scratch.z)
      if (scratch.length() < lookRadius * unit && Math.abs(wanted) < MAX_YAW + EYE_REACH) {
        tracking = true
        yaw = clamp(wanted, -MAX_YAW, MAX_YAW)
        pitch = clamp(-Math.atan2(scratch.y, flat), -MAX_PITCH, MAX_PITCH)
      }
    }
    h.rotation.y += (yaw - h.rotation.y) * k
    h.rotation.x += (pitch - h.rotation.x) * k
    const eyeYaw = tracking ? clamp(wanted - h.rotation.y, -EYE_REACH, EYE_REACH) : 0
    for (const e of parts.eyes) e.rotation.y += (eyeYaw - e.rotation.y) * Math.min(1, k * 3)

    // Keep the name legible from wherever it's read.
    if (nameTag.current?.parent) {
      scratch.copy(state.camera.position)
      nameTag.current.parent.worldToLocal(scratch)
      nameTag.current.rotation.y = Math.atan2(scratch.x, scratch.z)
    }
  })

  const figure = (
    <group ref={root}>
      <primitive object={rig.group} />
      {label && (
        <group ref={nameTag} position={[0, H + marks.headH * 0.55, 0]}>
          <Sign variant="body" size={0.13} color={palette.accent}>
            {label}
          </Sign>
        </group>
      )}
    </group>
  )

  // One capsule spanning the standing (or seated) body: an obstacle you bump into, not a
  // collider per limb (CONTRACT §5). A walking figure keeps the standing one throughout.
  const seated = p.sit && !route
  const bottom = seated ? H * 0.06 : 0
  const top = H + (seated ? p.drop : 0)
  const radius = Math.min(0.105 * H, (top - bottom) / 2)
  const half = Math.max((top - bottom) / 2 - radius, 0.01 * H)
  const driven = route && {
    route,
    frame: nodeFrame,
    facing,
    gait: walk,
    radius,
    waist: marks.waistY,
    unit,
  }

  if (!physics) {
    return (
      <group ref={nodeFrame} position={at} rotation={rotation}>
        <group ref={walker}>
          <group ref={facing}>{figure}</group>
        </group>
        {driven && (
          <RouteDriver
            {...driven}
            move={(to) => walker.current?.position.copy(nodeFrame.current?.worldToLocal(to) ?? to)}
          />
        )}
      </group>
    )
  }

  // A walking figure's body is kinematic, moved by its route; the node frame it walks in is a
  // bare sibling, since the body itself leaves the spawn point. A standing one stays fixed.
  // `excludeEcctrlRay` keeps the avatar from treating a walker as a moving platform to ride.
  return (
    <>
      {driven && (
        <>
          <group ref={nodeFrame} position={at} rotation={rotation} />
          <PhysicsRouteDriver {...driven} body={bodyRef} />
        </>
      )}
      <RigidBody
        key={driven ? 'walk' : 'stand'}
        ref={bodyRef}
        type={driven ? 'kinematicPosition' : 'fixed'}
        userData={driven ? { excludeEcctrlRay: true } : undefined}
        colliders={false}
        position={at}
        rotation={rotation}
      >
        {collider && (
          <CapsuleCollider args={[half, radius]} position={[0, (top + bottom) / 2, 0]} />
        )}
        <group ref={facing}>{figure}</group>
      </RigidBody>
    </>
  )
}

Person.groundSitting = true
