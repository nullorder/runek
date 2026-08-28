import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody } from '@react-three/rapier'
import {
  pick,
  type Rng,
  range,
  rng,
  useWorld,
  type Vec3,
  type WorldComponentProps,
} from '@runek/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Color, DoubleSide, type Group, LatheGeometry, Vector2, Vector3 } from 'three'
import { Sign } from './Sign'

/** Preset bundles: outfit, hat, and accessories for a role. */
export type PersonKind =
  | 'villager'
  | 'merchant'
  | 'guard'
  | 'sailor'
  | 'farmer'
  | 'noble'
  | 'scholar'
  | 'traveler'
/** Silhouette cues only (shoulder-to-hip ratio, torso taper, default hair weights). */
export type PersonGender = 'feminine' | 'masculine' | 'neutral'
export type PersonAge = 'child' | 'adult' | 'elder'
export type PersonBuild = 'slim' | 'average' | 'stocky'
export type PersonHair = 'short' | 'long' | 'bun' | 'ponytail' | 'braid' | 'cropped' | 'bald'
export type PersonFacialHair = 'none' | 'stubble' | 'moustache' | 'beard'
export type PersonOutfit =
  | 'tunic'
  | 'shirt'
  | 'dress'
  | 'robe'
  | 'coat'
  | 'apron'
  | 'uniform'
  | 'vest'
export type PersonHat = 'none' | 'cap' | 'straw' | 'brim' | 'bandana' | 'hood'
export type PersonAccessory = 'bag' | 'belt' | 'scarf' | 'glasses' | 'cape' | 'staff'
export type PersonPose = 'stand' | 'sit' | 'lean' | 'work' | 'wave'
/** `auto` swaps to the cheap silhouette past `LOD_FAR` units from the camera. */
export type PersonDetail = 'auto' | 'high' | 'low'

/** Visual template the whole figure follows. */
export type PersonStyle = 'anime' | 'realistic'

/**
 * A cosmetic loadout (a "skin" in the game sense): clothes, colors, headwear, hair, and
 * body accessories bundled as one plain-JSON object, so a whole look swaps in a single
 * prop write. It never touches the body itself (tone, build, age, gender). Precedence per
 * trait: an explicit component prop > this skin > the `kind` preset > the seeded roll.
 */
export interface PersonSkin {
  outfit?: PersonOutfit
  topColor?: string
  bottomColor?: string
  shoeColor?: string
  hat?: PersonHat
  hair?: PersonHair
  hairColor?: string
  accessories?: PersonAccessory[]
}

/**
 * The named skins that ship with the component: wardrobe, not wigs — each sets clothes,
 * colors, headwear, and accessories but never hair, so a figure keeps its identity across
 * skin swaps. Colors are fixed on purpose: a named skin looks the same in every world
 * (an explicit color always beats the palette, CONTRACT §7). Pass the name to `skin`,
 * or spread one into your own bundle to tweak it.
 */
export const PERSON_SKINS = {
  /** Bright tunic and scarf for a market day or a fair. */
  festival: {
    outfit: 'tunic',
    topColor: '#c8563b',
    bottomColor: '#3f4a63',
    shoeColor: '#5a4632',
    hat: 'none',
    accessories: ['scarf', 'belt'],
  },
  /** Field clothes under a straw hat. */
  harvest: {
    outfit: 'shirt',
    topColor: '#c9a05a',
    bottomColor: '#6b5138',
    shoeColor: '#4a3a2a',
    hat: 'straw',
    accessories: ['belt'],
  },
  /** Hooded coat and scarf for the cold. */
  winter: {
    outfit: 'coat',
    topColor: '#54626f',
    bottomColor: '#38393f',
    shoeColor: '#2e2a26',
    hat: 'hood',
    accessories: ['scarf', 'belt'],
  },
  /** Deck shirt, bandana, and a shoulder bag for the crossing. */
  voyage: {
    outfit: 'shirt',
    topColor: '#e8e2d2',
    bottomColor: '#31456b',
    shoeColor: '#3a3128',
    hat: 'bandana',
    accessories: ['belt', 'bag'],
  },
  /** A deep-dyed robe and cape for rites and audiences. */
  ceremony: {
    outfit: 'robe',
    topColor: '#5b3a5e',
    bottomColor: '#2e2633',
    shoeColor: '#241f29',
    hat: 'none',
    accessories: ['cape'],
  },
  /** Workshop apron and cap. */
  atelier: {
    outfit: 'apron',
    topColor: '#7a6a55',
    bottomColor: '#4c4238',
    shoeColor: '#33302c',
    hat: 'cap',
    accessories: ['belt'],
  },
  /** Oxblood longcoat, dark bandana, and a plunder bag. */
  pirate: {
    outfit: 'coat',
    topColor: '#5c2a2e',
    bottomColor: '#2b2622',
    shoeColor: '#1f1b18',
    hat: 'bandana',
    accessories: ['belt', 'bag'],
  },
  /** Rolled white sleeves under the bar apron, black trousers. */
  bartender: {
    outfit: 'apron',
    topColor: '#e6e0d4',
    bottomColor: '#26242a',
    shoeColor: '#1d1b1f',
    hat: 'none',
    accessories: ['belt'],
  },
  /** Navy deck uniform with white trousers and a cap. */
  sailor: {
    outfit: 'uniform',
    topColor: '#31456b',
    bottomColor: '#e8e4d8',
    shoeColor: '#26221e',
    hat: 'cap',
    accessories: ['belt'],
  },
} satisfies Record<string, PersonSkin>

export type PersonSkinName = keyof typeof PERSON_SKINS

