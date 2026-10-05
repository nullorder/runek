import { DEFAULT_PALETTE } from '@runek/core'
import { describeType, matches } from '../schema/controls'
import type { SchemaMap } from '../schema/types'

export type JsonPath = (string | number)[]

export interface Issue {
  path: JsonPath
  message: string
  severity: 'error' | 'warning'
  /** Point at the key rather than the value (unknown keys). */
  key?: boolean
}

const WORLD_KEYS = [
  'version',
  'meta',
  'unit',
  'gravity',
  'ground',
  'time',
  'timezone',
  'avatar',
  'controls',
  'palette',
  'fonts',
  'fog',
  'nodes',
]
const NODE_KEYS = ['type', 'id', 'anchor', 'props', 'children']

export function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
  }
  return dp[a.length][b.length]
}

/** The closest name, if it is close enough to be a typo. */
export function suggest(name: string, candidates: string[]): string | undefined {
  let best: string | undefined
  let bestD = Infinity
  for (const c of candidates) {
    const d = distance(name.toLowerCase(), c.toLowerCase())
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best && bestD <= Math.max(2, Math.floor(name.length / 3)) ? best : undefined
}

const mean = (name: string, candidates: string[]) => {
  const s = suggest(name, candidates)
  return s ? ` Did you mean "${s}"?` : ''
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Check parsed world JSON against the component schemas. Structural problems are errors (the
 *  world can't load); prop problems are warnings (it still renders, just maybe not as meant). */
export function validateWorld(data: unknown, schema: SchemaMap, custom: string[] = []): Issue[] {
  const issues: Issue[] = []
  const types = [...Object.keys(schema), 'Group', ...custom]
  if (!isObj(data))
    return [
      {
        path: [],
        message: 'A world is a JSON object: { "version": 1, "nodes": [...] }.',
        severity: 'error',
      },
    ]
  if (data.version !== 1)
    issues.push({ path: ['version'], message: 'Expected "version": 1.', severity: 'error' })
  if (!Array.isArray(data.nodes))
    issues.push({ path: ['nodes'], message: 'Expected a "nodes" array.', severity: 'error' })
  for (const key of Object.keys(data)) {
    if (!WORLD_KEYS.includes(key))
      issues.push({
        path: [key],
        key: true,
        message: `Unknown world field "${key}".${mean(key, WORLD_KEYS)}`,
        severity: 'warning',
      })
  }
  if (
    data.time !== undefined &&
    (typeof data.time !== 'string' || !/^\d{1,2}:\d{2}$/.test(data.time))
  ) {
    issues.push({
      path: ['time'],
      message: 'Time is "HH:MM" (24h), e.g. "18:30".',
      severity: 'error',
    })
  }
  if (
    data.avatar !== undefined &&
    !['first', 'third', 'overhead'].includes(data.avatar as string)
  ) {
    issues.push({
      path: ['avatar'],
      message: 'Avatar is "first", "third" or "overhead".',
      severity: 'error',
    })
  }
  for (const key of ['unit', 'ground'] as const) {
    if (data[key] !== undefined && typeof data[key] !== 'number')
      issues.push({ path: [key], message: `"${key}" is a number.`, severity: 'error' })
  }
  if (isObj(data.palette)) {
    const slots = Object.keys(DEFAULT_PALETTE)
    for (const [slot, value] of Object.entries(data.palette)) {
      if (!slots.includes(slot))
        issues.push({
          path: ['palette', slot],
          key: true,
          message: `Unknown palette slot "${slot}".${mean(slot, slots)}`,
          severity: 'warning',
        })
      else if (typeof value !== 'string')
        issues.push({
          path: ['palette', slot],
          message: 'A palette slot is a color string.',
          severity: 'warning',
        })
    }
  }
  if (data.fog !== undefined) {
    const fog = data.fog
    if (
      !isObj(fog) ||
      typeof fog.color !== 'string' ||
      typeof fog.near !== 'number' ||
      typeof fog.far !== 'number'
    ) {
      issues.push({
        path: ['fog'],
        message: 'Fog is { "color": "#…", "near": n, "far": n }.',
        severity: 'error',
      })
    }
  }

  const ids = new Set<string>()
  const walk = (nodes: unknown[], base: JsonPath) => {
    nodes.forEach((node, i) => {
      const path = [...base, i]
      if (!isObj(node)) {
        issues.push({ path, message: 'A node is an object with a "type".', severity: 'error' })
        return
      }
      if (typeof node.type !== 'string') {
        issues.push({
          path,
          message: 'A node needs a "type" (a component name).',
          severity: 'error',
        })
        return
      }
      for (const key of Object.keys(node)) {
        if (!NODE_KEYS.includes(key))
          issues.push({
            path: [...path, key],
            key: true,
            message: `Unknown node field "${key}".${mean(key, NODE_KEYS)} Component props go under "props".`,
            severity: 'warning',
          })
      }
      if (typeof node.id === 'string') {
        if (ids.has(node.id))
          issues.push({
            path: [...path, 'id'],
            message: `Duplicate id "${node.id}".`,
            severity: 'error',
          })
        ids.add(node.id)
      }
      if (node.anchor !== undefined && node.anchor !== 'ground' && node.anchor !== 'surface') {
        issues.push({
          path: [...path, 'anchor'],
          message: 'Anchor is "ground" or "surface".',
          severity: 'error',
        })
      }
      if (!types.includes(node.type)) {
        issues.push({
          path: [...path, 'type'],
          message: `Unknown component "${node.type}".${mean(node.type, types)}`,
          severity: 'warning',
        })
      }
      const component = schema[node.type]
      if (node.props !== undefined && !isObj(node.props)) {
        issues.push({
          path: [...path, 'props'],
          message: '"props" is an object.',
          severity: 'error',
        })
      } else if (component && isObj(node.props)) {
        const known = Object.keys(component.props)
        for (const [key, value] of Object.entries(node.props)) {
          const prop = component.props[key]
          if (!prop) {
            issues.push({
              path: [...path, 'props', key],
              key: true,
              message: `${node.type} has no prop "${key}".${mean(key, known)}`,
              severity: 'warning',
            })
          } else if (prop.type === 'function' || (prop.type === 'node' && key !== 'children')) {
            issues.push({
              path: [...path, 'props', key],
              key: true,
              message: `"${key}" only works in code (App.tsx), not in a world file.`,
              severity: 'warning',
            })
          } else if (
            prop.type === 'color' &&
            typeof value === 'string' &&
            value.startsWith('#') &&
            !/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)
          ) {
            issues.push({
              path: [...path, 'props', key],
              message: `"${value}" is not a hex color.`,
              severity: 'warning',
            })
          } else if (!matches(prop, value as never)) {
            issues.push({
              path: [...path, 'props', key],
              message: `"${key}" expects ${describeType(prop)}.`,
              severity: 'warning',
            })
          }
        }
      }
      if (node.children !== undefined) {
        if (!Array.isArray(node.children))
          issues.push({
            path: [...path, 'children'],
            message: '"children" is an array of nodes.',
            severity: 'error',
          })
        else walk(node.children, [...path, 'children'])
      }
    })
  }
  if (Array.isArray(data.nodes)) walk(data.nodes, ['nodes'])
  return issues
}
