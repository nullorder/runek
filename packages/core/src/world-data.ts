import type { ComponentType } from 'react'
import type { WorldFonts } from './font'
import type { WorldPalette } from './palette'
import type { AvatarView, Vec3, WorldFog } from './types'

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

/** One contributor to a world. */
export interface WorldAuthor {
  name: string
  url?: string
}

/** Where a world lives, so it can be linked, forked, and contributed back to. */
export interface WorldSource {
  /** Full web URL of the canonical repo, e.g. `https://github.com/owner/repo`.
   *  Stored whole (not `owner/repo`) so the host is detectable for the fork flow. */
  url: string
  /** Path to the world file within the repo, e.g. `public/helicon.world.json`. */
  path?: string
  branch?: string
}

/** A world's descriptive identity: attribution, license, and where it lives.
 *  Everything is optional; a world with no `meta` still renders. Travels in the
 *  world file (not tooling config) so it survives a fork. */
export interface WorldMeta {
  title?: string
  description?: string
  /** Worlds accrue contributors, hence an array. */
  authors?: WorldAuthor[]
  /** Free SPDX-ish string. Components are MIT code; a world is content, so authors
   *  often prefer a Creative Commons license for the world itself. */
  license?: string
  source?: WorldSource
}

/** One placed component: a registry key, its props, and optional nested children. */
export interface WorldNode {
  /** Registry key — the component's name, e.g. "Bookshelf". */
  type: string
  /** Stable identity, durable across edits and reorders. Optional in hand-authored
   *  worlds; the editor fills it in (see `assignNodeIds`). Drives React keys,
   *  selection, and minimal PR diffs. */
  id?: string
  props?: Record<string, JsonValue>
  children?: WorldNode[]
}

/** A whole world as plain data — diffable, forkable, version-controlled like any file. */
export interface WorldData {
  version: 1
  /** The world's identity (title, authors, license, source). Optional. */
  meta?: WorldMeta
  unit?: number
  gravity?: Vec3
  /** Pinned time-of-day ("HH:MM", 24h) for a reproducible world. Drives day/night. */
  time?: string
  /** IANA timezone for a live, clock-driven day/night (used when `time` is unset). */
  timezone?: string
  /** World default camera view; `Player` reads it when its own `view` is unset. */
  avatar?: AvatarView
  /** Color-slot overrides applied to every component in the world. */
  palette?: Partial<WorldPalette>
  /** Fonts the world ships, by role (`display`, `body`). Text components draw from
   *  these; unset roles fall back to the bundled default. Values are font URLs. */
  fonts?: Partial<WorldFonts>
  fog?: WorldFog
  nodes: WorldNode[]
}

// biome-ignore lint/suspicious/noExplicitAny: a registry holds components with heterogeneous prop types
export type ComponentRegistry = Record<string, ComponentType<any>>

/** Recreate a node with its keys in canonical order, recursing into children. */
function normalizeNode(node: WorldNode): WorldNode {
  const out: WorldNode = { type: node.type }
  if (node.id !== undefined) out.id = node.id
  if (node.props !== undefined) out.props = node.props
  if (node.children !== undefined) out.children = node.children.map(normalizeNode)
  return out
}

/**
 * Serialize a world to pretty JSON text with a canonical, stable key order
 * (`version, meta, unit, gravity, time, timezone, avatar, palette, fonts, fog,
 * nodes`; each node `type, id, props, children`). Stable output means an
 * unchanged node never churns the diff, so PR reviews show only the real change.
 */
export function serializeWorld(data: WorldData): string {
  // Build with a fixed key insertion order (nodes last); a plain record lets us add
  // the optional fields conditionally without TypeScript demanding `nodes` up front.
  const out: Record<string, unknown> = { version: data.version }
  if (data.meta !== undefined) out.meta = data.meta
  if (data.unit !== undefined) out.unit = data.unit
  if (data.gravity !== undefined) out.gravity = data.gravity
  if (data.time !== undefined) out.time = data.time
  if (data.timezone !== undefined) out.timezone = data.timezone
  if (data.avatar !== undefined) out.avatar = data.avatar
  if (data.palette !== undefined) out.palette = data.palette
  if (data.fonts !== undefined) out.fonts = data.fonts
  if (data.fog !== undefined) out.fog = data.fog
  out.nodes = data.nodes.map(normalizeNode)
  return `${JSON.stringify(out, null, 2)}\n`
}

/** Parse and lightly validate world JSON text. Throws on an unsupported shape. */
export function parseWorld(json: string): WorldData {
  const data = JSON.parse(json) as WorldData
  if (data.version !== 1) {
    throw new Error(
      `Unsupported world version: ${JSON.stringify((data as { version?: unknown }).version)}`,
    )
  }
  if (!Array.isArray(data.nodes)) {
    throw new Error('World data must have a "nodes" array')
  }
  if (data.meta !== undefined) {
    const meta = data.meta as unknown
    if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
      throw new Error('World "meta" must be an object')
    }
    if ((meta as WorldMeta).authors !== undefined && !Array.isArray((meta as WorldMeta).authors)) {
      throw new Error('World "meta.authors" must be an array')
    }
  }
  if (data.time !== undefined && typeof data.time !== 'string') {
    throw new Error('World "time" must be an "HH:MM" string')
  }
  if (data.timezone !== undefined && typeof data.timezone !== 'string') {
    throw new Error('World "timezone" must be a string')
  }
  if (data.avatar !== undefined && data.avatar !== 'first' && data.avatar !== 'third') {
    throw new Error('World "avatar" must be "first" or "third"')
  }
  if (data.fonts !== undefined) {
    const fonts = data.fonts as unknown
    if (typeof fonts !== 'object' || fonts === null || Array.isArray(fonts)) {
      throw new Error('World "fonts" must be an object of role to font URL')
    }
    for (const value of Object.values(fonts as Record<string, unknown>)) {
      if (typeof value !== 'string') {
        throw new Error('World "fonts" values must be font URL strings')
      }
    }
  }
  return data
}

/** Collect every existing node id in the tree into `into`. */
function collectIds(nodes: WorldNode[], into: Set<string>): void {
  for (const node of nodes) {
    if (node.id) into.add(node.id)
    if (node.children) collectIds(node.children, into)
  }
}

/** A short id, unique within the `taken` set (which it also updates). */
function makeNodeId(taken: Set<string>): string {
  let id: string
  do {
    id = `n${Math.random().toString(36).slice(2, 8)}`
  } while (taken.has(id))
  taken.add(id)
  return id
}

function withIds(nodes: WorldNode[], taken: Set<string>): WorldNode[] {
  return nodes.map((node) => ({
    ...node,
    id: node.id ?? makeNodeId(taken),
    ...(node.children ? { children: withIds(node.children, taken) } : {}),
  }))
}

/**
 * Return a copy of the world where every node has a stable `id`. Existing ids are
 * preserved; missing ones are generated (unique within the world). The editor calls
 * this on load, so edits and serialized output carry durable node identity even when
 * the source world was hand-authored without ids.
 */
export function assignNodeIds(data: WorldData): WorldData {
  const taken = new Set<string>()
  collectIds(data.nodes, taken)
  return { ...data, nodes: withIds(data.nodes, taken) }
}
