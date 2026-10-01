// Resolve a Person's props into a plain `FigureSpec`: every trait settled, every measurement
// derived. Pure, so the same props always give the same spec (and the same mesh).
import { pick, type Rng, range, rng, type WorldPalette } from '@runek/core'
import { Color } from 'three'
import type {
  PersonAccessory,
  PersonAge,
  PersonBodySpec,
  PersonBuild,
  PersonFaceSpec,
  PersonFacialHair,
  PersonGarment,
  PersonGarmentType,
  PersonGender,
  PersonHair,
  PersonHairSpec,
  PersonHat,
  PersonKind,
  PersonNose,
  PersonOutfit,
  PersonSkin,
  PersonStyle,
} from './types'

/**
 * The named skins that ship with the component: wardrobe, not wigs. Each sets clothes, colors,
 * headwear, and accessories but never hair, so a figure keeps its identity across skin swaps.
 * Colors are fixed on purpose: a named skin looks the same in every world (an explicit color
 * always beats the palette, CONTRACT §7). Pass the name to `skin`, or spread one into your own
 * bundle to tweak it.
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
  /** White short-sleeved shirt under a green sweater vest, slim jeans, brown shoes. */
  preppy: {
    clothes: [
      { type: 'shirt', sleeves: 'short', neck: 'collar', color: '#f1eee7' },
      { type: 'vest', color: '#7f9a3f' },
      { type: 'jeans', color: '#45576a' },
      { type: 'belt', color: '#5a3522' },
      { type: 'shoes', color: '#9a5236' },
    ],
    hat: 'none',
  },
} satisfies Record<string, PersonSkin>

export type PersonSkinName = keyof typeof PERSON_SKINS

/** Everything a style template controls. Face metrics are multipliers over the stylized face. */
export interface StyleSpec {
  /** Heads per body height for an adult. */
  heads: number
  /** Shoulder joint half-width, as a fraction of the height below the chin. */
  shoulder: number
  /** Torso and limb girth. */
  mass: number
  /** Extra leg length, as a fraction of the height below the chin. */
  legs: number
  eye: number
  /** Lid opening height over eye radius. */
  lid: number
  nose: number
  mouth: number
  jaw: number
  /** Lower-face length added, in head units. */
  chin: number
  cheek: number
  brow: number
  nose0: PersonNose
}

export const STYLES: Record<PersonStyle, StyleSpec> = {
  stylized: {
    heads: 6.2,
    shoulder: 0.11,
    mass: 1,
    legs: 0,
    eye: 1,
    lid: 0.44,
    nose: 1,
    mouth: 1,
    jaw: 1,
    chin: 0,
    cheek: 1,
    brow: 1,
    nose0: 'button',
  },
  realistic: {
    heads: 7.5,
    shoulder: 0.122,
    mass: 1.18,
    legs: 0,
    eye: 0.74,
    lid: 0.36,
    nose: 1.25,
    mouth: 1.2,
    jaw: 1.06,
    chin: 0.012,
    cheek: 0.8,
    brow: 1.3,
    nose0: 'straight',
  },
  anime: {
    heads: 6.8,
    shoulder: 0.106,
    mass: 0.92,
    legs: 0.03,
    eye: 1.22,
    lid: 0.52,
    nose: 0.62,
    mouth: 0.78,
    jaw: 0.86,
    chin: 0.008,
    cheek: 0.9,
    brow: 0.8,
    nose0: 'button',
  },
}

const GENDERS: readonly PersonGender[] = ['feminine', 'masculine', 'neutral']
const BUILDS: readonly PersonBuild[] = ['slim', 'average', 'stocky']
const NOSES: readonly PersonNose[] = ['button', 'straight', 'broad']

// Skin and hair have no palette slot and no honest mapping onto one, so they roll from curated
// sets instead (the seeded book-spine precedent, CONTRACT §7). Any explicit color wins.
const SKIN_TONES = [
  '#f6ddc3',
  '#efc9a4',
  '#e9b896',
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
  '#6e3d24',
  '#8c6b3f',
  '#b08d57',
  '#c9b18a',
  '#9a9a9a',
  '#7d3320',
]
const EYE_COLORS = ['#4a3424', '#2f2a26', '#3d7ab8', '#3f6a48', '#6b5a2e', '#6b7a85']

