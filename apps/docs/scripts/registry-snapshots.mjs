// Registry snapshots: one served registry per release, taken from the release tag.
//
// `just publish` regenerates registry/ and refuses to tag with uncommitted changes, so the
// `registry/` tree at tag vX.Y.Z is exactly what that release serves. We `git archive` it
// into public/r/X.Y.Z/ instead of rebuilding old releases.
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'

/** What a snapshot serves. Older releases lack some (props.json etc. arrived in 0.14.0). */
export const SERVED = ['registry.json', 'props.json', 'world.schema.json', 'components', 'agents']

const TAG = /^v(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/

/** `v0.15.0` → `{ version: '0.15.0', … }`, or null for a tag that isn't a release. */
export function parseTag(tag) {
  const m = TAG.exec(tag)
  if (!m) return null
  return {
    tag,
    version: tag.slice(1),
    core: [Number(m[1]), Number(m[2]), Number(m[3])],
    pre: m[4] ? m[4].split('.') : [],
  }
}

/** Semver precedence: newer first when used with `sort`. */
export function compareDesc(a, b) {
  for (let i = 0; i < 3; i++) if (a.core[i] !== b.core[i]) return b.core[i] - a.core[i]
  if (!a.pre.length || !b.pre.length) return a.pre.length - b.pre.length
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i]
    const y = b.pre[i]
    if (x === undefined) return 1
    if (y === undefined) return -1
    if (x === y) continue
    const nx = /^\d+$/.test(x)
    const ny = /^\d+$/.test(y)
    if (nx && ny) return Number(y) - Number(x)
    if (nx !== ny) return nx ? 1 : -1
    return x < y ? 1 : -1
  }
  return 0
}

/**
 * The `versions.json` index: every snapshot newest first, the newest stable as `latest`,
 * and the newest prerelease per channel (`0.17.0-rc.1` → `rc`).
 */
export function versionsIndex(releases) {
  const sorted = [...releases].sort(compareDesc)
  const latest = sorted.find((r) => r.pre.length === 0)?.version ?? null
  const channels = {}
  for (const r of sorted) {
    const channel = r.pre[0]
    if (channel && !(channel in channels)) channels[channel] = r.version
  }
  return {
    latest,
    versions: sorted.map((r) => r.version),
    ...(Object.keys(channels).length ? { channels } : {}),
  }
}

function git(root, args, input) {
  return execFileSync('git', args, { cwd: root, input, maxBuffer: 256 * 1024 * 1024 })
}

/** Release tags whose tree carries a registry, or [] outside a git checkout. */
export function releaseTags(root) {
  let out
  try {
    out = git(root, ['tag', '--list', 'v*']).toString()
  } catch {
    return []
  }
  return out
    .split('\n')
    .map((t) => parseTag(t.trim()))
    .filter((r) => r && servedEntries(root, r.tag).includes('registry.json'))
}

function servedEntries(root, tag) {
  const listed = git(root, ['ls-tree', '--name-only', tag, 'registry/']).toString()
  return listed
    .split('\n')
    .map((path) => path.replace(/^registry\//, ''))
    .filter((name) => SERVED.includes(name))
}

/** Extract the tag's served registry files into `dest`. */
export function writeSnapshot(root, tag, dest) {
  const paths = servedEntries(root, tag).map((name) => `registry/${name}`)
  const tar = git(root, ['archive', '--format=tar', tag, '--', ...paths])
  mkdirSync(dest, { recursive: true })
  execFileSync('tar', ['-x', '-C', dest, '--strip-components=1'], { input: tar })
}
