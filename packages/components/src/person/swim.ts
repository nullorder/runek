// Swimming for a figure: strokes written as canonical humanoid poses (relative to the T-pose, so
// one stroke reads the same on every build), how the whole body lies in the water for each, and
// which stroke a speed calls for.
//
// A stroke is authored in the swimmer's own frame, the one its chest stands in: x to its left, y
// up the spine toward the head, z out of the chest. Lying prone that is: y the way it swims, z
// down into the water, -z up out of it.
import { Quaternion, Vector3 } from 'three'
import type { HumanoidBoneName, HumanoidPose } from './humanoid'

/** `tread` holds a still body upright; `breast` and `crawl` carry it along; `streamline` is the
 *  arrow a diver makes, in the air and under the surface; `under` is the long pull and kick of a
 *  swimmer staying down; `climb` gets it out over a wall, hands first. */
export type Stroke = 'tread' | 'breast' | 'crawl' | 'streamline' | 'under' | 'climb'
export const STROKES: readonly Stroke[] = [
  'tread',
  'breast',
  'crawl',
  'streamline',
  'under',
  'climb',
]

/** How a body lies in the water for a stroke, and how fast the stroke turns over. */
export interface StrokeTrim {
  /** How far the body is tipped forward from standing, in radians (a quarter turn lies flat). */
  pitch: number
  /** How far under the surface the body's middle rides, as a part of its height. */
  depth: number
  /** Seconds a cycle takes at `speed` (meters per second). */
  period: (speed: number) => number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

export const STROKE_TRIM: Record<Stroke, StrokeTrim> = {
  // Near upright, the water at the chin.
  tread: { pitch: 0.28, depth: 0.3, period: () => 1.5 },
  // Head up, legs trailing a little under.
  breast: { pitch: 1.3, depth: 0.1, period: (v) => clamp(2 - 0.35 * v, 1.3, 2) },
  // Flat, face in the water.
  crawl: { pitch: 1.47, depth: 0.1, period: (v) => clamp(1.6 - 0.2 * v, 0.9, 1.4) },
  streamline: { pitch: Math.PI / 2, depth: 0.1, period: () => 1.5 },
  // Like the streamline, it lies along the way it moves (`divePitch`). A slow stroke: most of it
  // is glide.
  under: { pitch: Math.PI / 2, depth: 0.1, period: (v) => clamp(2.6 - 0.4 * v, 1.8, 2.6) },
  // Up against the wall, leaning over its top.
  climb: { pitch: 0.2, depth: 0.3, period: () => 1.5 },
}

// A figure on its own swims where the still water is over this much of its height, and stands
// again under the second (the gap keeps one on a sloping beach from flickering). `Player` holds
// its avatar to the same two.
export const SWIM_AT = 0.5
export const STAND_AT = 0.45

/** Where along the body, as a part of its height, it turns as it lies down: about its middle. */
export const SWIM_PIVOT = 0.55
/** The lowest a lying body's middle goes over the ground it would stand on, as a part of its
 *  height: half its thickness. */
export const SWIM_CLEARANCE = 0.14

// Below this speed a swimmer treads water; above the second it swims a crawl, and drops back to
// breaststroke under the third (meters per second).
const MOVING = 0.3
const CRAWL_FROM = 1.9
const CRAWL_UNTIL = 1.7

/** The stroke a swimmer at `speed` (meters per second) takes, given the one it is in. */
export function strokeFor(speed: number, current: Stroke): Stroke {
  if (speed < MOVING) return 'tread'
  if (speed > CRAWL_FROM || (current === 'crawl' && speed > CRAWL_UNTIL)) return 'crawl'
  return 'breast'
}

/** How far a diver is tipped forward, from the way it moves: flat while it flies level, head down
 *  as it falls, and head up again as it comes back to the surface. `speed` is over the ground,
 *  `vertical` positive rising. */
export function divePitch(speed: number, vertical: number, unit = 1) {
  return clamp(Math.PI / 2 + Math.atan2(-vertical, Math.max(speed, 0.5 * unit)), 0.35, 2.9)
}

const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)
const LEFT = new Vector3(1, 0, 0)
const RIGHT = new Vector3(-1, 0, 0)
const t = {
  upper: new Vector3(),
  fore: new Vector3(),
  toward: new Vector3(),
  pole: new Vector3(),
  local: new Vector3(),
  q: new Quaternion(),
}

