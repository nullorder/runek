// A FigureSpec as signed-distance fields: the anatomy (tagged primitives on a skeleton), and every
// layer over it (clothes, hair, hats, accessories) as offsets of or shells around the body field.
import {
  box,
  clamp01,
  ellipsoid,
  type Field,
  len,
  noise3,
  type Prim,
  prim,
  program,
  roundCone,
  smax,
  smin,
  sphere,
  type V3,
} from './sdf'
import { type FigureSpec, type Layer, LIT, type MaterialKind } from './spec'

export const BONES = [
  'root',
  'pelvis',
  'spine',
  'chest',
  'neck',
  'head',
  'upperArm.L',
  'foreArm.L',
  'hand.L',
  'upperArm.R',
  'foreArm.R',
  'hand.R',
  'thigh.L',
  'shin.L',
  'foot.L',
  'thigh.R',
  'shin.R',
  'foot.R',
] as const
export type BoneName = (typeof BONES)[number]
export const PARENT = [-1, 0, 1, 2, 3, 4, 3, 6, 7, 3, 9, 10, 1, 12, 13, 1, 15, 16]
const B = (name: BoneName) => BONES.indexOf(name)

/** How far the arms stand out from the body in the bind pose, in radians. */
export const ARM_SPREAD = 0.26

/** `p` turned by `a` about the z axis through `pivot`. */
function turn(p: V3, pivot: V3, a: number): V3 {
  const dx = p[0] - pivot[0]
  const dy = p[1] - pivot[1]
  return [
    pivot[0] + dx * Math.cos(a) - dy * Math.sin(a),
    pivot[1] + dx * Math.sin(a) + dy * Math.cos(a),
    p[2],
  ]
}

/** A primitive turned about the z axis through `pivot` (distances are unchanged by rotation). */
function swing(q: Prim, pivot: V3, a: number): Prim {
  const c = Math.cos(a)
  const s = Math.sin(a)
  const d = q.d
  return {
    ...q,
    c: turn(q.c, pivot, a),
    d: (x, y, z) => {
      const dx = x - pivot[0]
      const dy = y - pivot[1]
      return d(pivot[0] + dx * c + dy * s, pivot[1] - dx * s + dy * c, z)
    },
  }
}

/** How a part is colored: a flat color, or a function of the surface point. */
export type Paint = string | ((x: number, y: number, z: number) => string | null)

export interface PartDef {
  name: string
  material: MaterialKind
  field: Field
  min: V3
  max: V3
  /** Cell size at full detail, in world units. `far` is the coarse size, or `null` to skip. */
  near: number
  far: number | null
  /** Primitives the skin weights are measured against, and the falloff. */
  weightBy: Prim[]
  sigma: number
  /** Below `y`, weigh against `prims` with `sigma` instead (a skirt follows hips and thighs
   *  loosely while the bodice above follows the torso and arms tightly). */
  below?: { y: number; maxX: number; prims: Prim[]; sigma: number }
  paint: Paint
  /** Only at full detail (the coarse build folds these into `skin`). */
  nearOnly?: boolean
  farOnly?: boolean
}

/** Where a drawn face keeps its eyes, for whatever is placed round them. In head units. */
interface DrawnFace {
  eyeX: number
  eyeW: number
  eyeH: number
  eyeDrop: number
  /** How far forward the face's surface is ahead of a point. */
  faceZ: (x: number, y: number) => number
}

export interface Shape {
  joints: V3[]
  height: number
  /** `yaw` and `open` are set for a drawn eye: the way it is turned to lie along the face, and
   *  half the width and height of the opening it shows through. */
  eyes: { center: V3; radius: number; yaw?: number; open?: [number, number] }[]
  /** Radius of the blink lid shell (between the eyeball and the lid skin). */
  lidRadius: number
  parts: PartDef[]
  /** Everything solid, for baked occlusion. */
  occluder: Field
  /** Skin shading inputs (lips, flush, stubble) for the skin parts. */
  skinPaint: (
    x: number,
    y: number,
    z: number,
  ) => { lip: number; flush: number; stubble: number; ink?: number }
  /** Landmarks the rig and the far-detail fallbacks need. */
  marks: { hipY: number; thigh: number; shin: number; eyeY: number; headH: number; waistY: number }
  /** Glasses and the staff are rigid three.js primitives, positioned here. */
  props: {
    glasses?: { center: V3; ring: number; spacing: number; tube: number }
    staff?: { length: number; radius: number }
  }
}

/** Reference figure the measurements below were sculpted at: height below the chin, head height. */
const BODY0 = 1.385
const HEAD0 = 0.265

