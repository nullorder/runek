// Build-time readers for the served registry. Server-only (uses node:fs) — import
// from .astro frontmatter / getStaticPaths, never from a client island.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const registryDir = join(dirname(fileURLToPath(import.meta.url)), '../../../../registry')

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

export function getManifest(name: string): Manifest {
  return JSON.parse(readFileSync(join(registryDir, 'components', `${name}.json`), 'utf8'))
}
