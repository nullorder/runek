#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { applyFixes, describeIssue, loadCoreData, loadGroundRegistry } from './check.ts'
import { componentInfo, formatInfo, resolveItem } from './info.ts'
import {
  type Config,
  collectDependencies,
  configExists,
  DEFAULT_CONFIG,
  detectPackageManager,
  fetchIndex,
  fetchManifest,
  fetchPropSchema,
  fetchSkill,
  installCommand,
  installDependencies,
  readConfig,
  resolveItems,
  writeConfig,
  writeFiles,
} from './lib.ts'
import { previewUrl, SHARE_SOFT_LIMIT } from './preview.ts'
import {
  buildReport,
  customTypes,
  exitCode,
  loadValidator,
  parseWorldText,
  type ValidationIssue,
} from './validate.ts'

const color = (code: string) => (s: string) => `\x1b[${code}m${s}\x1b[0m`
const bold = color('1')
const dim = color('2')
const green = color('32')
const yellow = color('33')
const red = color('31')
const cyan = color('36')

type Options = {
  registry?: string
  dir?: string
  'no-install'?: boolean
  overwrite?: boolean
  force?: boolean
  strict?: boolean
  fix?: boolean
  tolerance?: string
  json?: boolean
  out?: string
  open?: boolean
}

const SKILL_PATH = '.claude/skills/runek/SKILL.md'

const CONFIG_HINT = cyan('runek.config.json')

const HELP = `${bold('runek')} — pull procedural 3D component source into your project

${bold('Usage')}
  runek init [options]              Create ${CONFIG_HINT} and the component directory
  runek add <name...> [options]     Add components (and their dependencies)
  runek list [options]              List everything in the registry
  runek info <name> [options]       Show a component's props, defaults, deps, and examples
  runek validate <file> [options]   Check a world file's types, props, and values
  runek check-world <file> [opts]   Find buried and floating nodes in a world file
  runek preview <file> [--open]     Print a workshop link that opens the world in the browser
  runek skill [--out <path>]        Install the Runek agent skill for coding agents

${bold('Options')}
  --registry <url|path>   Registry base (default: ${DEFAULT_CONFIG.registry})
  --dir <path>            Install directory (default: ${DEFAULT_CONFIG.dir})
  --overwrite             Overwrite files that already exist
  --no-install            Print the dependency install command instead of running it
  --force                 (init) overwrite an existing config
  --strict                (validate, check-world) exit non-zero on warnings / anything found
  --fix                   (check-world) write the suggested Y values into the file
  --tolerance <units>     (check-world) allowed gap before flagging (default 0.08)
  --json                  (list, info, validate, check-world) machine-readable output
  --out <path>            (skill) where to write the skill (default: ${SKILL_PATH})
  --open                  (preview) open the link in your browser
  -h, --help              Show this help

${bold('Examples')}
  runek init
  runek add player terrain bookshelf
  runek list --registry ./registry
  runek info bookshelf
  runek validate public/world.json
  runek check-world public/world.json --strict
`

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      registry: { type: 'string' },
      dir: { type: 'string' },
      'no-install': { type: 'boolean' },
      overwrite: { type: 'boolean' },
      force: { type: 'boolean' },
      strict: { type: 'boolean' },
      fix: { type: 'boolean' },
      tolerance: { type: 'string' },
      json: { type: 'boolean' },
      out: { type: 'string' },
      open: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  })

  const [command, ...names] = positionals
  const opts = values as Options & { help?: boolean }

  if (opts.help || command === 'help' || !command) {
    process.stdout.write(HELP)
    return
  }

  switch (command) {
    case 'init':
      return init(opts)
    case 'add':
      return add(names, opts)
    case 'list':
    case 'ls':
      return list(opts)
    case 'info':
      return info(names[0], opts)
    case 'validate':
      return validate(names[0], opts)
    case 'check-world':
      return checkWorld(names[0], opts)
    case 'preview':
      return preview(names[0], opts)
    case 'skill':
      return skill(opts)
    default:
      throw new Error(`unknown command "${command}" — run "runek --help"`)
  }
}

