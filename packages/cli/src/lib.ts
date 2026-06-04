// Core logic for the Runek CLI, kept free of argument parsing so it can be unit
// tested and reused. The registry is "just data": an index plus one manifest per
// item, served over HTTP or read from a local directory.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'

export type RegistryFile = { path: string; content: string; type: string }

export type Manifest = {
  name: string
  title?: string
  type: string
  description?: string
  dependencies: string[]
  registryDependencies: string[]
  files: RegistryFile[]
}

export type IndexItem = {
  name: string
  title?: string
  type: string
  category?: string
  description?: string
}

export type RegistryIndex = { name: string; homepage?: string; items: IndexItem[] }

export type Config = {
  registry: string
  dir: string
  coreImport: string
}

export const CONFIG_FILE = 'runek.config.json'

export const DEFAULT_CONFIG: Config = {
  registry: 'https://runek.nullorder.org/r',
  dir: 'src/runek',
  coreImport: './core',
}

// --- config ----------------------------------------------------------------

export function configExists(cwd: string): boolean {
  return existsSync(join(cwd, CONFIG_FILE))
}

export function readConfig(cwd: string): Config {
  const path = join(cwd, CONFIG_FILE)
  if (!existsSync(path)) return { ...DEFAULT_CONFIG }
  return { ...DEFAULT_CONFIG, ...JSON.parse(readFileSync(path, 'utf8')) }
}

export function writeConfig(cwd: string, config: Config): void {
  const body = { $schema: 'https://runek.nullorder.org/registry/config-schema.json', ...config }
  writeFileSync(join(cwd, CONFIG_FILE), `${JSON.stringify(body, null, 2)}\n`)
}

// --- registry client -------------------------------------------------------

function isHttp(base: string): boolean {
  return /^https?:\/\//.test(base)
}

async function readJson<T>(base: string, ...segments: string[]): Promise<T> {
  if (isHttp(base)) {
    const url = [base.replace(/\/+$/, ''), ...segments].join('/')
    const res = await fetch(url)
    if (!res.ok) throw new Error(`registry request failed (${res.status}) for ${url}`)
    return (await res.json()) as T
  }
  const path = join(isAbsolute(base) ? base : resolve(base), ...segments)
  if (!existsSync(path)) throw new Error(`registry file not found: ${path}`)
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

export function fetchIndex(base: string): Promise<RegistryIndex> {
  return readJson<RegistryIndex>(base, 'registry.json')
}

export function fetchManifest(base: string, name: string): Promise<Manifest> {
  return readJson<Manifest>(base, 'components', `${name}.json`)
}

/**
 * Resolve the given item names plus their registry dependencies, returning
 * manifests with every dependency ordered before the item that needs it.
 */
export async function resolveItems(base: string, names: string[]): Promise<Manifest[]> {
  const seen = new Set<string>()
  const ordered: Manifest[] = []

  async function visit(name: string): Promise<void> {
    if (seen.has(name)) return
    seen.add(name)
    const manifest = await fetchManifest(base, name)
    for (const dep of manifest.registryDependencies ?? []) await visit(dep)
    ordered.push(manifest)
  }

  for (const name of names) await visit(name)
  return ordered
}

// --- writing files ---------------------------------------------------------

/** Repoint the `@runek/core` import at the user's installed copy of core. */
export function rewriteCoreImport(content: string, coreImport: string): string {
  return content.replace(/(['"])@runek\/core(['"])/g, `$1${coreImport}$2`)
}

export type WriteResult = { written: string[]; skipped: string[] }

export function writeFiles(
  cwd: string,
  dir: string,
  files: RegistryFile[],
  coreImport: string,
  overwrite: boolean,
): WriteResult {
  const result: WriteResult = { written: [], skipped: [] }
  for (const file of files) {
    const dest = join(cwd, dir, file.path)
    if (existsSync(dest) && !overwrite) {
      result.skipped.push(file.path)
      continue
    }
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, rewriteCoreImport(file.content, coreImport))
    result.written.push(file.path)
  }
  return result
}

/** Union of npm dependencies across resolved manifests, sorted and deduped. */
export function collectDependencies(manifests: Manifest[]): string[] {
  return [...new Set(manifests.flatMap((m) => m.dependencies ?? []))].sort()
}

// --- package manager -------------------------------------------------------

export type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm'

export function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
  if (existsSync(join(cwd, 'yarn.lock'))) return 'yarn'
  if (existsSync(join(cwd, 'bun.lockb')) || existsSync(join(cwd, 'bun.lock'))) return 'bun'
  return 'npm'
}

export function installCommand(pm: PackageManager, deps: string[]): string {
  const verb = pm === 'npm' ? 'install' : 'add'
  return `${pm} ${verb} ${deps.join(' ')}`
}

export function installDependencies(cwd: string, pm: PackageManager, deps: string[]): void {
  const verb = pm === 'npm' ? 'install' : 'add'
  execFileSync(pm, [verb, ...deps], { cwd, stdio: 'inherit' })
}
