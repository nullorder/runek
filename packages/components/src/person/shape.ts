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
import type { FigureSpec, Layer, MaterialKind } from './spec'

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

export interface Shape {
  joints: V3[]
  height: number
  eyes: { center: V3; radius: number }[]
  /** Radius of the blink lid shell (between the eyeball and the lid skin). */
  lidRadius: number
  parts: PartDef[]
  /** Everything solid, for baked occlusion. */
  occluder: Field
  /** Skin shading inputs (lips, flush, stubble) for the skin parts. */
  skinPaint: (x: number, y: number, z: number) => { lip: number; flush: number; stubble: number }
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
  const fem = spec.fem
  const H = spec.height
  const headH = H / spec.headsTall
  const hu = headH / HEAD0
  const eyeY = H - headH * 0.548
  const chinY = eyeY - (0.116 + spec.face.chin) * hu
  const Bh = chinY
  const u = Bh / BODY0
  const girth = spec.build === 'slim' ? 0.86 : spec.build === 'stocky' ? 1.2 : 1
  const W = st.mass * girth * (spec.age === 'child' ? 0.92 : 1)
  const wide = 1.06 - 0.13 * fem
  const hipMul = 1 + 0.1 * fem
  const legs = st.legs
  const n = noise3(spec.seed)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  // ---- skeleton --------------------------------------------------------------------------------
  const shW = st.shoulder * Bh * wide * (0.94 + girth * 0.06)
  const hipX = 0.0505 * Bh * hipMul * (0.9 + girth * 0.1)
  const y = (f: number) => f * Bh
  const J: Record<BoneName, V3> = {
    root: [0, 0, 0],
    pelvis: [0, y(0.65 + legs), 0],
    spine: [0, y(0.736 + legs * 0.6), 0],
    chest: [0, y(0.837 + legs * 0.3), 0],
    neck: [0, y(0.96), -0.018 * u],
    head: [0, chinY + 0.017 * hu, -0.012 * hu],
    'upperArm.L': [shW, y(0.949), -0.012 * u],
    'foreArm.L': [shW + 0.0217 * Bh, y(0.765), -0.03 * u],
    'hand.L': [shW + 0.0318 * Bh, y(0.599), -0.008 * u],
    'upperArm.R': [-shW, y(0.949), -0.012 * u],
    'foreArm.R': [-(shW + 0.0217 * Bh), y(0.765), -0.03 * u],
    'hand.R': [-(shW + 0.0318 * Bh), y(0.599), -0.008 * u],
    'thigh.L': [hipX, y(0.617 + legs), 0],
    'shin.L': [hipX + 0.003 * Bh, y(0.339 + legs * 0.55), 0.01 * u],
    'foot.L': [hipX + 0.0043 * Bh, y(0.0505), -0.018 * u],
    'thigh.R': [-hipX, y(0.617 + legs), 0],
    'shin.R': [-(hipX + 0.003 * Bh), y(0.339 + legs * 0.55), 0.01 * u],
    'foot.R': [-(hipX + 0.0043 * Bh), y(0.0505), -0.018 * u],
  }
  const shoulderY = J['upperArm.L'][1]
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
  const bu = (x: number, yy: number, z: number): V3 => [x * u * W, yy, z * u * W]

