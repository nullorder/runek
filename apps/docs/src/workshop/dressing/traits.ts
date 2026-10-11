import type { ResolvedPerson } from '@runek/components'
import type { JsonValue } from '@runek/core/data'
import { editableProps } from '../schema'

type Props = Record<string, JsonValue>

export type TabId = 'looks' | 'body' | 'face' | 'hair' | 'clothes' | 'extras' | 'pose' | 'more'

export const TABS: [TabId, string][] = [
  ['looks', 'Looks'],
  ['body', 'Body'],
  ['face', 'Face'],
  ['hair', 'Hair'],
  ['clothes', 'Clothes'],
  ['extras', 'Hat & extras'],
  ['pose', 'Pose'],
  ['more', 'More'],
]

export interface TraitDef {
  label: string
  tab: TabId
  /** Where the room writes it: a part object path where one exists (`body.tone`), else the flat prop. */
  path: string[]
  /** The resolved trait that reports its value and source. */
  resolved?: keyof ResolvedPerson
}

export const TRAITS = {
  kind: { label: 'kind', tab: 'looks', path: ['kind'], resolved: 'kind' },
  skin: { label: 'skin', tab: 'looks', path: ['skin'] },
  style: { label: 'style', tab: 'body', path: ['style'], resolved: 'style' },
  gender: { label: 'gender', tab: 'body', path: ['gender'], resolved: 'gender' },
  age: { label: 'age', tab: 'body', path: ['age'], resolved: 'age' },
  build: { label: 'build', tab: 'body', path: ['body', 'build'], resolved: 'build' },
  height: { label: 'height', tab: 'body', path: ['body', 'height'], resolved: 'height' },
  tone: { label: 'skin tone', tab: 'body', path: ['body', 'tone'], resolved: 'tone' },
  eyeColor: { label: 'eyes', tab: 'face', path: ['face', 'eyes', 'color'], resolved: 'eyeColor' },
  eyeSize: { label: 'eye size', tab: 'face', path: ['face', 'eyes', 'size'], resolved: 'eyeSize' },
  browColor: {
    label: 'brows',
    tab: 'face',
    path: ['face', 'brows', 'color'],
    resolved: 'browColor',
  },
  browWeight: {
    label: 'brow weight',
    tab: 'face',
    path: ['face', 'brows', 'weight'],
    resolved: 'browWeight',
  },
  nose: { label: 'nose', tab: 'face', path: ['face', 'nose'], resolved: 'nose' },
  lipColor: { label: 'lips', tab: 'face', path: ['face', 'lips', 'color'], resolved: 'lipColor' },
  lipFullness: {
    label: 'lip fullness',
    tab: 'face',
    path: ['face', 'lips', 'fullness'],
    resolved: 'lipFullness',
  },
  blush: { label: 'blush', tab: 'face', path: ['face', 'blush'], resolved: 'blush' },
  facialHair: {
    label: 'facial hair',
    tab: 'face',
    path: ['facialHair'],
    resolved: 'facialHair',
  },
  hair: { label: 'style', tab: 'hair', path: ['hair', 'style'], resolved: 'hair' },
  hairColor: { label: 'color', tab: 'hair', path: ['hair', 'color'], resolved: 'hairColor' },
  outfit: { label: 'outfit', tab: 'clothes', path: ['outfit'], resolved: 'outfit' },
  clothes: { label: 'layers', tab: 'clothes', path: ['clothes'], resolved: 'clothes' },
  topColor: { label: 'top', tab: 'clothes', path: ['topColor'], resolved: 'topColor' },
  bottomColor: { label: 'bottoms', tab: 'clothes', path: ['bottomColor'], resolved: 'bottomColor' },
  shoeColor: { label: 'shoes', tab: 'clothes', path: ['shoeColor'], resolved: 'shoeColor' },
  hat: { label: 'hat', tab: 'extras', path: ['hat'], resolved: 'hat' },
  accessories: {
    label: 'accessories',
    tab: 'extras',
    path: ['accessories'],
    resolved: 'accessories',
  },
  pose: { label: 'pose', tab: 'pose', path: ['pose'] },
  idle: { label: 'idle', tab: 'pose', path: ['idle'] },
  lookAt: { label: 'look at you', tab: 'pose', path: ['lookAt'] },
  emote: { label: 'emote', tab: 'pose', path: ['emote'] },
  bubble: { label: 'bubble', tab: 'pose', path: ['bubble'] },
  label: { label: 'name tag', tab: 'pose', path: ['label'] },
} satisfies Record<string, TraitDef>

export type TraitId = keyof typeof TRAITS

/** Flat shorthands and the part-object field each one stands for. */
const SHORTHANDS: Record<string, [string, string][]> = {
  body: [
    ['skinTone', 'tone'],
    ['build', 'build'],
    ['height', 'height'],
  ],
  hair: [
    ['hair', 'style'],
    ['hairColor', 'color'],
  ],
}

