import type { RefObject } from 'react'
import type { Object3D } from 'three'
import type { WorldFonts } from './font'
import type { WorldControls } from './keyboard'
import type { Lens } from './lens'
import type { WorldPalette } from './palette'
import type { WorldTime } from './time'

export type Vec3 = [number, number, number]

/** How the player camera frames the avatar: through its eyes, from behind it, or from high
 *  above (a map-like view that still follows it). A world default `Player` reads when its own
 *  `view` is unset; an explicit component `view` still wins. */
export type AvatarView = 'first' | 'third' | 'overhead'

/** The contract every Runek component implements. */
export interface WorldComponentProps {
  position?: Vec3
  rotation?: Vec3
  seed?: number
}

/** Linear distance fog over the whole world. */
export interface WorldFog {
  color: string
  /** Distance where the fog starts, in units. */
  near: number
  /** Distance where the fog fully obscures, in units. */
  far: number
}

/** A figure walking a route, published so other walkers can step around it. Its world X and Z
 *  are written in place every frame (the route's base position, before any detour). */
export interface Walker {
  x: number
  z: number
  /** Body radius, in world units. */
  radius: number
}

/** Something offering the player actions (`useInteraction`): its distance to the avatar, or
 *  `Infinity` out of range. Written in place every frame. */
export interface Interactor {
  distance: number
}

/** The avatar's live motion, published by `Player` to the body it carries and to app code
 *  (`useWorld().playerMotion`), in every view. Written in place after every physics step, so a
 *  body posed in the same frame strides with that frame's distance. Plain numbers, so net code
 *  can send it as it is and feed a remote copy through `PlayerMotionContext`. */
export interface PlayerMotion {
  /** Horizontal speed, in world units per second. */
  speed: number
  /** Horizontal distance covered since the avatar spawned, in world units: what a stride's phase
   *  follows, so feet stay planted at any speed. */
  distance: number
  /** Vertical speed, in world units per second, positive rising. */
  vertical: number
  /** Standing on something (the controller's ground test). False from take-off to landing. */
  grounded: boolean
  /** Which way the body faces, in radians (0 faces +z, as `Player`'s `yaw`). It turns toward the
   *  direction of travel and holds when the avatar stops; in first person at rest it turns to
   *  the camera. */
  heading: number
  /** Where the camera looks relative to the body: yaw in radians, positive toward the body's
   *  left (+x when it faces +z). */
  lookYaw: number
  /** The camera's pitch in radians, positive looking up. */
  lookPitch: number
}

/** How `PlayerControl.teleport` lands the avatar. */
export interface TeleportOptions {
  /** Face this way on arrival, camera and body: yaw in radians (0 faces +z), as `Player`'s
   *  `yaw`. Unset keeps the current heading. */
  yaw?: number
  /** Carry the avatar's velocity through the jump. Default false: it arrives at rest. */
  keepVelocity?: boolean
}

/** Imperative handle on the player's avatar, published by `Player` while one is mounted. Safe to
 *  call from anywhere, including outside the canvas (a network message, a UI button). */
export interface PlayerControl {
  /** Move the avatar's body to `position`, in world coordinates (where `Player`'s `position` puts
   *  it). The camera moves with it, so the view doesn't sweep across the world. */
  teleport(position: Vec3, options?: TeleportOptions): void
}

export interface WorldContextValue {
  /** Meters per unit. Components scale their geometry by this. */
  unit: number
  gravity: Vec3
  /** Baseline ground level (Y, in world units). Floor-sitting and water components
   *  default their placement to it; an explicit `position` wins. Default 0. */
  ground: number
  /** Resolved color slots components default their materials to. */
  palette: WorldPalette
  /** Resolved font roles (display, body) text components draw from. Every role
   *  is filled (the world's overrides over the bundled default), so a text
   *  component can read `fonts[role]` unconditionally. */
  fonts: WorldFonts
  /** Resolved time-of-day. Day/night-aware components (`Sky`, `LightRig`,
   *  `Clock`) read this; defaults to a pinned midday. */
  time: WorldTime
  /** World default camera view for the player, if the world declares one. */
  avatar?: AvatarView
  /** Resolved input bindings (action → `KeyboardEvent.code`s): the world's
   *  `controls` over the defaults, or derived from an explicit `keyboardMap`.
   *  Components can read it to consume or display the actual bindings. */
  controls: WorldControls
  /** The player's avatar, published by `Player` while one is mounted (`null` otherwise).
   *  A mutable ref, not state: read `player.current` inside `useFrame` for where the
   *  player *is*, which in third person is not where the camera is. Absent under a
   *  hand-rolled provider, where components fall back to the camera. */
  player?: RefObject<Object3D | null>
  /** Teleport handle for the player's avatar, set by `Player` while one is mounted (`null`
   *  otherwise). A ref, so app code can keep it and call `playerControl.current?.teleport(...)`
   *  later, from outside React. Absent under a hand-rolled provider. */
  playerControl?: RefObject<PlayerControl | null>
  /** The avatar's live motion (speed, distance, vertical speed, grounded, heading, look), set by
   *  `Player` while one is mounted (`null` otherwise) and written in place, so net code can keep
   *  the ref and read `playerMotion.current` whenever it sends. Absent under a hand-rolled
   *  provider. */
  playerMotion?: RefObject<PlayerMotion | null>
  /** The curved projection the screen is drawn through, set by a `Player` with a wide
   *  first-person view (`null` while the camera's own flat projection is used). Read
   *  `lens.current` per frame, or use `useLensPosition` for `<Html>` labels. Absent under a
   *  hand-rolled provider. */
  lens?: RefObject<Lens | null>
  /** Every figure currently walking a route. Mutable, not state: add yourself on mount, remove
   *  on unmount, and read it inside `useFrame`. Absent under a hand-rolled provider. */
  walkers?: Set<Walker>
  /** Everything currently offering the player actions; the nearest in range is focused. Mutable,
   *  like `walkers`. Absent under a hand-rolled provider. */
  interactions?: Set<Interactor>
  /** The world's keyboard: window key events the world reads, so none aimed at a text field and
   *  none while `input` is off or the world is paused. Listen for `keydown` / `keyup`. Absent
   *  under a hand-rolled provider. */
  keyboard?: EventTarget
  /** The world's wall clock, in epoch milliseconds: `<World now>`, or `Date.now`. Read it for
   *  anything that moves or tells time by the wall clock (routes, trips, live day/night, clock
   *  hands), so viewers whose own clocks disagree still see the same world. Stable across
   *  renders. A hand-rolled provider may leave it out: fall back to `Date.now`. */
  now?: () => number
}
