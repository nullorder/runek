import { useFrame } from '@react-three/fiber'
import { type RapierRigidBody, useRapier } from '@react-three/rapier'
import { useGround, useWorld, type Walker } from '@runek/core'
import { type RefObject, useEffect, useMemo, useRef } from 'react'
import { type Object3D, Vector3 } from 'three'
import type { Route } from './route'

/** A route plus the seconds added to the wall clock to sample it: a seeded offset into a cycle,
 *  so figures sharing a route don't march in step, or minus the departure time for a trip. */
export interface WalkRoute extends Route {
  phase: number
}

/** What the driver tells the body each frame: how fast it moves and how far it has walked. */
export interface GaitState {
  speed: number
  distance: number
}

/** True when something solid lies within `reach` of `from` along the horizontal (dx, dz). */
export type SideCheck = (from: Vector3, dx: number, dz: number, reach: number) => boolean

export interface RouteDriverProps {
  route: WalkRoute
  /** The node's own frame (spawn point + rotation); waypoints are local to it. */
  frame: RefObject<Object3D | null>
  /** Put the figure's origin at this world point. */
  move: (world: Vector3) => void
  /** Turned toward the heading, in the node frame. */
  facing: RefObject<Object3D | null>
  gait: { current: GaitState }
  /** Body radius and the height side checks run at, in world units. */
  radius: number
  waist: number
  unit: number
  blocked?: SideCheck
  /** Called once when a trip is over, on the first frame it is (even if that was long ago). */
  onArrive?: () => void
}

// How far ahead a walker looks for someone in its way, and the gap it keeps (in meters).
const LOOK_AHEAD = 2.5
const MARGIN = 0.25
const MAX_DETOUR = 1.6
const AVATAR_RADIUS = 0.3
// Route seconds a held-up figure makes back per second, once the way clears.
const CATCH_UP = 0.25
// Seconds between side checks while a detour holds.
const RECHECK = 0.2
// Closest a walker lets itself come to the avatar beyond touching: a kinematic body never gives
// way, so walking into the player would shove it (into the ground, on a slope).
const PERSONAL_SPACE = 0.1

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/**
 * Walk a figure along its route. The base position is the route sampled at wall-clock time, so
 * every viewer agrees on it; height follows the ground under it (relative to the spawn point, so a
 * figure placed on a deck the ground index doesn't know stays on it). Detours ride on top: the
 * figure arcs around the avatar and other walkers ahead, passing on the right when head-on, and
 * stops (falling behind its clock, then catching up) only when both sides are blocked.
 */