function init(opts: Options): void {
  const cwd = process.cwd()
  if (configExists(cwd) && !opts.force) {
    throw new Error(`${CONFIG_HINT} already exists — pass --force to overwrite`)
  }
  const config: Config = { ...DEFAULT_CONFIG }
  if (opts.registry) config.registry = opts.registry
  if (opts.dir) config.dir = opts.dir

  writeConfig(cwd, config)
  mkdirSync(join(cwd, config.dir), { recursive: true })

  console.log(`${green('✓')} wrote ${CONFIG_HINT}`)
  console.log(`${green('✓')} created ${cyan(config.dir)}`)
  console.log(`\n${bold('Next:')} runek add player terrain bookshelf`)
  console.log(dim('Using a coding agent? "runek skill" installs the Runek skill for it.'))
}

async function add(names: string[], opts: Options): Promise<void> {
  if (names.length === 0)
    throw new Error('specify at least one component, e.g. "runek add bookshelf"')

  const cwd = process.cwd()
  const config = readConfig(cwd)
  if (opts.registry) config.registry = opts.registry
  if (opts.dir) config.dir = opts.dir

  const manifests = await resolveItems(config.registry, names)
  const requested = new Set(names)
  for (const m of manifests) {
    const tag = requested.has(m.name) ? '' : dim(' (dependency)')
    console.log(`${cyan('•')} ${m.name}${tag}`)
  }

  const files = manifests.flatMap((m) => m.files)
  const { written, skipped } = writeFiles(cwd, config.dir, files, !!opts.overwrite)
  for (const path of written) console.log(`  ${green('+')} ${config.dir}/${path}`)
  for (const path of skipped)
    console.log(`  ${yellow('•')} ${config.dir}/${path} ${dim('(exists, skipped)')}`)
  if (skipped.length > 0) console.log(dim('  pass --overwrite to replace skipped files'))

  const deps = collectDependencies(manifests)
  if (deps.length === 0) {
    console.log(`\n${green('✓')} done`)
    return
  }

  const pm = detectPackageManager(cwd)
  if (opts['no-install']) {
    console.log(`\n${bold('Install dependencies:')}\n  ${installCommand(pm, deps)}`)
    return
  }
  console.log(`\n${bold('Installing')} ${deps.join(', ')} ${dim(`(${pm})`)}`)
  installDependencies(cwd, pm, deps)
  console.log(`\n${green('✓')} done`)
}

async function list(opts: Options): Promise<void> {
  const base = opts.registry ?? readConfig(process.cwd()).registry
  const index = await fetchIndex(base)
  if (opts.json) {
    printJson(index.items)
    return
  }

  const byCategory = new Map<string, typeof index.items>()
  for (const item of index.items) {
    const key = item.category ?? 'other'
    const group = byCategory.get(key) ?? []
    group.push(item)
    byCategory.set(key, group)
  }

  for (const [category, items] of [...byCategory].sort()) {
    console.log(`\n${bold(category)}`)
    for (const item of items) {
      console.log(`  ${cyan(item.name.padEnd(12))} ${dim(item.description ?? '')}`)
    }
  }
}

async function checkWorld(file: string | undefined, opts: Options): Promise<void> {
  if (!file) throw new Error('specify a world file, e.g. "runek check-world public/world.json"')
  const cwd = process.cwd()
  const config = readConfig(cwd)
  const dir = resolve(cwd, opts.dir ?? config.dir)
  const path = resolve(cwd, file)
  const tolerance = opts.tolerance === undefined ? undefined : Number(opts.tolerance)
  if (tolerance !== undefined && !(tolerance >= 0)) throw new Error('--tolerance must be a number')

  const core = await loadCoreData([dir, cwd, dirname(path)])
  const registry = await loadGroundRegistry(dir)
  const world = core.parseWorld(readFileSync(path, 'utf8'))
  const issues = core.checkWorld(world, registry, { tolerance })

  const surfaces = Object.entries(registry)
    .filter(([, entry]) => 'surface' in entry)
    .map(([type]) => type)
  if (opts.json) {
    const fixed = opts.fix && issues.length ? applyFixes(world, issues) : 0
    if (fixed) writeFileSync(path, core.serializeWorld(world))
    printJson({ surfaces, issues, ...(opts.fix ? { fixed } : {}) })
    if (opts.strict && issues.length && !opts.fix) process.exitCode = 1
    return
  }
  console.log(dim(`surfaces from ${opts.dir ?? config.dir}: ${surfaces.join(', ') || 'none'}`))

  if (issues.length === 0) {
    console.log(`${green('✓')} nothing buried or floating in ${file}`)
    return
  }
  for (const issue of issues) {
    const mark = issue.kind === 'floating' ? yellow('floating') : red(issue.kind)
    console.log(`  ${mark} ${describeIssue(issue)}`)
  }

  if (opts.fix) {
    const fixed = applyFixes(world, issues)
    writeFileSync(path, core.serializeWorld(world))
    console.log(`\n${green('✓')} fixed ${fixed} node(s) in ${file}`)
    return
  }
  console.log(
    `\n${bold(`${issues.length} issue(s).`)} ${dim('--fix writes the suggested Y values')}`,
  )
  if (opts.strict) process.exitCode = 1
}

