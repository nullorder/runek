// Build a JSON Schema (draft 2020-12) for world files from the prop schema, so editors and
// agents can validate a world.json and complete component names and props. Served at
// https://runek.nullorder.org/r/world.schema.json.
import { DEFAULT_PALETTE } from '../packages/core/src/palette.ts'

const SCHEMA_URL = 'https://runek.nullorder.org/r/world.schema.json'
const vec3 = {
  type: 'array',
  prefixItems: Array(3).fill({ type: 'number' }),
  minItems: 3,
  maxItems: 3,
}

function propType(prop, component) {
  switch (prop.type) {
    case 'number':
    case 'boolean':
      return { type: prop.type }
    case 'string':
      return prop.suggestions?.length
        ? { type: 'string', examples: prop.suggestions }
        : { type: 'string' }
    case 'color':
      return { type: 'string', examples: ['#7a5a40'] }
    case 'enum':
      return { enum: prop.options }
    case 'vec3':
      return vec3
    case 'tuple':
      return {
        type: 'array',
        prefixItems: prop.items.map((i) => propType(i, component)),
        minItems: prop.items.length,
        maxItems: prop.items.length,
      }
    case 'array':
      return { type: 'array', items: propType(prop.items, component) }
    case 'object':
      return { $ref: `#/$defs/${defKey(component, prop.ref)}` }
    case 'union':
      return { anyOf: prop.variants.map((v) => propType(v, component)) }
    default:
      return {}
  }
}

const defKey = (component, ref) => `${component}.${ref}`.replaceAll('/', '_')

function objectSchema(props, component) {
  const properties = {}
  const required = []
  for (const [name, prop] of Object.entries(props)) {
    if (prop.type === 'function' || prop.type === 'node') continue
    properties[name] = {
      ...propType(prop, component),
      ...(prop.doc ? { description: prop.doc } : {}),
      ...(prop.default !== undefined ? { default: prop.default } : {}),
    }
    if (!prop.optional) required.push(name)
  }
  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
  }
}

export function worldSchema(components) {
  const types = Object.keys(components).sort()
  const $defs = {}
  for (const [name, component] of Object.entries(components)) {
    $defs[`props.${name}`] = {
      ...(component.description ? { description: component.description } : {}),
      ...objectSchema(component.props, name),
    }
    for (const [ref, def] of Object.entries(component.defs ?? {})) {
      $defs[defKey(name, ref)] = objectSchema(def.props, name)
    }
  }

  $defs.node = {
    type: 'object',
    required: ['type'],
    properties: {
      type: {
        description:
          'Component name (PascalCase registry key), `Group` for a plain transform, or one of your own components.',
        anyOf: [{ enum: ['Group', ...types] }, { type: 'string' }],
      },
      id: { type: 'string', description: 'Stable identity; the editor fills it in.' },
      anchor: {
        enum: ['ground', 'surface'],
        description:
          'Measure position[1] as an offset above the ground (`ground`) or the highest surface (`surface`).',
      },
      props: { type: 'object' },
      children: { type: 'array', items: { $ref: '#/$defs/node' } },
    },
    additionalProperties: false,
    allOf: types.map((type) => ({
      if: { properties: { type: { const: type } }, required: ['type'] },
      // biome-ignore lint/suspicious/noThenProperty: JSON Schema's if/then keyword
      then: { properties: { props: { $ref: `#/$defs/props.${type}` } } },
    })),
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: SCHEMA_URL,
    title: 'Runek world',
    description:
      'A Runek world as data: world settings plus a tree of component nodes. See https://runek.nullorder.org/docs/worlds-as-data',
    type: 'object',
    required: ['version', 'nodes'],
    properties: {
      $schema: { type: 'string' },
      version: { const: 1 },
      meta: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          authors: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name'],
              properties: { name: { type: 'string' }, url: { type: 'string' } },
              additionalProperties: false,
            },
          },
          license: { type: 'string' },
          source: {
            type: 'object',
            required: ['url'],
            properties: {
              url: { type: 'string' },
              path: { type: 'string' },
              branch: { type: 'string' },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      unit: { type: 'number', description: 'Meters per unit.', default: 1 },
      gravity: { ...vec3, default: [0, -9.81, 0] },
      ground: { type: 'number', description: 'Baseline ground level (Y).', default: 0 },
      time: {
        type: 'string',
        pattern: '^\\d{1,2}:\\d{2}$',
        description: 'Pinned time of day, "HH:MM" (24h).',
      },
      timezone: { type: 'string', description: 'IANA zone for a live, clock-driven day/night.' },
      avatar: { enum: ['first', 'third', 'overhead'], description: 'Default player camera view.' },
      controls: {
        type: 'object',
        description: 'Input remap: action to KeyboardEvent.code values.',
        additionalProperties: { type: 'array', items: { type: 'string' } },
      },
      palette: {
        type: 'object',
        description: 'Color-slot overrides for every component.',
        properties: Object.fromEntries(
          Object.entries(DEFAULT_PALETTE).map(([slot, color]) => [
            slot,
            { type: 'string', default: color },
          ]),
        ),
        additionalProperties: false,
      },
      fonts: {
        type: 'object',
        properties: { display: { type: 'string' }, body: { type: 'string' } },
        additionalProperties: false,
      },
      fog: {
        type: 'object',
        required: ['color', 'near', 'far'],
        properties: {
          color: { type: 'string' },
          near: { type: 'number' },
          far: { type: 'number' },
        },
        additionalProperties: false,
      },
      nodes: { type: 'array', items: { $ref: '#/$defs/node' } },
    },
    additionalProperties: false,
    $defs,
  }
}
