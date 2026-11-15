import { DEFAULT_PALETTE } from '@runek/core'
import { Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  applyPose,
  createHumanoidPose,
  HUMANOID_BONES,
  type HumanoidBoneName,
  type HumanoidPose,
} from './humanoid'
import { createRig, type Rig } from './rig'
import { type BoneName, shapeFigure } from './shape'
import { resolveFigure } from './spec'
import {
  divePitch,
  STROKE_TRIM,
  STROKES,
  type Stroke,
  SWIM_PIVOT,
  strokeFor,
  strokePose,
} from './swim'

const rigFor = (props: Parameters<typeof resolveFigure>[0]) => {
  const { spec } = resolveFigure(props, DEFAULT_PALETTE, 1)
  return Object.assign(createRig(shapeFigure(spec).joints), { height: spec.height })
}

const slim = rigFor({ seed: 3, style: 'stylized', kind: 'villager', age: 'adult', build: 'slim' })
const stocky = rigFor({
  seed: 11,
  style: 'realistic',
  kind: 'merchant',
  age: 'adult',
  build: 'stocky',
})

const TURN = Math.PI * 2

const pose = (stroke: Stroke, phase: number): HumanoidPose => {
  const out = createHumanoidPose()
  strokePose(stroke, phase, out)
  return out
}

/** Direction from one bone's joint to another's with `stroke` on the rig, in the figure's frame. */
function segment(rig: Rig, stroke: Stroke, phase: number, from: BoneName, to: BoneName) {
  for (const b of Object.values(rig.bones)) b.quaternion.identity()
  applyPose(rig, pose(stroke, phase))
  rig.group.updateMatrixWorld(true)
  const a = rig.bones[from].getWorldPosition(new Vector3())
  return rig.bones[to].getWorldPosition(new Vector3()).sub(a).normalize()
}

/** A rotation as its mirror image across the figure's middle sees it. */
const mirrored = (q: Quaternion) => new Quaternion(q.x, -q.y, -q.z, q.w)
const same = (a: Quaternion, b: Quaternion) => expect(Math.abs(a.dot(b))).toBeCloseTo(1, 6)

const SIDES: [HumanoidBoneName, HumanoidBoneName][] = [
  ['leftUpperArm', 'rightUpperArm'],
  ['leftLowerArm', 'rightLowerArm'],
  ['leftHand', 'rightHand'],
  ['leftUpperLeg', 'rightUpperLeg'],
  ['leftLowerLeg', 'rightLowerLeg'],
  ['leftFoot', 'rightFoot'],
]

