// Build-time reader for measured frame rates: one file per machine in src/data/perf/, written
// by `just perf update`. Feeds the landing page and the Performance doc. Server-only.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

type Scenario = 'spawn' | 'gallery' | 'turn'

export type PerfEntry = {
  measured: string
  release: string
  released: boolean
  commit: string
  machine: {
    os: string
    arch: string
    cpu: string
    cores: number
    memoryGB: number
    gpu: string
  }
  browser: string
  window: { width: number; height: number }
  runs: { dpr: number; fps: Record<Scenario, number>; p95: Record<Scenario, number> }[]
}

const SCENARIOS: [Scenario, string, string][] = [
  ['spawn', 'at the spawn', 'Spawn'],
  ['gallery', 'facing the gallery hall', 'Gallery'],
  ['turn', 'turning a full circle', 'Turning'],
]
// The pixel density `<World>` renders at by default on a Retina screen.
const HEADLINE_DPR = 1.5

const dir = join(process.cwd(), 'src/data/perf')

/** Every measured machine, newest first. */
export function getPerfEntries(): PerfEntry[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as PerfEntry)
    .sort((a, b) => b.measured.localeCompare(a.measured))
}

/** "ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)" → "Apple M1 Pro (Metal)". */
export function gpuName(raw: string): string {
  const angle = raw.match(/^ANGLE \((.*)\)$/)
  if (!angle) return raw
  const parts = angle[1].split(', ')
  const renderer = (parts[1] ?? parts[0])
    .replace(/\s*\(0x[0-9a-f]+\)/i, '')
    .replace(/\s+vs_\S+ ps_\S+/, '')
  const api = renderer.match(/^ANGLE (\w+) Renderer: (.*)$/)
  return api ? `${api[2]} (${api[1]})` : renderer
}

export const browserName = (raw: string) => raw.replace(/\/(\d+).*$/, ' $1')

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })

export const buildName = (e: PerfEntry) =>
  e.released ? e.release : `main at ${e.commit}, after ${e.release}`

/** The landing page's headline: the newest machine, at the default pixel density. */
export function getLatestPerf() {
  const entry = getPerfEntries()[0]
  const run = entry?.runs.find((r) => r.dpr === HEADLINE_DPR) ?? entry?.runs[0]
  if (!entry || !run) return null
  return {
    stats: SCENARIOS.map(([name, label]) => ({ label, fps: Math.round(run.fps[name]) })),
    viewport: `a ${entry.window.width}×${entry.window.height} window at ${run.dpr}x pixel density`,
    device: entry.machine.cpu,
    browser: `headless ${browserName(entry.browser)}`,
    date: formatDate(entry.measured),
    build: buildName(entry),
  }
}

/** Every machine as Markdown: a details line and an fps table per pixel density. */
export function perfMarkdown(): string {
  const entries = getPerfEntries()
  if (entries.length === 0) return '_No measurements yet._'
  const header = `| Pixel density | ${SCENARIOS.map(([, , column]) => column).join(' | ')} |`
  const rule = `|---|${SCENARIOS.map(() => '---:').join('|')}|`
  return entries
    .map((e) => {
      const m = e.machine
      const details = [
        `${m.os} (${m.arch})`,
        `${m.cores} cores`,
        `${m.memoryGB} GB`,
        `GPU ${gpuName(m.gpu)}`,
        `headless ${browserName(e.browser)}`,
        `${e.window.width}×${e.window.height}`,
      ].join(' · ')
      const rows = e.runs.map(
        (r) =>
          `| ${r.dpr}x | ${SCENARIOS.map(([name]) => `${Math.round(r.fps[name])} fps · ${Math.round(r.p95[name])} ms`).join(' | ')} |`,
      )
      return [
        `### ${m.cpu}`,
        `${details}. Measured ${formatDate(e.measured)} on ${buildName(e)}. Each cell is fps · p95 frame time.`,
        [header, rule, ...rows].join('\n'),
      ].join('\n\n')
    })
    .join('\n\n')
}

/** The Performance doc's MDX body as plain Markdown, for /docs/performance.md and the library's book. */
export const expandPerfReport = (body: string) =>
  body.replace(/^import .*\n+/gm, '').replace('<PerfReport />', perfMarkdown())