export function RouteDriver({
  route,
  frame,
  move,
  facing,
  gait,
  radius,
  waist,
  unit,
  blocked,
  onArrive,
}: RouteDriverProps) {
  const { player, walkers } = useWorld()
  const groundAt = useGround()
  const self = useMemo<Walker>(() => ({ x: 0, z: 0, radius }), [radius])
  const state = useRef({
    lag: 0,
    offset: 0,
    target: 0,
    checked: 0,
    started: false,
    arrived: null as Route | null,
  })
  const last = useMemo(() => new Vector3(), [])
  const v = useMemo(
    () => ({
      spawn: new Vector3(),
      at: new Vector3(),
      dir: new Vector3(),
      other: new Vector3(),
      avatar: new Vector3(),
    }),
    [],
  )

  useEffect(() => {
    if (!walkers) return
    walkers.add(self)
    return () => {
      walkers.delete(self)
    }
  }, [walkers, self])

  useFrame((_, delta) => {
    const node = frame.current
    if (!node) return
    const dt = Math.min(delta, 0.1)
    const s = state.current
    const t = Date.now() / 1000 + route.phase - s.lag
    const p = route.sample(t)

    node.updateWorldMatrix(true, false)
    v.spawn.setFromMatrixPosition(node.matrixWorld)
    v.at.set(p.x, p.y, p.z)
    node.localToWorld(v.at)
    self.x = v.at.x
    self.z = v.at.z

    v.dir.set(Math.sin(p.heading), 0, Math.cos(p.heading)).transformDirection(node.matrixWorld)
    v.dir.y = 0
    v.dir.normalize()
    const dx = v.dir.x
    const dz = v.dir.z

    // The obstacle that needs the widest berth: its lateral position (right is +), the gap to
    // keep, and whether it's close enough that a blocked detour means stopping.
    let want = 0
    let side = 0
    let clear = 0
    let weight = 0
    let close = false
    const consider = (ox: number, oz: number, oradius: number) => {
      const rx = ox - v.at.x
      const rz = oz - v.at.z
      const ahead = rx * dx + rz * dz
      const lateral = -rx * dz + rz * dx
      const gap = radius + oradius + MARGIN * unit
      const reach = LOOK_AHEAD * unit
      if (Math.abs(lateral) >= gap || ahead > reach || ahead < -gap) return
      // Full berth by the time it draws level, released once it's a body length past.
      const w = ahead > gap ? (reach - ahead) / (reach - gap) : ahead >= 0 ? 1 : 1 + ahead / gap
      const ease = w * w * (3 - 2 * w)
      const o = (lateral > 0.15 * gap ? lateral - gap : lateral + gap) * ease
      if (Math.abs(o) > Math.abs(want)) {
        want = o
        side = lateral
        clear = gap
        weight = ease
        close = ahead < gap + 0.3 * unit
      }
    }
    const avatar = player?.current
    if (avatar) avatar.getWorldPosition(v.avatar)
    if (p.speed > 0) {
      if (avatar) consider(v.avatar.x, v.avatar.z, AVATAR_RADIUS * unit)
      if (walkers) for (const w of walkers) if (w !== self) consider(w.x, w.z, w.radius)
    }

    let target = Math.min(Math.max(want, -MAX_DETOUR * unit), MAX_DETOUR * unit)
    let hold = false
    if (blocked && Math.abs(target) > 0.05 * unit) {
      s.checked -= dt
      if (s.checked <= 0 || Math.sign(target) !== Math.sign(s.target)) {
        s.checked = RECHECK
        v.other.set(v.at.x, v.at.y + waist, v.at.z)
        const sign = Math.sign(target)
        if (blocked(v.other, -dz * sign, dx * sign, Math.abs(target) + radius)) {
          const alt = (target > 0 ? side - clear : side + clear) * weight
          const altSign = Math.sign(alt)
          target = blocked(v.other, -dz * altSign, dx * altSign, Math.abs(alt) + radius) ? 0 : alt
          hold = target === 0 && close
        }
        s.target = target
      } else {
        target = s.target
        hold = target === 0 && close
      }
    } else {
      s.target = target
    }

    s.offset += (target - s.offset) * (1 - Math.exp(-5 * dt))
    v.at.x += -dz * s.offset
    v.at.z += dx * s.offset
    v.at.y += groundAt(v.at.x, v.at.z) - groundAt(v.spawn.x, v.spawn.z)

    // Never step into the avatar: if this frame would close on it inside touching range, stay
    // put and let the route clock fall behind instead.
    if (avatar && s.started) {
      const touch = radius + (AVATAR_RADIUS + PERSONAL_SPACE) * unit
      const next = Math.hypot(v.at.x - v.avatar.x, v.at.z - v.avatar.z)
      const now = Math.hypot(last.x - v.avatar.x, last.z - v.avatar.z)
      if (next < touch && next < now) {
        hold = true
        v.at.copy(last)
      }
    }
    // Held time is real frame time, not the clamped step, so the route can't creep on while held.
    s.lag = hold ? s.lag + delta : Math.max(0, s.lag - CATCH_UP * dt)
    last.copy(v.at)
    move(v.at)

    const f = facing.current
    if (f) {
      if (!s.started) f.rotation.y = p.heading
      else f.rotation.y += wrap(p.heading - f.rotation.y) * (1 - Math.exp(-6 * dt))
    }
    s.started = true
    gait.current.speed = hold ? 0 : p.speed
    gait.current.distance = p.distance

    if (route.once && t >= route.period && s.arrived !== route) {
      s.arrived = route
      onArrive?.()
    }
  })

  return null
}

/** `RouteDriver` for a figure with its own kinematic body: it moves the body, and checks the
 *  side it steps to against the physics world. */
export function PhysicsRouteDriver({
  body,
  ...props
}: Omit<RouteDriverProps, 'move' | 'blocked'> & { body: RefObject<RapierRigidBody | null> }) {
  const { world, rapier } = useRapier()
  const move = useMemo(() => (at: Vector3) => body.current?.setNextKinematicTranslation(at), [body])
  const blocked = useMemo<SideCheck>(
    () => (from, dx, dz, reach) => {
      const ray = new rapier.Ray(from, { x: dx, y: 0, z: dz })
      // Static geometry only: people in the way are the detour's business, and a ray starting
      // inside the avatar would call both sides blocked.
      const flags = rapier.QueryFilterFlags.ONLY_FIXED | rapier.QueryFilterFlags.EXCLUDE_SENSORS
      return world.castRay(ray, reach, true, flags) !== null
    },
    [world, rapier],
  )
  return <RouteDriver {...props} move={move} blocked={blocked} />
}