export interface PersonProps extends WorldComponentProps {
  /** Visual template: `anime` (default) has a bigger head, large lit eyes, a tapered chin,
   *  longer legs, and a chunky fringe; `realistic` keeps canonical human proportions. */
  style?: PersonStyle
  /** Role preset: fills `outfit`, `hat`, and `accessories` unless you set them. */
  kind?: PersonKind
  /** Silhouette cues only; every trait it influences stays overridable. Seeded when unset. */
  gender?: PersonGender
  /** Head-to-body ratio, stature, and (for `elder`) a stooped spine. */
  age?: PersonAge
  /** Standing height, in units. Every other measurement derives from it. */
  height?: number
  /** Limb thickness and torso depth. Seeded when unset. */
  build?: PersonBuild
  /** Skin color; seeded from a curated set of tones when unset. */
  skinTone?: string
  /** Cosmetic loadout: a preset name from `PERSON_SKINS` (e.g. `"winter"`) or a custom
   *  `PersonSkin` bundle. Individual props win over it. Plain JSON either way, so an editor
   *  or an in-world UI can swap a figure's whole look by writing this one prop. */
  skin?: PersonSkinName | PersonSkin
  hair?: PersonHair
  hairColor?: string
  facialHair?: PersonFacialHair
  outfit?: PersonOutfit
  /** Shirt/dress color; defaults to a seeded shade of the palette's `fabric`. */
  topColor?: string
  /** Trouser/skirt color; defaults to a seeded shade of the palette's `woodDark`. */
  bottomColor?: string
  /** Shoe color; defaults to the palette's `metal`. */
  shoeColor?: string
  hat?: PersonHat
  accessories?: PersonAccessory[]
  /** Static joint set. `wave` also animates the raised forearm. */
  pose?: PersonPose
  /** Breathing, weight shift, and blinking. */
  idle?: boolean
  /** Turn the head toward the camera when it comes within `lookRadius`. */
  lookAt?: boolean
  /** How close the camera must be for `lookAt` to engage, in units. */
  lookRadius?: number
  /** Floating name above the head. */
  label?: string
  /** Capsule collider, so the figure is something you bump into. */
  collider?: boolean
  /** Render as a bare visual with no `RigidBody` — for a parent that owns the physics
   *  (e.g. as `Player`'s third-person avatar). When false, `collider` is ignored. */
  physics?: boolean
  detail?: PersonDetail
}

const GENDERS: readonly PersonGender[] = ['feminine', 'masculine', 'neutral']
const BUILDS: readonly PersonBuild[] = ['slim', 'average', 'stocky']

// Skin and hair have no palette slot and no honest mapping onto one, so they roll from
// curated sets instead (the seeded book-spine precedent, CONTRACT §7). Any explicit color wins.
const SKIN_TONES = [
  '#f6ddc3',
  '#efc9a4',
  '#e0aa7e',
  '#c98d63',
  '#a9714a',
  '#8a5a3b',
  '#65402a',
  '#48301f',
]
const HAIR_COLORS = [
  '#171310',
  '#2b1d14',
  '#4a3122',
  '#6b4a2a',
  '#8c6b3f',
  '#b08d57',
  '#c9b18a',
  '#9a9a9a',
  '#d9d5cd',
  '#7d3320',
]

const EYE_COLORS = ['#3b2a1d', '#2a2a2e', '#37455a', '#3c5038', '#584022', '#6b7a85']

/** Everything a style template controls, so a new style is one record, not a rewrite.
 *  Proportions are multipliers over the human canon; face metrics are in head units. */
interface StyleSpec {
  /** Scales heads-per-body: < 1 means a bigger head (anime ~6 heads, canon 7.5). */
  headsMul: number
  /** Cranium width as a fraction of head height. */
  headWide: number
  /** Cranium height scale: < 1 rounds the skull (anime), 1 keeps the long oval. */
  headTall: number
  /** Leg length multiplier (anime figures are leggier; the torso gives up the difference). */
  leg: number
  /** Limb radius multiplier. */
  slim: number
  shoulder: number
  waist: number
  neck: number
  /** Eye half-width / half-height, eye-line height, iris radius (head units). */
  eyeW: number
  eyeH: number
  eyeY: number
  iris: number
  /** Specular sparkle dot in the iris. */
  highlight: boolean
  /** Jaw ellipsoid scale: narrow it for the anime taper, keep it broad for realism. */
  jaw: [number, number, number]
  nose: number
  mouth: number
  /** Hair mass multiplier, and whether a chunky fringe hangs over the forehead. */
  hairVol: number
  bangs: boolean
}

const STYLES: Record<PersonStyle, StyleSpec> = {
  anime: {
    headsMul: 0.82,
    headWide: 0.84,
    headTall: 0.94,
    leg: 1.05,
    slim: 0.86,
    shoulder: 0.95,
    waist: 0.9,
    neck: 0.82,
    eyeW: 0.085,
    eyeH: 0.105,
    eyeY: 0.0,
    iris: 0.06,
    highlight: true,
    jaw: [0.5, 0.66, 0.52],
    nose: 0.45,
    mouth: 0.6,
    hairVol: 1.14,
    bangs: true,
  },
  realistic: {
    headsMul: 1,
    headWide: 0.76,
    headTall: 1,
    leg: 1,
    slim: 1,
    shoulder: 1,
    waist: 1,
    neck: 1,
    eyeW: 0.062,
    eyeH: 0.05,
    eyeY: 0.06,
    iris: 0.028,
    highlight: false,
    jaw: [0.6, 0.75, 0.62],
    nose: 1,
    mouth: 1,
    hairVol: 1,
    bangs: false,
  },
}

const HAIR_STYLES: Record<PersonGender, readonly PersonHair[]> = {
  feminine: ['long', 'bun', 'ponytail', 'braid', 'short', 'long', 'ponytail'],
  masculine: ['short', 'cropped', 'short', 'ponytail', 'bald', 'cropped'],
  neutral: ['short', 'cropped', 'ponytail', 'bun', 'long', 'braid'],
}

interface KindPreset {
  outfit: PersonOutfit
  hat: PersonHat
  accessories: PersonAccessory[]
}

const KINDS: Record<PersonKind, KindPreset> = {
  villager: { outfit: 'tunic', hat: 'none', accessories: ['belt'] },
  merchant: { outfit: 'apron', hat: 'cap', accessories: ['bag', 'belt'] },
  guard: { outfit: 'uniform', hat: 'cap', accessories: ['belt'] },
  sailor: { outfit: 'shirt', hat: 'bandana', accessories: ['belt'] },
  farmer: { outfit: 'shirt', hat: 'straw', accessories: ['belt'] },
  noble: { outfit: 'coat', hat: 'brim', accessories: ['cape', 'belt'] },
  scholar: { outfit: 'robe', hat: 'hood', accessories: ['glasses', 'staff'] },
  traveler: { outfit: 'coat', hat: 'brim', accessories: ['bag', 'scarf'] },
}

