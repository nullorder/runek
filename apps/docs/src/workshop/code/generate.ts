import type { JsonValue, WorldData, WorldNode } from '@runek/core/data'
import { SCHEMA } from '../schema'
import { usedTypes } from '../state/ops'

export type CodeStyle = 'data' | 'jsx'
type Vec3 = [number, number, number]

const IDENT = /^[A-Za-z_$][\w$]*$/

/** A JSON value as a compact JS literal: `[1, 0, 2]`, `{ size: [3, 2] }`. */
export function literal(value: JsonValue): string {
  if (Array.isArray(value)) return `[${value.map(literal).join(', ')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
    if (!entries.length) return '{}'
    return `{ ${entries.map(([k, v]) => `${IDENT.test(k) ? k : JSON.stringify(k)}: ${literal(v)}`).join(', ')} }`
  }
  return JSON.stringify(value)
}

function attr(name: string, value: JsonValue): string {
  if (value === true) return name
  if (typeof value === 'string' && !/["{}\\\n]/.test(value)) return `${name}="${value}"`
  return `${name}={${literal(value)}}`
}

const WORLD_FIELDS = [
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
] as const

const has = (nodes: WorldNode[], type: string): boolean =>
  nodes.some((n) => n.type === type || (n.children ? has(n.children, type) : false))

const isComposite = (type: string) => SCHEMA[type]?.kind === 'composite'

const escapeText = (text: string) => text.replace(/[{}<>]/g, (c) => `{'${c}'}`)

export interface GenerateOptions {
  /** Resolved world position of an anchored node by tree path (JSX style bakes it in). */
  resolve?: (path: string) => Vec3 | undefined
}

function jsxNode(
  node: WorldNode,
  path: string,
  depth: number,
  opts: GenerateOptions,
  out: string[],
) {
  const pad = '  '.repeat(depth)
  const props: Record<string, JsonValue> = { ...node.props }
  if (node.anchor) {
    const at = opts.resolve?.(path)
    if (at) props.position = at
  }
  if (isComposite(node.type)) {
    out.push(
      `${pad}<WorldNodes nodes={[${literal({ type: node.type, props } as unknown as JsonValue)}]} registry={registry} />`,
    )
    return
  }
  const known = node.type === 'Group' || !!SCHEMA[node.type]
  if (!known) {
    out.push(`${pad}{/* ${node.type}: not in the stock registry, render it yourself */}`)
    return
  }
  const tag = node.type === 'Group' ? 'group' : node.type
  const text = typeof props.children === 'string' ? props.children : null
  delete props.children
  const attrs = Object.entries(props).map(([k, v]) => attr(k, v))
  const head = attrs.length ? `<${tag} ${attrs.join(' ')}` : `<${tag}`
  const children = node.children ?? []
  if (!children.length && text === null) {
    out.push(`${pad}${head} />`)
    return
  }
  out.push(`${pad}${head}>`)
  if (text !== null) out.push(`${pad}  ${escapeText(text)}`)
  children.forEach((child, i) => {
    jsxNode(child, `${path}/${i}`, depth + 1, opts, out)
  })
  out.push(`${pad}</${tag}>`)
}

/** A ready-to-run `App.tsx` for a world: rendered from data, or spelled out as JSX. */
export function generateApp(
  world: WorldData,
  style: CodeStyle = 'data',
  opts: GenerateOptions = {},
): string {
  const lights = has(world.nodes, 'LightRig') ? ' lights={false}' : ''
  if (style === 'data') {
    return `import { registry } from '@runek/components'
import { type WorldData, WorldRenderer } from '@runek/core'
import world from './world.json'

export default function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <WorldRenderer data={world as WorldData} registry={registry}${lights} />
    </div>
  )
}
`
  }

  const types = usedTypes(world).filter((t) => t !== 'Group' && SCHEMA[t] && !isComposite(t))
  const composites = usedTypes(world).some(isComposite)
  const worldAttrs = WORLD_FIELDS.filter((k) => world[k] !== undefined).map((k) =>
    attr(k, world[k] as JsonValue),
  )
  if (lights) worldAttrs.push('lights={false}')
  const body: string[] = []
  world.nodes.forEach((node, i) => {
    jsxNode(node, `${i}`, 4, opts, body)
  })
  const imports = [
    ...(types.length || composites
      ? [
          `import { ${[...types, ...(composites ? ['registry'] : [])].join(', ')} } from '@runek/components'`,
        ]
      : []),
    `import { World${composites ? ', WorldNodes' : ''} } from '@runek/core'`,
  ]
  const open = worldAttrs.length ? `<World ${worldAttrs.join(' ')}>` : '<World>'
  return `${imports.join('\n')}

export default function App() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      ${open}
${body.join('\n')}
      </World>
    </div>
  )
}
`
}

/** One component as a JSX element, e.g. for copying out of the lab. */
export function jsxFor(type: string, props: Record<string, JsonValue>): string {
  const { children, ...rest } = props
  const attrs = Object.entries(rest).map(([k, v]) => attr(k, v))
  const head = attrs.length ? `<${type} ${attrs.join(' ')}` : `<${type}`
  return typeof children === 'string' ? `${head}>${escapeText(children)}</${type}>` : `${head} />`
}

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

const RUNNER: Record<PackageManager, string> = {
  npm: 'npx',
  pnpm: 'pnpm dlx',
  yarn: 'yarn dlx',
  bun: 'bunx',
}

/** Registry names (`bookshelf`) of the components a world uses. */
export function registryNames(world: WorldData): string[] {
  return usedTypes(world)
    .map((t) => SCHEMA[t]?.name)
    .filter((n): n is string => !!n)
}

export function installCommands(world: WorldData, pm: PackageManager = 'npm'): string[] {
  const run = `${RUNNER[pm]} @runek/cli`
  const names = registryNames(world)
  return [`${run} init`, ...(names.length ? [`${run} add ${names.join(' ')}`] : [])]
}
