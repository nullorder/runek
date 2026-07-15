#!/usr/bin/env node
// Build the served registry from the authored index.
//
// Reads registry/registry.json (the hand-maintained index) and, for each item,
// expands directories, reads source, derives `dependencies` (npm) and
// `registryDependencies` (other items) from the imports, and writes a
// self-contained manifest to registry/components/<name>.json.
//
// Source content is stored verbatim. Components import `@runek/core` from npm
// (declared as a dependency, pinned to core's current version), so manifests
// stay layout-agnostic and need no import rewriting.
//
// Usage: node scripts/build-registry.mjs
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, posix, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const registryDir = join(root, 'registry')
const outDir = join(registryDir, 'components')

// Packages assumed present in any React project — never emitted as install deps.
const BASELINE_DEPS = new Set(['react', 'react-dom'])

const catalog = readCatalog(join(root, 'pnpm-workspace.yaml'))
const index = JSON.parse(readFileSync(join(registryDir, 'registry.json'), 'utf8'))

// Components depend on the published @runek/core, pinned to its current version.
const coreVersion = JSON.parse(
  readFileSync(join(root, 'packages/core/package.json'), 'utf8'),
).version
const CORE_DEP = `@runek/core@^${coreVersion}`

// Map a source file's basename (no extension) → item name, so a sibling import
// like `./Door` resolves to the `door` registry item.
const basenameToItem = new Map()
for (const item of index.items) {
  for (const file of item.files) {
    if (file.path.endsWith('.tsx') || file.path.endsWith('.ts')) {
      basenameToItem.set(baseNoExt(file.path), item.name)
    }
  }
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

let fileCount = 0
for (const item of index.items) {
  const files = item.files.flatMap((f) => expand(f, item))
  const deps = new Set()
  const registryDeps = new Set()

  for (const file of files) {
    if (item.type === 'registry:composite') {
      // A composite is a data arrangement: its registry dependencies are the
      // component types its nodes reference (PascalCase type = source basename).
      for (const type of nodeTypes(JSON.parse(file.content).nodes ?? [])) {
        const dep = basenameToItem.get(type)
        if (dep && dep !== item.name) registryDeps.add(dep)
      }
      continue
    }
    for (const spec of imports(file.content)) {
      classify(spec, item.name, deps, registryDeps)
    }
  }

  const manifest = {
    name: item.name,
    title: item.title,
    type: item.type,
    description: item.description,
    dependencies: [...deps].sort(),
    registryDependencies: [...registryDeps].sort(),
    files,
  }
  writeFileSync(join(outDir, `${item.name}.json`), `${JSON.stringify(manifest, null, 2)}\n`)
  fileCount += files.length
  const dep = manifest.registryDependencies.length
    ? ` ← ${manifest.registryDependencies.join(', ')}`
    : ''
  console.log(`  ${item.name.padEnd(12)} ${files.length} file(s)${dep}`)
}

console.log(`\nWrote ${index.items.length} manifests (${fileCount} files) to registry/components/`)

// --- helpers ---------------------------------------------------------------

/** Every component type referenced by an arrangement's nodes, recursively. */
function nodeTypes(nodes, into = new Set()) {
  for (const node of nodes) {
    if (node.type) into.add(node.type)
    if (node.children) nodeTypes(node.children, into)
  }
  return into
}

/** Expand one index file entry into one-or-more manifest files with content. */
function expand(file, item) {
  const abs = join(root, file.path)
  const fileType =
    item.type === 'registry:lib' || item.type === 'registry:composite'
      ? item.type
      : 'registry:component'
  if (statSync(abs).isDirectory()) {
    return sources(abs).map((src) => ({
      path: posix.join(file.target, relative(abs, src).split(/[/\\]/).join('/')),
      content: readFileSync(src, 'utf8'),
      type: fileType,
    }))
  }
  return [{ path: file.target, content: readFileSync(abs, 'utf8'), type: fileType }]
}

/** Recursively list .ts/.tsx source files under a dir, excluding tests. */
function sources(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...sources(full))
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full)
  }
  return out.sort()
}

/** Every module specifier imported/exported-from/side-effect-imported in a file. */
function imports(content) {
  const specs = new Set()
  for (const m of content.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) specs.add(m[1])
  for (const m of content.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)) specs.add(m[1])
  return specs
}

function classify(spec, selfName, deps, registryDeps) {
  if (spec === '@runek/core' || spec.startsWith('@runek/core/')) {
    deps.add(CORE_DEP)
    return
  }
  if (spec.startsWith('.')) {
    const item = basenameToItem.get(baseNoExt(spec))
    if (item && item !== selfName) registryDeps.add(item)
    return // otherwise an internal file already bundled with this item
  }
  const pkg = packageName(spec)
  if (!BASELINE_DEPS.has(pkg)) deps.add(catalog[pkg] ? `${pkg}@${catalog[pkg]}` : pkg)
}

function packageName(spec) {
  const parts = spec.split('/')
  return spec.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0]
}

function baseNoExt(p) {
  return p
    .split(/[/\\]/)
    .pop()
    .replace(/\.tsx?$/, '')
}

/** Parse the flat `catalog:` block of pnpm-workspace.yaml → { name: version }. */
function readCatalog(path) {
  const lines = readFileSync(path, 'utf8').split('\n')
  const out = {}
  let inCatalog = false
  for (const line of lines) {
    if (/^catalog:\s*$/.test(line)) {
      inCatalog = true
      continue
    }
    if (inCatalog) {
      if (/^\S/.test(line)) break // dedented out of the block
      const m = line.match(/^\s+"?([^":\s]+)"?:\s*"?([^"\s]+)"?/)
      if (m) out[m[1]] = m[2]
    }
  }
  return out
}