async function info(name: string | undefined, opts: Options): Promise<void> {
  if (!name) throw new Error('specify a component, e.g. "runek info bookshelf"')
  const base = opts.registry ?? readConfig(process.cwd()).registry
  const [index, schema] = await Promise.all([fetchIndex(base), fetchPropSchema(base)])
  const item = resolveItem(index.items, name)
  const manifest = await fetchManifest(base, item.name)
  const card = componentInfo(item, manifest, item.title ? schema[item.title] : undefined)
  if (opts.json) printJson(card)
  else process.stdout.write(formatInfo(card, { bold, dim }))
}

async function validate(file: string | undefined, opts: Options): Promise<void> {
  if (!file) throw new Error('specify a world file, e.g. "runek validate public/world.json"')
  const cwd = process.cwd()
  const config = readConfig(cwd)
  if (opts.registry) config.registry = opts.registry
  const dir = resolve(cwd, opts.dir ?? config.dir)
  const path = resolve(cwd, file)

  const parsed = parseWorldText(readFileSync(path, 'utf8'))
  let issues: ValidationIssue[]
  if (parsed.issue) issues = [parsed.issue]
  else {
    const [validateWorld, schema] = await Promise.all([
      loadValidator([dir, cwd, dirname(path)]),
      fetchPropSchema(config.registry),
    ])
    issues = validateWorld(parsed.data, schema, customTypes(dir, schema))
  }

  const report = buildReport(issues)
  process.exitCode = exitCode(report, !!opts.strict)
  if (opts.json) {
    printJson(report)
    return
  }
  if (report.issues.length === 0) {
    console.log(`${green('✓')} ${file} is a valid world`)
    return
  }
  for (const issue of report.issues) {
    const mark = issue.severity === 'error' ? red('error  ') : yellow('warning')
    console.log(`  ${mark} ${cyan(issue.pathString)} ${issue.message}`)
  }
  console.log(`\n${bold(`${report.errors} error(s), ${report.warnings} warning(s).`)}`)
}

function preview(file: string | undefined, opts: Options): void {
  if (!file) throw new Error('specify a world file, e.g. "runek preview public/world.json"')
  const config = readConfig(process.cwd())
  const parsed = parseWorldText(readFileSync(resolve(file), 'utf8'))
  if (parsed.issue) throw new Error(`${file}: ${parsed.issue.message}`)
  const url = previewUrl(parsed.data, opts.registry ?? config.registry)
  console.log(url)
  if (url.length > SHARE_SOFT_LIMIT)
    console.error(yellow(`⚠ the link is ${url.length} characters; some apps truncate long links`))
  if (opts.open) openUrl(url)
}

function openUrl(url: string): void {
  const [cmd, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]]
  spawn(cmd, args, { stdio: 'ignore', detached: true }).unref()
}

async function skill(opts: Options): Promise<void> {
  const cwd = process.cwd()
  const base = opts.registry ?? readConfig(cwd).registry
  const dest = resolve(cwd, opts.out ?? SKILL_PATH)
  const shown = relative(cwd, dest) || dest
  if (existsSync(dest) && !opts.overwrite) {
    console.log(`${yellow('•')} ${shown} ${dim('(exists, skipped; pass --overwrite to replace)')}`)
    return
  }
  const text = await fetchSkill(base)
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, text)
  console.log(`${green('✓')} wrote ${cyan(shown)}`)
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

main().catch((err: unknown) => {
  console.error(red(`✖ ${err instanceof Error ? err.message : String(err)}`))
  process.exit(1)
})