export function shapeFigure(spec: FigureSpec): Shape {
  const st = spec.st
  const ph = spec.physique
  const fem = spec.fem
  const H = spec.height
  const headH = H / spec.headsTall
  const hu = headH / HEAD0
  const eyeY = H - headH * 0.548
  const chinY = eyeY - (0.116 + spec.face.chin) * hu
  const Bh = chinY
  const u = Bh / BODY0
  const child = spec.age === 'child'
  const drawn = st.drawn
  // The body is built in three layers, each with its own measure: the frame (`Kb`, bone
  // thickness), the muscle on it (`M`, the girth of a muscled limb, 1 on an average build) and
  // the soft tissue over that (`soft`, a thickness, nothing on an average build because the
  // measurements below were sculpted with it on). `mass` is the style's overall slenderness.
  const mass = st.mass * (child ? 0.92 : 1)
  const Kb = ph.bone
  const mu = ph.muscle
  // A drawn body states its sex in its frame, the way a model sheet does. A man's shoulders are
  // about two head-heights across over a rib cage that tapers to narrow hips, on heavier limbs. A
  // woman's shoulders are narrower than her hips, which are the widest thing about her.
  const sexed = drawn && !child
  const M = mass * (0.4 + 0.6 * mu) * (sexed ? 1.17 - 0.22 * fem : 1)
  const level = spec.anatomy
  const fleshed = level !== 'bones'
  const padded = level === 'surface'
  const soft = Math.max(-0.003, (padded ? ph.fat - 0.35 : Math.min(ph.fat - 0.35, 0)) * 0.015) * u
  /** Overall girth of the trunk, for whatever is fitted round it. */
  const W = mass * (0.5 * ph.ribs + 0.5 * ph.hips) * (1 + 0.1 * (ph.fat - 0.35)) * (0.9 + 0.1 * mu)
  const wide = sexed ? 1.24 - 0.27 * fem : 1.06 - 0.13 * fem
  const hipMul = sexed ? 0.96 + 0.32 * fem : 1 + 0.1 * fem
  const hipW = hipMul * ph.hips
  const ribW = ph.ribs
  const legs = st.legs + ph.legs + (sexed ? 0.008 * (1 - fem) : 0)
  const n = noise3(spec.seed)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  // ---- skeleton --------------------------------------------------------------------------------
  // Everything else hangs off these joints: the build sets how wide the shoulders and hips are
  // and how much of the height is leg.
  const shW = st.shoulder * Bh * wide * ph.shoulders
  const hipX = 0.0505 * Bh * (sexed ? hipMul ** 0.55 : hipMul) * (0.6 + 0.4 * ph.hips)
  const y = (f: number) => f * Bh
  // The point of the shoulder sits below the base of the neck, so the line from one to the other
  // slopes the way a real one does instead of running level and dropping off a corner.
  const slope = sexed ? 0.026 : 0
  const J: Record<BoneName, V3> = {
    root: [0, 0, 0],
    pelvis: [0, y(0.65 + legs), 0],
    spine: [0, y(0.736 + legs * 0.6), 0],
    chest: [0, y(0.837 + legs * 0.3), 0],
    neck: [0, y(0.96), -0.018 * u],
    head: [0, chinY + 0.017 * hu, -0.012 * hu],
    'upperArm.L': [shW, y(0.949 - slope), -0.012 * u],
    'foreArm.L': [shW + 0.0217 * Bh, y(0.765 - slope), -0.03 * u],
    'hand.L': [shW + 0.0318 * Bh, y(0.599 - slope), -0.008 * u],
    'upperArm.R': [-shW, y(0.949 - slope), -0.012 * u],
    'foreArm.R': [-(shW + 0.0217 * Bh), y(0.765 - slope), -0.03 * u],
    'hand.R': [-(shW + 0.0318 * Bh), y(0.599 - slope), -0.008 * u],
    'thigh.L': [hipX, y(0.617 + legs), 0],
    'shin.L': [hipX + 0.003 * Bh, y(0.339 + legs * 0.55), 0.01 * u],
    'foot.L': [hipX + 0.0043 * Bh, y(0.0505), -0.018 * u],
    'thigh.R': [-hipX, y(0.617 + legs), 0],
    'shin.R': [-(hipX + 0.003 * Bh), y(0.339 + legs * 0.55), 0.01 * u],
    'foot.R': [-(hipX + 0.0043 * Bh), y(0.0505), -0.018 * u],
  }
  // The level clothes are cut to: the base of the neck, which is the shoulder joint's own height
  // on a figure with no slope.
  const shoulderY = J['upperArm.L'][1] + slope * Bh
  const armY = J['upperArm.L'][1]
  const hipY = J['thigh.L'][1]
  const kneeY = J['shin.L'][1]
  const ankleY = J['foot.L'][1]
  const pelvisY = J.pelvis[1]
  const waistY = pelvisY + 0.04 * u
  const neckTop = shoulderY + 0.055 * u

  // ---- primitive helpers -----------------------------------------------------------------------
  const body: Prim[] = []
  const head: Prim[] = []
  const hands: Prim[] = []
  /** Ellipsoid with radii scaled: x/z by girth, y by body scale. */
  const ell = (
    list: Prim[],
    bone: BoneName,
    c: V3,
    r: V3,
    k: number,
    extra?: Partial<Prim> & { rot?: V3 },
  ) => {
    list.push(prim(ellipsoid(c, r, extra?.rot), c, Math.max(...r), B(bone), k, extra))
  }
  const cone = (
    list: Prim[],
    bone: BoneName,
    a: V3,
    b: V3,
    r1: number,
    r2: number,
    k: number,
    extra?: Partial<Prim>,
  ) => {
    const c: V3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
    const R = len(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 2 + Math.max(r1, r2)
    list.push(prim(roundCone(a, b, r1, r2), c, R, B(bone), k, extra))
  }
  const sph = (
    list: Prim[],
    bone: BoneName,
    c: V3,
    r: number,
    k: number,
    extra?: Partial<Prim>,
  ) => {
    list.push(prim(sphere(c, r), c, r, B(bone), k, extra))
  }

  const BONE = { tag: 'bone' }
  const MUSCLE = { tag: 'muscle' }
  const FAT = { tag: 'fat' }
  const neckR =
    0.037 *
      u *
      (sexed ? 1.14 - 0.24 * fem : 1 - 0.1 * fem) *
      Math.sqrt(mass * (0.5 + 0.3 * mu + 0.2 * Kb)) *
      st.neck +
    soft * 0.5

  // ---- layer 1: the frame ------------------------------------------------------------------------
  // Pelvis, spine, rib cage, collar bones, and a bone with a ball at each end for every limb
  // segment. On its own it is a stick figure with the build's proportions.
  ell(
    body,
    'pelvis',
    [0, pelvisY + 0.005 * u, -0.005 * u],
    [0.1 * u * mass * hipW, 0.062 * u, 0.066 * u * mass * Kb],
    0,
    BONE,
  )
  cone(
    body,
    'spine',
    [0, pelvisY, -0.022 * u],
    [0, J.chest[1], -0.03 * u],
    0.022 * u * Kb,
    0.02 * u * Kb,
    0.02 * u,
    BONE,
  )
  ell(
    body,
    'chest',
    [0, J.chest[1] + 0.035 * u, -0.006 * u],
    [0.1 * u * mass * ribW * wide, 0.125 * u, 0.07 * u * mass * ribW],
    0.03 * u,
    BONE,
  )
  for (const x of [-1, 1])
    cone(
      body,
      'chest',
      [0, shoulderY - 0.008 * u, 0.028 * u],
      [x * (shW - 0.012 * u), armY + 0.004 * u, -0.012 * u],
      0.012 * u * Kb,
      0.012 * u * Kb,
      0.012 * u,
      BONE,
    )
  cone(
    body,
    'neck',
    [0, J.neck[1] - 0.03 * u, -0.02 * u],
    [0, J.head[1] + 0.025 * hu, -0.008 * hu],
    0.019 * u * Kb,
    0.017 * u * Kb,
    0.02 * u,
    BONE,
  )

  // ---- layer 2: muscle -------------------------------------------------------------------------
  if (fleshed) {
    // Hips and seat.
    ell(
      body,
      'pelvis',
      [0, pelvisY + 0.005 * u, -0.005 * u],
      [0.122 * u * mass * hipW + soft, 0.08 * u, 0.088 * u * mass * (0.6 + 0.4 * ph.hips) + soft],
      0.02 * u,
      MUSCLE,
    )
    for (const x of [-1, 1])
      ell(
        body,
        'pelvis',
        [x * 0.05 * u * mass * hipW, pelvisY - 0.05 * u, -(sexed ? 0.05 : 0.038) * u * mass],
        [
          0.064 * u * M * Math.sqrt(hipW) + soft,
          0.074 * u,
          (sexed ? 0.064 + 0.012 * fem : 0.058 * hipMul) * u * mass + soft,
        ],
        0.04 * u,
        MUSCLE,
      )
    // The waist: narrowest on a drawn feminine figure, widest where the ribs are.
    const waist =
      (sexed ? 1.2 - 0.3 * fem : 1 - 0.06 * fem) *
      st.waist *
      (0.55 + 0.45 * ribW) *
      (0.8 + 0.2 * mu)
    ell(
      body,
      'spine',
      [0, J.spine[1] + 0.01 * u, 0.004 * u],
      [
        0.104 * u * mass * waist + soft,
        0.13 * u,
        0.078 * u * mass * (0.7 + 0.3 * ribW) * Math.sqrt(st.waist) + soft,
      ],
      0.07 * u,
      MUSCLE,
    )
    // The chest wall over the ribs.
    ell(
      body,
      'chest',
      [0, J.chest[1] + 0.03 * u, -0.006 * u],
      [
        0.118 * u * mass * ribW * wide + soft,
        0.145 * u,
        (sexed ? 0.092 - 0.012 * fem : 0.082) * u * mass * ribW + soft,
      ],
      0.06 * u,
      MUSCLE,
    )
    if (!child && fem < 0.5)
      // Each pectoral is a broad flat slab from the breastbone to the shoulder, with an edge
      // along its lower side and a groove between the two.
      for (const x of [-1, 1])
        ell(
          body,
          'chest',
          [
            x * 0.058 * u * mass * ribW * Math.sqrt(wide),
            J.chest[1] + 0.05 * u,
            0.058 * u * mass * ribW,
          ],
          [0.066 * u * M * Math.sqrt(wide), 0.05 * u, (0.028 + 0.014 * mu) * u * mass],
          (sexed ? 0.02 : 0.035) * u,
          MUSCLE,
        )
    // The back's wide muscles give a trained body its taper from shoulder to waist.
    if (mu > 1.05)
      for (const x of [-1, 1])
        ell(
          body,
          'chest',
          [x * 0.092 * u * mass * ribW * wide, J.chest[1] + 0.03 * u, -0.028 * u],
          [0.03 * (mu - 0.5) * u, 0.11 * u, 0.05 * u * mass],
          0.05 * u,
          MUSCLE,
        )
    // From the neck out to the point of each shoulder.
    for (const x of [-1, 1])
      cone(
        body,
        'chest',
        [sexed ? x * 0.03 * u : 0, shoulderY + (sexed ? 0.042 : 0.03) * u, -0.03 * u],
        [x * (shW - 0.025 * u), armY + (sexed ? 0.012 : 0.003) * u, -0.018 * u],
        0.033 * u * M + soft * 0.5,
        (sexed ? 0.025 : 0.028) * u * M + soft * 0.5,
        (sexed ? 0.055 : 0.04) * u,
        MUSCLE,
      )
    cone(
      body,
      'neck',
      [0, J.neck[1] - 0.03 * u, -0.02 * u],
      [0, J.head[1] + 0.025 * hu, -0.008 * hu],
      neckR,
      neckR * 0.92,
      0.03 * u,
      MUSCLE,
    )
  }

  // ---- layer 3: soft tissue ----------------------------------------------------------------------
  if (padded) {
    if (!child && fem > 0.5)
      for (const x of [-1, 1]) {
        // A breast hangs from the chest wall: a long slope down from the collar bone, fullest
        // low down, about two head-heights below the crown.
        const size = 0.9 + 0.25 * ph.fat
        const by = J.chest[1] - (sexed ? 0.03 : -0.012) * u
        ell(
          body,
          'chest',
          [x * 0.056 * u * mass * ribW, by, (sexed ? 0.07 : 0.05) * u * mass * ribW],
          [0.053 * u * mass * size, 0.054 * u * size, (sexed ? 0.052 : 0.046) * u * mass * size],
          (sexed ? 0.028 : 0.04) * u,
          FAT,
        )
        if (sexed)
          ell(
            body,
            'chest',
            [x * 0.052 * u * mass * ribW, by + 0.05 * u, 0.05 * u * mass * ribW],
            [0.046 * u * mass * size, 0.065 * u, 0.034 * u * mass * size],
            0.05 * u,
            FAT,
          )
      }
    if (ph.belly > 0.02)
      ell(
        body,
        'spine',
        [0, J.spine[1] - 0.02 * u, (0.015 + 0.05 * ph.belly) * u * mass],
        [
          (0.085 + 0.06 * ph.belly) * u * mass * ribW,
          (0.085 + 0.045 * ph.belly) * u,
          (0.06 + 0.085 * ph.belly) * u * mass,
        ],
        0.06 * u,
        FAT,
      )
    if (ph.fat > 0.6)
      for (const x of [-1, 1])
        ell(
          body,
          'spine',
          [x * 0.09 * u * mass * hipW, waistY + 0.012 * u, -0.012 * u],
          [0.04 * u * ph.fat, 0.06 * u, 0.065 * u * mass],
          0.05 * u,
          FAT,
        )
  }

  // ---- limbs -----------------------------------------------------------------------------------
  for (const tag of ['L', 'R'] as const) {
    const x = tag === 'L' ? 1 : -1
    const sh = J[`upperArm.${tag}`]
    const el = J[`foreArm.${tag}`]
    const wr = J[`hand.${tag}`]
    const hp = J[`thigh.${tag}`]
    const kn = J[`shin.${tag}`]
    const an = J[`foot.${tag}`]
    // A man's hands and feet are larger.
    const ex = st.extremity * (sexed ? 1.12 - 0.12 * fem : 1)
    // Frame: a bone for each segment and a ball at each joint.
    cone(body, `upperArm.${tag}`, sh, el, 0.014 * u * Kb, 0.012 * u * Kb, 0, BONE)
    cone(body, `foreArm.${tag}`, el, wr, 0.012 * u * Kb, 0.0105 * u * Kb, 0, BONE)
    cone(body, `thigh.${tag}`, hp, kn, 0.021 * u * Kb, 0.018 * u * Kb, 0, BONE)
    cone(body, `shin.${tag}`, kn, an, 0.017 * u * Kb, 0.013 * u * Kb, 0, BONE)
    sph(body, `upperArm.${tag}`, sh, 0.024 * u * Kb, 0.008 * u, BONE)
    sph(body, `foreArm.${tag}`, el, 0.019 * u * Kb, 0.006 * u, BONE)
    sph(body, `thigh.${tag}`, hp, 0.03 * u * Kb, 0.01 * u, BONE)
    sph(body, `shin.${tag}`, kn, 0.027 * u * Kb, 0.008 * u, BONE)
    sph(body, `foot.${tag}`, an, 0.019 * u * Kb, 0.006 * u, BONE)
    ell(
      body,
      `foot.${tag}`,
      [an[0], 0.04 * u, an[2] - 0.015 * u],
      [0.028 * u * ex, 0.038 * u, 0.04 * u * ex],
      0.025 * u,
      BONE,
    )
    ell(
      body,
      `foot.${tag}`,
      [an[0] + x * 0.003 * u, 0.028 * u, an[2] + 0.075 * u * ex],
      [0.036 * u * ex, 0.024 * u, 0.068 * u * ex],
      0.035 * u,
      BONE,
    )

    if (fleshed) {
      // Shoulder cap, upper arm, forearm.
      // The cap rounds over the joint and runs on down the arm, so the shoulder turns a curve.
      ell(
        body,
        `upperArm.${tag}`,
        [sh[0] + x * 0.002 * u, sh[1] - (sexed ? 0.03 : 0.015) * u, sh[2]],
        [0.038 * u * M + soft, (sexed ? 0.062 : 0.048) * u, 0.04 * u * M + soft],
        (sexed ? 0.05 : 0.03) * u,
        MUSCLE,
      )
      cone(
        body,
        `upperArm.${tag}`,
        sh,
        el,
        (sexed ? 0.037 : 0.033) * u * M + soft,
        (sexed ? 0.029 : 0.026) * u * M + soft,
        0.015 * u,
        MUSCLE,
      )
      if (mu > 1.1)
        ell(
          body,
          `upperArm.${tag}`,
          [lerp(sh[0], el[0], 0.45), lerp(sh[1], el[1], 0.45), sh[2] + 0.012 * u],
          [0.03 * u * M, 0.06 * u, 0.034 * u * M],
          0.025 * u,
          MUSCLE,
        )
      cone(
        body,
        `foreArm.${tag}`,
        el,
        wr,
        0.027 * u * M + soft,
        0.019 * u * mass * Kb + soft * 0.5,
        0.01 * u,
        MUSCLE,
      )
      // Thigh, shin and the calf behind it.
      cone(
        body,
        `thigh.${tag}`,
        hp,
        kn,
        (sexed ? 0.074 : 0.066) * u * M * (1 + (sexed ? 0.2 : 0.05) * fem) + soft * 1.4,
        (sexed ? 0.046 : 0.042) * u * M + soft,
        0.045 * u,
        MUSCLE,
      )
      cone(
        body,
        `shin.${tag}`,
        kn,
        an,
        0.041 * u * M + soft,
        0.024 * u * mass * Kb + soft * 0.4,
        0.015 * u,
        MUSCLE,
      )
      ell(
        body,
        `shin.${tag}`,
        [kn[0] + x * 0.002 * u, lerp(an[1], kn[1], 0.68), -0.018 * u * M],
        [(sexed ? 0.042 : 0.038) * u * M + soft, 0.09 * u, (sexed ? 0.041 : 0.036) * u * M + soft],
        0.03 * u,
        MUSCLE,
      )
    }
    // Soft tissue gathers on the outside of the hip and thigh.
    if (padded && (ph.fat > 0.6 || (drawn && fem > 0.5 && !child)))
      ell(
        body,
        `thigh.${tag}`,
        [hp[0] + x * 0.022 * u * mass, hp[1] - 0.05 * u, -0.006 * u],
        [
          0.056 * u * mass * (0.75 + 0.3 * ph.fat) * (sexed ? 0.7 + 0.5 * fem : 1),
          0.11 * u,
          0.064 * u * mass * (0.8 + 0.2 * ph.fat),
        ],
        0.06 * u,
        FAT,
      )

    // hand: palm toward the thigh, four slim fingers and a thumb
    const hs = 0.82 * u * (mass * Kb) ** 0.3 * ex
    const [hx, hy, hz] = wr
    cone(
      hands,
      `foreArm.${tag}`,
      [hx - x * 0.002 * u, hy + 0.05 * u, hz],
      wr,
      (fleshed ? 0.021 * u * M : 0.012 * u * Kb) + (fleshed ? soft * 0.5 : 0),
      fleshed ? 0.019 * u * mass * Kb + soft * 0.5 : 0.0105 * u * Kb,
      0.008 * u,
    )
    ell(
      hands,
      `hand.${tag}`,
      [hx, hy - 0.04 * hs, hz + 0.004 * hs],
      [0.013 * hs, 0.04 * hs, 0.034 * hs],
      0.01 * hs,
    )
    for (const [fz, fl] of [
      [0.022, 0.07],
      [0.0075, 0.078],
      [-0.007, 0.074],
      [-0.021, 0.06],
    ] as const) {
      const a: V3 = [hx - x * 0.002 * hs, hy - 0.075 * hs, hz + fz * hs]
      const m: V3 = [hx - x * 0.008 * hs, hy - (0.075 + fl * 0.5) * hs, hz + (fz + 0.005) * hs]
      const b: V3 = [hx - x * 0.018 * hs, hy - (0.075 + fl) * hs, hz + (fz + 0.012) * hs]
      cone(hands, `hand.${tag}`, a, m, 0.0072 * hs, 0.0066 * hs, 0.003 * hs)
      cone(hands, `hand.${tag}`, m, b, 0.0066 * hs, 0.0057 * hs, 0.002 * hs)
    }
    const ta: V3 = [hx - x * 0.006 * hs, hy - 0.022 * hs, hz + 0.02 * hs]
    const tb: V3 = [hx - x * 0.022 * hs, hy - 0.075 * hs, hz + 0.042 * hs]
    cone(hands, `hand.${tag}`, ta, tb, 0.0105 * hs, 0.0068 * hs, 0.008 * hs)
  }

  // The arms are sculpted hanging, then swung out to the bind pose (a slight A), so cloth and
  // skin never bridge the gap between arm and torso. The rig swings them back down.
  for (const tag of ['L', 'R'] as const) {
    const pivot = J[`upperArm.${tag}`]
    const a = tag === 'L' ? ARM_SPREAD : -ARM_SPREAD
    const bones = new Set([B(`upperArm.${tag}`), B(`foreArm.${tag}`), B(`hand.${tag}`)])
    for (const list of [body, hands])
      for (let i = 0; i < list.length; i++)
        if (bones.has(list[i].bone)) list[i] = swing(list[i], pivot, a)
    J[`foreArm.${tag}`] = turn(J[`foreArm.${tag}`], pivot, a)
    J[`hand.${tag}`] = turn(J[`hand.${tag}`], pivot, a)
  }
  const joints = BONES.map((b) => J[b])
  const elbowY = J['foreArm.L'][1]
  const wristY = J['hand.L'][1]

  // ---- head (in head units around the eye-line centre) --------------------------------------
  const fc = spec.face
  const E = (x: number, yy: number, z: number): V3 => [x * hu, eyeY + yy * hu, z * hu]
  const hk = (k: number) => k * hu
  const full = 1 + 0.11 * (ph.fat - 0.35)
  ell(
    head,
    'head',
    E(0, 0.035, -0.012),
    [(drawn ? 0.093 : 0.083) * hu, 0.11 * hu, (drawn ? 0.108 : 0.105) * hu],
    0,
  )
  ell(
    head,
    'head',
    E(0, -0.03, 0.024),
    [(drawn ? 0.08 : 0.073) * fc.cheek * full * hu, 0.066 * hu, 0.071 * hu],
    hk(0.04),
  )
  // A drawn face is flatter and wider across the front, so the eyes have somewhere to sit.
  if (drawn)
    ell(head, 'head', E(0, -0.016, 0.028), [0.087 * full * hu, 0.064 * hu, 0.06 * hu], hk(0.03))
  const chinDrop = fc.chin
  for (const x of [-1, 1]) {
    cone(
      head,
      'head',
      // A drawn jaw runs from a wide cheek straight down to a small chin, wider on a man.
      E(x * (drawn ? 0.064 : 0.05) * fc.jaw * full, -0.045, -0.005),
      E(
        x * (drawn ? (0.008 + 0.008 * (1 - fem)) * full ** 3 : 0.016) * fc.jaw,
        -0.094 - chinDrop,
        0.052,
      ),
      (drawn ? 0.025 : 0.022) * fc.jaw * hu,
      (drawn ? 0.013 : 0.017) * hu,
      hk(0.04),
    )
    if (!drawn)
      cone(
        head,
        'head',
        E(x * 0.012, 0.031, 0.086),
        E(x * 0.058, 0.028, 0.066),
        0.008 * fc.brow * hu,
        0.007 * fc.brow * hu,
        hk(0.02),
      )
    ell(
      head,
      'head',
      E(x * (drawn ? 0.092 : 0.083), -0.012, -0.004),
      [0.011 * hu, 0.026 * hu, 0.017 * hu],
      hk(0.004),
      { rot: [0, 0, -x * 0.15], tag: 'ear' },
    )
  }
  ell(
    head,
    'head',
    E(0, -0.097 - chinDrop, 0.052),
    drawn
      ? [(0.014 + 0.008 * (1 - fem)) * fc.jaw * full ** 3 * hu, 0.015 * hu, 0.016 * hu]
      : [0.022 * fc.jaw * hu, 0.019 * hu, 0.02 * hu],
    hk(0.03),
  )

  // The face before anything is cut into it: where its surface is, straight ahead of a point.
  const bare = program(head)
  const faceZ = (x: number, yy: number) => {
    let lo = 0
    let hi = 0.2 * hu
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2
      if (bare(x * hu, eyeY + yy * hu, mid) < 0) lo = mid
      else hi = mid
    }
    return lo / hu
  }

  const eyeR = 0.0186 * fc.eye
  const eyeX = drawn ? (0.0165 + 0.0175 * fc.eye) * fc.eyeX : (0.031 + 0.006 * fc.eye) * fc.eyeX
  const eyeZ = 0.088 - eyeR
  /** A drawn eye: half its width and height, where its middle is, and the ball behind it. */
  const eyeW = 0.0175 * fc.eye
  const eyeH = eyeW * fc.lid
  const eyeDrop = -0.012
  const BALL = 0.058
  const drawnEyes: Shape['eyes'] = []
  const eyeFrames: { x: number; at: V3; out: V3; n: V3 }[] = []
  for (const x of [-1, 1]) {
    if (drawn) {
      // The eye lies along the face: its plane runs through the surface at its two corners, and
      // a large ball sits just behind that plane, so what shows through the opening is nearly flat.
      const zi = faceZ(x * (eyeX - eyeW * 0.85), eyeDrop)
      const zo = faceZ(x * (eyeX + eyeW * 0.85), eyeDrop)
      const yaw = x * Math.min(0.5, Math.atan2(zi - zo, 1.7 * eyeW))
      const nrm: V3 = [Math.sin(yaw), 0, Math.cos(yaw)]
      const out: V3 = [x * Math.cos(yaw), 0, -x * Math.sin(yaw)]
      const at = E(x * eyeX, eyeDrop, (zi + zo) / 2)
      eyeFrames.push({ x, at, out, n: nrm })
      ell(head, 'head', at, [eyeW * hu, eyeH * hu, 0.016 * hu], hk(0.0035), {
        sub: true,
        rot: [0, yaw, 0],
      })
      const back = (BALL + 0.0022) * hu
      drawnEyes.push({
        center: [at[0] - nrm[0] * back, at[1], at[2] - nrm[2] * back],
        radius: BALL * hu,
        yaw,
        open: [eyeW * hu, eyeH * hu],
      })
      continue
    }
    ell(
      head,
      'head',
      E(x * eyeX, 0.003, eyeZ + eyeR * 1.13),
      [eyeR * 1.18 * hu, eyeR * 0.97 * hu, eyeR * 0.65 * hu],
      hk(eyeR * 0.65),
      { sub: true },
    )
    sph(head, 'head', E(x * eyeX, 0, eyeZ), eyeR * 1.065 * hu, hk(0.004), { tag: 'lid' })
    ell(
      head,
      'head',
      E(x * eyeX, eyeR * 0.67, eyeZ + eyeR * 0.65),
      [eyeR * 1.02 * hu, eyeR * 0.24 * hu, eyeR * 0.43 * hu],
      hk(0.005),
      { tag: 'lid' },
    )
    ell(
      head,
      'head',
      E(x * eyeX, -eyeR * 0.12, eyeZ + eyeR * 1.13),
      [eyeR * 1.065 * hu, eyeR * fc.lid * hu, eyeR * 0.6 * hu],
      hk(0.0022),
      { sub: true, rot: [0, 0, x * 0.05] },
    )
  }

  const ns = fc.nose
  const kind = fc.noseKind
  const m = fc.mouth
  const lips = fc.lips
  const my = (drawn ? -0.076 : -0.0635) - chinDrop * 0.4
  if (drawn) {
    // A hint of a nose: a small tip and the faintest bridge down to it.
    const ny = -0.052
    const nz = faceZ(0, ny)
    cone(
      head,
      'head',
      E(0, ny + 0.022, faceZ(0, ny + 0.022) - 0.003),
      E(0, ny, nz + 0.001),
      0.004 * hu,
      0.0058 * ns * 1.6 * hu,
      hk(0.012),
      { tag: 'nose' },
    )
    sph(head, 'head', E(0, ny - 0.001, nz + 0.0035 * ns * 1.6), 0.0052 * ns * 1.6 * hu, hk(0.008), {
      tag: 'nose',
    })
    // And a mouth that is a line, with only a little lip under it.
    const mz = faceZ(0, my)
    ell(
      head,
      'head',
      E(0, my + 0.0022, mz - 0.0012),
      [0.0125 * m * hu, 0.002 * lips * hu, 0.004 * hu],
      hk(0.005),
      { tag: 'lip' },
    )
    ell(
      head,
      'head',
      E(0, my - 0.003, mz - 0.0016),
      [0.0095 * m * hu, 0.0028 * lips * hu, 0.0045 * hu],
      hk(0.006),
      { tag: 'lip' },
    )
    ell(head, 'head', E(0, my, mz + 0.003), [0.014 * m * hu, 0.0009 * hu, 0.008 * hu], hk(0.002), {
      sub: true,
    })
  } else {
    const tipR = (kind === 'broad' ? 0.0112 : kind === 'straight' ? 0.0086 : 0.0092) * ns
    const tipY = (kind === 'straight' ? -0.046 : -0.041) * ns
    const tipZ = 0.088 + (kind === 'straight' ? 0.016 : 0.012) * ns
    cone(
      head,
      'head',
      E(0, kind === 'straight' ? 0.004 : -0.004, 0.087),
      E(0, tipY + 0.003 * ns, tipZ + 0.003 * ns),
      0.0055 * ns * hu,
      (kind === 'straight' ? 0.0074 : 0.0082) * ns * hu,
      hk(0.012),
      { tag: 'nose' },
    )
    sph(head, 'head', E(0, tipY, tipZ), tipR * hu, hk(0.006), { tag: 'nose' })
    const alaX = (kind === 'broad' ? 0.0135 : 0.0105) * ns
    for (const x of [-1, 1]) {
      ell(
        head,
        'head',
        E(x * alaX, tipY - 0.004 * ns, 0.088 + 0.004 * ns),
        [0.0062 * ns * hu, 0.0058 * ns * hu, 0.0068 * ns * hu],
        hk(0.005),
        { tag: 'nose' },
      )
      ell(
        head,
        'head',
        E(x * alaX * 0.54, tipY - 0.0085 * ns, 0.088 + 0.0085 * ns),
        [0.0026 * ns * hu, 0.0016 * ns * hu, 0.0034 * ns * hu],
        hk(0.002),
        { sub: true },
      )
    }
    ell(
      head,
      'head',
      E(0, my + 0.0035, 0.0875),
      [0.015 * m * hu, 0.003 * lips * hu, 0.005 * hu],
      hk(0.006),
      { tag: 'lip' },
    )
    ell(
      head,
      'head',
      E(0, my - 0.004, 0.0855),
      [0.012 * m * hu, 0.0038 * lips * hu, 0.0055 * hu],
      hk(0.006),
      { tag: 'lip' },
    )
    ell(head, 'head', E(0, my, 0.091), [0.0155 * m * hu, 0.001 * hu, 0.009 * hu], hk(0.0025), {
      sub: true,
    })
    for (const x of [-1, 1])
      sph(head, 'head', E(x * 0.0148 * m, my + 0.0003, 0.0835), 0.0014 * hu, hk(0.003), {
        sub: true,
      })
  }
  for (const x of [-1, 1])
    ell(
      head,
      'head',
      E(x * (drawn ? 0.1 : 0.091), -0.015, 0),
      [0.006 * hu, 0.011 * hu, 0.008 * hu],
      hk(0.003),
      {
        sub: true,
      },
    )
  head.push(...body.filter((p) => p.bone === B('neck')))

  // What a drawn face has in ink: the lash line over each eye, heaviest toward the outer corner
  // where it ends in a short flick.
  const face: DrawnFace | null = drawn ? { eyeX, eyeW, eyeH, eyeDrop, faceZ } : null
  let lashes: Field | null = null
  if (drawn) {
    const strokes: Prim[] = []
    for (const f of eyeFrames) {
      // On the eye's own plane, or on the face where that stands further forward (the brow does).
      const on = (lx: number, ly: number, lz: number): V3 => {
        const px = f.at[0] + (f.out[0] * lx + f.n[0] * lz) * hu
        const py = f.at[1] + ly * hu
        const pz = f.at[2] + (f.out[2] * lx + f.n[2] * lz) * hu
        return [px, py, Math.max(pz, (faceZ(px / hu, (py - eyeY) / hu) + 0.0008) * hu)]
      }
      const arc = (deg: number): V3 => {
        const a = (deg * Math.PI) / 180
        return on(Math.cos(a) * eyeW * 1.03, Math.sin(a) * eyeH * 1.04, 0.0012)
      }
      // From just above the inner corner, over the top, to a little under the outer one.
      const lash = 0.5 + 0.3 * fem
      const stops = [168, 146, 120, 92, 64, 38, 14, -8]
      for (let i = 0; i + 1 < stops.length; i++) {
        const a = arc(stops[i])
        const b = arc(stops[i + 1])
        const r1 = (0.0018 + 0.0022 * Math.min(1, i / 4)) * lash * hu
        const r2 = (0.0018 + 0.0022 * Math.min(1, (i + 1) / 4)) * lash * hu
        strokes.push(
          prim(
            roundCone(a, b, r1, r2),
            a,
            len(b[0] - a[0], b[1] - a[1], b[2] - a[2]) + r2,
            0,
            0.004 * hu,
          ),
        )
      }
      if (fem < 0.5) continue
      const a = arc(24)
      const b = on(eyeW * 1.36, eyeH * 0.56, -0.003)
      strokes.push(
        prim(
          roundCone(a, b, 0.0042 * hu, 0.001 * hu),
          a,
          len(b[0] - a[0], b[1] - a[1], b[2] - a[2]) + 0.004 * hu,
          0,
          0.001 * hu,
        ),
      )
    }
    lashes = program(strokes)
  }

  // ---- skin fields -------------------------------------------------------------------------------
  const neckCut = chinY - 0.016 * u
  const wristCut = wristY + 0.008 * u
  const bodyF = program(body)
  const headF = program(head)
  const handF = program(hands)
  const armX = (shW + 0.118 * u * W * wide) / 2

  // Skin under opaque clothes is never seen, so it isn't meshed (keeps a clothed figure cheap).
  const tops = spec.layers.filter((l) => l.region === 'top' && l.type !== 'apron')
  const bottoms = spec.layers.filter((l) => l.region === 'bottom' && l.type !== 'skirt')
  const feet = spec.layers.filter((l) => l.region === 'feet')
  const margin = 0.035 * u
  const sleeveEnd = (l: Layer) =>
    l.sleeves === 'long'
      ? wristY + 0.012 * u
      : l.sleeves === 'short'
        ? shoulderY - 0.49 * (shoulderY - elbowY)
        : shoulderY + 1
  const hemOf = (l: Layer) =>
    l.type === 'croptop'
      ? waistY + (0.04 + 0.1 * l.length) * u
      : l.tucked
        ? waistY - 0.03 * u
        : l.type === 'dress' || l.type === 'robe'
          ? waistY - l.length * (waistY - ankleY)
          : waistY - l.length * (waistY - kneeY)
  const legEnd = (l: Layer) => hipY - l.length * (hipY - ankleY - 0.025 * u)
  const torsoFrom = tops.length ? Math.min(...tops.map(hemOf)) + margin : Number.POSITIVE_INFINITY
  const torsoTo = tops.length
    ? Math.min(
        ...tops.map((l) =>
          l.neck === 'v' && !tops.some((o) => o !== l && o.neck !== 'v')
            ? shoulderY - 0.13 * u
            : shoulderY - 0.02 * u,
        ),
      )
    : Number.NEGATIVE_INFINITY
  const armFrom = tops.length ? Math.min(...tops.map(sleeveEnd)) + margin : Number.POSITIVE_INFINITY
  const legFrom = bottoms.length
    ? Math.min(...bottoms.map(legEnd)) + margin
    : Number.POSITIVE_INFINITY
  const legTo = bottoms.length ? waistY - margin : Number.NEGATIVE_INFINITY
  const shoeTop = feet.length ? Math.min(...feet.map(() => ankleY + 0.04 * u)) - 0.015 * u : -1
  const hoseTopOf = (l: Layer) => kneeY + l.length * (hipY - kneeY)
  const hose = feet.find((l) => l.type === 'stockings')
  const hoseTop = hose ? hoseTopOf(hose) - margin : -1
  const hidden = (x: number, yy: number) => {
    const ax = Math.abs(x)
    if (yy < shoeTop) return true
    if (yy < hoseTop && ax < armX - 0.01 * u) return true
    if (yy > legFrom && yy < legTo && ax < armX - 0.01 * u) return true
    if (ax < armX - 0.005 * u) return yy > torsoFrom && yy < torsoTo
    return yy > armFrom && yy < shoulderY - 0.03 * u
  }
  const skinBody: Field = (x, yy, z) => {
    if (hidden(x, yy)) return Math.max(bodyF(x, yy, z), 0.004 * u)
    let d = smax(bodyF(x, yy, z), yy - neckCut, 0.004 * u)
    if (Math.abs(x) > armX) d = Math.max(d, wristCut - 0.012 * u - yy)
    return d
  }
  const skinHead: Field = (x, yy, z) =>
    smax(headF(x, yy, z) - 0.0004, neckCut - 0.018 * u - yy, 0.004 * u)
  const skinHands: Field = (x, yy, z) => smax(handF(x, yy, z) - 0.0003, yy - wristCut, 0.004 * u)
  const skinAll: Field = (x, yy, z) => {
    const d = Math.min(bodyF(x, yy, z), headF(x, yy, z), handF(x, yy, z))
    return hidden(x, yy) ? Math.max(d, 0.004 * u) : d
  }

  // ---- garments ----------------------------------------------------------------------------------
  const isLeg = (p: Prim) => /thigh|shin|foot/.test(BONES[p.bone])
  const torsoPrims = body.filter((p) => !isLeg(p) && !/Arm|hand|neck/.test(BONES[p.bone]))
  const upperArmPrims = body.filter((p) => /upperArm/.test(BONES[p.bone]))
  const foreArmPrims = body.filter((p) => /foreArm/.test(BONES[p.bone]))
  const legPrims = body.filter((p) => /pelvis|thigh|shin/.test(BONES[p.bone]))
  const footPrims = body.filter((p) => /foot|shin/.test(BONES[p.bone]))
  const pelvisPrims = body.filter((p) => /pelvis|spine/.test(BONES[p.bone]))
  const torsoF = program(torsoPrims)
  const legsF = program(legPrims)
  const feetF = program(footPrims)
  const pelvisF = program(pelvisPrims)
  const zc = -0.005 * u
  const hipRx = Math.max(0.122 * u * W * hipMul, hipX + 0.066 * u * W) + 0.01 * u
  const hipRz = 0.095 * u * W
  /** A flared elliptical drop from `top` to `hem`, wide enough to clear the thighs. */
  const skirt =
    (top: number, hem: number, off: number, flare: number): Field =>
    (x, yy, z) => {
      const t = Math.max(0, top - yy)
      const rx = hipRx + off + t * flare
      const rz = hipRz + off + t * flare * 0.8
      const d = (len(x / rx, (z - zc) / rz) - 1) * Math.min(rx, rz)
      return Math.max(d, yy - top, hem - yy)
    }
  // Drawn cloth hangs in a few broad folds, not a crumple.
  const crumple = drawn ? 0.45 : 1
  const folds = (x: number, yy: number, z: number, amp: number) =>
    ((n((x * 13) / u, (yy * 6) / u, (z * 13) / u) - 0.5) * amp * crumple +
      (n((x * 31) / u + 9, (yy * 12) / u, (z * 31) / u) - 0.5) * amp * 0.3 * (drawn ? 0 : 1)) *
    u

  const parts: PartDef[] = []
  const anatomy = [...body, ...head.filter((p) => p.bone === B('head')), ...hands]
  const pad = 0.05 * u
  const span = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => ({
    min: [x0, y0, z0] as V3,
    max: [x1, y1, z1] as V3,
  })
  const wideX = Math.max(shW + 0.09 * u * W, J['hand.L'][0] + 0.07 * u)
  const deepZ = 0.16 * u * W

  const garmentField = (
    l: Layer,
  ): {
    f: Field
    collar?: Field | null
    collarPaint?: (x: number, y: number, z: number) => string | null
    y0: number
    y1: number
    weightBy: Prim[]
    sigma: number
    below?: PartDef['below']
    flat: boolean
  } => {
    const off = l.offset * u
    const knit = l.material === 'knit'
    if (l.region === 'top') {
      const arms =
        l.sleeves === 'none'
          ? []
          : l.sleeves === 'long'
            ? [...upperArmPrims, ...foreArmPrims]
            : upperArmPrims
      const F = program([...torsoPrims, ...arms])
      const armHole = program(upperArmPrims, off + 0.016 * u)
      const sleeve = sleeveEnd(l)
      const hem = hemOf(l)
      const long = hem < hipY - 0.02 * u
      const flare =
        l.type === 'dress'
          ? 0.34
          : l.type === 'robe'
            ? 0.3
            : l.type === 'coat' || l.type === 'shell'
              ? 0.16
              : l.type === 'blazer' ||
                  l.type === 'jacket' ||
                  l.type === 'runner' ||
                  l.type === 'techvest'
                ? 0.1
                : l.type === 'apron'
                  ? 0.06
                  : 0.12
      const drop = long ? skirt(hipY + 0.03 * u, hem, off, flare) : null
      // A street jacket is cut a size too big.
      const loose = l.tucked
        ? 0
        : l.type === 'jacket'
          ? 0.014
          : l.type === 'runner'
            ? 0.022
            : l.type === 'techvest'
              ? 0.012
              : 0.006
      const quilted = l.type === 'techvest'
      const vBottom = shoulderY - 0.095 * u
      const f: Field = (x, yy, z) => {
        const inArm = Math.abs(x) > armX
        // The body's ease fades out toward the armhole, so the sleeve joins it without a step.
        const ease =
          off +
          lerp(
            0.0015 * u,
            clamp01((waistY + 0.1 * u - yy) / (0.3 * u)) * loose * u,
            clamp01((armX - Math.abs(x)) / (0.03 * u)),
          )
        let rib = 0
        if (knit && (yy < hem + 0.035 * u || (inArm && yy < sleeve + 0.03 * u)))
          rib = Math.sin(Math.atan2(x, z - zc) * 48) * 0.0012 * u
        let d = F(x, yy, z) - ease - rib + folds(x, yy, z, knit ? 0.002 : 0.005)
        // Padding, stitched across in rolls.
        if (quilted)
          d -= (0.5 + 0.5 * Math.cos(((yy - hem) / (0.052 * u)) * Math.PI * 2)) * 0.0055 * u
        if (l.sleeves === 'none') d = smax(d, -armHole(x, yy, z), 0.006 * u)
        d = smax(d, (inArm ? sleeve : long ? hipY : hem) - yy, 0.003 * u)
        if (drop) d = smin(d, drop(x, yy, z) + folds(x, yy, z, 0.006), 0.03 * u)
        // neckline
        d = smax(d, -(len(x, (z + 0.01 * u) * 1.15) - (neckR + 0.014 * u + off)), 0.008 * u)
        // A blazer's collar sits over a V opening: the lapels.
        if ((l.neck === 'v' || l.type === 'blazer') && z > 0)
          d = smax(
            d,
            yy - (vBottom - (l.type === 'blazer' ? 0.05 * u : 0) + Math.abs(x) * 2.2),
            0.004 * u,
          )
        d = smax(d, yy - neckTop, 0.006 * u)
        // A jacket hangs open down the front.
        if ((l.type === 'jacket' || l.type === 'runner') && z > 0)
          d = smax(d, 0.024 * u - Math.abs(x), 0.004 * u)
        if (l.type === 'apron')
          d = Math.max(d, Math.abs(x) - 0.105 * u * W, 0.02 * u - z, yy - (shoulderY - 0.06 * u))
        return d
      }
      const y0 = (long ? hem : Math.min(hem, inArmMin(l))) - 0.02 * u
      // A fold-down collar: a band that flares as it drops, open at the front in a V so its two
      // points lie on the chest. Thin, so it meshes as its own finer part.
      // A hoodie's hood, down: a thick soft roll lying round the back of the neck, open at the
      // front where the drawstrings would hang.
      const hood: Field | null =
        l.type === 'hoodie'
          ? (x, yy, z) => {
              const r = neckR + 0.03 * u + off
              const ring = len(len(x, (z + 0.02 * u) * 1.1) - r, (yy - (neckTop - 0.012 * u)) * 1.3)
              return Math.max(ring - 0.024 * u, z - 0.03 * u + Math.abs(x) * 0.35)
            }
          : null
      // Street clothes stand their collar up: a funnel round the neck, highest at the back, open
      // down the front on anything worn open.
      const funnel = l.type === 'runner' || l.type === 'shell' || l.type === 'techvest'
      const funnelFoot = neckTop - 0.03 * u
      const funnelTop = (z: number) =>
        neckTop + 0.01 * u + 0.034 * u * clamp01(0.55 - z / (0.09 * u))
      const stand: Field | null = funnel
        ? (x, yy, z) => {
            const rise = clamp01((yy - funnelFoot) / (0.075 * u))
            const r = neckR + 0.024 * u + off + rise * 0.014 * u
            let c = Math.max(
              Math.abs(len(x, (z + 0.01 * u) * 1.1) - r) - 0.0045 * u,
              yy - funnelTop(z),
              funnelFoot - yy,
            )
            if (l.type !== 'shell' && z > 0)
              c = Math.max(c, 0.012 * u + rise * 0.028 * u - Math.abs(x))
            return c
          }
        : null
      const collar: Field | null = stand
        ? stand
        : hood
          ? hood
          : l.neck === 'collar'
            ? (x, yy, z) => {
                const drop = clamp01((neckTop + 0.006 * u - yy) / (0.03 * u))
                const r = neckR + 0.016 * u + off + drop * 0.02 * u
                let c = Math.max(
                  Math.abs(len(x, (z + 0.01 * u) * 1.12) - r) - 0.0035 * u,
                  yy - (neckTop + 0.006 * u),
                  neckTop - 0.026 * u - yy,
                )
                if (z > 0) c = Math.max(c, 0.006 * u + drop * 0.022 * u - Math.abs(x))
                return c
              }
            : null
      return {
        f,
        collar,
        // The rim of a stood-up collar is lit.
        collarPaint: funnel
          ? (_x, yy, z) => (yy > funnelTop(z) - 0.009 * u ? lit(l.trim) : null)
          : undefined,
        y0,
        y1: neckTop + 0.03 * u,
        weightBy: [...torsoPrims, ...arms],
        sigma: 0.016 * u,
        below: long
          ? {
              y: hipY + 0.02 * u,
              maxX: armX,
              prims: [...pelvisPrims, ...legPrims.filter((p) => /thigh/.test(BONES[p.bone]))],
              sigma: 0.12 * u,
            }
          : undefined,
        flat: false,
      }
    }
    if (l.region === 'bottom') {
      if (l.type === 'skirt' || l.type === 'pleated') {
        const hem = waistY - l.length * (waistY - ankleY)
        const pleated = l.type === 'pleated'
        const drop = skirt(waistY, hem, off, pleated ? 0.42 : 0.25)
        // Pleats are knife folds all the way round, deeper toward the hem.
        const hang = (x: number, yy: number, z: number) =>
          pleated
            ? Math.sin(Math.atan2(x, z - zc) * 24) *
              0.0055 *
              u *
              clamp01((waistY - yy) / (0.09 * u))
            : folds(x, yy, z, 0.008)
        const f: Field = (x, yy, z) =>
          Math.min(
            drop(x, yy, z) + hang(x, yy, z),
            Math.max(pelvisF(x, yy, z) - off, yy - waistY, hipY - yy),
          )
        return {
          f,
          y0: hem - 0.02 * u,
          y1: waistY + 0.02 * u,
          weightBy: [...pelvisPrims, ...legPrims.filter((p) => /thigh/.test(BONES[p.bone]))],
          sigma: 0.12 * u,
          flat: false,
        }
      }
      const end = legEnd(l)
      const cuff = l.type === 'jeans' || l.type === 'joggers'
      const cargo = l.type === 'cargo'
      // Joggers are cut as full as cargo trousers, without the pockets.
      const baggy = cargo || l.type === 'joggers'
      // Cargo trousers: baggy from the hip down, gathered at the ankle, a pocket on each thigh.
      const pocketY = lerp(hipY, kneeY, 0.5)
      const pockets = cargo
        ? [-1, 1].map((x) =>
            box(
              [x * (J['thigh.L'][0] + 0.054 * u * M + off + 0.012 * u), pocketY, 0],
              [0.011 * u, 0.05 * u, 0.038 * u],
              0.008 * u,
            ),
          )
        : []
      const f: Field = (x, yy, z) => {
        const ease =
          off +
          clamp01((kneeY + 0.1 * u - yy) / (0.3 * u)) * 0.004 * u +
          (cuff && yy < end + 0.03 * u ? 0.004 * u : 0) +
          (baggy
            ? 0.007 * u * clamp01((hipY - yy) / (0.1 * u)) * clamp01(0.3 + (yy - end) / (0.08 * u))
            : 0)
        let d = legsF(x, yy, z) - ease + folds(x, yy, z, baggy ? 0.007 : 0.004)
        for (const pocket of pockets) d = Math.min(d, pocket(x, yy, z))
        // Two legs, however full the thighs or the cloth: a gap is kept between them.
        if (yy < hipY - 0.075 * u) d = smax(d, 0.006 * u - Math.abs(x), 0.005 * u)
        d = smax(d, yy - waistY, 0.003 * u)
        d = smax(d, end - yy, 0.003 * u)
        return d
      }
      return {
        f,
        y0: end - 0.02 * u,
        y1: waistY + 0.02 * u,
        weightBy: legPrims,
        sigma: 0.016 * u,
        flat: false,
      }
    }
    if (l.type === 'stockings') {
      const top = hoseTopOf(l)
      const hosePrims = body.filter((p) => /thigh|shin|foot/.test(BONES[p.bone]))
      const hoseF = program(hosePrims)
      // A band at the top, where it grips the thigh.
      const f: Field = (x, yy, z) =>
        Math.max(hoseF(x, yy, z) - off - (yy > top - 0.022 * u ? 0.002 * u : 0), yy - top, -yy)
      return {
        f,
        y0: -0.01,
        y1: top + 0.02 * u,
        weightBy: hosePrims,
        sigma: 0.016 * u,
        flat: false,
      }
    }
    if (l.region === 'feet') {
      const chunky = l.type === 'sneakers' || l.type === 'hightops'
      const top =
        l.type === 'boots'
          ? ankleY + 0.04 * u + l.length * (kneeY - ankleY - 0.08 * u)
          : l.type === 'hightops'
            ? ankleY + 0.095 * u
            : ankleY + 0.04 * u
      const f: Field = (x, yy, z) => {
        let d = feetF(x, yy, z) - off - (chunky ? 0.004 * u : 0)
        d = Math.max(d, yy - top)
        // A sneaker stands on a thick sole that shows all the way round.
        const sole = chunky
          ? Math.max(feetF(x, yy, z) - off - 0.009 * u, yy - 0.026 * u)
          : Math.max(feetF(x, yy, z) - off - 0.003 * u, yy - 0.012 * u)
        return Math.max(Math.min(d, sole), -yy)
      }
      return {
        f,
        y0: -0.01,
        y1: top + 0.02 * u,
        weightBy: footPrims,
        sigma: 0.016 * u,
        flat: false,
      }
    }
    // extras
    if (l.type === 'belt') {
      const by = waistY - 0.015 * u
      const front = frontZ(pelvisF, by, off) + 0.002 * u
      const buckle = box([0, by, front], [0.016 * u, 0.013 * u, 0.003 * u], 0.002 * u)
      const f: Field = (x, yy, z) => {
        // a thin band, not a solid disc through the waist
        const d = pelvisF(x, yy, z) - off - 0.002 * u
        return Math.min(
          Math.max(d, -d - 0.005 * u, Math.abs(yy - by) - 0.011 * u),
          buckle(x, yy, z),
        )
      }
      return {
        f,
        y0: by - 0.03 * u,
        y1: by + 0.03 * u,
        weightBy: pelvisPrims,
        sigma: 0.02 * u,
        flat: true,
      }
    }
    if (l.type === 'scarf') {
      const sy = neckTop - 0.008 * u
      const tailA: V3 = [0.03 * u, sy - 0.01 * u, 0.07 * u * W]
      const tailB: V3 = [0.045 * u, sy - 0.05 * u - l.length * 0.2 * u, 0.1 * u * W]
      const tail = roundCone(tailA, tailB, 0.02 * u, 0.017 * u)
      const f: Field = (x, yy, z) => {
        const ring = len(len(x, (z + 0.01 * u) * 1.05) - (neckR + 0.03 * u), yy - sy) - 0.022 * u
        return (
          smin(ring, Math.max(tail(x, yy, z), -0.004 * u - (z - 0.04 * u)), 0.01 * u) +
          folds(x, yy, z, 0.006)
        )
      }
      return {
        f,
        y0: tailB[1] - 0.04 * u,
        y1: sy + 0.05 * u,
        weightBy: [...torsoPrims, ...body.filter((p) => p.bone === B('neck'))],
        sigma: 0.03 * u,
        flat: false,
      }
    }
    // cape: a thin shell hanging behind, from the shoulders toward the knees
    const top = shoulderY + 0.02 * u
    const hem = top - l.length * (top - kneeY)
    const f: Field = (x, yy, z) => {
      const t = clamp01((top - yy) / (top - hem))
      const rx = shW + 0.05 * u + t * 0.12 * u
      const rz = 0.11 * u * W + 0.02 * u + t * 0.08 * u
      const d = Math.abs((len(x / rx, (z + 0.01 * u) / rz) - 1) * Math.min(rx, rz)) - 0.004 * u
      return (
        Math.max(d, yy - top, hem - yy, z + 0.035 * u - (top - yy) * 0.05) + folds(x, yy, z, 0.006)
      )
    }
    return {
      f,
      y0: hem - 0.02 * u,
      y1: top + 0.05 * u,
      weightBy: [...torsoPrims, ...pelvisPrims],
      sigma: 0.06 * u,
      flat: false,
    }
  }
  function inArmMin(l: Layer) {
    return l.sleeves === 'none' ? shoulderY : sleeveEnd(l)
  }

  /**
   * Where street clothes carry a second tone and their lit seams. Bands are wide enough to hold
   * a couple of the mesh's cells, or they break up.
   */
  const stripes = (l: Layer): Paint | null => {
    const glow = lit(l.trim)
    const panel = panelOf(l.color)
    const top = l.region === 'top'
    const hem = top ? hemOf(l) : 0
    const sleeve = top ? sleeveEnd(l) : 0
    const band = shoulderY - 0.5 * (shoulderY - elbowY)
    // Past the armhole and above the cuff: the skirt of a long coat is wider than the arms hang.
    const onArm = (x: number, yy: number) => Math.abs(x) > armX && yy > sleeve - 0.01 * u
    switch (l.type) {
      case 'runner':
        // A yoke, cuffs and a hem in the second tone; lit down both edges of the front and in a
        // ring round each upper arm.
        return (x, yy, z) => {
          if (onArm(x, yy))
            return Math.abs(yy - band) < 0.009 * u ? glow : yy < sleeve + 0.04 * u ? panel : null
          if (z > 0 && Math.abs(x) < 0.04 * u) return glow
          return yy > shoulderY - 0.035 * u || yy < hem + 0.026 * u ? panel : null
        }
      case 'shell':
        // Zipped off-centre in light, a lit line over a dark hem, and a lit ring over each cuff.
        return (x, yy, z) => {
          if (onArm(x, yy))
            return Math.abs(yy - (sleeve + 0.055 * u)) < 0.008 * u
              ? glow
              : yy < sleeve + 0.045 * u
                ? panel
                : null
          if (z > 0 && Math.abs(x - 0.032 * u) < 0.0075 * u && yy < neckTop) return glow
          if (Math.abs(yy - (hem + 0.085 * u)) < 0.008 * u) return glow
          return yy < hem + 0.075 * u || yy > shoulderY - 0.03 * u ? panel : null
        }
      case 'techvest':
        // A lit zip, and the shoulders in the second tone.
        return (x, yy, z) =>
          z > 0 && Math.abs(x) < 0.0075 * u ? glow : yy > shoulderY - 0.03 * u ? panel : null
      case 'hoodie':
        // The cords light up, and so does a ring round each upper arm.
        return (x, yy, z) => {
          if (Math.abs(x) > armX) return Math.abs(yy - band) < 0.008 * u ? glow : null
          return z > 0 &&
            Math.abs(Math.abs(x) - 0.024 * u) < 0.0065 * u &&
            yy < neckTop - 0.025 * u &&
            yy > neckTop - 0.115 * u
            ? glow
            : null
        }
      case 'joggers': {
        // A lit stripe down the outside of each leg, to a cuff in the second tone.
        const end = legEnd(l)
        const outside = J['thigh.L'][0] + 0.022 * u
        return (x, yy, z) =>
          yy < end + 0.032 * u
            ? panel
            : yy < hipY + 0.02 * u && Math.abs(x) > outside && Math.abs(z - zc) < 0.013 * u
              ? glow
              : null
      }
      default:
        return null
    }
  }

  // Layers render from the stack; colors are flat apart from shoe soles, belt buckles and the
  // stripes of street clothes.
  const garmentFields: Field[] = []
  spec.layers.forEach((l, i) => {
    const g = garmentField(l)
    garmentFields.push(g.f)
    const thickSole = l.type === 'sneakers' || l.type === 'hightops'
    const sole = thickSole
      ? SOLE
      : l.region === 'feet' && l.type !== 'stockings'
        ? darken(l.color)
        : null
    const soleY = (thickSole ? 0.027 : 0.013) * u
    const welt = l.type === 'hightops' ? lit(l.trim) : null
    const by = waistY - 0.015 * u
    parts.push({
      name: `${l.type}#${i}`,
      material: l.material,
      field: g.f,
      ...span(-wideX - pad, wideX + pad, Math.max(-0.01, g.y0), g.y1, -deepZ - pad, deepZ + pad),
      // The ink line shows every step in an edge, so a drawn garment is meshed a little finer.
      near:
        l.material === 'knit' || l.type === 'belt'
          ? 0.0048
          : l.region === 'feet'
            ? 0.005
            : drawn
              ? 0.0056
              : 0.0068,
      far: l.type === 'belt' ? 0.012 : 0.024,
      weightBy: g.weightBy,
      sigma: g.sigma,
      below: g.below,
      paint:
        l.region === 'feet'
          ? // High-tops have a lit line where the upper meets the sole.
            (_x, yy) => (yy < soleY ? sole : welt && yy < soleY + 0.012 * u ? welt : null)
          : l.type === 'belt'
            ? (x, yy) =>
                Math.abs(x) < 0.017 * u && Math.abs(yy - by) < 0.014 * u ? spec.colors.metal : null
            : (stripes(l) ?? l.color),
    })
    parts[parts.length - 1].paint = paintWith(l.color, parts[parts.length - 1].paint)
    if (g.collar) {
      parts.push({
        name: `${l.type}#${i}.collar`,
        material: l.material,
        field: g.collar,
        min: [-0.12 * u, neckTop - 0.04 * u, -0.12 * u],
        max: [0.12 * u, neckTop + (g.collarPaint ? 0.06 : 0.02) * u, 0.12 * u],
        near: 0.0022,
        far: null,
        nearOnly: true,
        weightBy: [...torsoPrims, ...body.filter((p) => p.bone === B('neck'))],
        sigma: 0.02 * u,
        paint: g.collarPaint ? paintWith(l.color, g.collarPaint) : l.color,
      })
    }
  })

  // ---- hair, brows, beard ----------------------------------------------------------------------
  const headOnly = head.filter((p) => p.bone === B('head'))
  const hairParts = hairFields(spec, E, hu, n, chinY, face)
  const headBox = (below: number, h0: number) => ({
    min: [-0.13 * hu, eyeY - below * hu, -0.16 * hu] as V3,
    max: [0.13 * hu, eyeY + h0 * hu, 0.15 * hu] as V3,
  })
  if (hairParts.hair) {
    const long =
      spec.hair === 'long' ||
      spec.hair === 'braid' ||
      spec.hair === 'ponytail' ||
      (drawn && (spec.hair === 'fringe' || spec.hair === 'twintails'))
    const reach = hairParts.reach
    parts.push({
      name: 'hair',
      material: 'hair',
      field: hairParts.hair,
      ...(reach
        ? {
            min: [-0.2 * hu, eyeY - reach * hu, -0.24 * hu] as V3,
            max: [0.2 * hu, eyeY + 0.25 * hu, 0.16 * hu] as V3,
          }
        : headBox(long ? (spec.hair === 'braid' ? 0.75 : 0.5) : 0.12, 0.2)),
      near: 0.0034,
      far: 0.012,
      weightBy: long
        ? [...headOnly, ...body.filter((p) => /neck|chest/.test(BONES[p.bone]))]
        : headOnly,
      sigma: long ? 0.05 * u : 0.02 * u,
      paint: hairParts.shine
        ? (
            (shine, lit) => (x: number, yy: number, z: number) =>
              shine(x, yy, z) ? lit : null
          )(hairParts.shine, lighten(spec.colors.hair, 0.3))
        : spec.colors.hair,
    })
    parts[parts.length - 1].paint = paintWith(spec.colors.hair, parts[parts.length - 1].paint)
  }
  parts.push({
    name: 'brows',
    material: 'hair',
    field: hairParts.brows,
    ...headBox(-0.01, 0.07),
    near: 0.0015,
    far: null,
    weightBy: headOnly,
    sigma: 0.02 * u,
    paint: spec.colors.brow,
    nearOnly: true,
  })
  if (lashes) {
    parts.push({
      name: 'lashes',
      material: 'hair',
      field: lashes,
      min: [-0.1 * hu, eyeY - 0.05 * hu, 0.02 * hu],
      max: [0.1 * hu, eyeY + 0.05 * hu, 0.12 * hu],
      near: 0.0011,
      far: null,
      weightBy: headOnly,
      sigma: 0.02 * u,
      paint: spec.colors.ink,
      nearOnly: true,
    })
  }
  if (hairParts.beard) {
    parts.push({
      name: 'beard',
      material: 'hair',
      field: hairParts.beard,
      ...headBox(0.16, -0.02),
      near: 0.0028,
      far: 0.012,
      weightBy: headOnly,
      sigma: 0.02 * u,
      paint: spec.colors.hair,
    })
  }

  // ---- hats ------------------------------------------------------------------------------------
  const hat = hatField(spec, E, hu)
  if (hat) {
    parts.push({
      name: 'hat',
      material: spec.hat === 'straw' || spec.hat === 'beanie' ? 'knit' : 'cloth',
      field: hat,
      min: [-0.27 * hu, eyeY - 0.2 * hu, -0.27 * hu],
      max: [0.27 * hu, eyeY + (spec.hat === 'chef' ? 0.32 : 0.26) * hu, 0.27 * hu],
      near: 0.0045,
      far: 0.014,
      weightBy:
        spec.hat === 'hood' ? [...headOnly, ...body.filter((p) => p.bone === B('neck'))] : headOnly,
      sigma: 0.03 * u,
      paint: spec.colors.hat,
    })
  }

  // ---- bag ---------------------------------------------------------------------------------------
  if (spec.accessories.includes('bag')) {
    const sx = -(shW + 0.02 * u)
    const sat = box(
      [-(shW + 0.035 * u), hipY + 0.01 * u, 0.0],
      [0.022 * u, 0.065 * u, 0.075 * u],
      0.012 * u,
    )
    const strapPlane = (x: number, yy: number) => (x - sx) * 0.62 - (yy - shoulderY) * 0.78
    const outer = spec.layers
      .filter((l) => l.region === 'top')
      .reduce((a, l) => Math.max(a, l.offset), 0)
    const f: Field = (x, yy, z) => {
      const strap = Math.max(
        torsoF(x, yy, z) - (outer + 0.022) * u,
        Math.abs(strapPlane(x, yy)) - 0.016 * u,
      )
      return Math.min(strap, sat(x, yy, z))
    }
    parts.push({
      name: 'bag',
      material: 'leather',
      field: f,
      ...span(-wideX - 0.06 * u, wideX, hipY - 0.1 * u, neckTop, -deepZ, deepZ),
      near: 0.0055,
      far: 0.016,
      weightBy: [...torsoPrims, ...pelvisPrims],
      sigma: 0.05 * u,
      paint: spec.colors.bag,
    })
  }

  // ---- headphones, mask, backpack ---------------------------------------------------------------
  if (spec.accessories.includes('headphones')) {
    const cups = [-1, 1].map((x) =>
      ellipsoid(E(x * 0.11, -0.008, -0.004), [0.015 * hu, 0.034 * hu, 0.03 * hu]),
    )
    // Under a hat there is no room for the band, so only the cups show.
    const banded = spec.hat === 'none'
    const f: Field = (x, yy, z) => {
      const cup = Math.min(cups[0](x, yy, z), cups[1](x, yy, z))
      if (!banded) return cup
      const lx = x / hu
      const ly = (yy - eyeY) / hu
      const lz = z / hu
      const ring = Math.abs(len(lx / 0.119, ly / 0.176) - 1) * 0.119
      return Math.min(cup, Math.max(len(ring, (lz + 0.004) * 0.5) - 0.0065, -ly - 0.01) * hu)
    }
    parts.push({
      name: 'headphones',
      material: 'leather',
      field: f,
      min: [-0.15 * hu, eyeY - 0.06 * hu, -0.06 * hu],
      max: [0.15 * hu, eyeY + 0.2 * hu, 0.05 * hu],
      near: 0.004,
      far: 0.012,
      weightBy: headOnly,
      sigma: 0.02 * u,
      // The outer face of each cup is lit in the world's accent.
      paint: (x) => (Math.abs(x) > 0.1195 * hu ? spec.colors.accent : DARK),
    })
  }
  if (spec.accessories.includes('mask')) {
    const under = program(headOnly.filter((p) => !p.sub))
    const jaw = -(0.116 + spec.face.chin) - 0.006
    const f: Field = (x, yy, z) => {
      const lx = x / hu
      const ly = (yy - eyeY) / hu
      // Solid from the skin out: only its outer face and its edge are ever seen.
      const shell = under(x, yy, z) - 0.007 * hu
      return Math.max(
        shell,
        (ly - (-0.03 + Math.abs(lx) * 0.28)) * hu,
        (jaw - ly) * hu,
        0.004 * hu - z,
      )
    }
    parts.push({
      name: 'mask',
      material: 'cloth',
      field: f,
      min: [-0.11 * hu, eyeY - 0.15 * hu, 0],
      max: [0.11 * hu, eyeY + 0.01 * hu, 0.13 * hu],
      near: 0.0026,
      far: 0.008,
      weightBy: headOnly,
      sigma: 0.02 * u,
      paint: DARK,
    })
  }
  if (spec.accessories.includes('visor')) {
    const under = program(headOnly.filter((p) => !p.sub))
    // A band across the eyes and round to the ears, solid from the skin out like the mask.
    const band = (yy: number) => Math.abs((yy - eyeY) / hu - 0.004)
    const f: Field = (x, yy, z) =>
      Math.max(under(x, yy, z) - 0.02 * hu, (band(yy) - 0.036) * hu, -0.03 * hu - z)
    parts.push({
      name: 'visor',
      material: 'leather',
      field: f,
      min: [-0.15 * hu, eyeY - 0.06 * hu, -0.04 * hu],
      max: [0.15 * hu, eyeY + 0.06 * hu, 0.16 * hu],
      near: 0.0026,
      far: 0.008,
      weightBy: headOnly,
      sigma: 0.02 * u,
      // One lit slit across the front.
      paint: (_x, yy, z) => (band(yy) < 0.011 && z > 0.03 * hu ? lit(spec.colors.trim) : DARK),
    })
  }
  if (spec.accessories.includes('backpack')) {
    const outer = spec.layers
      .filter((l) => l.region === 'top')
      .reduce((a, l) => Math.max(a, l.offset), 0)
    const by = J.chest[1] - 0.012 * u
    const back = -(0.082 * u * mass * ribW + soft + outer * u + 0.045 * u)
    const pack = box([0, by, back], [0.082 * u, 0.115 * u, 0.042 * u], 0.03 * u)
    const strapX = 0.066 * u * ribW
    const f: Field = (x, yy, z) => {
      const strap = Math.max(
        torsoF(x, yy, z) - (outer + 0.024) * u,
        Math.abs(Math.abs(x) - strapX) - 0.011 * u,
        by - 0.085 * u - yy,
      )
      return Math.min(strap, pack(x, yy, z))
    }
    parts.push({
      name: 'backpack',
      material: 'leather',
      field: f,
      ...span(-0.13 * u, 0.13 * u, by - 0.14 * u, neckTop + 0.02 * u, back - 0.06 * u, deepZ),
      near: 0.0055,
      far: 0.016,
      weightBy: torsoPrims,
      sigma: 0.05 * u,
      paint: spec.colors.bag,
    })
  }

  // ---- skin parts (first, so they draw under everything) -----------------------------------------
  // A body shown part-built is painted as what it is: bone, or muscle.
  const bodyPaint =
    level === 'bones' ? BONE_WHITE : level === 'muscle' ? MUSCLE_RED : spec.colors.skin
  const endPaint = level === 'bones' ? BONE_WHITE : spec.colors.skin
  const skin: PartDef[] = [
    {
      name: 'body',
      material: 'skin',
      field: skinBody,
      ...span(-wideX - pad, wideX + pad, -0.01, neckCut + 0.01 * u, -deepZ, deepZ),
      near: 0.0085,
      far: null,
      weightBy: anatomy,
      sigma: 0.016 * u,
      paint: bodyPaint,
      nearOnly: true,
    },
    {
      name: 'head',
      material: 'skin',
      field: skinHead,
      ...headBox(0.116 + spec.face.chin + 0.07, 0.14),
      near: 0.0024,
      far: null,
      weightBy: anatomy,
      sigma: 0.016 * u,
      paint: endPaint,
      nearOnly: true,
    },
    {
      name: 'hands',
      material: 'skin',
      field: skinHands,
      ...span(-wideX - pad, wideX + pad, wristY - 0.2 * u, wristCut + 0.01 * u, -0.1 * u, 0.1 * u),
      near: 0.0022,
      far: null,
      weightBy: anatomy,
      sigma: 0.016 * u,
      paint: endPaint,
      nearOnly: true,
    },
    {
      name: 'skin',
      material: 'skin',
      field: skinAll,
      ...span(-wideX - pad, wideX + pad, -0.01, H + 0.02, -deepZ - 0.04 * u, deepZ + 0.04 * u),
      near: 0.02,
      far: 0.02,
      weightBy: anatomy,
      sigma: 0.02 * u,
      paint: bodyPaint,
      farOnly: true,
    },
  ]
  parts.unshift(...skin)

  // ---- shading inputs ------------------------------------------------------------------------------
  const tagged = (tag: string) => program(head.filter((p) => p.tag === tag))
  const lipF = tagged('lip')
  const noseF = tagged('nose')
  const earF = tagged('ear')
  // A drawn face blushes just under the eyes.
  const blushAt = (x: number): V3 =>
    face
      ? E(
          x * (eyeX + 0.004),
          eyeDrop - eyeH - 0.013,
          faceZ(x * eyeX, eyeDrop - eyeH - 0.013) - 0.004,
        )
      : E(x * 0.048, -0.035, 0.075)
  const cheeks = program(
    [-1, 1].map((x) => prim(sphere(blushAt(x), 0.014 * hu), blushAt(x), 0.014 * hu, 0)),
  )
  const near = (f: Field, x: number, yy: number, z: number, w: number) =>
    clamp01(1 - f(x, yy, z) / (w * hu))
  const stubble = spec.facialHair === 'stubble'
  const jawLine = chinY + 0.02 * hu
  const skinPaint = (x: number, yy: number, z: number) => {
    if (yy < neckCut - 0.03 * u) return { lip: 0, flush: 0, stubble: 0 }
    // The rim of a drawn eye is inked all the way round, like a line of kohl.
    let rim = 0
    for (const f of eyeFrames) {
      const dx = x - f.at[0]
      const dz = z - f.at[2]
      const lx = (dx * f.out[0] + dz * f.out[2]) / hu
      const ly = (yy - f.at[1]) / hu
      const lz = (dx * f.n[0] + dz * f.n[2]) / hu
      if (lz > -0.03 && lz < 0.03 && len(lx / (eyeW * 1.05), ly / (eyeH * 1.05)) < 1) rim = 1
    }
    // And the mouth is one stroke, turned up a little at its ends, under a tick for the nose.
    if (drawn && rim === 0 && z > 0.04 * hu) {
      const lx = x / hu
      const ly = (yy - eyeY) / hu
      if (Math.abs(lx - 0.003) < 0.0035 && Math.abs(ly + 0.0585 - (lx - 0.003) * 0.5) < 0.0016)
        rim = 0.55
      if (Math.abs(lx) < 0.019 * m && Math.abs(ly - my - lx * lx * 7) < 0.0019) rim = 0.8
    }
    return {
      ink: rim,
      lip: near(lipF, x, yy, z, 0.002),
      flush:
        spec.face.blush *
        Math.max(
          near(cheeks, x, yy, z, 0.03) * 0.8,
          near(noseF, x, yy, z, 0.005) * 0.5,
          near(earF, x, yy, z, 0.004) * 0.6,
        ),
      stubble: stubble
        ? clamp01((eyeY - 0.055 * hu - yy) / (0.02 * hu)) *
          clamp01((yy - (jawLine - 0.05 * hu)) / (0.02 * hu)) *
          clamp01((z + 0.02 * hu) / (0.04 * hu)) *
          (1 - near(lipF, x, yy, z, 0.004))
        : 0,
    }
  }

  const occluder: Field = (x, yy, z) => {
    let d = Math.min(bodyF(x, yy, z), headF(x, yy, z), handF(x, yy, z))
    for (const l of spec.layers) {
      if (l.region === 'top') d = Math.min(d, torsoF(x, yy, z) - l.offset * u)
      else if (l.region === 'bottom') d = Math.min(d, legsF(x, yy, z) - l.offset * u)
    }
    return d
  }

  const glasses = spec.accessories.includes('glasses')
    ? {
        center: drawn ? E(0, eyeDrop, faceZ(eyeX, eyeDrop) + 0.016) : E(0, 0.002, 0.088 + 0.012),
        ring: (drawn ? Math.max(eyeW, eyeH) * 1.12 : eyeR * 1.45) * hu,
        spacing: eyeX * hu,
        tube: 0.0018 * hu,
      }
    : undefined
  const staff = spec.accessories.includes('staff')
    ? { length: H * 1.05, radius: 0.011 * u }
    : undefined

  return {
    joints,
    height: H,
    eyes: drawn
      ? drawnEyes
      : [-1, 1].map((x) => ({ center: E(x * eyeX, 0, eyeZ), radius: eyeR * 0.985 * hu })),
    lidRadius: (drawn ? BALL + 0.0012 : eyeR * 1.035) * hu,
    parts,
    occluder,
    skinPaint,
    marks: { hipY, thigh: hipY - kneeY, shin: kneeY - ankleY, eyeY, headH, waistY },
    props: { glasses, staff },
  }
}