const ARM: Record<1 | -1, [HumanoidBoneName, HumanoidBoneName, HumanoidBoneName]> = {
  1: ['leftUpperArm', 'leftLowerArm', 'leftHand'],
  [-1]: ['rightUpperArm', 'rightLowerArm', 'rightHand'],
}
const LEG: Record<1 | -1, [HumanoidBoneName, HumanoidBoneName, HumanoidBoneName]> = {
  1: ['leftUpperLeg', 'leftLowerLeg', 'leftFoot'],
  [-1]: ['rightUpperLeg', 'rightLowerLeg', 'rightFoot'],
}

/** Point an arm: the upper arm along `upper` and the forearm along `fore`, both in the chest's
 *  frame, with the hand rolled about the forearm by `roll`. */
function arm(pose: HumanoidPose, side: 1 | -1, upper: Vector3, fore: Vector3, roll = 0) {
  const [upperArm, lowerArm, hand] = ARM[side]
  const rest = side > 0 ? LEFT : RIGHT
  const shoulder = pose.rotations[upperArm].setFromUnitVectors(rest, upper.normalize())
  // The elbow's bend is the forearm's line as the upper arm sees it.
  t.local.copy(fore).normalize().applyQuaternion(t.q.copy(shoulder).invert())
  pose.rotations[lowerArm].setFromUnitVectors(rest, t.local)
  // About x for both hands, which is the same turn seen in a mirror.
  pose.rotations[hand].setFromAxisAngle(X, roll)
}

/** Set a leg: the thigh drawn up toward the belly by `flex` and out to the side by `spread`,
 *  the knee bent by `knee`, the toes pointed by `point` (all radians). */
function leg(
  pose: HumanoidPose,
  side: 1 | -1,
  flex: number,
  spread: number,
  knee: number,
  point: number,
) {
  const [upperLeg, lowerLeg, foot] = LEG[side]
  pose.rotations[upperLeg]
    .setFromAxisAngle(Z, side * spread)
    .multiply(t.q.setFromAxisAngle(X, -flex))
  pose.rotations[lowerLeg].setFromAxisAngle(X, knee)
  pose.rotations[foot].setFromAxisAngle(X, point)
}

const smooth = (v: number) => {
  const c = clamp(v, 0, 1)
  return c * c * (3 - 2 * c)
}
/** 0 until `from`, up to 1 at `peak`, back to 0 by `to`, eased both ways. */
const bump = (u: number, from: number, peak: number, to: number) =>
  u < peak ? smooth((u - from) / (peak - from)) : 1 - smooth((u - peak) / (to - peak))

function tread(pose: HumanoidPose, phase: number) {
  // Both hands scull out and back in together, just under the surface.
  const sweep = Math.sin(phase)
  for (const side of [1, -1] as const) {
    arm(
      pose,
      side,
      t.upper.set(side * (0.72 + 0.14 * sweep), -0.42, 0.52 - 0.1 * sweep),
      t.fore.set(side * (0.35 + 0.45 * sweep), -0.05, 0.9),
      0.5 * Math.cos(phase),
    )
    // The legs turn over one after the other, knees wide.
    const turn = phase + (side > 0 ? 0 : Math.PI)
    leg(
      pose,
      side,
      0.45 + 0.35 * Math.sin(turn),
      0.28 + 0.08 * Math.cos(turn),
      0.9 + 0.45 * Math.sin(turn - 1.2),
      0.5,
    )
  }
  pose.rotations.spine.setFromAxisAngle(X, 0.08)
  pose.rotations.head.setFromAxisAngle(X, -0.12)
}

function breast(pose: HumanoidPose, phase: number) {
  const u = (((phase / (Math.PI * 2)) % 1) + 1) % 1
  // A glide with the arms ahead, a sweep out and down, the hands tucked in under the chin as the
  // head comes up for air, then a shoot forward while the legs kick.
  const out = bump(u, 0.2, 0.42, 0.6)
  const tuck = bump(u, 0.42, 0.6, 0.8)
  const reach = 1 - out - tuck
  // The heels come up as the hands tuck in; the legs whip out and close as the arms shoot.
  const draw = bump(u, 0.46, 0.66, 0.8)
  const wide = bump(u, 0.5, 0.7, 0.86)
  for (const side of [1, -1] as const) {
    arm(
      pose,
      side,
      t.upper.set(
        side * (0.1 * reach + 0.9 * out + 0.55 * tuck),
        reach + 0.42 * out - 0.35 * tuck,
        0.08 * reach + 0.35 * out + 0.75 * tuck,
      ),
      t.fore.set(
        side * (0.02 * reach + 0.7 * out - 0.5 * tuck),
        reach + 0.15 * out + 0.82 * tuck,
        0.05 * reach + 0.7 * out + 0.3 * tuck,
      ),
      0.7 * out,
    )
    leg(pose, side, 0.6 * draw, 0.03 + 0.5 * wide, 1.9 * draw, 0.9 - 1.25 * draw)
  }
  // The pull lifts the shoulders: the whole body tips up about the hips and the back arches.
  pose.rotations.hips.setFromAxisAngle(X, -0.14 * tuck)
  pose.rotations.chest.setFromAxisAngle(X, -0.12 - 0.2 * tuck)
  pose.rotations.neck.setFromAxisAngle(X, -0.2 - 0.1 * tuck)
  pose.rotations.head.setFromAxisAngle(X, -0.35 - 0.2 * tuck)
}

