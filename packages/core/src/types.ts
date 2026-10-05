import type { RefObject } from 'react'
import type { Object3D } from 'three'
import type { WorldFonts } from './font'
import type { WorldControls } from './keyboard'
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

/** What `Player` publishes to its children (its third-person body): live motion, written in
 *  place every frame. */
export interface PlayerMotion {
  /** Horizontal speed, in world units per second. */
  speed: number
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
}
