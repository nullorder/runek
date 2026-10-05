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
export type PersonBuild = 'slim' | 'average' | 'stocky'
export type PersonHair =
  | 'short'
  | 'swept'
  | 'long'
  | 'bun'
  | 'ponytail'
  | 'braid'
  | 'cropped'
  | 'bald'
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
export type PersonHat = 'none' | 'cap' | 'straw' | 'brim' | 'bandana' | 'hood' | 'chef'
export type PersonAccessory = 'bag' | 'belt' | 'scarf' | 'glasses' | 'cape' | 'staff'
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
 *  pushes the eyes and legs further and sharpens the chin. */
export type PersonStyle = 'stylized' | 'realistic' | 'anime'

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
  | 'belt'
  | 'scarf'
  | 'cape'

/**
 * One layer of clothing. Layers are listed inner to outer, and the order decides the fit: a
 * top listed before the trousers is tucked into them, one listed after hangs over them.
 */
export interface PersonGarment {
  type: PersonGarmentType
  color?: string
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
  hat?: PersonHat
  hair?: PersonHair
  hairColor?: string
  accessories?: PersonAccessory[]
}
