#!/usr/bin/env node
// Copy the served registry into public/ so the docs deploy also hosts it:
// https://runek.nullorder.org/r (the CLI's default registry: index, manifests, prop schema,
// world schema, agent skill) and /registry (the JSON Schemas that `$schema` URLs point at).
// The workshop bundles the same prop schema. Runs before dev and build.
//
// /r is versioned: /r/<version>/ holds each release's registry, taken from its git tag,
// /r/versions.json indexes them, and /r itself serves the latest stable release, so the
// source `runek add` installs always matches a published @runek/core. Without release tags
// (a shallow clone, a fresh fork) /r falls back to the working tree.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { releaseTags, SERVED, versionsIndex, writeSnapshot } from './registry-snapshots.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '../../..')
const registry = join(repoRoot, 'registry')
const publicDir = join(here, '../public')

if (!existsSync(join(registry, 'components')) || !existsSync(join(registry, 'props.json'))) {
  console.error('registry/ is incomplete — run `just registry` first.')
  process.exit(1)
}

const served = join(publicDir, 'r')
rmSync(served, { recursive: true, force: true })
mkdirSync(served, { recursive: true })

const releases = releaseTags(repoRoot)
const index = versionsIndex(releases)
for (const release of releases) {
  writeSnapshot(repoRoot, release.tag, join(served, release.version))
}
const rootSource = index.latest ? join(served, index.latest) : registry
for (const entry of SERVED) {
  if (existsSync(join(rootSource, entry)))
    cpSync(join(rootSource, entry), join(served, entry), { recursive: true })
}
if (releases.length) {
  writeFileSync(join(served, 'versions.json'), `${JSON.stringify(index, null, 2)}\n`)
} else {
  console.warn('no release tags found: serving the working tree at /r, unversioned')
}

const schemas = join(publicDir, 'registry')
rmSync(schemas, { recursive: true, force: true })
mkdirSync(schemas, { recursive: true })
for (const file of ['schema.json', 'config-schema.json']) {
  cpSync(join(registry, file), join(schemas, file))
}

cpSync(join(registry, 'props.json'), join(here, '../src/workshop/schema/props.json'))

console.log(
  `synced registry → apps/docs/public/r (${releases.length} release(s), /r = ${index.latest ?? 'working tree'}), public/registry, workshop prop schema`,
)