function crawl(pose: HumanoidPose, phase: number) {
  for (const side of [1, -1] as const) {
    // Each arm goes round like a wheel: in ahead of the head, down under the body, back to the
    // hip, and forward again over the water with the elbow high. The left arm leads by half a
    // turn.
    const turn = phase + (side > 0 ? 0 : Math.PI)
    const sin = Math.sin(turn)
    const cos = Math.cos(turn)
    const pull = Math.max(sin, 0)
    const recover = Math.max(-sin, 0)
    t.upper.set(side * (0.16 + 0.42 * recover), cos, sin * (1 - 0.25 * recover)).normalize()
    // Under water the forearm leads the pull; over it, it hangs from the elbow.
    if (sin >= 0) t.toward.set(-side * 0.25, -sin, cos)
    else t.toward.set(-side * 0.15, -0.3, 1)
    t.toward.addScaledVector(t.upper, -t.toward.dot(t.upper)).normalize()
    const bend = 0.12 + 0.75 * pull + 1.25 * recover
    t.fore.copy(t.upper).multiplyScalar(Math.cos(bend)).addScaledVector(t.toward, Math.sin(bend))
    arm(pose, side, t.upper, t.fore)
    // A flutter kick, three beats to an arm cycle.
    const beat = phase * 3 + (side > 0 ? 0 : Math.PI)
    leg(
      pose,
      side,
      0.05 + 0.22 * Math.sin(beat),
      0.03,
      0.15 + 0.22 * (0.5 - 0.5 * Math.sin(beat + 0.6)),
      0.95,
    )
  }
  // The body rolls toward the arm that pulls, lifting the shoulder that recovers.
  const roll = -0.42 * Math.sin(phase)
  pose.rotations.hips.setFromAxisAngle(Y, 0.2 * roll)
  pose.rotations.spine.setFromAxisAngle(Y, 0.45 * roll)
  pose.rotations.chest.setFromAxisAngle(Y, 0.55 * roll)
  pose.rotations.neck.setFromAxisAngle(X, -0.1)
  // The head stays down against the roll and turns left for air as the left arm recovers.
  const u = (((phase / (Math.PI * 2)) % 1) + 1) % 1
  const breath = bump(u, 0.5, 0.74, 0.98)
  pose.rotations.head
    .setFromAxisAngle(Y, -0.9 * roll + 1.25 * breath)
    .multiply(t.q.setFromAxisAngle(X, -0.15))
}

function streamline(pose: HumanoidPose) {
  for (const side of [1, -1] as const) {
    arm(pose, side, t.upper.set(side * 0.1, 1, 0.04), t.fore.set(0, 1, 0.02))
    leg(pose, side, 0, 0.02, 0.03, 1)
  }
  pose.rotations.head.setFromAxisAngle(X, 0.1)
}

function under(pose: HumanoidPose, phase: number) {
  const u = (((phase / (Math.PI * 2)) % 1) + 1) % 1
  // A glide with the arms ahead, one long pull out and round to the thighs, a glide with them
  // there, then the hands slide back up under the chest as the legs kick.
  const recovering = u > 0.62
  const sweep = (smooth((u - 0.15) / 0.3) - smooth((u - 0.62) / 0.3)) * Math.PI
  const sin = Math.sin(sweep)
  const cos = Math.cos(sweep)
  const draw = bump(u, 0.66, 0.8, 0.94)
  const wide = bump(u, 0.72, 0.86, 0.98)
  for (const side of [1, -1] as const) {
    if (recovering) {
      // Close to the body, elbows bent, the hands leading up the middle.
      t.upper.set(side * (0.12 + 0.33 * sin), cos, 0.08 + 0.47 * sin)
      t.fore.set(side * (0.05 - 0.3 * sin), cos + 0.9 * sin, 0.05 + 0.45 * sin)
    } else {
      // Wide, the arms nearly straight.
      t.upper.set(side * (0.12 + 0.88 * sin), cos, 0.08 + 0.2 * sin)
      t.fore.set(side * (0.05 + 0.7 * sin), cos - 0.25 * sin, 0.05 + 0.45 * sin)
    }
    arm(pose, side, t.upper, t.fore, recovering ? 0 : 0.5 * sin)
    leg(pose, side, 0.55 * draw, 0.03 + 0.5 * wide, 1.8 * draw, 0.9 - 1.25 * draw)
  }
  // Looking the way it goes.
  pose.rotations.chest.setFromAxisAngle(X, -0.08)
  pose.rotations.head.setFromAxisAngle(X, -0.3)
}

