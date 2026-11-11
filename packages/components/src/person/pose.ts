// Outside motion for a figure: a source that fills a canonical pose each frame in place of the
// built-in gait (a clip library, motion matching, poses off the network).
import { createContext } from 'react'
import type { HumanoidPose } from './humanoid'

/** What a figure knows about its motion each frame, handed to its pose source. Distances and
 *  speeds are in world units; angles in radians. */
export interface PoseContext {
  /** Seconds since the last frame. */
  dt: number
  /** Ground speed: the route's, the `gait` prop's, or the carrying `Player`'s. */
  speed: number
  /** Distance walked, the stride's phase. On a figure with its own body it is where the drawn body
   *  has got to, a frame behind its route, so a stride driven by it keeps the feet planted. */
  distance: number
  /** On the ground (false while a carrying `Player` is in the air). */
  grounded: boolean
  /** Vertical speed, positive rising. */
  vertical: number
  /** Which way the body faces in the world (0 faces +z). */
  heading: number
  /** Where the figure looks relative to its body: yaw, positive toward its left. A `Player`'s
   *  body looks where the camera looks; another figure at the avatar it is watching, else ahead. */
  lookYaw: number
  /** Pitch, positive looking up. */
  lookPitch: number
  /** Hip height above the soles: scale strides and the pose's `hips` offset by it. */
  legLength: number
  /** Standing height. */
  height: number
}

/**
 * Motion for a `Person` from outside its built-in gait. Each frame `update` gets the figure's
 * motion and a pose reset to the T-pose; fill it and return true, or return false to leave the
 * figure to its own gait that frame. An authored `pose` (sitting, waving, drinking) and the head
 * turning to look still play over it.
 */
export interface PoseSource {
  update(ctx: PoseContext, out: HumanoidPose): boolean
  /** Called when a figure lets go of a source it made with a `PoseSourceContext` factory. */
  dispose?(): void
}

/** Makes a figure's own `PoseSource`. */
export type PoseSourceFactory = (figure: { seed: number }) => PoseSource

/** A pose source for every `Person` below it without a `poseSource` of its own: each figure calls
 *  the factory once and keeps what it returns until the factory changes. */
export const PoseSourceContext = createContext<PoseSourceFactory | null>(null)