  // ---- torso -----------------------------------------------------------------------------------
  ell(
    body,
    'pelvis',
    [0, pelvisY + 0.005 * u, -0.005 * u],
    [0.122 * u * W * hipMul, 0.08 * u, 0.088 * u * W],
    0,
  )
  for (const x of [-1, 1])
    ell(
      body,
      'pelvis',
      [x * 0.05 * u * W * hipMul, pelvisY - 0.05 * u, -0.038 * u * W],
      [0.064 * u * W * hipMul, 0.072 * u, 0.058 * u * W * hipMul],
      0.04 * u,
    )
  ell(
    body,
    'spine',
    [0, J.spine[1] + 0.01 * u, 0.004 * u],
    [0.104 * u * W * (1 - 0.06 * fem), 0.13 * u, 0.078 * u * W],
    0.07 * u,
  )
  ell(
    body,
    'chest',
    [0, J.chest[1] + 0.03 * u, -0.006 * u],
    [0.118 * u * W * wide, 0.145 * u, 0.082 * u * W],
    0.06 * u,
  )
  if (spec.age !== 'child') {
    for (const x of [-1, 1]) {
      if (fem > 0.5)
        ell(
          body,
          'chest',
          bu(x * 0.05, J.chest[1] + 0.012 * u, 0.052),
          [0.05 * u * W, 0.046 * u, 0.044 * u * W],
          0.04 * u,
        )
      else if (fem < 0.5)
        ell(
          body,
          'chest',
          bu(x * 0.052, J.chest[1] + 0.045 * u, 0.04),
          [0.06 * u * W, 0.045 * u, 0.04 * u * W],
          0.035 * u,
        )
    }
  }
  for (const x of [-1, 1])
    cone(
      body,
      'chest',
      [0, shoulderY + 0.03 * u, -0.03 * u],
      [x * (shW - 0.025 * u), shoulderY + 0.003 * u, -0.018 * u],
      0.033 * u * W,
      0.028 * u * W,
      0.04 * u,
    )
  const neckR = 0.037 * u * (1 - 0.1 * fem) * Math.sqrt(W)
  cone(
    body,
    'neck',
    [0, J.neck[1] - 0.03 * u, -0.02 * u],
    [0, J.head[1] + 0.025 * hu, -0.008 * hu],
    neckR,
    neckR * 0.92,
    0.03 * u,
  )

