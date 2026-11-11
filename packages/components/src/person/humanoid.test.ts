import { DEFAULT_PALETTE } from '@runek/core'
import { Euler, Group, type Object3D, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  applyPose,
  createHumanoidPose,
  HUMANOID_BONES,
  type HumanoidBoneName,
  type HumanoidPose,
  humanoidFromTPose,
} from './humanoid'
import { createRig, type Rig } from './rig'
import { type BoneName, shapeFigure } from './shape'
import { resolveFigure } from './spec'

const rigFor = (props: Parameters<typeof resolveFigure>[0]) =>
  createRig(shapeFigure(resolveFigure(props, DEFAULT_PALETTE, 1).spec).joints)

const slim = rigFor({
  seed: 3,
  style: 'stylized',
  kind: 'villager',
  age: 'adult',
  build: 'slim',
  height: 1.55,
})
const stocky = rigFor({
  seed: 11,
  style: 'realistic',
  kind: 'merchant',
  age: 'adult',
  build: 'stocky',
  height: 1.9,
})
const child = rigFor({ seed: 5, style: 'anime', kind: 'villager', age: 'child' })

/** World direction from one bone's joint to another's. */
function segment(rig: Rig, from: BoneName, to: BoneName) {
  rig.group.updateMatrixWorld(true)
  const a = rig.bones[from].getWorldPosition(new Vector3())
  return rig.bones[to].getWorldPosition(new Vector3()).sub(a).normalize()
}

const close = (a: Vector3, b: Vector3, eps = 1e-6) => expect(a.distanceTo(b)).toBeLessThan(eps)

function reset(rig: Rig) {
  for (const b of Object.values(rig.bones)) b.quaternion.identity()
}

const posed = (set: Partial<Record<HumanoidBoneName, Euler>>): HumanoidPose => {
  const pose = createHumanoidPose()
  for (const [name, e] of Object.entries(set))
    pose.rotations[name as HumanoidBoneName].setFromEuler(e)
  return pose
}

