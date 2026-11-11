// A canonical humanoid skeleton over a rig: bones named as in VRM 1.0, and a pose language that
// means the same on any of them. A canonical local rotation is relative to a world-aligned T-pose
// facing +Z (arms out along ±X, palms down, legs straight down), so the identity pose is that
// T-pose whatever the rig's own bone frames or proportions, and one authored pose reads the same
// on every figure.
import { type Object3D, Quaternion, Vector3 } from 'three'

/** The VRM 1.0 humanoid names a pose can drive: the required bones plus chest, upper chest,
 *  neck, shoulders, and toes. A rig answers the names it has bones for. */
export const HUMANOID_BONES = [
  'hips',
  'spine',
  'chest',
  'upperChest',
  'neck',
  'head',
  'leftShoulder',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightShoulder',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'leftToes',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot',
  'rightToes',
] as const
export type HumanoidBoneName = (typeof HUMANOID_BONES)[number]

/** Each name's parent in the VRM hierarchy. */
export const HUMANOID_PARENT: Record<HumanoidBoneName, HumanoidBoneName | null> = {
  hips: null,
  spine: 'hips',
  chest: 'spine',
  upperChest: 'chest',
  neck: 'upperChest',
  head: 'neck',
  leftShoulder: 'upperChest',
  leftUpperArm: 'leftShoulder',
  leftLowerArm: 'leftUpperArm',
  leftHand: 'leftLowerArm',
  rightShoulder: 'upperChest',
  rightUpperArm: 'rightShoulder',
  rightLowerArm: 'rightUpperArm',
  rightHand: 'rightLowerArm',
  leftUpperLeg: 'hips',
  leftLowerLeg: 'leftUpperLeg',
  leftFoot: 'leftLowerLeg',
  leftToes: 'leftFoot',
  rightUpperLeg: 'hips',
  rightLowerLeg: 'rightUpperLeg',
  rightFoot: 'rightLowerLeg',
  rightToes: 'rightFoot',
}

/** One rig bone under its humanoid name. Its local rotation for a canonical local rotation `c`
 *  is `pre · c · post`: `post` is the bone's own rotation (in the rig's frame) when the rig stands
 *  in the canonical T-pose, `pre` the inverse of its parent's. */
export interface HumanoidBone {
  bone: Object3D
  pre: Quaternion
  post: Quaternion
  /** The bone's local position at rest, where a pose's `hips` offset is measured from. */
  rest: Vector3
}

/** A rig's bones by humanoid name, for the names it has. */
export type Humanoid = Partial<Record<HumanoidBoneName, HumanoidBone>>

/**
 * A canonical pose: every humanoid bone's local rotation relative to the T-pose, plus how far the
 * hips sit from their rest position, in the rig's frame and in its units (scale it by the
 * figure, e.g. by `legLength`, for poses authored on another body). Names a rig lacks fold into
 * the nearest bone it has below them (an `upperChest` turn carries the neck and both arms on a rig
 * without one), and leaves such as `leftToes` drop out.
 */
export interface HumanoidPose {
  rotations: Record<HumanoidBoneName, Quaternion>
  hips: Vector3
}

/** A pose at identity: the T-pose. */
export function createHumanoidPose(): HumanoidPose {
  const rotations = {} as Record<HumanoidBoneName, Quaternion>
  for (const name of HUMANOID_BONES) rotations[name] = new Quaternion()
  return { rotations, hips: new Vector3() }
}

/** Put `pose` back to the T-pose, in place. */
export function resetHumanoidPose(pose: HumanoidPose) {
  for (const name of HUMANOID_BONES) pose.rotations[name].identity()
  pose.hips.set(0, 0, 0)
}

const scratch = { c: new Quaternion(), target: new Quaternion(), at: new Vector3() }

/**
 * Write a canonical pose onto a rig's bones, blended by `weight` (0 leaves them as they are, 1
 * replaces them). Bones the rig has no humanoid name for are left alone.
 */
export function applyPose(rig: { humanoid: Humanoid }, pose: HumanoidPose, weight = 1) {
  if (weight <= 0) return
  const { humanoid } = rig
  const { c, target, at } = scratch
  for (const name of HUMANOID_BONES) {
    const entry = humanoid[name]
    if (!entry) continue
    // The turns of missing names between this bone and the nearest one the rig has above it.
    c.copy(pose.rotations[name])
    for (let p = HUMANOID_PARENT[name]; p && !humanoid[p]; p = HUMANOID_PARENT[p]) {
      c.premultiply(pose.rotations[p])
    }
    target.copy(entry.pre).multiply(c).multiply(entry.post)
    if (weight >= 1) entry.bone.quaternion.copy(target)
    else entry.bone.quaternion.slerp(target, weight)
  }
  const hips = humanoid.hips
  if (hips) {
    at.copy(pose.hips).applyQuaternion(hips.pre).add(hips.rest)
    if (weight >= 1) hips.bone.position.copy(at)
    else hips.bone.position.lerp(at, weight)
  }
}

/**
 * The humanoid table of a rig standing in the canonical T-pose right now (a glTF or VRM model
 * loaded in T-pose, facing +Z), measured in `root`'s frame. Bones between two named ones (twist or
 * helper bones) must hold their T-pose rotation while posed.
 */
export function humanoidFromTPose(
  root: Object3D,
  bones: Partial<Record<HumanoidBoneName, Object3D>>,
): Humanoid {
  root.updateWorldMatrix(true, true)
  const frame = root.getWorldQuaternion(new Quaternion()).invert()
  const inRoot = (o: Object3D | null) =>
    o ? frame.clone().multiply(o.getWorldQuaternion(new Quaternion())) : frame.clone()
  const humanoid: Humanoid = {}
  for (const name of HUMANOID_BONES) {
    const bone = bones[name]
    if (!bone) continue
    humanoid[name] = {
      bone,
      pre: inRoot(bone.parent).invert(),
      post: inRoot(bone),
      rest: bone.position.clone(),
    }
  }
  return humanoid
}
