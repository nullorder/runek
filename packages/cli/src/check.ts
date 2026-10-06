// `runek check-world`: find buried and floating nodes in a world file. The ground math lives in
// @runek/core (its React-free `data` entry), loaded from the user's own project; each surface
// comes from the vendored component source (`surfaces/*.ts`), so the check reads exactly the
// code the app renders.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, join } from 'node:path'
import { pathToFileURL } from 'node:url'

type Vec3 = [number, number, number]

export type WorldNode = {
  type: string
  id?: string
  anchor?: string
  props?: Record<string, unknown>
  children?: WorldNode[]
}

export type WorldData = { version: 1; nodes: WorldNode[]; [key: string]: unknown }

export type WorldIssue = {
  kind: 'buried' | 'floating' | 'water-above-ground'
  path: string
  id?: string
  type: string
  at: Vec3
  ground: number
  fix?: number
}

type SurfaceDef = { kind: string; build: (...args: unknown[]) => unknown }

export type GroundRegistry = Record<
  string,
  { surface?: SurfaceDef; groundSitting?: boolean } | object
>

/** The subset of `@runek/core/data` the check uses. */
export type CoreData = {
  parseWorld: (json: string) => WorldData
  serializeWorld: (world: WorldData) => string
  checkWorld: (
    world: WorldData,
    registry: GroundRegistry,
    opts?: { tolerance?: number },
  ) => WorldIssue[]
  GROUND_TOLERANCE: number
}

/** Load `@runek/core/data` as installed in the project at any of `bases`. */
export async function loadCoreData(bases: string[], command = 'check-world'): Promise<CoreData> {
  for (const base of bases) {
    let resolved: string
    try {
      resolved = createRequire(join(base, 'noop.js')).resolve('@runek/core/data')
    } catch {
      continue
    }
    return (await import(pathToFileURL(resolved).href)) as CoreData
  }
  throw new Error(
    `${command} needs @runek/core 0.14 or newer installed in this project (run "runek add" first, or install @runek/core)`,
  )
}

const isSurface = (value: unknown): value is SurfaceDef =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as SurfaceDef).kind === 'string' &&
  typeof (value as SurfaceDef).build === 'function'

export function listFiles(dir: string, match: RegExp): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') out.push(...listFiles(full, match))
    } else if (match.test(entry.name)) out.push(full)
  }
  return out.sort()
}

/**
 * Build the registry the ground check needs from a component directory, without running any
 * React: surface definitions imported from `surfaces/*.ts`, matched to their component through
 * the `Component.surface = …` line in its source; `Component.groundSitting = true` flags; and
 * composite arrangements from `composites/*.json`.
 */
export async function loadGroundRegistry(dir: string): Promise<GroundRegistry> {
  const surfaces = new Map<string, SurfaceDef>()
  for (const file of listFiles(join(dir, 'surfaces'), /^[^.]+\.ts$/)) {
    let mod: Record<string, unknown>
    try {
      mod = await import(pathToFileURL(file).href)
    } catch (err) {
      if ((err as { code?: string }).code === 'ERR_UNKNOWN_FILE_EXTENSION') {
        throw new Error('check-world loads surfaces/*.ts directly and needs Node 22.18 or newer')
      }
      throw err
    }
    for (const [name, value] of Object.entries(mod)) if (isSurface(value)) surfaces.set(name, value)
  }

  const registry: Record<string, { surface?: SurfaceDef; groundSitting?: boolean } | object> = {}
  const entry = (type: string) => {
    registry[type] ??= {}
    return registry[type] as { surface?: SurfaceDef; groundSitting?: boolean }
  }
  for (const file of listFiles(dir, /\.tsx?$/)) {
    const source = readFileSync(file, 'utf8')
    for (const [, type, name] of source.matchAll(/^(\w+)\.surface\s*=\s*(\w+)/gm)) {
      const surface = surfaces.get(name)
      if (surface) entry(type).surface = surface
    }
    for (const [, type] of source.matchAll(/^(\w+)\.groundSitting\s*=\s*true/gm)) {
      entry(type).groundSitting = true
    }
  }
  for (const file of listFiles(join(dir, 'composites'), /\.json$/)) {
    const def = JSON.parse(readFileSync(file, 'utf8')) as { name?: string }
    const stem = basename(file, '.json')
    registry[def.name ?? stem[0].toUpperCase() + stem.slice(1)] = def
  }
  return registry
}

/** The node at a ground-index path (`"3/0"`) in a world's own tree. */
export function nodeAtPath(nodes: WorldNode[], path: string): WorldNode | undefined {
  let list: WorldNode[] | undefined = nodes
  let node: WorldNode | undefined
  for (const step of path.split('/')) {
    node = list?.[Number(step)]
    list = node?.children
  }
  return node
}

/** Write each issue's suggested `position[1]` into the world. Returns how many it fixed. */
export function applyFixes(world: WorldData, issues: WorldIssue[]): number {
  let fixed = 0
  for (const issue of issues) {
    const node = nodeAtPath(world.nodes, issue.path)
    const position = node?.props?.position
    if (issue.fix === undefined || !node) continue
    const [x, , z] = Array.isArray(position) ? (position as Vec3) : [0, 0, 0]
    node.props = { ...node.props, position: [x, issue.fix, z] }
    fixed++
  }
  return fixed
}

const n = (value: number) => (Math.round(value * 100) / 100).toString()

/** One human-readable line per issue. */
export function describeIssue(issue: WorldIssue): string {
  const name = `${issue.type}${issue.id ? ` ${issue.id}` : ''} [${issue.path}]`
  const [x, y, z] = issue.at
  const where = `at (${n(x)}, ${n(y)}, ${n(z)})`
  const depth = n(Math.abs(y - issue.ground))
  const fix = issue.fix === undefined ? '' : `; set position[1] to ${issue.fix}`
  switch (issue.kind) {
    case 'buried':
      return `${name} ${where} is ${depth} below the ground (${n(issue.ground)})${fix}, or anchor it`
    case 'floating':
      return `${name} ${where} floats ${depth} above the surface (${n(issue.ground)})${fix}, or anchor it`
    default:
      return `${name} water at ${n(y)} stands ${depth} above its shore (${n(issue.ground)})${fix}`
  }
}