// A figure's rough proportions, as parts of its height: enough to put its hands on a ledge.
const SHOULDER = 0.81
const UPPER_ARM = 0.16
const FORE_ARM = 0.21
/** How far ahead of the body its hands come down on the top of a wall, as a part of its height. */
const HANDS_OUT = 0.26

/** Getting out over a wall whose top is `left` body heights over the feet: the arms reach up for
 *  it, the hands stay on it and press down as the body rises past, a knee comes up onto it, and
 *  the body stands. */
function climb(pose: HumanoidPose, left: number) {
  const up = clamp(left, 0, 1.6)
  // The hands let go as the feet come level with the top.
  const hold = smooth(up / 0.3)
  const reach = smooth((up - 0.9) / 0.4)
  const press = bump(up, 0.2, 0.55, 1)
  const knee = bump(up, 0.04, 0.3, 0.62)
  // Still in the water, the legs hang with the knees a little bent.
  const hang = smooth((up - 0.6) / 0.3)
  // The back bends over the wall as the arms press; the hands are found in the frame of the
  // chest, which leans with it.
  const lean = STROKE_TRIM.climb.pitch + 0.3 * press
  const sin = Math.sin(lean)
  const cos = Math.cos(lean)
  const y = up - SHOULDER
  const ty = y * cos + HANDS_OUT * sin
  const tz = HANDS_OUT * cos - y * sin
  for (const side of [1, -1] as const) {
    // Shoulder to hand, bent at the elbow by what the two bones leave over, the elbow out to
    // the side and back.
    const far = Math.hypot(0.02, ty, tz)
    const d = clamp(far, FORE_ARM - UPPER_ARM + 0.01, UPPER_ARM + FORE_ARM - 0.005)
    t.toward.set(side * 0.02, ty, tz).divideScalar(far)
    t.pole.set(side * 0.7, -0.4, -0.6)
    t.pole.addScaledVector(t.toward, -t.pole.dot(t.toward)).normalize()
    const bend = Math.acos(
      clamp((UPPER_ARM ** 2 + d * d - FORE_ARM ** 2) / (2 * UPPER_ARM * d), -1, 1),
    )
    t.upper.copy(t.toward).multiplyScalar(Math.cos(bend)).addScaledVector(t.pole, Math.sin(bend))
    t.fore.copy(t.toward).multiplyScalar(d).addScaledVector(t.upper, -UPPER_ARM)
    // Let go, the arms come down to the sides.
    t.upper.lerp(t.local.set(side * 0.14, -1, 0.05), 1 - hold)
    t.fore.normalize().lerp(t.local.set(side * 0.05, -1, 0.18), 1 - hold)
    arm(pose, side, t.upper, t.fore, 0.4 * hold * (1 - reach))
  }
  // The left knee goes up onto the top; the right leg trails and pushes.
  leg(pose, 1, 1.45 * knee + 0.2 * hang, 0.1 * knee, 1.9 * knee + 0.4 * hang, 0.2 + 0.6 * hang)
  leg(pose, -1, 0.1 * hang - 0.15 * knee, 0.03, 0.3 * knee + 0.25 * hang, 0.3 + 0.5 * hang)
  pose.rotations.spine.setFromAxisAngle(X, 0.12 * press)
  pose.rotations.chest.setFromAxisAngle(X, 0.18 * press)
  // Up at the top it is reaching for, then down at where the knee is going.
  pose.rotations.head.setFromAxisAngle(X, 0.2 * press - 0.4 * reach)
}

/** Write `stroke` at `phase` (radians, one cycle per turn) over `pose`. `climb` is not a cycle:
 *  its `phase` is how far the top of the wall still is over the feet, in body heights. `pose`
 *  must come in reset to the T-pose: a stroke sets only the bones it moves. */
export function strokePose(stroke: Stroke, phase: number, pose: HumanoidPose) {
  if (stroke === 'tread') tread(pose, phase)
  else if (stroke === 'breast') breast(pose, phase)
  else if (stroke === 'crawl') crawl(pose, phase)
  else if (stroke === 'under') under(pose, phase)
  else if (stroke === 'climb') climb(pose, phase)
  else streamline(pose)
}
