// What a Person's props resolve to, trait by trait, and where each value came from. Built on the
// same `resolveFigure` the component renders with, so the answer always matches the figure.
import { DEFAULT_PALETTE, type WorldPalette } from '@runek/core'
import { KINDS, PERSON_SKINS, resolveFigure, type TraitInput } from './spec'
import type {
  PersonAccessory,
  PersonAge,
  PersonBuild,
  PersonFacialHair,
  PersonGarment,
  PersonGender,
  PersonHair,
  PersonHat,
  PersonKind,
  PersonNose,
  PersonOutfit,
  PersonSkin,
  PersonStyle,
} from './types'

/** Where a resolved trait came from: a prop (flat or part object), the `skin` bundle, the `kind`
 *  preset, the seeded roll, or the component's fixed default. */
export type PersonTraitSource = 'prop' | 'skin' | 'kind' | 'seed' | 'default'

export interface PersonTrait<T> {
  value: T
  from: PersonTraitSource
}

/** A clothing layer with every option settled. `tucked` comes from the stack order. */
export interface ResolvedGarment extends Required<PersonGarment> {
  tucked: boolean
}

export interface ResolvedPerson {
  style: PersonTrait<PersonStyle>
  kind: PersonTrait<PersonKind>
  gender: PersonTrait<PersonGender>
  age: PersonTrait<PersonAge>
  build: PersonTrait<PersonBuild>
  /** Standing height, in units. */
  height: PersonTrait<number>
  tone: PersonTrait<string>
  hair: PersonTrait<PersonHair>
  hairColor: PersonTrait<string>
  facialHair: PersonTrait<PersonFacialHair>
  eyeColor: PersonTrait<string>
  eyeSize: PersonTrait<number>
  browColor: PersonTrait<string>
  browWeight: PersonTrait<number>
  nose: PersonTrait<PersonNose>
  lipColor: PersonTrait<string>
  lipFullness: PersonTrait<number>
  blush: PersonTrait<number>
  /** The one-word outfit the layers expanded from; `null` when `clothes` were given outright. */
  outfit: PersonTrait<PersonOutfit | null>
  clothes: PersonTrait<ResolvedGarment[]>
  topColor: PersonTrait<string>
  bottomColor: PersonTrait<string>
  shoeColor: PersonTrait<string>
  hat: PersonTrait<PersonHat>
  accessories: PersonTrait<PersonAccessory[]>
}

const trait = <T>(value: T, from: PersonTraitSource): PersonTrait<T> => ({ value, from })

/**
 * Resolve a `Person`'s props the way the component does and report every trait with its source,
 * so an editor (or an agent) can tell what the seed chose: `resolvePerson({ seed: 3 }).hair` is
 * `{ value: 'braid', from: 'seed' }`. Pass the world's palette and unit to match a figure in a
 * world that sets them. Pure and cheap: no geometry is built.
 */
export function resolvePerson(
  props: Partial<TraitInput>,
  palette: WorldPalette = DEFAULT_PALETTE,
  unit = 1,
): ResolvedPerson {
  const t: TraitInput = {
    ...props,
    seed: props.seed ?? 1,
    style: props.style ?? 'stylized',
    kind: props.kind ?? 'villager',
    age: props.age ?? 'adult',
  }
  const { spec, slots } = resolveFigure(t, palette, unit)
  const sk: PersonSkin | undefined = typeof t.skin === 'string' ? PERSON_SKINS[t.skin] : t.skin
  const preset = KINDS[t.kind]
  const hairObj = typeof t.hair === 'object' ? t.hair : undefined
  const hairName = typeof t.hair === 'string' ? t.hair : undefined
  const f = t.face ?? {}
  const given = (v: unknown) => v !== undefined
  const chain = (prop: unknown, skin: unknown, fallback: PersonTraitSource): PersonTraitSource =>
    given(prop) ? 'prop' : given(skin) ? 'skin' : fallback

  const explicit = t.clothes !== undefined ? 'prop' : sk?.clothes !== undefined ? 'skin' : null
  const outfitFrom = chain(t.outfit, sk?.outfit, 'kind')

  return {
    style: trait(t.style, given(props.style) ? 'prop' : 'default'),
    kind: trait(t.kind, given(props.kind) ? 'prop' : 'default'),
    gender: trait(spec.gender, given(t.gender) ? 'prop' : 'seed'),
    age: trait(t.age, given(props.age) ? 'prop' : 'default'),
    build: trait(spec.build, given(t.body?.build ?? t.build) ? 'prop' : 'seed'),
    height: trait(spec.height / unit, given(t.body?.height ?? t.height) ? 'prop' : 'default'),
    tone: trait(spec.colors.skin, given(t.body?.tone ?? t.skinTone) ? 'prop' : 'seed'),
    hair: trait(spec.hair, chain(hairObj?.style ?? hairName, sk?.hair, 'seed')),
    hairColor: trait(spec.colors.hair, chain(hairObj?.color ?? t.hairColor, sk?.hairColor, 'seed')),
    facialHair: trait(spec.facialHair, given(t.facialHair) ? 'prop' : 'seed'),
    eyeColor: trait(spec.colors.eye, given(f.eyes?.color) ? 'prop' : 'seed'),
    eyeSize: trait(f.eyes?.size ?? 1, given(f.eyes?.size) ? 'prop' : 'default'),
    browColor: trait(spec.colors.brow, given(f.brows?.color) ? 'prop' : 'default'),
    browWeight: trait(spec.face.browWeight, given(f.brows?.weight) ? 'prop' : 'default'),
    nose: trait(
      spec.face.noseKind,
      given(f.nose) ? 'prop' : t.style === 'realistic' ? 'seed' : 'default',
    ),
    lipColor: trait(spec.colors.lip, given(f.lips?.color) ? 'prop' : 'default'),
    lipFullness: trait(f.lips?.fullness ?? 1, given(f.lips?.fullness) ? 'prop' : 'default'),
    blush: trait(spec.face.blush, given(f.blush) ? 'prop' : 'default'),
    outfit: explicit
      ? trait(null, explicit)
      : trait(t.outfit ?? sk?.outfit ?? preset.outfit, outfitFrom),
    clothes: trait(
      spec.layers.map((l) => ({
        type: l.type,
        color: l.color,
        sleeves: l.sleeves,
        neck: l.neck,
        length: l.length,
        tucked: l.tucked,
      })),
      explicit ?? outfitFrom,
    ),
    topColor: trait(slots.top, chain(t.topColor, sk?.topColor, 'seed')),
    bottomColor: trait(slots.bottom, chain(t.bottomColor, sk?.bottomColor, 'seed')),
    shoeColor: trait(slots.shoe, chain(t.shoeColor, sk?.shoeColor, 'default')),
    hat: trait(spec.hat, chain(t.hat, sk?.hat, 'kind')),
    accessories: trait(
      t.accessories ?? sk?.accessories ?? preset.accessories,
      chain(t.accessories, sk?.accessories, 'kind'),
    ),
  }
}