/** Props the room covers on some tab (part objects and their shorthands included). */
const COVERED = new Set([
  ...Object.values(TRAITS).map((t) => t.path[0]),
  ...Object.values(SHORTHANDS).flatMap((pairs) => pairs.map(([flat]) => flat)),
  'seed',
])

/** Person props no tab places: behavior and physics, shown under More. */
export const moreProps = () =>
  editableProps('Person')
    .map(([name]) => name)
    .filter((name) => !COVERED.has(name))

/** Props that make up a look (who the figure is and what it wears), not where it is or what it does. */
export const LOOK_KEYS = [
  'seed',
  'style',
  'kind',
  'gender',
  'age',
  'body',
  'face',
  'clothes',
  'height',
  'build',
  'skinTone',
  'skin',
  'hair',
  'hairColor',
  'facialHair',
  'outfit',
  'topColor',
  'bottomColor',
  'shoeColor',
  'hat',
  'accessories',
]

const isObject = (v: unknown): v is Props => !!v && typeof v === 'object' && !Array.isArray(v)

/** Move a group's flat shorthands into its part object. The part object already wins over them,
 *  so a flat value is kept only where the part has no field of its own. The look is unchanged. */
export function migrate(props: Props, group: string): Props {
  const pairs = SHORTHANDS[group]
  if (!pairs) return props
  const flats = pairs.filter(([flat]) => {
    const v = props[flat]
    return v !== undefined && !(group === 'hair' && flat === 'hair' && isObject(v))
  })
  if (!flats.length) return props
  const next = { ...props }
  const part: Props = isObject(props[group]) ? { ...(props[group] as Props) } : {}
  for (const [flat, field] of flats) {
    if (part[field] === undefined) part[field] = props[flat]
    if (flat !== group) delete next[flat]
  }
  next[group] = part
  return next
}

export function getPath(props: Props, path: string[]): JsonValue | undefined {
  let at: JsonValue | undefined = props
  for (const key of path) {
    if (!isObject(at)) return undefined
    at = at[key]
  }
  return at
}

function setIn(obj: Props, path: string[], value: JsonValue | undefined): Props {
  const [key, ...rest] = path
  const next = { ...obj }
  if (!rest.length) {
    if (value === undefined) delete next[key]
    else next[key] = value
    return next
  }
  const child = setIn(isObject(obj[key]) ? (obj[key] as Props) : {}, rest, value)
  if (Object.keys(child).length) next[key] = child
  else delete next[key]
  return next
}

/** Write one trait, canonically: part objects where they exist, shorthands migrated into them,
 *  emptied objects pruned. `undefined` clears it, so the skin, kind, or seed takes over again. */
export function writeTrait(props: Props, id: TraitId, value: JsonValue | undefined): Props {
  const { path } = TRAITS[id]
  return setIn(migrate(props, path[0]), path, value)
}

/** The keys that changed between two props objects, as a patch (`undefined` removes a key). */
export function diffPatch(before: Props, after: Props): Record<string, JsonValue | undefined> {
  const patch: Record<string, JsonValue | undefined> = {}
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) patch[key] = after[key]
  }
  return patch
}

/** Just the look of a figure. */
export function lookOf(props: Props): Props {
  const out: Props = {}
  for (const key of LOOK_KEYS) if (props[key] !== undefined) out[key] = props[key]
  return out
}

/** Put a look on a figure, replacing its look and keeping where it stands and what it does. */
export function wearLook(props: Props, look: Props): Props {
  const out: Props = {}
  for (const [key, value] of Object.entries(props)) if (!LOOK_KEYS.includes(key)) out[key] = value
  return { ...out, ...lookOf(look) }
}

/** A `.look.json` file: a Person node, so it also pastes straight into a world. */
export const lookFile = (props: Props) => ({ type: 'Person', props: lookOf(props) })

/** Read a look from a file's JSON: a Person node, or a bare props object. */
export function parseLook(text: string): Props {
  const data = JSON.parse(text) as unknown
  if (!isObject(data)) throw new Error('A look is a JSON object.')
  if (data.type !== undefined && data.type !== 'Person') throw new Error(`That's a ${data.type}.`)
  const props = isObject(data.props) ? data.props : data.type ? {} : data
  const look = lookOf(props as Props)
  if (!Object.keys(look).length) throw new Error('No Person look in that file.')
  return look
}

/** The play avatar's body wearing a look: the body's own fit (height, offset) is kept, since it
 *  is sized to the avatar's capsule. */
export function avatarBody(look: Props, current?: Props): Props {
  const worn = lookOf(look)
  delete worn.height
  if (isObject(worn.body)) {
    const { height: _h, ...rest } = worn.body as Props
    if (Object.keys(rest).length) worn.body = rest
    else delete worn.body
  }
  return {
    ...worn,
    physics: false,
    lookAt: false,
    height: current?.height ?? 1.3,
    position: current?.position ?? [0, -0.65, 0],
  }
}
