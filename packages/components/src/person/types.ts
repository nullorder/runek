// Public trait types for `Person`. All plain JSON, so a whole look round-trips through world data.

/** Preset bundles: clothes, hat, and accessories for a role. */
export type PersonKind =
  | 'villager'
  | 'merchant'
  | 'guard'
  | 'sailor'
  | 'farmer'
  | 'noble'
  | 'scholar'
  | 'traveler'
/** Silhouette cues only (shoulder-to-hip ratio, jaw, brow, default hair weights). */
export type PersonGender = 'feminine' | 'masculine' | 'neutral'
export type PersonAge = 'child' | 'adult' | 'elder'
/**
 * The body's own shape. Each build is a different skeleton (stature, head size, leg length,
 * shoulder, rib and hip width) with its own amount of muscle and soft tissue over it, so they
 * differ in outline and not only in scale.
 */
export type PersonBuild = 'slim' | 'average' | 'stocky' | 'athletic' | 'heavy' | 'petite' | 'lanky'
/** How much of the body is built: the bare frame, the frame with its muscles, or all of it. A
 *  look at how a figure is put together; `surface` is the finished body. */
export type PersonAnatomy = 'bones' | 'muscle' | 'surface'
export type PersonHair =
  | 'short'
  | 'swept'
  | 'long'
  | 'bun'
  | 'ponytail'
  | 'braid'
  | 'cropped'
  | 'bald'
  | 'bob'
  | 'twintails'
  | 'spiky'
  | 'fringe'
  | 'curtain'
export type PersonFacialHair = 'none' | 'stubble' | 'moustache' | 'beard'
/** One-word outfit shorthand; it expands to a `clothes` stack. */
export type PersonOutfit =
  | 'tunic'
  | 'shirt'
  | 'dress'
  | 'robe'
  | 'coat'
  | 'apron'
  | 'uniform'
  | 'vest'
  | 'tshirt'
  | 'sweater'
  | 'hoodie'
  | 'blazer'
  | 'bomber'
  | 'crop'
  | 'tank'
  | 'pleated'
  | 'shorts'
  /** A cropped street jacket with a tall collar, lit down the front and round the sleeves. */
  | 'runner'
  /** A long rain shell, zipped off-centre, with lit seams. */
  | 'shell'
  /** A padded vest over a tank, cargo trousers and boots. */
  | 'rig'
  /** A crop top, shorts over leggings and high-tops under the street jacket. */
  | 'street'
export type PersonHat = 'none' | 'cap' | 'straw' | 'brim' | 'bandana' | 'hood' | 'chef' | 'beanie'
export type PersonAccessory =
  | 'bag'
  | 'belt'
  | 'scarf'
  | 'glasses'
  | 'cape'
  | 'staff'
  | 'headphones'
  | 'mask'
  | 'backpack'
  /** A dark band across the eyes with a lit slit. */
  | 'visor'
export type PersonPose =
  | 'stand'
  | 'sit'
  | 'lean'
  | 'work'
  | 'wave'
  | 'type'
  | 'play'
  | 'drink'
  | 'lie'
/** A small animated sign over the head: asleep, something went wrong, thinking, pleased, on a break. */
export type PersonEmote = 'sleep' | 'alert' | 'think' | 'happy' | 'coffee'
/** `auto` builds the full-detail mesh only within `LOD_NEAR` units of the camera. */
export type PersonDetail = 'auto' | 'high' | 'low'
/** Proportion and face template: `stylized` is an animated-film look (big head and eyes,
 *  small features, slender limbs), `realistic` keeps canonical human proportions, `anime`
 *  pushes the eyes and legs further and sharpens the chin, and `punk` is drawn the way an
 *  animator would: long legs, tall flat eyes under a lash line, hair in chunky locks, and flat
 *  two-tone color inside an ink line. */
export type PersonStyle = 'stylized' | 'realistic' | 'anime' | 'punk'

/** The body itself. Every field is optional and seeded when unset. */
export interface PersonBodySpec {
  /** Limb thickness and torso depth. */
  build?: PersonBuild
  /** Skin color. */
  tone?: string
  /** Standing height, in units. */
  height?: number
}

export type PersonNose = 'button' | 'straight' | 'broad'

/** The face, part by part. Sizes are multipliers around 1. */
export interface PersonFaceSpec {
  eyes?: { color?: string; size?: number }
  /** Brow color defaults to the hair color; `weight` thickens them. */
  brows?: { color?: string; weight?: number }
  nose?: PersonNose
  lips?: { color?: string; fullness?: number }
  /** Cheek flush, 0 (none) to 1. */
  blush?: number
}

export interface PersonHairSpec {
  style?: PersonHair
  color?: string
}

export type PersonGarmentType =
  | 'tshirt'
  | 'shirt'
  | 'sweater'
  | 'hoodie'
  | 'blazer'
  | 'vest'
  | 'tunic'
  | 'coat'
  | 'dress'
  | 'robe'
  | 'apron'
  | 'trousers'
  | 'jeans'
  | 'shorts'
  | 'skirt'
  | 'shoes'
  | 'boots'
  | 'jacket'
  | 'croptop'
  | 'tank'
  | 'cargo'
  | 'pleated'
  | 'stockings'
  | 'sneakers'
  | 'belt'
  | 'scarf'
  | 'cape'
  | 'runner'
  | 'shell'
  | 'techvest'
  | 'joggers'
  | 'hightops'

/**
 * One layer of clothing. Layers are listed inner to outer, and the order decides the fit: a
 * top listed before the trousers is tucked into them, one listed after hangs over them.
 */
export interface PersonGarment {
  type: PersonGarmentType
  color?: string
  /** The color of its lit seams and stripes, where it has any. Defaults to the figure's trim. */
  trim?: string
  /** Tops only. */
  sleeves?: 'none' | 'short' | 'long'
  /** Tops only. */
  neck?: 'crew' | 'v' | 'collar'
  /** 0 to 1: how far it reaches (a top's hem, a leg's length, a skirt or boot's drop). */
  length?: number
}

/**
 * A cosmetic loadout (a "skin" in the game sense): clothes, colors, headwear, hair, and
 * body accessories bundled as one plain-JSON object, so a whole look swaps in a single
 * prop write. It never touches the body itself (tone, build, age, gender). Precedence per
 * trait: an explicit component prop > this skin > the `kind` preset > the seeded roll.
 */
export interface PersonSkin {
  outfit?: PersonOutfit
  /** Full layer stack; wins over `outfit`. */
  clothes?: PersonGarment[]
  topColor?: string
  bottomColor?: string
  shoeColor?: string
  /** The lit seams and stripes of street clothes. */
  trimColor?: string
  hat?: PersonHat
  hair?: PersonHair
  hairColor?: string
  accessories?: PersonAccessory[]
}
