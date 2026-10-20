// Versioned registries: a registry that serves `versions.json` keeps one snapshot per release
// at `<base>/<version>/`, and the CLI reads the one matching the project's `@runek/core`, so
// the source it installs only uses core APIs the project has. A registry without
// `versions.json` (a local checkout, a fork) is flat and used as-is.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { joinBase, readOptionalJson } from './lib.ts'

export type VersionsIndex = {
  latest: string | null
  versions: string[]
  channels?: Record<string, string>
}

export type CoreVersion = { version: string; source: 'installed' | 'package.json' }

export type ResolvedRegistry = {
  /** Where to read this command's registry files. */
  base: string
  /** The snapshot in use; absent for a flat registry. */
  version?: string
  /** The newest stable snapshot, for "available in a newer release" hints. */
  latest?: string
  latestBase?: string
  /** Why this snapshot, e.g. "matches installed @runek/core". */
  reason?: string
  core?: CoreVersion | null
}

type Semver = { core: [number, number, number]; pre: string[] }

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/

export function parseVersion(version: string): Semver | null {
  const m = SEMVER.exec(version)
  if (!m) return null
  return { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split('.') : [] }
}

/** Semver precedence: negative when `a` is older than `b`. */
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a)
  const y = parseVersion(b)
  if (!x || !y) return 0
  for (let i = 0; i < 3; i++) if (x.core[i] !== y.core[i]) return x.core[i] - y.core[i]
  if (!x.pre.length || !y.pre.length) return y.pre.length - x.pre.length
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i]
    const q = y.pre[i]
    if (p === undefined) return -1
    if (q === undefined) return 1
    if (p === q) continue
    const np = /^\d+$/.test(p)
    const nq = /^\d+$/.test(q)
    if (np && nq) return Number(p) - Number(q)
    if (np !== nq) return np ? -1 : 1
    return p < q ? -1 : 1
  }
  return 0
}

/** Same release line: same major, and same minor before 1.0 (where a minor can break). */
function sameLine(a: Semver, b: Semver): boolean {
  return a.core[0] === b.core[0] && (a.core[0] > 0 || a.core[1] === b.core[1])
}

export function sameReleaseLine(a: string, b: string): boolean {
  const x = parseVersion(a)
  const y = parseVersion(b)
  return Boolean(x && y && sameLine(x, y))
}

/**
 * The snapshot for `wanted`: `latest`, a channel name (`rc`), or a core version. A version
 * gets its exact snapshot, else the newest older one on the same release line, else null.
 */
export function pickVersion(index: VersionsIndex, wanted: string): string | null {
  if (wanted === 'latest') return index.latest
  if (index.channels?.[wanted]) return index.channels[wanted]
  if (index.versions.includes(wanted)) return wanted
  const target = parseVersion(wanted)
  if (!target) return null
  return (
    index.versions
      .filter((v) => {
        const parsed = parseVersion(v)
        return parsed && sameLine(parsed, target) && compareVersions(v, wanted) <= 0
      })
      .sort(compareVersions)
      .at(-1) ?? null
  )
}

/** `^0.15.0`, `~0.15.2`, `>=0.15.0`, `0.15.0` → the version it starts from; null otherwise. */
export function rangeFloor(range: string): string | null {
  const m = /^\s*(?:\^|~|>=|=)?\s*v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\s*$/.exec(range)
  return m ? m[1] : null
}

/**
 * The project's `@runek/core`: the installed copy (nearest `node_modules`, walking up),
 * else the version its `package.json` range starts from, else null.
 */
export function coreVersion(cwd: string): CoreVersion | null {
  for (let dir = cwd; ; dir = dirname(dir)) {
    const pkg = join(dir, 'node_modules', '@runek', 'core', 'package.json')
    if (existsSync(pkg)) {
      const { version } = JSON.parse(readFileSync(pkg, 'utf8'))
      if (typeof version === 'string') return { version, source: 'installed' }
    }
    if (dirname(dir) === dir) break
  }
  const manifest = join(cwd, 'package.json')
  if (!existsSync(manifest)) return null
  const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
  for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const range = pkg[field]?.['@runek/core']
    const version = typeof range === 'string' ? rangeFloor(range) : null
    if (version) return { version, source: 'package.json' }
  }
  return null
}

/**
 * Pick the registry snapshot for this project. `core` (from `--core`) overrides the
 * detected `@runek/core`: a version, a channel name, or `latest`.
 */
export async function resolveRegistry(
  base: string,
  cwd: string,
  core?: string,
): Promise<ResolvedRegistry> {
  const index = await readOptionalJson<VersionsIndex>(base, 'versions.json')
  if (!index) {
    if (core) throw new Error(`--core needs a versioned registry; ${base} has no versions.json`)
    return { base }
  }
  const latest = index.latest ?? undefined
  const latestBase = latest ? joinBase(base, latest) : undefined
  const detected = coreVersion(cwd)
  const wanted = core ?? detected?.version ?? 'latest'
  const version = pickVersion(index, wanted)
  if (!version) {
    const newest = latest ? ` (newest: ${latest})` : ''
    throw new Error(
      core
        ? `no registry for "${core}"${newest}; available: ${index.versions.join(', ')}`
        : `no registry matches @runek/core ${wanted}${newest}. Pass --core latest to use the newest components (and upgrade @runek/core).`,
    )
  }
  const reason = core
    ? `--core ${core}`
    : detected
      ? `matches ${detected.source === 'installed' ? 'installed' : "package.json's"} @runek/core ${detected.version}`
      : 'latest; no @runek/core in this project yet'
  return { base: joinBase(base, version), version, latest, latestBase, reason, core: detected }
}