const HAIR_STYLES: Record<PersonGender, readonly PersonHair[]> = {
  feminine: ['long', 'bun', 'ponytail', 'braid', 'swept', 'long', 'ponytail'],
  masculine: ['short', 'swept', 'cropped', 'short', 'swept', 'bald'],
  neutral: ['short', 'swept', 'cropped', 'ponytail', 'bun', 'long'],
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

/** What a one-word outfit expands to. `top`/`bottom`/`shoe` mark the layers the flat color
 *  props recolor; `light` is an inner layer in the palette's light `wall` tone. */
type Slot = 'top' | 'bottom' | 'shoe' | 'light' | 'apron'
const OUTFITS: Record<PersonOutfit, Array<PersonGarment & { slot: Slot }>> = {
  tunic: [
    { type: 'trousers', slot: 'bottom' },
    { type: 'tunic', slot: 'top' },
    { type: 'shoes', slot: 'shoe' },
  ],
  shirt: [
    { type: 'shirt', sleeves: 'short', neck: 'collar', slot: 'top' },
    { type: 'trousers', slot: 'bottom' },
    { type: 'shoes', slot: 'shoe' },
  ],
  dress: [
    { type: 'dress', slot: 'top' },
    { type: 'shoes', slot: 'shoe' },
  ],
  robe: [
    { type: 'robe', slot: 'top' },
    { type: 'shoes', slot: 'shoe' },
  ],
  coat: [
    { type: 'shirt', neck: 'collar', sleeves: 'long', slot: 'light' },
    { type: 'trousers', slot: 'bottom' },
    { type: 'coat', slot: 'top' },
    { type: 'boots', slot: 'shoe' },
  ],
  apron: [
    { type: 'shirt', sleeves: 'short', neck: 'crew', slot: 'top' },
    { type: 'trousers', slot: 'bottom' },
    { type: 'apron', slot: 'apron' },
    { type: 'shoes', slot: 'shoe' },
  ],
  uniform: [
    { type: 'trousers', slot: 'bottom' },
    { type: 'tunic', neck: 'collar', length: 0.45, slot: 'top' },
    { type: 'boots', slot: 'shoe' },
  ],
  vest: [
    { type: 'shirt', sleeves: 'long', neck: 'collar', slot: 'light' },
    { type: 'trousers', slot: 'bottom' },
    { type: 'vest', slot: 'top' },
    { type: 'shoes', slot: 'shoe' },
  ],
}

export type GarmentRegion = 'top' | 'bottom' | 'feet' | 'extra'
export type MaterialKind = 'skin' | 'cloth' | 'knit' | 'denim' | 'leather' | 'hair'

export const GARMENT_REGION: Record<PersonGarmentType, GarmentRegion> = {
  tshirt: 'top',
  shirt: 'top',
  sweater: 'top',
  vest: 'top',
  tunic: 'top',
  coat: 'top',
  dress: 'top',
  robe: 'top',
  apron: 'top',
  trousers: 'bottom',
  jeans: 'bottom',
  shorts: 'bottom',
  skirt: 'bottom',
  shoes: 'feet',
  boots: 'feet',
  belt: 'extra',
  scarf: 'extra',
  cape: 'extra',
}

export const GARMENT_MATERIAL: Record<PersonGarmentType, MaterialKind> = {
  tshirt: 'cloth',
  shirt: 'cloth',
  sweater: 'knit',
  vest: 'knit',
  tunic: 'cloth',
  coat: 'cloth',
  dress: 'cloth',
  robe: 'cloth',
  apron: 'cloth',
  trousers: 'cloth',
  jeans: 'denim',
  shorts: 'cloth',
  skirt: 'cloth',
  shoes: 'leather',
  boots: 'leather',
  belt: 'leather',
  scarf: 'knit',
  cape: 'cloth',
}

/** Per-type defaults: sleeves, neckline, and reach (0..1, meaning depends on the region). */
const GARMENT_DEFAULTS: Record<
  PersonGarmentType,
  { sleeves: 'none' | 'short' | 'long'; neck: 'crew' | 'v' | 'collar'; length: number }
> = {
  tshirt: { sleeves: 'short', neck: 'crew', length: 0.3 },
  shirt: { sleeves: 'long', neck: 'collar', length: 0.3 },
  sweater: { sleeves: 'long', neck: 'crew', length: 0.3 },
  vest: { sleeves: 'none', neck: 'v', length: 0.15 },
  tunic: { sleeves: 'long', neck: 'crew', length: 0.6 },
  coat: { sleeves: 'long', neck: 'collar', length: 0.85 },
  dress: { sleeves: 'short', neck: 'crew', length: 0.6 },
  robe: { sleeves: 'long', neck: 'v', length: 1 },
  apron: { sleeves: 'none', neck: 'crew', length: 0.6 },
  trousers: { sleeves: 'none', neck: 'crew', length: 1 },
  jeans: { sleeves: 'none', neck: 'crew', length: 1 },
  shorts: { sleeves: 'none', neck: 'crew', length: 0.4 },
  skirt: { sleeves: 'none', neck: 'crew', length: 0.55 },
  shoes: { sleeves: 'none', neck: 'crew', length: 0 },
  boots: { sleeves: 'none', neck: 'crew', length: 0.45 },
  belt: { sleeves: 'none', neck: 'crew', length: 0 },
  scarf: { sleeves: 'none', neck: 'crew', length: 0.5 },
  cape: { sleeves: 'none', neck: 'crew', length: 0.8 },
}

/** A garment with every option settled, its place in the stack, and how far it stands off. */
export interface Layer {
  type: PersonGarmentType
  region: GarmentRegion
  material: MaterialKind
  color: string
  sleeves: 'none' | 'short' | 'long'
  neck: 'crew' | 'v' | 'collar'
  length: number
  /** A top tucked into a bottom listed after it. */
  tucked: boolean
  /** Base offset off the skin, in meters (scaled with the figure). */
  offset: number
}

export interface FaceMetrics {
  eye: number
  eyeX: number
  lid: number
  nose: number
  noseKind: PersonNose
  mouth: number
  lips: number
  jaw: number
  chin: number
  cheek: number
  brow: number
  browWeight: number
  blush: number
}

/** Everything the shape builder needs. Plain data: it is also the build cache key. */
export interface FigureSpec {
  seed: number
  style: PersonStyle
  gender: PersonGender
  age: PersonAge
  build: PersonBuild
  /** Standing height in world units. */
  height: number
  /** Feminine (1) to masculine (0) silhouette blend. */
  fem: number
  st: StyleSpec
  headsTall: number
  face: FaceMetrics
  hair: PersonHair
  facialHair: PersonFacialHair
  hat: PersonHat
  accessories: PersonAccessory[]
  layers: Layer[]
  colors: {
    skin: string
    lip: string
    eye: string
    brow: string
    hair: string
    hat: string
    bag: string
    accent: string
    metal: string
    wood: string
  }
}

/** Per-figure animation phases; never part of the mesh. */
export interface MotionSpec {
  phase: number
  blinkPhase: number
  blinkEvery: number
  stoop: number
}

export interface TraitInput {
  seed: number
  style: PersonStyle
  kind: PersonKind
  gender?: PersonGender
  age: PersonAge
  height?: number
  build?: PersonBuild
  skinTone?: string
  skin?: PersonSkinName | PersonSkin
  body?: PersonBodySpec
  face?: PersonFaceSpec
  hair?: PersonHair | PersonHairSpec
  hairColor?: string
  facialHair?: PersonFacialHair
  outfit?: PersonOutfit
  clothes?: PersonGarment[]
  topColor?: string
  bottomColor?: string
  shoeColor?: string
  hat?: PersonHat
  accessories?: PersonAccessory[]
}

const AGES: Record<PersonAge, { heads: number; stature: number; stoop: number; mass: number }> = {
  child: { heads: 0.74, stature: 0.72, stoop: 0, mass: 0.92 },
  adult: { heads: 1, stature: 1, stoop: 0, mass: 1 },
  elder: { heads: 0.98, stature: 0.97, stoop: 0.16, mass: 1 },
}
const BASE_HEIGHT: Record<PersonGender, number> = { feminine: 1.64, masculine: 1.76, neutral: 1.7 }

/** Nudge a palette color per figure, so a crowd defaulting to one slot isn't a uniform. */
function tint(hex: string, r: Rng): string {
  const c = new Color(hex)
  c.offsetHSL((r() - 0.5) * 0.05, (r() - 0.5) * 0.14, (r() - 0.5) * 0.16)
  return `#${c.getHexString()}`
}

function shade(hex: string, h: number, s: number, l: number) {
  return `#${new Color(hex).offsetHSL(h, s, l).getHexString()}`
}

/**
 * Every trait resolves the same way: the part object (`body`, `face`, `hair`, `clothes`) wins,
 * then the flat shorthand prop, then the skin, then the `kind` preset, then a seeded roll.
 */
export function resolveFigure(
  t: TraitInput,
  palette: WorldPalette,
  unit: number,
): { spec: FigureSpec; motion: MotionSpec } {
  const r = rng(t.seed)
  const sk: PersonSkin | undefined = typeof t.skin === 'string' ? PERSON_SKINS[t.skin] : t.skin
  const hairObj = typeof t.hair === 'object' ? t.hair : undefined
  const hairName = typeof t.hair === 'string' ? t.hair : undefined

  // Every roll is drawn before any override is applied, so setting one trait never shifts the
  // rolls behind it.
  const roll = {
    gender: pick(r, GENDERS),
    build: pick(r, BUILDS),
    tone: pick(r, SKIN_TONES),
    hair: r(),
    hairColor: pick(r, HAIR_COLORS),
    beard: r(),
  }
  const gender = t.gender ?? roll.gender
  const build = t.body?.build ?? t.build ?? roll.build
  const tone = t.body?.tone ?? t.skinTone ?? roll.tone
  const styles = HAIR_STYLES[gender]
  const hair =
    hairObj?.style ?? hairName ?? sk?.hair ?? styles[Math.floor(roll.hair * styles.length)]
  const hairColor = hairObj?.color ?? t.hairColor ?? sk?.hairColor ?? roll.hairColor
  const beardRoll = roll.beard
  const facialHair =
    t.facialHair ??
    (gender === 'masculine' && t.age !== 'child' && beardRoll > 0.55
      ? beardRoll > 0.85
        ? 'beard'
        : beardRoll > 0.7
          ? 'moustache'
          : 'stubble'
      : 'none')
  // Clothes stay palette-driven (one palette swap re-themes the crowd), but each figure rolls
  // which slot it wears and a shade of it, or a village ends up in uniform.
  const topRoll = tint(pick(r, [palette.fabric, palette.accent, palette.wall, palette.foliage]), r)
  const bottomRoll = tint(pick(r, [palette.woodDark, palette.stone, palette.metal]), r)
  const eyeRoll = pick(r, EYE_COLORS)
  const noseRoll = pick(r, NOSES)
  const jitter = Array.from({ length: 6 }, () => range(r, -1, 1))
  const motion: MotionSpec = {
    phase: r() * Math.PI * 2,
    blinkPhase: r() * 6,
    blinkEvery: range(r, 3.4, 6.5),
    stoop: AGES[t.age].stoop,
  }

  const st = STYLES[t.style]
  const a = AGES[t.age]
  const preset = KINDS[t.kind]
  const height = (t.body?.height ?? t.height ?? BASE_HEIGHT[gender] * a.stature) * unit
  const child = t.age === 'child'
  const f = t.face ?? {}

  const face: FaceMetrics = {
    eye: st.eye * (child ? 1.12 : 1) * (f.eyes?.size ?? 1) * (1 + jitter[0] * 0.05),
    eyeX: 1 + jitter[1] * 0.035,
    lid: st.lid,
    nose: st.nose * (child ? 0.8 : 1) * (1 + jitter[2] * 0.08),
    noseKind: f.nose ?? (t.style === 'realistic' ? noseRoll : st.nose0),
    mouth: st.mouth * (1 + jitter[3] * 0.06),
    lips: (f.lips?.fullness ?? 1) * (gender === 'feminine' ? 1.2 : 1),
    jaw:
      st.jaw *
      (gender === 'masculine' ? 1.06 : gender === 'feminine' ? 0.93 : 1) *
      (1 + jitter[4] * 0.04),
    chin: st.chin + (child ? -0.008 : 0) + jitter[5] * 0.003,
    cheek: st.cheek * (child ? 1.1 : 1),
    brow: st.brow * (gender === 'masculine' ? 1.2 : 0.85),
    browWeight: f.brows?.weight ?? (gender === 'feminine' ? 0.7 : 0.85),
    blush: f.blush ?? (gender === 'feminine' || child ? 0.6 : 0.35),
  }

  const colors = {
    skin: tone,
    lip: f.lips?.color ?? shade(tone, -0.02, 0.1, -0.1),
    eye: f.eyes?.color ?? eyeRoll,
    brow: f.brows?.color ?? hairColor,
    hair: hairColor,
    hat: palette.accent,
    bag: palette.wood,
    accent: palette.accent,
    metal: palette.metal,
    wood: palette.wood,
  }

  const hat = t.hat ?? sk?.hat ?? preset.hat
  const layers = resolveLayers(t, sk, preset, palette, {
    top: t.topColor ?? sk?.topColor ?? topRoll,
    bottom: t.bottomColor ?? sk?.bottomColor ?? bottomRoll,
    shoe: t.shoeColor ?? sk?.shoeColor ?? palette.metal,
  })

  const outerTop = [...layers].reverse().find((l) => l.region === 'top' && l.type !== 'apron')
  colors.hat =
    hat === 'straw'
      ? palette.sand
      : hat === 'brim'
        ? (layers.find((l) => l.region === 'bottom')?.color ?? palette.woodDark)
        : hat === 'bandana'
          ? palette.fabric
          : hat === 'hood'
            ? (outerTop?.color ?? palette.fabric)
            : palette.accent

  return {
    spec: {
      seed: t.seed,
      style: t.style,
      gender,
      age: t.age,
      build,
      height,
      fem: gender === 'feminine' ? 1 : gender === 'masculine' ? 0 : 0.5,
      st,
      headsTall: st.heads * a.heads,
      face,
      hair,
      facialHair,
      hat,
      accessories: (t.accessories ?? sk?.accessories ?? preset.accessories).filter(
        (x) => x === 'bag' || x === 'glasses' || x === 'staff',
      ),
      layers,
      colors,
    },
    motion,
  }
}

function resolveLayers(
  t: TraitInput,
  sk: PersonSkin | undefined,
  preset: KindPreset,
  palette: WorldPalette,
  slot: { top: string; bottom: string; shoe: string },
): Layer[] {
  const accessories = t.accessories ?? sk?.accessories ?? preset.accessories
  let stack: Array<PersonGarment & { slot?: Slot }>
  const explicit = t.clothes ?? sk?.clothes
  if (explicit) stack = explicit.map((g) => ({ ...g }))
  else {
    stack = OUTFITS[t.outfit ?? sk?.outfit ?? preset.outfit].map((g) => ({ ...g }))
    // Worn accessories that are really clothing become layers on the outside.
    for (const extra of ['belt', 'scarf', 'cape'] as const)
      if (accessories.includes(extra)) stack.push({ type: extra })
  }

  // The flat color props (already folded into `slot`) recolor the outermost top, every
  // bottom, and the footwear.
  let outerTop = -1
  stack.forEach((g, i) => {
    if (GARMENT_REGION[g.type] === 'top' && g.slot !== 'light' && g.type !== 'apron') outerTop = i
  })

  const light = shade(palette.wall, 0, -0.05, 0.12)
  const defaultColor = (g: PersonGarment & { slot?: Slot }, i: number, region: GarmentRegion) => {
    if (g.slot === 'light') return light
    if (g.type === 'apron') return palette.wall
    if (g.type === 'belt') return palette.woodDark
    if (g.type === 'scarf') return palette.accent
    if (g.type === 'cape') return slot.bottom
    if (region === 'feet') return slot.shoe
    if (region === 'bottom') return slot.bottom
    // The outermost top wears the top color; anything under it a light tone.
    return i === outerTop ? slot.top : light
  }

  const layers: Layer[] = stack.map((g, i) => {
    const d = GARMENT_DEFAULTS[g.type]
    const region = GARMENT_REGION[g.type]
    return {
      type: g.type,
      region,
      material: GARMENT_MATERIAL[g.type],
      // The garment's own color beats the shorthand color props, which beat the defaults.
      color: g.color ?? defaultColor(g, i, region),
      sleeves: g.sleeves ?? d.sleeves,
      neck: g.neck ?? d.neck,
      length: g.length ?? d.length,
      tucked: false,
      offset: 0,
    }
  })

  // Order decides the fit. A top listed before a bottom is tucked in; each layer stands just
  // proud of every earlier layer it overlaps, so inner never pokes through outer.
  const base: Record<GarmentRegion, number> = {
    top: 0.006,
    bottom: 0.008,
    feet: 0.009,
    extra: 0.01,
  }
  // How far past its base offset a layer can bulge (ease toward the hem, cuffs, folds).
  const slack = (l: Layer) =>
    l.region === 'bottom' ? 0.009 : l.region === 'top' ? (l.tucked ? 0.004 : 0.009) : 0.003
  const overlaps = (x: Layer, y: Layer) =>
    x.region === y.region ||
    (x.region === 'top' && y.region === 'bottom') ||
    (x.region === 'bottom' && y.region === 'top') ||
    (x.region === 'bottom' && y.region === 'feet') ||
    (x.region === 'feet' && y.region === 'bottom') ||
    x.region === 'extra' ||
    y.region === 'extra'
  layers.forEach((l, i) => {
    if (l.region === 'top' && !['dress', 'robe', 'coat', 'apron'].includes(l.type))
      l.tucked = layers.slice(i + 1).some((o) => o.region === 'bottom' && o.type !== 'skirt')
    let off = base[l.region] + (l.material === 'knit' ? 0.003 : 0) + (l.type === 'coat' ? 0.008 : 0)
    for (let j = 0; j < i; j++)
      if (overlaps(l, layers[j])) off = Math.max(off, layers[j].offset + slack(layers[j]))
    l.offset = off
  })
  return layers
}
