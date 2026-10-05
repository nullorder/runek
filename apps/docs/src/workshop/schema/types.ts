import type { JsonValue } from '@runek/core'

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
  /** Registry name (`bookshelf`), category and description, from the registry index. */
  name?: string
  category?: string
  description?: string
  doc?: string
  props: Record<string, PropSchema>
  defs?: Record<string, ObjectDef>
}

export type SchemaMap = Record<string, ComponentSchema>