interface OutfitSpec {
  /** How far down the arm the sleeve reaches, as a fraction of the upper arm (0 = bare). */
  sleeve: number
  /** Skirt length as a fraction of the leg (0 = trousers instead). */
  skirt: number
  /** How far the top hangs below the hip, as a fraction of the thigh. */
  hem: number
  collar: boolean
  apron: boolean
}

const OUTFITS: Record<PersonOutfit, OutfitSpec> = {
  tunic: { sleeve: 0.75, skirt: 0, hem: 0.35, collar: false, apron: false },
  shirt: { sleeve: 0.55, skirt: 0, hem: 0.1, collar: true, apron: false },
  dress: { sleeve: 0.35, skirt: 0.75, hem: 0, collar: false, apron: false },
  robe: { sleeve: 1, skirt: 0.95, hem: 0, collar: true, apron: false },
  coat: { sleeve: 1, skirt: 0, hem: 0.85, collar: true, apron: false },
  apron: { sleeve: 0.5, skirt: 0, hem: 0.2, collar: false, apron: true },
  uniform: { sleeve: 0.95, skirt: 0, hem: 0.45, collar: true, apron: false },
  vest: { sleeve: 0, skirt: 0, hem: 0.15, collar: true, apron: false },
}

/** Head-to-body ratio and stature multiplier per age (a child is ~5.6 heads tall). */
const AGES: Record<PersonAge, { heads: number; stature: number; stoop: number }> = {
  child: { heads: 5.6, stature: 0.72, stoop: 0 },
  adult: { heads: 7.5, stature: 1, stoop: 0 },
  elder: { heads: 7.4, stature: 0.97, stoop: 0.16 },
}

const BASE_HEIGHT: Record<PersonGender, number> = {
  feminine: 1.64,
  masculine: 1.76,
  neutral: 1.7,
}

const GIRTH: Record<PersonBuild, number> = { slim: 0.85, average: 1, stocky: 1.2 }

/** Fringe wedges over the forehead: [x, z, length, z-tilt] in head units (apex down). */
const BANGS: Array<[number, number, number, number]> = [
  [-0.31, 0.25, 0.24, 0.2],
  [-0.16, 0.33, 0.3, 0.08],
  [0, 0.36, 0.27, 0],
  [0.17, 0.32, 0.31, -0.1],
  [0.31, 0.24, 0.23, -0.22],
]

const LOD_FAR = 18
const LOD_NEAR = 15
const MAX_YAW = 1.2
const MAX_PITCH = 0.4