describe('humanoid', () => {
  it('names every bone but the root', () => {
    expect(Object.keys(slim.humanoid).sort()).toEqual(
      HUMANOID_BONES.filter((n) => !/upperChest|Shoulder|Toes/.test(n)).sort(),
    )
  })

  it('stands any figure in a T-pose facing +Z for the identity pose', () => {
    for (const rig of [slim, stocky, child]) {
      reset(rig)
      applyPose(rig, createHumanoidPose())
      const x = new Vector3(1, 0, 0)
      close(segment(rig, 'upperArm.L', 'foreArm.L'), x)
      close(segment(rig, 'foreArm.L', 'hand.L'), x)
      close(segment(rig, 'upperArm.R', 'foreArm.R'), x.clone().negate())
      close(segment(rig, 'foreArm.R', 'hand.R'), x.clone().negate())
      const down = new Vector3(0, -1, 0)
      close(segment(rig, 'thigh.L', 'shin.L'), down)
      close(segment(rig, 'shin.R', 'foot.R'), down)
      // The torso, head and feet keep their bind orientation.
      for (const b of ['pelvis', 'chest', 'head', 'foot.L', 'foot.R'] as const) {
        expect(
          rig.bones[b].getWorldQuaternion(new Quaternion()).angleTo(new Quaternion()),
        ).toBeLessThan(1e-6)
      }
    }
  })

  it('reads one authored pose the same on figures of different build', () => {
    const pose = posed({
      leftUpperArm: new Euler(0.2, 0.3, -1.1),
      leftLowerArm: new Euler(0, -0.9, 0),
      rightUpperArm: new Euler(-0.4, 0, 1.2),
      leftUpperLeg: new Euler(-0.6, 0, 0.05),
      leftLowerLeg: new Euler(0.9, 0, 0),
      spine: new Euler(0.15, 0.2, 0),
      chest: new Euler(0.1, 0, -0.1),
    })
    const pairs: [BoneName, BoneName][] = [
      ['upperArm.L', 'foreArm.L'],
      ['foreArm.L', 'hand.L'],
      ['upperArm.R', 'foreArm.R'],
      ['thigh.L', 'shin.L'],
      ['shin.L', 'foot.L'],
    ]
    for (const rig of [slim, stocky, child]) {
      reset(rig)
      applyPose(rig, pose)
    }
    for (const [a, b] of pairs) {
      close(segment(stocky, a, b), segment(slim, a, b))
      close(segment(child, a, b), segment(slim, a, b))
    }
    // Whole bone frames agree too, not just the segment directions.
    for (const name of ['leftHand', 'chest', 'leftFoot'] as const) {
      const q = (rig: Rig) => {
        const e = rig.humanoid[name]
        if (!e) throw new Error(name)
        return e.bone.getWorldQuaternion(new Quaternion()).multiply(e.post.clone().invert())
      }
      expect(q(stocky).angleTo(q(slim))).toBeLessThan(1e-6)
    }
  })

  it('folds a missing name into the bones below it', () => {
    const folded = posed({ upperChest: new Euler(0.3, -0.4, 0.1) })
    const direct = createHumanoidPose()
    const turn = folded.rotations.upperChest
    for (const n of ['neck', 'leftUpperArm', 'rightUpperArm'] as const)
      direct.rotations[n].copy(turn)
    reset(slim)
    applyPose(slim, folded)
    const a = segment(slim, 'foreArm.L', 'hand.L')
    const h = slim.bones.head.getWorldQuaternion(new Quaternion())
    reset(slim)
    applyPose(slim, direct)
    close(segment(slim, 'foreArm.L', 'hand.L'), a)
    expect(slim.bones.head.getWorldQuaternion(new Quaternion()).angleTo(h)).toBeLessThan(1e-6)
  })

  it('blends by weight and offsets the hips', () => {
    reset(slim)
    const before = slim.bones['thigh.L'].quaternion.clone()
    const pose = posed({ leftUpperLeg: new Euler(-1, 0, 0) })
    pose.hips.set(0, -0.1, 0.05)
    applyPose(slim, pose, 0)
    expect(slim.bones['thigh.L'].quaternion.equals(before)).toBe(true)
    const rest = slim.humanoid.hips?.rest.clone() ?? new Vector3()
    applyPose(slim, pose, 1)
    close(slim.bones.pelvis.position, rest.clone().add(pose.hips))
    const full = slim.bones['thigh.L'].quaternion.clone()
    reset(slim)
    applyPose(slim, pose, 0.5)
    expect(slim.bones['thigh.L'].quaternion.angleTo(before)).toBeCloseTo(
      full.angleTo(before) / 2,
      6,
    )
  })

  it('measures a T-posed rig into the same table', () => {
    // A stand-in for a glTF rig: the generated figure stood in its T-pose, bones re-parented
    // under an armature turned to face +Z from somewhere else.
    reset(stocky)
    applyPose(stocky, createHumanoidPose())
    const armature = new Group()
    armature.rotation.y = 0.7
    armature.add(stocky.group)
    const bones: Partial<Record<HumanoidBoneName, Object3D>> = {}
    for (const [name, e] of Object.entries(stocky.humanoid))
      bones[name as HumanoidBoneName] = e.bone
    const measured = { humanoid: humanoidFromTPose(armature, bones) }
    const pose = posed({
      hips: new Euler(0.1, 0.4, 0),
      leftUpperArm: new Euler(0.3, 0.2, -1),
      rightLowerLeg: new Euler(1.1, 0, 0),
      head: new Euler(-0.2, 0.6, 0),
    })
    applyPose(stocky, pose)
    const expected = Object.values(stocky.bones).map((b) => b.quaternion.clone())
    reset(stocky)
    applyPose(measured, pose)
    Object.values(stocky.bones).forEach((b, i) => {
      expect(b.quaternion.angleTo(expected[i])).toBeLessThan(1e-6)
    })
    armature.remove(stocky.group)
  })
})
