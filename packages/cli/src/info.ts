// `runek info`: one component's card (props, defaults, deps, examples) from the registry alone.
import type { ComponentSchema, IndexItem, Manifest, PropSchema, PropType } from './lib.ts'

export type PropInfo = {
  name: string
  type: string
  optional: boolean
  default?: unknown
  computed?: string
  palette?: string
  doc?: string
  /** Functions and React nodes: settable in code, not in a world file. */
  codeOnly?: boolean
}

export type ComponentInfo = {
  name: string
  title: string
  kind: string
  category?: string
  description?: string
  doc?: string
  add: string
  dependencies: string[]
  registryDependencies: string[]
  props: PropInfo[]
  types: Record<string, PropInfo[]>
  example: { node: Record<string, unknown>; jsx: string }
}

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]
}

/** Find an item by registry name (`bench`) or world-data type (`Bench`), ignoring case. */
export function resolveItem(items: IndexItem[], query: string): IndexItem {
  const q = query.toLowerCase()
  const hit = items.find((i) => i.name.toLowerCase() === q || i.title?.toLowerCase() === q)
  if (hit) return hit
  let best: IndexItem | undefined
  let bestD = Infinity
  for (const item of items) {
    const d = distance(q, item.name.toLowerCase())
    if (d < bestD) [best, bestD] = [item, d]
  }
  const hint =
    best && bestD <= Math.max(2, Math.floor(q.length / 3)) ? ` Did you mean "${best.name}"?` : ''
  throw new Error(`no component named "${query}" in the registry.${hint} Run "runek list".`)
}

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
    case 'string':
      return type.multiline ? 'string (text)' : 'string'
    default:
      return type.type
  }
}

function propInfo(name: string, prop: PropSchema): PropInfo {
  return {
    name,
    type: describeType(prop),
    optional: !!prop.optional,
    ...(prop.default !== undefined ? { default: prop.default } : {}),
    ...(prop.computed ? { computed: prop.computed } : {}),
    ...(prop.palette ? { palette: prop.palette } : {}),
    ...(prop.doc ? { doc: prop.doc } : {}),
    ...(prop.type === 'function' || prop.type === 'node' ? { codeOnly: true } : {}),
  }
}

const jsxValue = (value: unknown) =>
  typeof value === 'string'
    ? JSON.stringify(value)
    : `{${JSON.stringify(value).replace(/,/g, ', ')}}`

export function componentInfo(
  item: IndexItem,
  manifest: Manifest,
  schema: ComponentSchema | undefined,
): ComponentInfo {
  const title = item.title ?? manifest.title ?? item.name
  const props = Object.entries(schema?.props ?? {}).map(([name, prop]) => propInfo(name, prop))
  const types: Record<string, PropInfo[]> = {}
  for (const [ref, def] of Object.entries(schema?.defs ?? {})) {
    types[ref.split('.').at(-1) ?? ref] = Object.entries(def.props).map(([n, p]) => propInfo(n, p))
  }

  const exampleProps: Record<string, unknown> = { position: [0, 0, 0] }
  if (schema?.seeded) exampleProps.seed = 1
  const node = { type: title, props: exampleProps }
  const jsx = `<${title} ${Object.entries(exampleProps)
    .map(([k, v]) => `${k}=${jsxValue(v)}`)
    .join(' ')} />`

  return {
    name: item.name,
    title,
    kind: item.type,
    ...(item.category ? { category: item.category } : {}),
    ...(item.description ? { description: item.description } : {}),
    ...(schema?.doc && schema.doc !== item.description ? { doc: schema.doc } : {}),
    add: `npx @runek/cli add ${item.name}`,
    dependencies: manifest.dependencies ?? [],
    registryDependencies: manifest.registryDependencies ?? [],
    props,
    types,
    example: { node, jsx },
  }
}

export type Style = { bold: (s: string) => string; dim: (s: string) => string }
const plain: Style = { bold: (s) => s, dim: (s) => s }

function defaultText(prop: PropInfo): string {
  if (prop.default !== undefined) return JSON.stringify(prop.default)
  if (prop.palette) return `palette.${prop.palette}`
  if (prop.computed) return prop.computed
  return prop.optional ? '' : 'required'
}

function propLines(props: PropInfo[], style: Style, indent = '  '): string[] {
  const nameW = Math.max(...props.map((p) => p.name.length))
  const typeW = Math.min(36, Math.max(...props.map((p) => p.type.length)))
  const lines: string[] = []
  for (const prop of props) {
    const type = prop.codeOnly ? `${prop.type} (code only)` : prop.type
    const def = defaultText(prop)
    lines.push(
      `${indent}${prop.name.padEnd(nameW)}  ${type.padEnd(typeW)}${def ? `  ${style.dim(`= ${def}`)}` : ''}`,
    )
    if (prop.doc)
      lines.push(
        `${indent}${' '.repeat(nameW + 2)}${style.dim(prop.doc.replace(/\s*\n\s*/g, ' '))}`,
      )
  }
  return lines
}

/** The human-readable card `runek info` prints. */
export function formatInfo(info: ComponentInfo, style: Style = plain): string {
  const out = [
    `${style.bold(info.title)} ${style.dim(`(${info.name}, ${info.category ?? info.kind})`)}`,
  ]
  if (info.description) out.push(info.description)
  out.push('', style.bold('Add'), `  ${info.add}`)
  if (info.dependencies.length) out.push(`  npm: ${info.dependencies.join(', ')}`)
  if (info.registryDependencies.length)
    out.push(`  also pulls: ${info.registryDependencies.join(', ')}`)
  if (info.props.length) out.push('', style.bold('Props'), ...propLines(info.props, style))
  for (const [name, props] of Object.entries(info.types)) {
    if (props.length) out.push('', style.bold(name), ...propLines(props, style))
  }
  out.push(
    '',
    style.bold('World node'),
    `  ${JSON.stringify(info.example.node)}`,
    '',
    style.bold('JSX'),
    `  ${info.example.jsx}`,
  )
  return `${out.join('\n')}\n`
}
