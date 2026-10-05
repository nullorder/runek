import raw from './props.json'
import type { ComponentSchema, ObjectDef, PropSchema, SchemaMap } from './types'

export const SCHEMA = raw as unknown as SchemaMap

export const CATEGORY_ORDER = [
  'structures',
  'interiors',
  'water',
  'environment',
  'vegetation',
  'terrain',
  'character',
  'systems',
]

/** Registry entries that make no sense to place from the catalog on their own. */
const UNPLACEABLE = new Set(['Interactable'])

export const COMPONENT_NAMES = Object.keys(SCHEMA).sort()

export const PLACEABLE = COMPONENT_NAMES.filter((name) => !UNPLACEABLE.has(name))

export function schemaFor(type: string): ComponentSchema | undefined {
  return SCHEMA[type]
}

export function defFor(type: string, ref: string): ObjectDef | undefined {
  return SCHEMA[type]?.defs?.[ref]
}

/** Props an inspector can edit: everything serializable, minus the transform it shows apart. */
export function editableProps(type: string): [string, PropSchema][] {
  const schema = SCHEMA[type]
  if (!schema) return []
  return Object.entries(schema.props).filter(
    ([name, prop]) =>
      !['position', 'rotation', 'seed'].includes(name) &&
      prop.type !== 'function' &&
      prop.type !== 'node',
  )
}

/** Props that only make sense in code: callbacks and React children. */
export function codeOnlyProps(type: string): string[] {
  const schema = SCHEMA[type]
  if (!schema) return []
  return Object.entries(schema.props)
    .filter(([, prop]) => prop.type === 'function' || prop.type === 'node')
    .map(([name]) => name)
}

export const hasSeed = (type: string) => !!SCHEMA[type]?.props.seed

/** Catalog grouping by registry category, in display order. */
export function catalogGroups(names = PLACEABLE) {
  const groups = new Map<string, string[]>()
  for (const name of names) {
    const category = SCHEMA[name]?.category ?? 'other'
    groups.set(category, [...(groups.get(category) ?? []), name])
  }
  const order = [
    ...CATEGORY_ORDER,
    ...[...groups.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ]
  return order
    .filter((c) => groups.has(c))
    .map((category) => ({ category, names: groups.get(category) as string[] }))
}