/** z of the surface of `f` straight ahead of the midline at height `y`, plus `off`. */
function frontZ(f: Field, y: number, off: number) {
  let lo = 0
  let hi = 0.5
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (f(0, y, mid) - off < 0) lo = mid
    else hi = mid
  }
  return lo
}

/** A sneaker's sole, a part-built body's bone and muscle, and the dark of masks and headphones. */
const SOLE = '#e8e0d4'
const BONE_WHITE = '#e8e0d4'
const MUSCLE_RED = '#a8572c'
const DARK = '#24222a'

/** `hex` moved `t` of the way to white. */
function lighten(hex: string, t: number) {
  const v = Number.parseInt(hex.slice(1), 16)
  const c = (sh: number) => Math.round(((v >> sh) & 255) + (255 - ((v >> sh) & 255)) * t)
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`
}

function darken(hex: string) {
  const v = Number.parseInt(hex.slice(1), 16)
  const c = (s: number) => Math.round(((v >> s) & 255) * 0.45)
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`
}

/** `hex` as paint that shines by its own light (see `LIT`). */
const lit = (hex: string) => `${LIT}${hex}`

/** The second tone of a two-tone garment: lighter on dark cloth, darker on light. */
function panelOf(hex: string) {
  const v = Number.parseInt(hex.slice(1), 16)
  const lum = (0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255
  if (lum < 0.3) return lighten(hex, 0.2)
  const c = (s: number) => Math.round(((v >> s) & 255) * 0.62)
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`
}

function paintWith(base: string, p: Paint): Paint {
  if (typeof p === 'string') return p
  return (x, y, z) => p(x, y, z) ?? base
}

type HeadPoint = (x: number, y: number, z: number) => V3

/** Hair, brows, and facial hair over the cranium. */
function hairFields(
  spec: FigureSpec,
  E: HeadPoint,
  hu: number,
  n: Field,
  chinY: number,
  face: DrawnFace | null,
) {
  const style = spec.hair
  const eye = E(0, 0, 0)
  const toLocal = (x: number, y: number, z: number) => [x / hu, (y - eye[1]) / hu, z / hu] as const
  const fc = spec.face
  const eyeX = (0.031 + 0.006 * fc.eye) * fc.eyeX

  const bw = fc.browWeight
  const brows = face
    ? program(
        // A drawn brow is one thin stroke following the forehead over each eye.
        [-1, 1].flatMap((x) => {
          const top = face.eyeDrop + face.eyeH
          const on = (t: number, lift: number): V3 => {
            const px = x * (face.eyeX + t * face.eyeW)
            return E(px, top + lift, face.faceZ(px, top + lift) + 0.002)
          }
          const a = on(-0.85, 0.013)
          const m = on(0.15, 0.02)
          const b = on(1.05, 0.013)
          const stroke = (p: V3, q: V3, r1: number, r2: number) =>
            prim(
              roundCone(p, q, r1 * bw * hu, r2 * bw * hu),
              p,
              len(q[0] - p[0], q[1] - p[1], q[2] - p[2]) + 0.004 * hu,
              0,
              0.001 * hu,
            )
          return [stroke(a, m, 0.0036, 0.0034), stroke(m, b, 0.0034, 0.002)]
        }),
      )
    : program(
        [-1, 1].map((x) => {
          const a = E(x * (eyeX - 0.022), 0.038, 0.095)
          const b = E(x * (eyeX + 0.027), 0.042, 0.074)
          return prim(
            roundCone(a, b, 0.0046 * bw * hu, 0.0028 * bw * hu),
            a,
            len(b[0] - a[0], b[1] - a[1], b[2] - a[2]) + 0.006 * hu,
            0,
          )
        }),
      )

  let hair: Field | null = null
  let shine: ((x: number, y: number, z: number) => boolean) | null = null
  let reach = 0
  if (style !== 'bald' && face) {
    const drawnHair = drawHair(spec, E, hu, toLocal, face)
    hair = drawnHair.field
    shine = drawnHair.shine
    reach = drawnHair.reach
  } else if (style !== 'bald') {
    const thick = style === 'cropped' ? 0.004 : 0.01
    const cap = ellipsoid(E(0, 0.04, -0.014), [
      (0.083 + thick) * hu,
      (0.11 + thick) * hu,
      (0.105 + thick) * hu,
    ])
    const extras: Field[] = []
    if (style === 'swept' || style === 'short') {
      const lobes: [V3, V3, V3][] =
        style === 'swept'
          ? [
              [
                [-0.05, 0.1, 0.07],
                [0.05, 0.035, 0.035],
                [0.3, 0, -0.5],
              ],
              [
                [0.0, 0.11, 0.075],
                [0.06, 0.03, 0.035],
                [0.35, 0, -0.35],
              ],
              [
                [0.05, 0.095, 0.065],
                [0.04, 0.03, 0.03],
                [0.3, 0, -0.2],
              ],
              [
                [0.07, 0.07, 0.03],
                [0.03, 0.04, 0.04],
                [0, 0, 0.3],
              ],
              [
                [-0.075, 0.07, 0.02],
                [0.03, 0.045, 0.045],
                [0, 0, -0.3],
              ],
            ]
          : [
              [
                [-0.035, 0.085, 0.075],
                [0.045, 0.022, 0.03],
                [0.5, 0, -0.25],
              ],
              [
                [0.025, 0.088, 0.078],
                [0.05, 0.022, 0.03],
                [0.5, 0, -0.1],
              ],
            ]
      extras.push(
        program(
          lobes.map(([c, r, rot]) =>
            prim(
              ellipsoid(E(...c), [r[0] * hu, r[1] * hu, r[2] * hu], rot),
              E(...c),
              Math.max(...r) * hu,
              0,
              0.02 * hu,
            ),
          ),
        ),
      )
    }
    if (style === 'long') {
      const back = ellipsoid(E(0, -0.07, -0.05), [0.098 * hu, 0.15 * hu, 0.075 * hu])
      const sides = program(
        [-1, 1].map((x) => {
          const a = E(x * 0.075, 0.02, 0.02)
          const b = E(x * 0.085, -0.15, -0.01)
          return prim(
            roundCone(a, b, 0.03 * hu, 0.026 * hu),
            a,
            len(0.01, 0.17, 0.03) * hu + 0.03 * hu,
            0,
            0.02 * hu,
          )
        }),
      )
      extras.push((x, y, z) => smin(back(x, y, z), sides(x, y, z), 0.03 * hu))
    }
    if (style === 'bun') extras.push(sphere(E(0, 0.1, -0.1), 0.045 * hu))
    if (style === 'ponytail') {
      const a = E(0, 0.04, -0.11)
      const m = E(0, -0.04, -0.14)
      const b = E(0, -0.2, -0.13)
      const t1 = roundCone(a, m, 0.03 * hu, 0.026 * hu)
      const t2 = roundCone(m, b, 0.026 * hu, 0.012 * hu)
      extras.push((x, y, z) => smin(t1(x, y, z), t2(x, y, z), 0.01 * hu))
    }
    if (style === 'braid') {
      const links = Array.from({ length: 9 }, (_, i) =>
        sphere(E(0, 0.02 - i * 0.032, -0.115 - Math.min(i, 2) * 0.008), (0.026 - i * 0.0015) * hu),
      )
      extras.push((x, y, z) => {
        let d = 1e9
        for (const l of links) d = smin(d, l(x, y, z), 0.006 * hu)
        return d
      })
    }
    const longHair = style === 'long'
    hair = (x, y, z) => {
      const [lx, ly, lz] = toLocal(x, y, z)
      const front = clamp01((lz + 0.02) / 0.09)
      // Hairline: high over the forehead, down at the nape, lifted over the ears.
      let line =
        0.06 * front -
        0.055 * (1 - front) +
        Math.max(0, 0.03 - Math.abs(Math.abs(lx) - 0.082) * 1.5) * 0.9
      if (longHair) line = Math.min(line, lz < 0.035 ? -0.3 : line)
      const ang = Math.atan2(lx, lz)
      const clumps =
        Math.sin(ang * 18 + ly * 30 + n(lx * 8, ly * 8, lz * 8) * 4) *
        (style === 'cropped' ? 0.0008 : 0.0026)
      let d = cap(x, y, z)
      for (const e of extras) d = smin(d, e(x, y, z), 0.015 * hu)
      d += clumps * hu
      d = smax(d, (line - ly) * hu, 0.01 * hu)
      if (longHair) {
        // keep the face clear and stop above the shoulders' front
        d = smax(
          d,
          -(len(lx * 1.1, (ly + 0.03) * 0.85) - 0.08) * hu - (lz > 0.03 ? 0 : 1),
          0.008 * hu,
        )
        d = smax(d, chinY - 0.09 * hu - y, 0.01 * hu)
      }
      return d
    }
  }

  let beard: Field | null = null
  if (spec.facialHair === 'beard' || spec.facialHair === 'moustache') {
    const chin = spec.face.chin
    const my = -0.0635 - chin * 0.4
    const stache = program(
      [-1, 1].map((x) => {
        const a = E(x * 0.002, my + 0.009, 0.092)
        const b = E(x * 0.022, my + 0.001, 0.084)
        return prim(roundCone(a, b, 0.0055 * hu, 0.0035 * hu), a, 0.03 * hu, 0)
      }),
    )
    if (spec.facialHair === 'moustache')
      beard = (x, y, z) => stache(x, y, z) + (n(x * 300, y * 300, z * 300) - 0.5) * 0.0008
    else {
      const jaw = ellipsoid(E(0, -0.075 - chin, 0.035), [
        0.07 * spec.face.jaw * hu,
        0.06 * hu,
        0.07 * hu,
      ])
      beard = (x, y, z) => {
        const [, ly, lz] = toLocal(x, y, z)
        let d = jaw(x, y, z) - 0.004 * hu
        d = smax(d, ly - (-0.03 - Math.max(0, -lz) * 0.4), 0.01 * hu)
        d = smax(d, -(lz + 0.02), 0.01 * hu)
        // mouth stays clear
        d = smax(d, -(len((x / hu) * 0.8, ly - my, (lz - 0.09) * 0.6) - 0.016) * hu, 0.004 * hu)
        d += (n(x * 200, y * 200, z * 200) - 0.5) * 0.0012 * hu
        return Math.min(d, stache(x, y, z))
      }
    }
  }
  return { hair, brows, beard, shine, reach }
}

/**
 * Hair the way it is drawn: a full cap of it over the skull, and over that a few thick locks
 * that each taper to a point. A fringe of them falls over the forehead from the hairline, one
 * hangs in front of each ear, and the style decides what the back does. `reach` is how far below
 * the eye line the hair gets, in head units, and `shine` marks the band of light round the crown.
 */
function drawHair(
  spec: FigureSpec,
  E: HeadPoint,
  hu: number,
  toLocal: (x: number, y: number, z: number) => readonly [number, number, number],
  face: DrawnFace,
) {
  const style = spec.hair
  const hatted = spec.hat !== 'none'
  const thick = style === 'cropped' ? 0.004 : hatted ? 0.005 : 0.014
  const cap = ellipsoid(E(0, 0.04, -0.014), [
    (0.093 + thick) * hu,
    (0.11 + thick) * hu,
    (0.108 + thick) * hu,
  ])
  const locks: Prim[] = []
  type P = [number, number, number]
  /** One lock through `pts` (head units), as thick as `radii` at each. */
  const strand = (pts: P[], radii: number[], k = 0.006) => {
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = E(...pts[i])
      const b = E(...pts[i + 1])
      locks.push(
        prim(
          roundCone(a, b, radii[i] * hu, radii[i + 1] * hu),
          a,
          len(b[0] - a[0], b[1] - a[1], b[2] - a[2]) + Math.max(radii[i], radii[i + 1]) * hu,
          0,
          (i === 0 ? k : 0.004) * hu,
        ),
      )
    }
  }
  const fz = face.faceZ
  const eyeTop = face.eyeDrop + face.eyeH
  // Under a hat the fringe starts at the brim instead of the crown.
  const rootY = hatted ? 0.072 : 0.112
  const rootZ = hatted ? 0.078 : 0.07
  /** A fringe: a lock from the hairline at each `xs`, ending where `tip` says. */
  const fringe = (xs: number[], tip: (x: number, i: number) => [number, number], r = 0.019) =>
    xs.forEach((x0, i) => {
      const [tx, ty] = tip(x0, i)
      const mx = (x0 + tx) / 2
      const my = (rootY + ty) / 2 + (hatted ? 0.004 : 0.012)
      strand(
        [
          [x0 * 0.85, rootY, rootZ - Math.abs(x0) * 0.25],
          [mx, my, fz(mx, my) + 0.012],
          [tx, ty, fz(tx, ty) + 0.007],
        ],
        [hatted ? r * 0.75 : r, r * 0.9, 0.0035],
      )
    })
  /** The lock in front of each ear, down to `tipY`. */
  const sides = (tipY: number, r = 0.017) => {
    for (const x of [-1, 1])
      strand(
        [
          [x * 0.086, hatted ? 0.05 : 0.07, 0.035],
          [x * 0.096, ((hatted ? 0.05 : 0.07) + tipY) / 2, 0.04],
          [x * 0.088, tipY, 0.045],
        ],
        [r, r * 0.95, 0.004],
      )
  }
  const even = [-0.066, -0.044, -0.022, 0, 0.022, 0.044, 0.066]
  const five = [-0.06, -0.03, 0, 0.03, 0.06]
  const backs: Field[] = []
  let nape = -0.055
  let reach = 0.14

  if (style === 'fringe' || style === 'bob' || style === 'twintails') {
    // Cut straight across, just clear of the eyes.
    fringe(even, (x, i) => [x * 1.02, eyeTop + 0.013 + (i % 2) * 0.006])
    sides(style === 'bob' ? -0.09 : -0.115)
  } else if (style === 'long' || style === 'ponytail' || style === 'bun' || style === 'braid') {
    fringe(five, (x, i) => [x * 1.1 + 0.004, eyeTop + 0.02 + (i % 2) * 0.01], 0.021)
    sides(style === 'bun' ? -0.06 : -0.11)
  } else if (style === 'short') {
    fringe(five, (x, i) => [x * 1.15, 0.05 + (i % 2) * 0.012], 0.017)
    sides(-0.012, 0.014)
  } else if (style === 'spiky') {
    fringe(
      [-0.065, -0.04, -0.015, 0.012, 0.04, 0.065],
      (x, i) => [x * 1.35 + (i % 2 ? 0.01 : -0.008), eyeTop + 0.02 + (i % 3) * 0.014],
      0.018,
    )
    sides(-0.025, 0.015)
  } else if (style === 'swept') {
    // All of it combed across to one side, longest where it lands.
    fringe([-0.06, -0.035, -0.01, 0.015, 0.04, 0.062], (x) => [
      x * 0.9 + 0.034,
      eyeTop + 0.03 - (x + 0.06) * 0.25,
    ])
    sides(-0.03, 0.015)
  } else if (style === 'curtain') {
    // Parted in the middle and falling away to each temple, the forehead left open.
    fringe([-0.062, -0.04, -0.018, 0.018, 0.04, 0.062], (x) => {
      const out = Math.sign(x) * (0.034 - Math.abs(x) * 0.22)
      return [x + out, eyeTop + 0.03 - Math.abs(x) * 0.9]
    })
    sides(-0.06)
  }

  const window = (lx: number, ly: number, lz: number) =>
    -(len(lx * 1.1, (ly + 0.03) * 0.85) - 0.072) * hu - (lz > 0.03 ? 0 : 1)
  if (style === 'bob') {
    backs.push(ellipsoid(E(0, -0.015, -0.03), [0.11 * hu, 0.115 * hu, 0.096 * hu]))
    nape = -0.1
  }
  if (style === 'long' || style === 'fringe') {
    // Round the head, then a sheet of it down the back, clear of the shoulders.
    const drop = style === 'fringe' ? 0.36 : 0.27
    backs.push(ellipsoid(E(0, -0.03, -0.045), [0.108 * hu, 0.12 * hu, 0.085 * hu]))
    backs.push(
      ellipsoid(E(0, -drop / 2 - 0.03, -0.112), [0.088 * hu, (drop / 2 + 0.03) * hu, 0.036 * hu]),
    )
    nape = -drop - 0.04
    reach = drop + 0.1
  }
  if (style === 'twintails') {
    for (const x of [-1, 1])
      strand(
        [
          [x * 0.085, 0.07, -0.035],
          [x * 0.122, 0.035, -0.05],
          [x * 0.136, -0.1, -0.078],
          [x * 0.122, -0.32, -0.088],
        ],
        [0.02, 0.03, 0.03, 0.006],
        0.012,
      )
    reach = 0.36
  }
  if (style === 'ponytail') {
    strand(
      [
        [0, 0.075, -0.1],
        [0, 0.035, -0.158],
        [0, -0.08, -0.172],
        [0, -0.27, -0.145],
      ],
      [0.03, 0.037, 0.031, 0.007],
      0.012,
    )
    reach = 0.31
  }
  if (style === 'bun') backs.push(sphere(E(0, 0.105, -0.105), 0.05 * hu))
  if (style === 'braid') {
    for (let i = 0; i < 9; i++)
      backs.push(
        sphere(E(0, 0.02 - i * 0.032, -0.118 - Math.min(i, 2) * 0.008), (0.027 - i * 0.0015) * hu),
      )
    reach = 0.3
  }
  if (style === 'swept' && !hatted)
    backs.push(
      ellipsoid(E(0.012, 0.118, 0.02), [0.07 * hu, 0.034 * hu, 0.07 * hu], [0.25, 0, -0.2]),
    )
  if (style === 'spiky' && !hatted) {
    // Spikes thrown up and back from the crown.
    const dirs: P[] = [
      [0, 1, 0.12],
      [0.5, 0.86, 0.05],
      [-0.5, 0.86, 0.05],
      [0.28, 0.82, -0.5],
      [-0.28, 0.82, -0.5],
      [0.82, 0.5, -0.2],
      [-0.82, 0.5, -0.2],
      [0, 0.55, -0.84],
      [0.58, 0.32, -0.75],
      [-0.58, 0.32, -0.75],
      [0.2, 0.9, 0.4],
      [-0.25, 0.92, 0.3],
    ]
    dirs.forEach(([dx, dy, dz], i) => {
      const far = 1 + (i % 3) * 0.1
      strand(
        [
          [dx * 0.07, 0.04 + dy * 0.09, -0.014 + dz * 0.085],
          [dx * 0.142 * far, 0.04 + dy * 0.165 * far, -0.014 + dz * 0.16 * far],
        ],
        [0.03, 0.004],
        0.014,
      )
    })
    reach = 0.14
  }

  const locksF = locks.length ? program(locks) : null
  const cropped = style === 'cropped'
  const field: Field = (x, y, z) => {
    const [lx, ly, lz] = toLocal(x, y, z)
    const front = clamp01((lz + 0.02) / 0.09)
    // Hairline: high over the forehead (the fringe covers it), down at the nape, lifted over the ears.
    const line =
      (cropped ? 0.07 : 0.088) * front +
      nape * (1 - front) +
      Math.max(0, 0.03 - Math.abs(Math.abs(lx) - 0.09) * 1.5) * 0.9 * (nape > -0.06 ? 1 : 0)
    let d = cap(x, y, z)
    for (const b of backs) d = smin(d, b(x, y, z), 0.016 * hu)
    d = smax(d, (line - ly) * hu, 0.008 * hu)
    // Hair that comes down past the ears stays off the face.
    if (nape < -0.06) d = smax(d, window(lx, ly, lz), 0.008 * hu)
    if (locksF) d = smin(d, locksF(x, y, z), 0.007 * hu)
    return d
  }
  // The ring of light an animator paints round the crown, broken into a zigzag.
  const shine = (x: number, y: number, z: number) => {
    const [lx, ly, lz] = toLocal(x, y, z)
    if (cropped || hatted || lz < -0.06) return false
    const ang = Math.atan2(lx, lz)
    const zig = Math.abs(((ang * 7) % 1) - 0.5) * 0.02
    return Math.abs(ly - (0.094 + zig)) < 0.01
  }
  return { field, shine, reach }
}

function hatField(spec: FigureSpec, E: HeadPoint, hu: number): Field | null {
  const h = spec.hat
  if (h === 'none') return null
  const crown = ellipsoid(E(0, 0.045, -0.014), [0.103 * hu, 0.124 * hu, 0.121 * hu])
  const eye = E(0, 0, 0)[1]
  const ly = (y: number) => (y - eye) / hu
  if (h === 'cap') {
    const visor = ellipsoid(E(0, 0.072, 0.1), [0.075 * hu, 0.008 * hu, 0.07 * hu])
    return (x, y, z) => {
      const shell = Math.max(crown(x, y, z), (0.068 - ly(y)) * hu)
      return Math.min(shell, Math.max(visor(x, y, z), -(z / hu - 0.06) * hu))
    }
  }
  if (h === 'chef') {
    // A band round the head, a straight tube above it, and a soft puff on top.
    const puff = ellipsoid(E(0, 0.21, -0.02), [0.118 * hu, 0.072 * hu, 0.118 * hu])
    const cz = E(0, 0, -0.016)[2]
    return (x, y, z) => {
      const band = Math.max(crown(x, y, z) - 0.004 * hu, (0.06 - ly(y)) * hu)
      const tube = Math.max(len(x / hu, (z - cz) / hu) - 0.1, 0.06 - ly(y), ly(y) - 0.2) * hu
      return smin(Math.min(band, tube), puff(x, y, z), 0.025 * hu)
    }
  }
  if (h === 'beanie') {
    // A close knitted cap, lower at the back, with a turned-up cuff round its edge.
    const tight = ellipsoid(E(0, 0.045, -0.014), [0.105 * hu, 0.128 * hu, 0.124 * hu])
    return (x, y, z) => {
      const edge = 0.045 - Math.max(0, -z / hu) * 0.5
      const shell = tight(x, y, z)
      const cap = Math.max(shell, (edge - ly(y)) * hu)
      const cuff = Math.max(shell - 0.005 * hu, (edge - ly(y)) * hu, (ly(y) - edge - 0.03) * hu)
      return Math.min(cap, cuff)
    }
  }
  if (h === 'bandana') {
    return (x, y, z) => {
      const tight = ellipsoid(E(0, 0.04, -0.014), [0.101 * hu, 0.12 * hu, 0.117 * hu])(x, y, z)
      const knot = sphere(E(0, 0.02, -0.12), 0.018 * hu)(x, y, z)
      return smin(
        Math.max(tight, (0.05 - ly(y) - Math.max(0, -z / hu) * 0.35) * hu),
        knot,
        0.01 * hu,
      )
    }
  }
  if (h === 'straw' || h === 'brim') {
    const wide = h === 'straw' ? 0.25 : 0.17
    const brimY = h === 'straw' ? 0.065 : 0.075
    const top = h === 'straw' ? 0.2 : 0.21
    return (x, y, z) => {
      const r = len(x / hu, (z - E(0, 0, -0.012)[2]) / hu)
      const crownTop = Math.max(crown(x, y, z) - 0.006 * hu, ly(y) - top, (brimY - ly(y)) * 1)
      const brim =
        Math.max(
          r - wide,
          Math.abs(ly(y) - brimY - (r - 0.1) * (h === 'straw' ? -0.05 : 0.12) * (r > 0.1 ? 1 : 0)) -
            0.004,
        ) * hu
      return Math.min(crownTop, brim)
    }
  }
  // hood: a shell over the head, open at the face, falling to the shoulders
  return (x, y, z) => {
    const outer = ellipsoid(E(0, 0.0, -0.03), [0.12 * hu, 0.175 * hu, 0.15 * hu])(x, y, z)
    const shell = Math.abs(outer + 0.006 * hu) - 0.006 * hu
    const [lx, lyy, lz] = [x / hu, ly(y), z / hu]
    let d = smax(
      shell,
      -(len(lx * 1.05, (lyy + 0.01) * 0.82) - 0.085) * hu - (lz > 0.02 ? 0 : 1),
      0.01 * hu,
    )
    d = smax(d, (-0.14 - lyy) * hu, 0.01 * hu)
    return d
  }
}