  // ---- limbs -----------------------------------------------------------------------------------
  for (const tag of ['L', 'R'] as const) {
    const x = tag === 'L' ? 1 : -1
    const sh = J[`upperArm.${tag}`]
    const el = J[`foreArm.${tag}`]
    const wr = J[`hand.${tag}`]
    ell(
      body,
      `upperArm.${tag}`,
      [sh[0] + x * 0.002 * u, sh[1] - 0.015 * u, sh[2]],
      [0.038 * u * W, 0.048 * u, 0.04 * u * W],
      0.03 * u,
    )
    cone(body, `upperArm.${tag}`, sh, el, 0.033 * u * W, 0.026 * u * W, 0.015 * u)
    cone(body, `foreArm.${tag}`, el, wr, 0.027 * u * W, 0.019 * u * W, 0.01 * u)
    const hp = J[`thigh.${tag}`]
    const kn = J[`shin.${tag}`]
    const an = J[`foot.${tag}`]
    cone(body, `thigh.${tag}`, hp, kn, 0.066 * u * W * (1 + 0.05 * fem), 0.042 * u * W, 0.045 * u)
    cone(body, `shin.${tag}`, kn, an, 0.041 * u * W, 0.024 * u * W, 0.015 * u)
    ell(
      body,
      `shin.${tag}`,
      [kn[0] + x * 0.002 * u, lerp(an[1], kn[1], 0.68), -0.018 * u * W],
      [0.038 * u * W, 0.09 * u, 0.036 * u * W],
      0.03 * u,
    )
    ell(
      body,
      `foot.${tag}`,
      [an[0], 0.04 * u, an[2] - 0.015 * u],
      [0.028 * u, 0.038 * u, 0.04 * u],
      0.025 * u,
    )
    ell(
      body,
      `foot.${tag}`,
      [an[0] + x * 0.003 * u, 0.028 * u, an[2] + 0.075 * u],
      [0.036 * u, 0.024 * u, 0.068 * u],
      0.035 * u,
    )

    // hand: palm toward the thigh, four slim fingers and a thumb
    const hs = 0.82 * u * W ** 0.3
    const [hx, hy, hz] = wr
    cone(
      hands,
      `foreArm.${tag}`,
      [hx - x * 0.002 * u, hy + 0.05 * u, hz],
      wr,
      0.021 * u * W,
      0.019 * u * W,
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
  ell(head, 'head', E(0, 0.035, -0.012), [0.083 * hu, 0.11 * hu, 0.105 * hu], 0)
  ell(head, 'head', E(0, -0.03, 0.024), [0.073 * fc.cheek * hu, 0.066 * hu, 0.071 * hu], hk(0.04))
  const chinDrop = fc.chin
  for (const x of [-1, 1]) {
    cone(
      head,
      'head',
      E(x * 0.05 * fc.jaw, -0.045, -0.005),
      E(x * 0.016 * fc.jaw, -0.094 - chinDrop, 0.052),
      0.022 * fc.jaw * hu,
      0.017 * hu,
      hk(0.04),
    )
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
      E(x * 0.083, -0.012, -0.004),
      [0.011 * hu, 0.026 * hu, 0.017 * hu],
      hk(0.004),
      { rot: [0, 0, -x * 0.15], tag: 'ear' },
    )
  }
  ell(
    head,
    'head',
    E(0, -0.097 - chinDrop, 0.052),
    [0.022 * fc.jaw * hu, 0.019 * hu, 0.02 * hu],
    hk(0.03),
  )

  const eyeR = 0.0186 * fc.eye
  const eyeX = (0.031 + 0.006 * fc.eye) * fc.eyeX
  const eyeZ = 0.088 - eyeR
  for (const x of [-1, 1]) {
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

  const m = fc.mouth
  const lips = fc.lips
  const my = -0.0635 - chinDrop * 0.4
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
  for (const x of [-1, 1]) {
    sph(head, 'head', E(x * 0.0148 * m, my + 0.0003, 0.0835), 0.0014 * hu, hk(0.003), { sub: true })
    ell(head, 'head', E(x * 0.091, -0.015, 0), [0.006 * hu, 0.011 * hu, 0.008 * hu], hk(0.003), {
      sub: true,
    })
  }
  head.push(...body.filter((p) => p.bone === B('neck')))

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
    l.tucked
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
  const hidden = (x: number, yy: number) => {
    const ax = Math.abs(x)
    if (yy < shoeTop) return true
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
  const folds = (x: number, yy: number, z: number, amp: number) =>
    ((n((x * 13) / u, (yy * 6) / u, (z * 13) / u) - 0.5) * amp +
      (n((x * 31) / u + 9, (yy * 12) / u, (z * 31) / u) - 0.5) * amp * 0.3) *
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
            : l.type === 'coat'
              ? 0.16
              : l.type === 'apron'
                ? 0.06
                : 0.12
      const drop = long ? skirt(hipY + 0.03 * u, hem, off, flare) : null
      const loose = l.tucked ? 0 : 0.006
      const vBottom = shoulderY - 0.095 * u
      const f: Field = (x, yy, z) => {
        const inArm = Math.abs(x) > armX
        const ease =
          off + (inArm ? 0.0015 * u : clamp01((waistY + 0.1 * u - yy) / (0.3 * u)) * loose * u)
        let rib = 0
        if (knit && (yy < hem + 0.035 * u || (inArm && yy < sleeve + 0.03 * u)))
          rib = Math.sin(Math.atan2(x, z - zc) * 48) * 0.0012 * u
        let d = F(x, yy, z) - ease - rib + folds(x, yy, z, knit ? 0.002 : 0.005)
        if (l.sleeves === 'none') d = smax(d, -armHole(x, yy, z), 0.006 * u)
        d = smax(d, (inArm ? sleeve : long ? hipY : hem) - yy, 0.003 * u)
        if (drop) d = smin(d, drop(x, yy, z) + folds(x, yy, z, 0.006), 0.03 * u)
        // neckline
        d = smax(d, -(len(x, (z + 0.01 * u) * 1.15) - (neckR + 0.014 * u + off)), 0.008 * u)
        if (l.neck === 'v' && z > 0) d = smax(d, yy - (vBottom + Math.abs(x) * 2.2), 0.004 * u)
        d = smax(d, yy - neckTop, 0.006 * u)
        if (l.type === 'apron')
          d = Math.max(d, Math.abs(x) - 0.105 * u * W, 0.02 * u - z, yy - (shoulderY - 0.06 * u))
        return d
      }
      const y0 = (long ? hem : Math.min(hem, inArmMin(l))) - 0.02 * u
      // A fold-down collar: a band that flares as it drops, open at the front in a V so its two
      // points lie on the chest. Thin, so it meshes as its own finer part.
      const collar: Field | null =
        l.neck === 'collar'
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
      if (l.type === 'skirt') {
        const hem = waistY - l.length * (waistY - ankleY)
        const drop = skirt(waistY, hem, off, 0.25)
        const f: Field = (x, yy, z) =>
          Math.min(
            drop(x, yy, z) + folds(x, yy, z, 0.008),
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
      const cuff = l.type === 'jeans'
      const f: Field = (x, yy, z) => {
        const ease =
          off +
          clamp01((kneeY + 0.1 * u - yy) / (0.3 * u)) * 0.004 * u +
          (cuff && yy < end + 0.03 * u ? 0.004 * u : 0)
        let d = legsF(x, yy, z) - ease + folds(x, yy, z, 0.004)
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
    if (l.region === 'feet') {
      const top =
        l.type === 'boots'
          ? ankleY + 0.04 * u + l.length * (kneeY - ankleY - 0.08 * u)
          : ankleY + 0.04 * u
      const f: Field = (x, yy, z) => {
        let d = feetF(x, yy, z) - off
        d = Math.max(d, yy - top)
        const sole = Math.max(feetF(x, yy, z) - off - 0.003 * u, yy - 0.012 * u)
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

  // Layers render from the stack; colors are flat apart from shoe soles and belt buckles.
  const garmentFields: Field[] = []
  spec.layers.forEach((l, i) => {
    const g = garmentField(l)
    garmentFields.push(g.f)
    const sole = l.region === 'feet' ? darken(l.color) : null
    const by = waistY - 0.015 * u
    parts.push({
      name: `${l.type}#${i}`,
      material: l.material,
      field: g.f,
      ...span(-wideX - pad, wideX + pad, Math.max(-0.01, g.y0), g.y1, -deepZ - pad, deepZ + pad),
      near:
        l.material === 'knit' || l.type === 'belt' ? 0.0048 : l.region === 'feet' ? 0.005 : 0.0068,
      far: l.type === 'belt' ? 0.012 : 0.024,
      weightBy: g.weightBy,
      sigma: g.sigma,
      below: g.below,
      paint:
        l.region === 'feet'
          ? (_x, yy) => (yy < 0.013 * u ? sole : null)
          : l.type === 'belt'
            ? (x, yy) =>
                Math.abs(x) < 0.017 * u && Math.abs(yy - by) < 0.014 * u ? spec.colors.metal : null
            : l.color,
    })
    parts[parts.length - 1].paint = paintWith(l.color, parts[parts.length - 1].paint)
    if (g.collar) {
      parts.push({
        name: `${l.type}#${i}.collar`,
        material: l.material,
        field: g.collar,
        min: [-0.12 * u, neckTop - 0.04 * u, -0.12 * u],
        max: [0.12 * u, neckTop + 0.02 * u, 0.12 * u],
        near: 0.0022,
        far: null,
        nearOnly: true,
        weightBy: [...torsoPrims, ...body.filter((p) => p.bone === B('neck'))],
        sigma: 0.02 * u,
        paint: l.color,
      })
    }
  })

  // ---- hair, brows, beard ----------------------------------------------------------------------
  const headOnly = head.filter((p) => p.bone === B('head'))
  const hairParts = hairFields(spec, E, hu, n, chinY)
  const headBox = (below: number, h0: number) => ({
    min: [-0.13 * hu, eyeY - below * hu, -0.16 * hu] as V3,
    max: [0.13 * hu, eyeY + h0 * hu, 0.15 * hu] as V3,
  })
  if (hairParts.hair) {
    const long = spec.hair === 'long' || spec.hair === 'braid' || spec.hair === 'ponytail'
    parts.push({
      name: 'hair',
      material: 'hair',
      field: hairParts.hair,
      ...headBox(long ? (spec.hair === 'braid' ? 0.75 : 0.5) : 0.12, 0.2),
      near: 0.0034,
      far: 0.012,
      weightBy: long
        ? [...headOnly, ...body.filter((p) => /neck|chest/.test(BONES[p.bone]))]
        : headOnly,
      sigma: long ? 0.05 * u : 0.02 * u,
      paint: spec.colors.hair,
    })
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
      material: spec.hat === 'straw' ? 'knit' : 'cloth',
      field: hat,
      min: [-0.27 * hu, eyeY - 0.2 * hu, -0.27 * hu],
      max: [0.27 * hu, eyeY + 0.26 * hu, 0.27 * hu],
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
        Math.abs(torsoF(x, yy, z) - (outer + 0.006) * u) - 0.003 * u,
        Math.abs(strapPlane(x, yy)) - 0.018 * u,
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

  // ---- skin parts (first, so they draw under everything) -----------------------------------------
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
      paint: spec.colors.skin,
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
      paint: spec.colors.skin,
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
      paint: spec.colors.skin,
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
      paint: spec.colors.skin,
      farOnly: true,
    },
  ]
  parts.unshift(...skin)

  // ---- shading inputs ------------------------------------------------------------------------------
  const tagged = (tag: string) => program(head.filter((p) => p.tag === tag))
  const lipF = tagged('lip')
  const noseF = tagged('nose')
  const earF = tagged('ear')
  const cheeks = program(
    [-1, 1].map((x) =>
      prim(
        sphere(E(x * 0.048, -0.035, 0.075), 0.014 * hu),
        E(x * 0.048, -0.035, 0.075),
        0.014 * hu,
        0,
      ),
    ),
  )
  const near = (f: Field, x: number, yy: number, z: number, w: number) =>
    clamp01(1 - f(x, yy, z) / (w * hu))
  const stubble = spec.facialHair === 'stubble'
  const jawLine = chinY + 0.02 * hu
  const skinPaint = (x: number, yy: number, z: number) => {
    if (yy < neckCut - 0.03 * u) return { lip: 0, flush: 0, stubble: 0 }
    return {
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
        center: E(0, 0.002, 0.088 + 0.012),
        ring: eyeR * 1.45 * hu,
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
    eyes: [-1, 1].map((x) => ({ center: E(x * eyeX, 0, eyeZ), radius: eyeR * 0.985 * hu })),
    lidRadius: eyeR * 1.035 * hu,
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

function darken(hex: string) {
  const v = Number.parseInt(hex.slice(1), 16)
  const c = (s: number) => Math.round(((v >> s) & 255) * 0.45)
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, '0')}`
}

function paintWith(base: string, p: Paint): Paint {
  if (typeof p === 'string') return p
  return (x, y, z) => p(x, y, z) ?? base
}

type HeadPoint = (x: number, y: number, z: number) => V3

/** Hair, brows, and facial hair over the cranium. */
function hairFields(spec: FigureSpec, E: HeadPoint, hu: number, n: Field, chinY: number) {
  const style = spec.hair
  const eye = E(0, 0, 0)
  const toLocal = (x: number, y: number, z: number) => [x / hu, (y - eye[1]) / hu, z / hu] as const
  const fc = spec.face
  const eyeX = (0.031 + 0.006 * fc.eye) * fc.eyeX

  const bw = fc.browWeight
  const brows = program(
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
  if (style !== 'bald') {
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
          -(len(lx * 1.1, (ly + 0.03) * 0.85) - 0.072) * hu - (lz > 0.03 ? 0 : 1),
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
  return { hair, brows, beard }
}

function hatField(spec: FigureSpec, E: HeadPoint, hu: number): Field | null {
  const h = spec.hat
  if (h === 'none') return null
  const crown = ellipsoid(E(0, 0.045, -0.014), [0.097 * hu, 0.124 * hu, 0.12 * hu])
  const eye = E(0, 0, 0)[1]
  const ly = (y: number) => (y - eye) / hu
  if (h === 'cap') {
    const visor = ellipsoid(E(0, 0.072, 0.1), [0.075 * hu, 0.008 * hu, 0.07 * hu])
    return (x, y, z) => {
      const shell = Math.max(crown(x, y, z), (0.068 - ly(y)) * hu)
      return Math.min(shell, Math.max(visor(x, y, z), -(z / hu - 0.06) * hu))
    }
  }
  if (h === 'bandana') {
    return (x, y, z) => {
      const tight = ellipsoid(E(0, 0.04, -0.014), [0.094 * hu, 0.12 * hu, 0.116 * hu])(x, y, z)
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
