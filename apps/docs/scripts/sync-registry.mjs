#!/usr/bin/env node
// Copy the served registry into public/r so the docs deploy also hosts
// https://runek.nullorder.org/r — the CLI's default registry. Runs before dev and build.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const registry = join(here, '../../../registry')
const out = join(here, '../public/r')

if (!existsSync(join(registry, 'components'))) {
  console.error('registry/components is missing — run `just registry` first.')
  process.exit(1)
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync(join(registry, 'registry.json'), join(out, 'registry.json'))
cpSync(join(registry, 'components'), join(out, 'components'), { recursive: true })

console.log('synced registry → apps/docs/public/r')
