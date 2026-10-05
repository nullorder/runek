import type { JsonValue } from '@runek/core'
import { RANGES } from './ranges'
import type { PropSchema, PropType } from './types'

export interface NumberRange {
  min: number
  max: number
  step: number
  integer: boolean
}

const INTEGER_NAME =
  /^(count|iterations|shelves|segments|rows|columns|cols|floors|steps|levels|seats|sides|petals|branches|planks|posts|rails|panels|drawers|doors|layers|blades|resolution|sections|slats|spokes|stories|balls|cushions|legs|seed)$|Count$/i
const UNIT_NAME =
  /^(fill|opacity|falloff|roughness|metalness|ratio|chance|bias|lean|curl|tilt)$|Ratio$/i
const SIZE_NAME = /(width|height|depth|size|radius|length|thickness|span|area|reach|scale|height)$/i
const ANGLE_DOC = /radian/i

const nice = (n: number) => {
  if (n <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(n))
  const m = n / p
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p
}

const stepFor = (span: number, integer: boolean) => {
  if (integer) return 1
  const raw = span / 200
  const p = 10 ** Math.floor(Math.log10(raw))
  return Number((Math.round(raw / p) * p).toPrecision(1)) || 0.01
}

/** Slider bounds for a number prop: hand ranges first, then guesses from name, doc and default. */
export function numberRange(component: string, name: string, schema: PropSchema): NumberRange {
  const fixed = RANGES[component]?.[name]
  const d = typeof schema.default === 'number' ? schema.default : undefined
  const integer =
    (INTEGER_NAME.test(name) || /\bnumber of\b/i.test(schema.doc ?? '')) &&
    (d === undefined || Number.isInteger(d))
  if (fixed)
    return { min: fixed[0], max: fixed[1], step: fixed[2], integer: Number.isInteger(fixed[2]) }

  const doc = schema.doc ?? ''
  if (UNIT_NAME.test(name) || /\b0\s*[–-]\s*1\b|fraction/i.test(doc)) {
    return { min: 0, max: 1, step: 0.01, integer: false }
  }
  if (ANGLE_DOC.test(doc) || /^(angle|yaw|pitch|roll|heading)$/i.test(name)) {
    return { min: -Math.PI, max: Math.PI, step: 0.01, integer: false }
  }
  if (d !== undefined && d < 0) {
    const max = nice(Math.abs(d) * 4)
    return { min: -max, max, step: stepFor(max * 2, integer), integer }
  }
  if (d !== undefined && d > 0) {
    const max = nice(d * 4)
    const min = integer && d >= 1 ? 1 : 0
    return { min, max, step: stepFor(max - min, integer), integer }
  }
  const max = SIZE_NAME.test(name) ? 10 : integer ? 10 : 1
  return { min: 0, max, step: stepFor(max, integer), integer }
}

export type ControlKind =
  | 'number'
  | 'string'
  | 'text'
  | 'color'
  | 'boolean'
  | 'segmented'
  | 'select'
  | 'vec3'
  | 'pair'
  | 'tuple'
  | 'list'
  | 'object'
  | 'union'
  | 'json'

/** Which field renders a prop. Enums with few short options become a segmented control. */
export function controlKind(type: PropType): ControlKind {
  switch (type.type) {
    case 'number':
      return 'number'
    case 'string':
      return type.multiline ? 'text' : 'string'
    case 'color':
      return 'color'
    case 'boolean':
      return 'boolean'
    case 'enum':
      return type.options.length <= 4 &&
        type.options.reduce<number>((n, o) => n + String(o).length, 0) <= 18
        ? 'segmented'
        : 'select'
    case 'vec3':
      return 'vec3'
    case 'tuple':
      return type.items.length === 2 && type.items.every((i) => i.type === 'number')
        ? 'pair'
        : type.items.every((i) => i.type === 'number')
          ? 'tuple'
          : 'json'
    case 'array':
      return 'list'
    case 'object':
      return 'object'
    case 'union':
      return 'union'
    default:
      return 'json'
  }
}

/** "segmentLength" → "segment length". */
export const labelFor = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()

/** A fresh value of a type, for "add row" and switching union variants. */
export function emptyValue(
  type: PropType,
  defs?: Record<string, { props: Record<string, PropSchema> }>,
): JsonValue {
  switch (type.type) {
    case 'number':
      return 0
    case 'string':
      return ''
    case 'color':
      return '#ffffff'
    case 'boolean':
      return true
    case 'enum':
      return type.options[0] ?? ''
    case 'vec3':
      return [0, 0, 0]
    case 'tuple':
      return type.items.map((item) => emptyValue(item, defs))
    case 'array':
      return []
    case 'object': {
      const def = defs?.[type.ref]
      const out: Record<string, JsonValue> = {}
      for (const [key, prop] of Object.entries(def?.props ?? {})) {
        if (!prop.optional) out[key] = prop.default ?? emptyValue(prop, defs)
      }
      return out
    }
    case 'union':
      return emptyValue(type.variants[0], defs)
    default:
      return null
  }
}

/** Which variant of a union a value currently is, or -1. */
export function variantOf(
  type: Extract<PropType, { type: 'union' }>,
  value: JsonValue | undefined,
) {
  return type.variants.findIndex((variant) => matches(variant, value))
}

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