describe('strokes', () => {
  it('are whole rotations at every point of the cycle', () => {
    for (const stroke of STROKES) {
      for (let i = 0; i < 48; i++) {
        const p = pose(stroke, (i / 48) * TURN)
        for (const name of HUMANOID_BONES) {
          const q = p.rotations[name]
          expect(Number.isFinite(q.x + q.y + q.z + q.w)).toBe(true)
          expect(q.length()).toBeCloseTo(1, 6)
        }
      }
    }
  })

  it('come round to where they began', () => {
    // All but the climb, which is not a cycle.
    for (const stroke of STROKES.filter((s) => s !== 'climb')) {
      const a = pose(stroke, 0.7)
      const b = pose(stroke, 0.7 + TURN)
      for (const name of HUMANOID_BONES) same(a.rotations[name], b.rotations[name])
    }
  })

  it('keep breaststroke, the streamline and the pull under water the same on both sides', () => {
    for (const stroke of ['breast', 'streamline', 'under'] as const) {
      for (const phase of [0, 1.9, 3.1, 4.4]) {
        const p = pose(stroke, phase)
        for (const [left, right] of SIDES) same(mirrored(p.rotations[left]), p.rotations[right])
      }
    }
  })

  it('swing the crawl arms half a cycle apart', () => {
    for (const phase of [0.3, 2, 4.5]) {
      const now = pose('crawl', phase)
      const later = pose('crawl', phase + Math.PI)
      for (const [left, right] of SIDES.slice(0, 3)) {
        same(mirrored(now.rotations[left]), later.rotations[right])
      }
    }
  })

  it('reach ahead of the head in a glide, whatever the build', () => {
    for (const rig of [slim, stocky]) {
      for (const stroke of ['breast', 'streamline', 'under'] as const) {
        for (const side of ['L', 'R'] as const) {
          const upper = segment(rig, stroke, 0, `upperArm.${side}`, `foreArm.${side}`)
          const fore = segment(rig, stroke, 0, `foreArm.${side}`, `hand.${side}`)
          // Up the spine is the way a lying swimmer travels.
          expect(upper.y).toBeGreaterThan(0.95)
          expect(fore.y).toBeGreaterThan(0.95)
        }
      }
      // Legs trail straight behind.
      expect(segment(rig, 'streamline', 0, 'thigh.L', 'shin.L').y).toBeLessThan(-0.95)
      expect(segment(rig, 'streamline', 0, 'shin.L', 'foot.L').y).toBeLessThan(-0.95)
    }
  })

  it('pull the crawl arm down through the water and bring it back over', () => {
    // A quarter in, the left arm is under the body (out of the chest); three quarters in, over
    // the back with the elbow up and the forearm hanging toward the water.
    expect(segment(slim, 'crawl', TURN / 4, 'upperArm.L', 'foreArm.L').z).toBeGreaterThan(0.8)
    const upper = segment(slim, 'crawl', (3 * TURN) / 4, 'upperArm.L', 'foreArm.L')
    const fore = segment(slim, 'crawl', (3 * TURN) / 4, 'foreArm.L', 'hand.L')
    expect(upper.z).toBeLessThan(-0.5)
    expect(fore.z).toBeGreaterThan(upper.z + 0.5)
  })

  it('draw the knees up and out for the breaststroke kick', () => {
    const glide = segment(slim, 'breast', 0, 'thigh.L', 'shin.L')
    const drawn = segment(slim, 'breast', 0.66 * TURN, 'thigh.L', 'shin.L')
    expect(glide.y).toBeLessThan(-0.95)
    // Toward the belly and out to the left.
    expect(drawn.z).toBeGreaterThan(0.3)
    expect(drawn.x).toBeGreaterThan(0.2)
    const shin = segment(slim, 'breast', 0.66 * TURN, 'shin.L', 'foot.L')
    expect(shin.angleTo(drawn)).toBeGreaterThan(1.2)
  })

  it('pull the arms from ahead of the head round to the thighs under water', () => {
    for (const rig of [slim, stocky]) {
      // Half way through the pull the arms are out wide; at its end, along the body.
      const wide = segment(rig, 'under', 0.3 * TURN, 'upperArm.L', 'foreArm.L')
      expect(wide.x).toBeGreaterThan(0.8)
      const done = segment(rig, 'under', 0.55 * TURN, 'upperArm.L', 'foreArm.L')
      expect(done.y).toBeLessThan(-0.95)
      // The hands come back up close under the chest, elbows bent.
      const upper = segment(rig, 'under', 0.77 * TURN, 'upperArm.L', 'foreArm.L')
      const fore = segment(rig, 'under', 0.77 * TURN, 'foreArm.L', 'hand.L')
      expect(upper.x).toBeLessThan(0.7)
      expect(fore.angleTo(upper)).toBeGreaterThan(0.8)
      expect(fore.y).toBeGreaterThan(0.5)
    }
    // The kick comes with the recovery, not the pull.
    expect(segment(slim, 'under', 0.3 * TURN, 'thigh.L', 'shin.L').y).toBeLessThan(-0.95)
    expect(segment(slim, 'under', 0.8 * TURN, 'thigh.L', 'shin.L').z).toBeGreaterThan(0.3)
  })

  describe('the climb out', () => {
    /** Where a joint is with the top of the wall `left` body heights over the feet, on a rig
     *  leaning into the wall as `Person` draws it: over the feet, in parts of its height. */
    const at = (rig: typeof slim, left: number, bone: BoneName) => {
      for (const b of Object.values(rig.bones)) b.quaternion.identity()
      applyPose(rig, pose('climb', left))
      const tip = STROKE_TRIM.climb.pitch
      const pivot = SWIM_PIVOT * rig.height
      rig.group.rotation.x = tip
      rig.group.position.set(0, pivot * (1 - Math.cos(tip)), -pivot * Math.sin(tip))
      rig.group.updateMatrixWorld(true)
      const found = rig.bones[bone].getWorldPosition(new Vector3()).divideScalar(rig.height)
      rig.group.rotation.x = 0
      rig.group.position.set(0, 0, 0)
      return found
    }

    it('reaches up for a top over the head', () => {
      for (const rig of [slim, stocky]) {
        for (const side of ['L', 'R'] as const) {
          const upper = segment(rig, 'climb', 1.3, `upperArm.${side}`, `foreArm.${side}`)
          expect(upper.y).toBeGreaterThan(0.5)
          expect(upper.z).toBeGreaterThan(0.1)
        }
      }
    })

    it('keeps the hands near the top as the body rises past it', () => {
      for (const rig of [slim, stocky]) {
        for (const left of [1, 0.9, 0.8, 0.65, 0.5]) {
          // The wrists are out in front of the body, at the height of the wall's top.
          for (const side of ['L', 'R'] as const) {
            const wrist = at(rig, left, `hand.${side}`)
            expect(wrist.z).toBeGreaterThan(0.2)
            expect(Math.abs(wrist.y - left)).toBeLessThan(0.08)
          }
        }
      }
    })

    it('brings the left knee up, and stands at the top', () => {
      const thigh = segment(slim, 'climb', 0.3, 'thigh.L', 'shin.L')
      expect(thigh.z).toBeGreaterThan(0.8)
      expect(segment(slim, 'climb', 0.3, 'thigh.R', 'shin.R').y).toBeLessThan(-0.9)
      // The foot comes up about as high as the top it is stepping onto.
      expect(Math.abs(at(slim, 0.3, 'foot.L').y - 0.3)).toBeLessThan(0.08)
      // Level with the top: legs straight, arms down at the sides.
      for (const side of ['L', 'R'] as const) {
        expect(segment(slim, 'climb', 0, `thigh.${side}`, `shin.${side}`).y).toBeLessThan(-0.97)
        expect(segment(slim, 'climb', 0, `upperArm.${side}`, `foreArm.${side}`).y).toBeLessThan(
          -0.95,
        )
      }
    })

    it('is steady for any height', () => {
      for (const left of [-1, 0, 5, Number.POSITIVE_INFINITY]) {
        for (const name of HUMANOID_BONES) {
          expect(pose('climb', left).rotations[name].length()).toBeCloseTo(1, 6)
        }
      }
    })
  })

  it('lie flatter the faster the stroke', () => {
    expect(STROKE_TRIM.tread.pitch).toBeLessThan(STROKE_TRIM.breast.pitch)
    expect(STROKE_TRIM.breast.pitch).toBeLessThan(STROKE_TRIM.crawl.pitch)
    expect(STROKE_TRIM.crawl.pitch).toBeLessThan(Math.PI / 2)
    // And turn over faster.
    expect(STROKE_TRIM.breast.period(1.5)).toBeLessThan(STROKE_TRIM.breast.period(0.5))
    expect(STROKE_TRIM.crawl.period(2.6)).toBeLessThan(STROKE_TRIM.breast.period(1.5))
  })
})

describe('strokeFor', () => {
  it('treads when still, swims breaststroke at a cruise and a crawl at a sprint', () => {
    expect(strokeFor(0, 'breast')).toBe('tread')
    expect(strokeFor(1.5, 'tread')).toBe('breast')
    expect(strokeFor(2.6, 'breast')).toBe('crawl')
  })

  it('holds the crawl a little below the speed that started it', () => {
    expect(strokeFor(1.8, 'breast')).toBe('breast')
    expect(strokeFor(1.8, 'crawl')).toBe('crawl')
    expect(strokeFor(1.6, 'crawl')).toBe('breast')
  })
})

describe('divePitch', () => {
  it('lies flat in level flight, tips head down in a fall and head up on the way back', () => {
    expect(divePitch(3, 0)).toBeCloseTo(Math.PI / 2)
    expect(divePitch(3, -6)).toBeGreaterThan(divePitch(3, -2))
    expect(divePitch(3, -6)).toBeGreaterThan(Math.PI / 2)
    expect(divePitch(1, 3)).toBeLessThan(Math.PI / 2)
    // Never past straight down, never back to standing.
    expect(divePitch(0, -20)).toBeLessThan(Math.PI)
    expect(divePitch(0, 20)).toBeGreaterThan(0)
  })
})
