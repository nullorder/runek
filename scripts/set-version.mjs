#!/usr/bin/env node
// Sync one semver version across every workspace package.json.
// Usage: node scripts/set-version.mjs <semver>
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error(`Usage: node scripts/set-version.mjs <semver>  (got: ${version ?? 'nothing'})`)
  process.exit(1)
}

const files = [
  'package.json',
  'packages/core/package.json',
  'packages/components/package.json',
  'apps/helicon/package.json',
]

for (const file of files) {
  const pkg = JSON.parse(readFileSync(file, 'utf8'))
  pkg.version = version
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`)
  console.log(`  ${pkg.name} → ${version}`)
}
console.log(`\nSet ${files.length} packages to ${version}.`)
