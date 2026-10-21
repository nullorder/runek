// Build-time readers for the served registry. Server-only (uses node:fs) — import
// from .astro frontmatter / getStaticPaths, never from a client island.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Resolved from the docs app root (Astro's cwd): import.meta.url moves with the build's chunk layout.
const registryDir = join(process.cwd(), '../../registry')
// What /r serves: the latest release (sync-registry.mjs), so it lags the working tree.
const servedIndex = join(process.cwd(), 'public/r/registry.json')

export type IndexItem = {
  name: string
  title: string
  type: string
  category: string
  description: string
}

export type RegistryFile = { path: string; content: string; type: string }

export type Manifest = {
  name: string
  title: string
  type: string
  description: string
  dependencies: string[]
  registryDependencies: string[]
  files: RegistryFile[]
}

export function getIndex(): { items: IndexItem[] } {
  return JSON.parse(readFileSync(join(registryDir, 'registry.json'), 'utf8'))
}

/** The renderable catalog: components and composites (everything except libs). */
export function getComponents(): IndexItem[] {
  return getIndex().items.filter(
    (i) => i.type === 'registry:component' || i.type === 'registry:composite',
  )
}

let released: Set<string> | null | undefined

/** False for a component on main that the latest release doesn't serve yet. */
export function isReleased(name: string): boolean {
  if (released === undefined) {
    released = existsSync(servedIndex)
      ? new Set(
          (JSON.parse(readFileSync(servedIndex, 'utf8')) as { items: IndexItem[] }).items.map(
            (i) => i.name,
          ),
        )
      : null
  }
  return released?.has(name) ?? true
}

export const UNRELEASED_NOTE =
  "Unreleased: this lands in the next release. Until then, runek add can't install it."

export function getManifest(name: string): Manifest {
  return JSON.parse(readFileSync(join(registryDir, 'components', `${name}.json`), 'utf8'))
}
