#!/usr/bin/env node
// Copy the served registry into public/ so the docs deploy also hosts it:
// https://runek.nullorder.org/r (the CLI's default registry: index, manifests, prop schema,
// world schema, agent skill) and /registry (the JSON Schemas that `$schema` URLs point at).
// The workshop bundles the same prop schema. Runs before dev and build.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const registry = join(here, '../../../registry')
const publicDir = join(here, '../public')

if (!existsSync(join(registry, 'components')) || !existsSync(join(registry, 'props.json'))) {
  console.error('registry/ is incomplete — run `just registry` first.')
  process.exit(1)
}

const served = join(publicDir, 'r')
rmSync(served, { recursive: true, force: true })
mkdirSync(served, { recursive: true })
for (const entry of ['registry.json', 'props.json', 'world.schema.json', 'components', 'agents']) {
  if (existsSync(join(registry, entry)))
    cpSync(join(registry, entry), join(served, entry), { recursive: true })
}

const schemas = join(publicDir, 'registry')
rmSync(schemas, { recursive: true, force: true })
mkdirSync(schemas, { recursive: true })
for (const file of ['schema.json', 'config-schema.json']) {
  cpSync(join(registry, file), join(schemas, file))
}

cpSync(join(registry, 'props.json'), join(here, '../src/workshop/schema/props.json'))

console.log('synced registry → apps/docs/public/r, public/registry, workshop prop schema')
