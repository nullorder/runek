import type { WorldFonts } from './font'
import type { WorldPalette } from './palette'
import type { WorldTime } from './time'

export type Vec3 = [number, number, number]

/** How the player camera frames the avatar. A world default `Player` reads when
 *  its own `view` is unset; an explicit component `view` still wins. */
export type AvatarView = 'first' | 'third'

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
}
