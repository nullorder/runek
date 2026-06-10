import type { ComponentType } from 'react'
import type { WorldPalette } from './palette'
import type { Vec3, WorldFog } from './types'

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

/** One placed component: a registry key, its props, and optional nested children. */
export interface WorldNode {
  /** Registry key — the component's name, e.g. "Bookshelf". */
  type: string
  props?: Record<string, JsonValue>
  children?: WorldNode[]
}

/** A whole world as plain data — diffable, forkable, version-controlled like any file. */
export interface WorldData {
  version: 1
  unit?: number
  gravity?: Vec3
  /** Color-slot overrides applied to every component in the world. */
  palette?: Partial<WorldPalette>
  fog?: WorldFog
  nodes: WorldNode[]
}

// biome-ignore lint/suspicious/noExplicitAny: a registry holds components with heterogeneous prop types
export type ComponentRegistry = Record<string, ComponentType<any>>

/** Serialize a world to pretty JSON text. */
export function serializeWorld(data: WorldData): string {
  return `${JSON.stringify(data, null, 2)}\n`
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
  return data
}
