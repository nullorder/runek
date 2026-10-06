// The shape of the generated prop schema (`registry/props.json`, served at `/r/props.json`):
// every component's props as data, derived from its TypeScript source.
import type { JsonValue } from './world-data.ts'

export type PropType =
  | { type: 'number' }
  | { type: 'string'; suggestions?: string[]; multiline?: boolean }
  | { type: 'color' }
  | { type: 'boolean' }
  | { type: 'enum'; options: (string | number)[] }
  | { type: 'vec3' }
  | { type: 'tuple'; items: PropType[] }
  | { type: 'array'; items: PropType }
  | { type: 'object'; ref: string }
  | { type: 'union'; variants: PropType[] }
  | { type: 'function' }
  | { type: 'node' }
  | { type: 'unknown'; text?: string }

export type PropSchema = PropType & {
  doc?: string
  optional?: boolean
  default?: JsonValue
  /** Source text of a default the build could not reduce to a literal. */
  computed?: string
  /** The world palette slot a color falls back to. */
  palette?: string
}

export interface ObjectDef {
  props: Record<string, PropSchema>
}

export interface ComponentSchema {
  kind: 'component' | 'composite'
  /** Whether `seed` changes the output; some components accept it only for the contract. */
  seeded?: boolean
  /** Registry name (`bookshelf`), category and description, from the registry index. */
  name?: string
  category?: string
  description?: string
  doc?: string
  props: Record<string, PropSchema>
  defs?: Record<string, ObjectDef>
}

/** Keyed by the world-data `type` (`Bookshelf`). */
export type SchemaMap = Record<string, ComponentSchema>

export function matches(type: PropType, value: JsonValue | undefined): boolean {
  if (value === undefined) return false
  switch (type.type) {
    case 'number':
      return typeof value === 'number'
    case 'string':
      return typeof value === 'string'
    case 'color':
      return typeof value === 'string'
    case 'boolean':
      return typeof value === 'boolean'
    case 'enum':
      return type.options.includes(value as string | number)
    case 'vec3':
      return Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'number')
    case 'tuple':
      return Array.isArray(value) && value.length === type.items.length
    case 'array':
      return Array.isArray(value)
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value)
    case 'union':
      return type.variants.some((v) => matches(v, value))
    default:
      return true
  }
}

/** A short human name for a type, for errors and completion details. */
export function describeType(type: PropType): string {
  switch (type.type) {
    case 'enum':
      return type.options.map((o) => JSON.stringify(o)).join(' | ')
    case 'vec3':
      return '[x, y, z]'
    case 'tuple':
      return `[${type.items.map(describeType).join(', ')}]`
    case 'array':
      return `${describeType(type.items)}[]`
    case 'object':
      return type.ref.split('.').at(-1) ?? 'object'
    case 'union':
      return type.variants.map(describeType).join(' | ')
    case 'color':
      return 'color'
    default:
      return type.type
  }
}