/** Nudge a palette color per figure, so a crowd defaulting to one slot isn't a uniform. */
function tint(hex: string, r: Rng): string {
  const c = new Color(hex)
  c.offsetHSL((r() - 0.5) * 0.05, (r() - 0.5) * 0.14, (r() - 0.5) * 0.16)
  return `#${c.getHexString()}`
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

interface Figure {
  gender: PersonGender
  hair: PersonHair
  facialHair: PersonFacialHair
  outfit: OutfitSpec
  hat: PersonHat
  accessories: PersonAccessory[]
  skin: string
  hairInk: string
  top: string
  bottom: string
  shoe: string
  /** Iris color and a lip shade derived from the skin tone. */
  eye: string
  lip: string
  st: StyleSpec
  stoop: number
  /** Measurements, in world units. */
  H: number
  head: number
  headW: number
  neck: number
  shoulderY: number
  shoulderW: number
  hipY: number
  hipW: number
  /** Torso lathe radii (chest, waist, hip) and its elliptical depth ratio. */
  chestR: number
  waistR: number
  hipR: number
  torsoZ: number
  /** Hip-joint offset from the midline (femurs sit far inside the hip's silhouette). */
  legX: number
  upperArm: number
  foreArm: number
  armR: number
  thigh: number
  shin: number
  legR: number
  foot: number
  /** Idle phases, so a row of figures never moves in lockstep. */
  phase: number
  blinkPhase: number
  blinkEvery: number
}

/**
 * A procedural person: a proportioned, clothed, articulated figure generated from a seed.
 *
 * Every trait resolves the same way: an explicit prop wins, else the `kind` preset, else a
 * seeded roll, so `<Person seed={3} />` is a complete villager and each prop narrows it.
 * Measurements derive from `height` through canonical human ratios (a 7.5-head adult), so the
 * silhouette reads as a person rather than a toy; the body is a nested joint rig that breathes,
 * shifts its weight, blinks, and turns its head toward you.
 *
 * `position` is the spawn point. The figure is static (movement and dialogue are a later pass)
 * and stands on one capsule collider. Pass `physics={false}` for a bare visual, which is how it
 * becomes `Player`'s third-person body:
 * `<Player><Person physics={false} height={1.3} position={[0, -0.65, 0]} /></Player>`.
 *
 * Detail is parametric: past ~18 units the rig swaps to a cheap silhouette. A market square of
 * figures is affordable, but a true crowd wants the instanced component that comes later.
 */
export function Person({
  position,
  rotation = [0, 0, 0],
  seed = 1,
  style = 'anime',
  kind = 'villager',
  gender,
  age = 'adult',
  height,
  build,
  skinTone,
  skin,
  hair,
  hairColor,
  facialHair,
  outfit,
  topColor,
  bottomColor,
  shoeColor,
  hat,
  accessories,
  pose = 'stand',
  idle = true,
  lookAt = true,
  lookRadius = 9,
  label,
  collider = true,
  physics = true,
  detail = 'auto',
}: PersonProps) {
  const { unit, palette, ground } = useWorld()
  // A placed figure stands on the world's ground baseline; a bare visual is positioned by
  // whatever parent owns it (a `Player` capsule, a vehicle), so it starts at its own origin.
  const at: Vec3 = position ?? (physics ? [0, ground, 0] : [0, 0, 0])
  const accessoryKey = accessories?.join(',')
  const skinKey = skin && JSON.stringify(skin)

  // Every trait draws from the seed in a fixed order and is then overridden, so passing one
  // prop never reshuffles the others' rolls.
  const f = useMemo<Figure>(() => {
    const r = rng(seed)
    const sk: PersonSkin | undefined = typeof skin === 'string' ? PERSON_SKINS[skin] : skin
    const g = gender ?? pick(r, GENDERS)
    const b = build ?? pick(r, BUILDS)
    const tone = skinTone ?? pick(r, SKIN_TONES)
    const hairStyle = hair ?? sk?.hair ?? pick(r, HAIR_STYLES[g])
    const hairTone = hairColor ?? sk?.hairColor ?? pick(r, HAIR_COLORS)
    const beardRoll = r()
    const beard =
      facialHair ??
      (g === 'masculine' && age !== 'child' && beardRoll > 0.55
        ? beardRoll > 0.85
          ? 'beard'
          : beardRoll > 0.7
            ? 'moustache'
            : 'stubble'
        : 'none')
    const preset = KINDS[kind]
    const cloth = OUTFITS[outfit ?? sk?.outfit ?? preset.outfit]
    // Clothes stay palette-driven (so one palette swap re-themes the crowd), but each figure
    // rolls which slot it wears and a shade of it, or a village ends up in uniform. An explicit
    // color is used verbatim (CONTRACT §7). The rolls are always drawn, even when overridden,
    // so passing a color never reshuffles the traits that roll after it.
    const topRoll = tint(
      pick(r, [palette.fabric, palette.accent, palette.wall, palette.foliage]),
      r,
    )
    const bottomRoll = tint(pick(r, [palette.woodDark, palette.stone, palette.metal]), r)
    const top = topColor ?? sk?.topColor ?? topRoll
    const bottom = bottomColor ?? sk?.bottomColor ?? bottomRoll
    const shoe = shoeColor ?? sk?.shoeColor ?? palette.metal

    const a = AGES[age]
    const st = STYLES[style]
    const H = (height ?? BASE_HEIGHT[g] * a.stature) * unit
    const headH = H / (a.heads * st.headsMul)
    const girth = GIRTH[b]
    const wide = g === 'masculine' ? 1.06 : g === 'feminine' ? 0.94 : 1
    const hips = g === 'feminine' ? 1.09 : 1
    const shoulderW = 0.25 * H * wide * (0.94 + girth * 0.06) * st.shoulder
    const hipW = 0.19 * H * hips * girth
    const chestR = shoulderW * 0.4
    const lipTone = new Color(tone).offsetHSL(-0.02, 0.08, -0.13)

    return {
      gender: g,
      hair: hairStyle,
      facialHair: beard,
      outfit: cloth,
      hat: hat ?? sk?.hat ?? preset.hat,
      accessories: accessories ?? sk?.accessories ?? preset.accessories,
      skin: tone,
      hairInk: hairTone,
      top,
      bottom,
      shoe,
      st,
      stoop: a.stoop,
      H,
      head: headH,
      headW: headH * st.headWide,
      neck: headH * 0.28,
      shoulderY: H - headH - headH * 0.22,
      shoulderW,
      hipY: 0.53 * H * st.leg,
      hipW,
      chestR,
      waistR: chestR * (0.6 + girth * 0.14) * (g === 'feminine' ? 0.94 : 1) * st.waist,
      hipR: hipW * 0.52,
      torsoZ: 0.68 + (girth - 1) * 0.25,
      legX: hipW * 0.3,
      upperArm: 0.19 * H,
      foreArm: 0.15 * H,
      armR: 0.03 * H * girth * st.slim,
      thigh: 0.25 * H * st.leg,
      shin: 0.235 * H * st.leg,
      legR: 0.045 * H * girth * st.slim,
      foot: 0.14 * H,
      phase: r() * Math.PI * 2,
      blinkPhase: r() * 6,
      blinkEvery: range(r, 3.4, 6.5),
      eye: pick(r, EYE_COLORS),
      lip: `#${lipTone.getHexString()}`,
    }
  }, [
    seed,
    style,
    kind,
    gender,
    age,
    height,
    build,
    skinTone,
    skinKey,
    skin,
    hair,
    hairColor,
    facialHair,
    outfit,
    topColor,
    bottomColor,
    shoeColor,
    hat,
    accessoryKey,
    accessories,
    unit,
    palette,
  ])

  const root = useRef<Group>(null)
  const hips = useRef<Group>(null)
  const chest = useRef<Group>(null)
  const headRef = useRef<Group>(null)
  const shoulderL = useRef<Group>(null)
  const shoulderR = useRef<Group>(null)
  const elbowR = useRef<Group>(null)
  const eyes = useRef<Group>(null)
  const nameTag = useRef<Group>(null)
  const scratch = useMemo(() => new Vector3(), [])

  const [far, setFar] = useState(detail === 'low')
  const low = detail === 'low' || (detail === 'auto' && far)

  // Static joint set for the pose. Sitting drops the root to a knee-height seat and folds the
  // legs; the rest are torso and arm offsets the idle motion then rides on top of.
  const p = useMemo(() => {
    const sit = pose === 'sit'
    return {
      sit,
      drop: sit ? -(f.hipY - f.thigh * 0.92) : 0,
      spineX: f.stoop + (pose === 'work' ? 0.42 : pose === 'lean' ? -0.14 : sit ? 0.06 : 0),
      armX: pose === 'work' ? -0.7 : sit ? -0.25 : 0,
      armZ: pose === 'lean' ? 0.14 : 0.09,
      thighX: sit ? -Math.PI / 2 : 0,
      shinX: sit ? Math.PI / 2.1 : 0,
      wave: pose === 'wave',
    }
  }, [pose, f.hipY, f.thigh, f.stoop])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const k = 1 - Math.exp(-7 * dt)

    if (detail === 'auto' && root.current) {
      const d = root.current.getWorldPosition(scratch).distanceTo(state.camera.position) / unit
      if (!far && d > LOD_FAR) setFar(true)
      else if (far && d < LOD_NEAR) setFar(false)
    }

    const breath = idle ? Math.sin(t * 1.6 + f.phase) : 0
    const sway = idle ? Math.sin(t * 0.42 + f.phase) : 0

    if (root.current) root.current.position.y = p.drop + breath * 0.004 * f.H
    if (hips.current) hips.current.rotation.z = sway * 0.022
    if (chest.current) {
      chest.current.rotation.x = p.spineX
      chest.current.rotation.z = -sway * 0.012
      chest.current.scale.set(1, 1 + breath * 0.012, 1 + breath * 0.022)
    }
    if (shoulderL.current) {
      shoulderL.current.rotation.x = p.armX - sway * 0.06
      shoulderL.current.rotation.z = -p.armZ
    }
    if (shoulderR.current) {
      shoulderR.current.rotation.x = p.wave ? -0.2 : p.armX + sway * 0.06
      shoulderR.current.rotation.z = p.wave ? 2.35 : p.armZ
    }
    if (p.wave && elbowR.current) elbowR.current.rotation.z = -0.35 + Math.sin(t * 6) * 0.4

    if (eyes.current && !low) {
      const blink = (t + f.blinkPhase) % f.blinkEvery
      eyes.current.scale.y = blink < 0.1 ? 0.12 : 1
    }

    // Head tracking: the camera position in the head's own parent space gives yaw and pitch
    // directly. Outside the radius, or behind the shoulder, the head eases back to neutral.
    if (headRef.current) {
      const h = headRef.current
      // Yaw before pitch, so looking up while turned doesn't roll the head.
      if (h.rotation.order !== 'YXZ') h.rotation.order = 'YXZ'
      let yaw = idle ? sway * 0.05 : 0
      let pitch = 0
      if (lookAt && h.parent) {
        scratch.copy(state.camera.position)
        h.parent.worldToLocal(scratch).sub(h.position)
        const flat = Math.hypot(scratch.x, scratch.z)
        const wanted = Math.atan2(scratch.x, scratch.z)
        if (scratch.length() < lookRadius * unit && Math.abs(wanted) < MAX_YAW) {
          yaw = wanted
          pitch = clamp(-Math.atan2(scratch.y, flat), -MAX_PITCH, MAX_PITCH)
        }
      }
      h.rotation.y += (yaw - h.rotation.y) * k
      h.rotation.x += (pitch - h.rotation.x) * k
    }

    // Keep the name legible from wherever it's read.
    if (nameTag.current?.parent) {
      scratch.copy(state.camera.position)
      nameTag.current.parent.worldToLocal(scratch)
      nameTag.current.rotation.y = Math.atan2(scratch.x, scratch.z)
    }
  })

  // ---- geometry -----------------------------------------------------------------------------
  // Surfaces of revolution instead of primitive capsules: each limb is one smooth lathe whose
  // radius follows the real profile (thigh tapering to the knee, the calf's bulge narrowing to
  // the ankle), and the torso is a single hip-to-trapezius profile squashed into an elliptical
  // cross-section. No seams, no marionette ball joints. Left and right limbs share geometry.
  const seg = low ? 7 : 22
  const sph = low ? 8 : 18
  const torso = f.shoulderY - f.hipY
  const cloth = f.outfit
  const skirtLen = (f.thigh + f.shin) * cloth.skirt
  const nR = f.neck * 0.62 * f.st.neck
  const has = (a: PersonAccessory) => f.accessories.includes(a)

  const geo = useMemo(() => {
    const lathe = (pts: [number, number][]) =>
      new LatheGeometry(
        pts.map(([r, y]) => new Vector2(Math.max(r, 0.001), y)),
        seg,
      )
    /** A limb hanging from y=0 down to -len; stations are [fraction along, radius]. */
    const limb = (len: number, st: [number, number][]) => {
      const rTop = st[0][1]
      const rEnd = st[st.length - 1][1]
      const pts: [number, number][] = [
        [0, -len - rEnd * 0.8],
        [rEnd * 0.7, -len - rEnd * 0.55],
      ]
      for (let i = st.length - 1; i >= 0; i--) pts.push([st[i][1], -st[i][0] * len])
      pts.push([rTop * 0.72, rTop * 0.5], [0, rTop * 0.78])
      return lathe(pts)
    }

    const t = f.shoulderY - f.hipY
    const { chestR, waistR, hipR, neck } = f
    const collarR = neck * 0.62 * f.st.neck
    const sleeve = f.upperArm * f.outfit.sleeve
    const hem = f.thigh * f.outfit.hem
    const skirt = (f.thigh + f.shin) * f.outfit.skirt

    return {
      torso: lathe([
        [0, -hipR * 0.7],
        [hipR * 0.82, -hipR * 0.42],
        [hipR, 0.04 * t],
        [hipR * 0.96, 0.18 * t],
        [waistR, 0.46 * t],
        [chestR * 0.96, 0.72 * t],
        [chestR, 0.84 * t],
        [chestR * 0.97, 0.89 * t],
        [collarR * 2.1, 1.0 * t],
        [collarR * 1.4, 1.045 * t],
        [0, 1.06 * t],
      ]),
      garment: lathe([
        [0, -hem - hipR * 0.12],
        [hipR * 1.1 + hem * 0.12, -hem],
        [hipR * 1.09, -hem * 0.35],
        [hipR * 1.07, 0.08 * t],
        [hipR * 1.05, 0.2 * t],
        [waistR * 1.12, 0.46 * t],
        [chestR * 1.06, 0.76 * t],
        [chestR * 1.03, 0.89 * t],
        [collarR * 2.3, 1.01 * t],
        [collarR * 1.2, 1.06 * t],
        [0, 1.055 * t],
      ]),
      skirt:
        skirt > 0
          ? lathe([
              [0, -skirt],
              [hipR * 1.02 + skirt * 0.32, -skirt],
              [hipR * 1.16, -skirt * 0.4],
              [hipR * 1.13, 0.02 * t],
              [waistR * 1.16, 0.12 * t],
              [0, 0.13 * t],
            ])
          : null,
      sleeve:
        sleeve > 0.01
          ? limb(sleeve, [
              [0, f.armR * 1.3],
              [1, f.armR * 1.18],
            ])
          : null,
      upperArm: limb(f.upperArm, [
        [0, f.armR * 1.12],
        [0.5, f.armR],
        [1, f.armR * 0.8],
      ]),
      foreArm: limb(f.foreArm, [
        [0, f.armR * 0.82],
        [0.25, f.armR * 0.9],
        [1, f.armR * 0.55],
      ]),
      thigh: limb(f.thigh, [
        [0, f.legR * 1.16],
        [0.55, f.legR * 0.95],
        [1, f.legR * 0.72],
      ]),
      calf: limb(f.shin, [
        [0, f.legR * 0.74],
        [0.3, f.legR * 0.87],
        [1, f.legR * 0.42],
      ]),
    }
  }, [f, seg])

  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g?.dispose()
    },
    [geo],
  )

  const skinMat = <meshStandardMaterial color={f.skin} roughness={0.75} />
  const topMat = <meshStandardMaterial color={f.top} roughness={0.9} />
  const bottomMat = <meshStandardMaterial color={f.bottom} roughness={0.9} />
  const hairMat = <meshStandardMaterial color={f.hairInk} roughness={0.95} />
  const trousers = skirtLen <= 0
  const st = f.st

  const arm = (side: -1 | 1) => (
    <group
      ref={side < 0 ? shoulderL : shoulderR}
      position={[side * (f.chestR + f.armR * 0.25), torso * 0.88, 0]}
    >
      {/* deltoid: rounds the shoulder into the torso and rides the arm's rotation */}
      <mesh castShadow>
        <sphereGeometry args={[f.armR * 1.18, sph, sph / 2]} />
        {cloth.sleeve > 0.01 ? topMat : skinMat}
      </mesh>
      <mesh geometry={geo.upperArm} castShadow>
        {skinMat}
      </mesh>
      {geo.sleeve && (
        <mesh geometry={geo.sleeve} castShadow>
          {topMat}
        </mesh>
      )}
      <group
        ref={side > 0 ? elbowR : undefined}
        position={[0, -f.upperArm, 0]}
        rotation={[p.wave && side > 0 ? 0 : -0.18, 0, 0]}
      >
        <mesh>
          <sphereGeometry args={[f.armR * 0.8, sph, sph / 2]} />
          {skinMat}
        </mesh>
        <mesh geometry={geo.foreArm} castShadow>
          {skinMat}
        </mesh>
        {/* hand: a mitt continuing the wrist line */}
        <mesh
          position={[0, -f.foreArm - f.armR * 0.85, f.armR * 0.15]}
          scale={[0.8, 1.4, 0.5]}
          castShadow
        >
          <sphereGeometry args={[f.armR * 1.05, sph, sph / 2]} />
          {skinMat}
        </mesh>
        {side > 0 && has('staff') && (
          <mesh position={[0, -f.foreArm * 0.9, f.armR * 1.4]} castShadow>
            <cylinderGeometry args={[f.armR * 0.35, f.armR * 0.35, f.H * 1.05, 6]} />
            <meshStandardMaterial color={palette.wood} roughness={0.9} />
          </mesh>
        )}
      </group>
    </group>
  )

  const leg = (side: -1 | 1) => (
    <group position={[side * f.legX, f.hipY, 0]} rotation={[p.thighX, 0, 0]}>
      <mesh geometry={geo.thigh} scale={trousers ? [1.14, 1, 1.14] : [1, 1, 1]} castShadow>
        {trousers ? bottomMat : skinMat}
      </mesh>
      <group position={[0, -f.thigh, 0]} rotation={[p.shinX, 0, 0]}>
        <mesh scale={trousers ? [1.14, 1, 1.14] : [1, 1, 1]}>
          <sphereGeometry args={[f.legR * 0.78, sph, sph / 2]} />
          {trousers ? bottomMat : skinMat}
        </mesh>
        <mesh geometry={geo.calf} scale={trousers ? [1.12, 1, 1.12] : [1, 1, 1]} castShadow>
          {trousers ? bottomMat : skinMat}
        </mesh>
        <mesh
          position={[0, -f.shin - f.legR * 0.42, f.foot * 0.32]}
          scale={[0.82, 0.5, 1.75]}
          castShadow
        >
          <sphereGeometry args={[f.legR * 1.05, sph, sph / 2]} />
          <meshStandardMaterial color={f.shoe} roughness={0.7} />
        </mesh>
      </group>
    </group>
  )

  const figure = (
    <group ref={root}>
      <group ref={hips}>
        {leg(-1)}
        {leg(1)}

        {/* trouser seat: the pelvis in trouser color, so short garment hems (shirt, vest)
            meet cloth rather than bare torso */}
        {trousers && (
          <mesh position={[0, f.hipY - f.hipR * 0.12, 0]} scale={[1, 0.78, f.torsoZ]} castShadow>
            <sphereGeometry args={[f.hipR * 1.04, sph, sph / 2]} />
            {bottomMat}
          </mesh>
        )}

        {/* skirt: hangs from the hip so a spine lean doesn't swing the hem */}
        {geo.skirt && (
          <mesh
            geometry={geo.skirt}
            position={[0, f.hipY, 0]}
            scale={[1, 1, (f.torsoZ + 1) / 2]}
            castShadow
          >
            {topMat}
          </mesh>
        )}

        <group ref={chest} position={[0, f.hipY, 0]}>
          {/* torso + garment share the lathe profile, squashed to an elliptical section */}
          <group scale={[1, 1, f.torsoZ]}>
            <mesh geometry={geo.torso} castShadow>
              {skinMat}
            </mesh>
            <mesh geometry={geo.garment} castShadow>
              {topMat}
            </mesh>
            {has('belt') && (
              <mesh position={[0, torso * 0.44, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[f.waistR * 1.22, f.legR * 0.22, 6, low ? 8 : 20]} />
                <meshStandardMaterial color={palette.woodDark} roughness={0.7} />
              </mesh>
            )}
            {has('bag') && !low && (
              <mesh position={[0, torso * 0.55, 0]} rotation={[0, 0, 0.55]}>
                <torusGeometry args={[f.chestR * 1.35, f.legR * 0.16, 5, 16]} />
                <meshStandardMaterial color={palette.woodDark} roughness={0.8} />
              </mesh>
            )}
          </group>

          {cloth.apron && !low && (
            <mesh
              position={[0, torso * 0.28, f.chestR * f.torsoZ * 1.02]}
              rotation={[-0.06, 0, 0]}
              castShadow
            >
              <boxGeometry args={[f.chestR * 1.1, torso * 0.72, f.chestR * 0.06]} />
              <meshStandardMaterial color={palette.wall} roughness={0.95} />
            </mesh>
          )}
          {has('bag') && !low && (
            <mesh position={[f.chestR * 1.18, torso * 0.12, 0]} castShadow>
              <boxGeometry args={[f.hipW * 0.42, f.hipW * 0.5, f.hipW * 0.26]} />
              <meshStandardMaterial color={palette.wood} roughness={0.9} />
            </mesh>
          )}
          {has('cape') && !low && (
            <mesh
              position={[0, torso * 0.5, -f.chestR * f.torsoZ * 0.7]}
              rotation={[0.1, 0, 0]}
              castShadow
            >
              <cylinderGeometry
                args={[
                  f.chestR * 1.15,
                  f.chestR * 1.7,
                  torso * 1.25,
                  14,
                  1,
                  true,
                  Math.PI - 1.25,
                  2.5,
                ]}
              />
              <meshStandardMaterial color={f.bottom} roughness={0.9} side={DoubleSide} />
            </mesh>
          )}
          {has('scarf') && !low && (
            <mesh position={[0, torso, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[nR * 1.7, nR * 0.5, 6, 16]} />
              <meshStandardMaterial color={palette.accent} roughness={0.95} />
            </mesh>
          )}

          {arm(-1)}
          {arm(1)}

          {/* neck */}
          <mesh position={[0, torso + f.neck * 0.3, 0]} castShadow>
            <cylinderGeometry args={[nR * 0.95, nR * 1.2, f.neck * 1.15, 12]} />
            {skinMat}
          </mesh>

          <group ref={headRef} position={[0, torso + f.neck + f.head * 0.42, 0]}>
            {/* skull: cranium ellipsoid + a jaw that carries the chin below it */}
            <mesh
              position={[0, f.head * 0.04, -f.head * 0.01]}
              scale={[st.headWide, st.headTall, 0.88]}
              castShadow
            >
              <sphereGeometry args={[f.head * 0.5, sph, sph]} />
              {skinMat}
            </mesh>
            <mesh position={[0, -f.head * 0.24, f.head * 0.04]} scale={st.jaw}>
              <sphereGeometry args={[f.head * 0.4, sph, sph / 2]} />
              {skinMat}
            </mesh>

            {!low && (
              <>
                {[-1, 1].map((s) => (
                  <mesh
                    key={s}
                    position={[s * f.head * 0.36, 0, -f.head * 0.02]}
                    scale={[0.3, 0.55, 0.4]}
                  >
                    <sphereGeometry args={[f.head * 0.11, 10, 8]} />
                    {skinMat}
                  </mesh>
                ))}
                {/* eyes: sclera, iris, pupil, and (per style) a specular sparkle */}
                <group ref={eyes}>
                  {[-1, 1].map((s) => (
                    <group
                      key={s}
                      position={[s * f.head * 0.15, f.head * st.eyeY, f.head * 0.4]}
                      rotation={[0, s * 0.1, 0]}
                    >
                      <mesh scale={[1, st.eyeH / st.eyeW, 0.3]}>
                        <sphereGeometry args={[f.head * st.eyeW, 12, 10]} />
                        <meshStandardMaterial color="#f4f0e8" roughness={0.35} />
                      </mesh>
                      <mesh position={[0, 0, f.head * 0.014]} scale={[1, 1.3, 0.3]}>
                        <sphereGeometry args={[f.head * st.iris, 12, 10]} />
                        <meshStandardMaterial color={f.eye} roughness={0.25} />
                      </mesh>
                      <mesh position={[0, 0, f.head * 0.024]} scale={[1, 1.3, 0.3]}>
                        <sphereGeometry args={[f.head * st.iris * 0.45, 10, 8]} />
                        <meshStandardMaterial color="#181410" roughness={0.25} />
                      </mesh>
                      {st.highlight && (
                        <mesh
                          position={[
                            s * f.head * st.iris * 0.4,
                            f.head * st.iris * 0.5,
                            f.head * 0.032,
                          ]}
                        >
                          <sphereGeometry args={[f.head * st.iris * 0.26, 8, 6]} />
                          <meshStandardMaterial
                            color="#ffffff"
                            emissive="#ffffff"
                            emissiveIntensity={0.35}
                            roughness={0.2}
                          />
                        </mesh>
                      )}
                    </group>
                  ))}
                </group>
                {[-1, 1].map((s) => (
                  <mesh
                    key={s}
                    position={[
                      s * f.head * 0.15,
                      f.head * (st.eyeY + st.eyeH + 0.09),
                      f.head * 0.41,
                    ]}
                    rotation={[0, 0, s * 0.1]}
                  >
                    <boxGeometry args={[f.head * 0.13, f.head * 0.022, f.head * 0.03]} />
                    {hairMat}
                  </mesh>
                ))}
                <mesh
                  position={[0, -f.head * 0.1, f.head * 0.42]}
                  rotation={[1.35, 0, 0]}
                  scale={st.nose}
                >
                  <coneGeometry args={[f.head * 0.05, f.head * 0.15, 8]} />
                  {skinMat}
                </mesh>
                <mesh position={[0, -f.head * 0.24, f.head * 0.37]}>
                  <boxGeometry args={[f.head * 0.15 * st.mouth, f.head * 0.02, f.head * 0.02]} />
                  <meshStandardMaterial color={f.lip} roughness={0.8} />
                </mesh>
                {f.facialHair !== 'none' && (
                  <mesh
                    position={[
                      0,
                      f.facialHair === 'moustache' ? -f.head * 0.14 : -f.head * 0.28,
                      f.head * 0.16,
                    ]}
                    scale={[0.74, f.facialHair === 'beard' ? 0.9 : 0.3, 0.62]}
                  >
                    <sphereGeometry args={[f.head * 0.34, 12, 8]} />
                    <meshStandardMaterial
                      color={f.hairInk}
                      roughness={0.95}
                      transparent={f.facialHair === 'stubble'}
                      opacity={f.facialHair === 'stubble' ? 0.55 : 1}
                    />
                  </mesh>
                )}
              </>
            )}

            {/* hair: a skull cap plus the style's own mass */}
            {f.hair !== 'bald' && (
              <>
                <mesh
                  position={[0, f.head * 0.07, -f.head * 0.03]}
                  scale={[(st.headWide + 0.06) * st.hairVol, 0.98 * st.hairVol, 0.92 * st.hairVol]}
                >
                  <sphereGeometry args={[f.head * 0.52, sph, sph / 2, 0, Math.PI * 2, 0, 1.5]} />
                  {hairMat}
                </mesh>
                {st.bangs &&
                  !low &&
                  BANGS.map(([bx, bz, len, tilt]) => (
                    <mesh
                      key={`${bx}:${bz}`}
                      position={[bx * f.head, f.head * 0.18, bz * f.head]}
                      rotation={[Math.PI - 0.24, 0, tilt]}
                    >
                      <coneGeometry args={[f.head * 0.088, f.head * len, 6]} />
                      {hairMat}
                    </mesh>
                  ))}
                {(f.hair === 'long' || f.hair === 'braid') && (
                  <mesh
                    position={[0, -f.head * 0.26, -f.head * 0.16]}
                    scale={[
                      (st.headWide + 0.14) * (f.hair === 'braid' ? 0.55 : 1),
                      f.hair === 'braid' ? 2.1 : 1.7,
                      0.6,
                    ]}
                    castShadow
                  >
                    <capsuleGeometry args={[f.head * 0.34, f.head * 0.5, 3, low ? 6 : 10]} />
                    {hairMat}
                  </mesh>
                )}
                {f.hair === 'ponytail' && (
                  <mesh
                    position={[0, -f.head * 0.1, -f.head * 0.5]}
                    rotation={[0.5, 0, 0]}
                    castShadow
                  >
                    <capsuleGeometry args={[f.head * 0.13, f.head * 0.65, 3, low ? 6 : 10]} />
                    {hairMat}
                  </mesh>
                )}
                {f.hair === 'bun' && (
                  <mesh position={[0, f.head * 0.36, -f.head * 0.32]} castShadow>
                    <sphereGeometry args={[f.head * 0.22, low ? 8 : 14, low ? 6 : 10]} />
                    {hairMat}
                  </mesh>
                )}
              </>
            )}

            {/* hat */}
            {f.hat !== 'none' && (
              <group position={[0, f.head * 0.42, 0]}>
                {f.hat === 'straw' && (
                  <>
                    <mesh position={[0, f.head * 0.05, 0]} castShadow>
                      <cylinderGeometry args={[f.head * 0.02, f.head * 0.46, f.head * 0.3, 12]} />
                      <meshStandardMaterial color={palette.sand} roughness={0.95} />
                    </mesh>
                    <mesh position={[0, -f.head * 0.06, 0]} castShadow>
                      <cylinderGeometry args={[f.head * 0.95, f.head * 0.95, f.head * 0.04, 14]} />
                      <meshStandardMaterial color={palette.sand} roughness={0.95} />
                    </mesh>
                  </>
                )}
                {f.hat === 'brim' && (
                  <>
                    <mesh position={[0, f.head * 0.12, 0]} castShadow>
                      <cylinderGeometry args={[f.head * 0.42, f.head * 0.45, f.head * 0.34, 12]} />
                      {bottomMat}
                    </mesh>
                    <mesh position={[0, -f.head * 0.04, 0]} castShadow>
                      <cylinderGeometry args={[f.head * 0.72, f.head * 0.72, f.head * 0.05, 14]} />
                      {bottomMat}
                    </mesh>
                  </>
                )}
                {f.hat === 'cap' && (
                  <>
                    <mesh position={[0, -f.head * 0.04, 0]} scale={[0.84, 0.7, 0.95]} castShadow>
                      <sphereGeometry args={[f.head * 0.56, 14, 8, 0, Math.PI * 2, 0, 1.6]} />
                      <meshStandardMaterial color={palette.accent} roughness={0.9} />
                    </mesh>
                    <mesh position={[0, -f.head * 0.06, f.head * 0.45]} castShadow>
                      <boxGeometry args={[f.head * 0.5, f.head * 0.04, f.head * 0.3]} />
                      <meshStandardMaterial color={palette.accent} roughness={0.9} />
                    </mesh>
                  </>
                )}
                {f.hat === 'bandana' && (
                  <mesh position={[0, -f.head * 0.08, 0]} scale={[0.84, 0.62, 0.95]}>
                    <sphereGeometry args={[f.head * 0.56, 12, 8, 0, Math.PI * 2, 0, 1.6]} />
                    <meshStandardMaterial color={palette.fabric} roughness={0.95} />
                  </mesh>
                )}
                {f.hat === 'hood' && (
                  <mesh position={[0, -f.head * 0.2, -f.head * 0.08]} scale={[0.95, 1, 1.05]}>
                    {/* phi runs from -X, so the face (+Z) is the gap left open. */}
                    <sphereGeometry args={[f.head * 0.64, 16, 10, 2.6, 4.2, 0, 2.1]} />
                    <meshStandardMaterial color={f.top} roughness={0.95} side={DoubleSide} />
                  </mesh>
                )}
              </group>
            )}

            {has('glasses') && !low && (
              <group position={[0, f.head * 0.06, f.head * 0.44]}>
                {[-1, 1].map((s) => (
                  <mesh key={s} position={[s * f.head * 0.14, 0, 0]}>
                    <torusGeometry args={[f.head * 0.09, f.head * 0.013, 5, 12]} />
                    <meshStandardMaterial color={palette.metal} roughness={0.5} metalness={0.4} />
                  </mesh>
                ))}
                <mesh>
                  <boxGeometry args={[f.head * 0.13, f.head * 0.015, f.head * 0.015]} />
                  <meshStandardMaterial color={palette.metal} roughness={0.5} metalness={0.4} />
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>

      {label && (
        <group ref={nameTag} position={[0, f.H + f.head * 0.55, 0]}>
          <Sign variant="body" size={0.13} color={palette.accent}>
            {label}
          </Sign>
        </group>
      )}
    </group>
  )

  if (!physics) {
    return (
      <group position={at} rotation={rotation}>
        {figure}
      </group>
    )
  }

  // One capsule spanning the standing (or seated) body: an obstacle you bump into, not a
  // collider per limb (CONTRACT §5).
  const bottom = p.sit ? f.H * 0.06 : 0
  const top = f.H + p.drop
  const radius = Math.min(Math.max(f.hipW, f.shoulderW * 0.62) * 0.55, (top - bottom) / 2)
  const half = Math.max((top - bottom) / 2 - radius, 0.01 * f.H)

  return (
    <RigidBody type="fixed" colliders={false} position={at} rotation={rotation}>
      {collider && <CapsuleCollider args={[half, radius]} position={[0, (top + bottom) / 2, 0]} />}
      {figure}
    </RigidBody>
  )
}
