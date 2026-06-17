#!/usr/bin/env node
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import {
  type Config,
  collectDependencies,
  configExists,
  DEFAULT_CONFIG,
  detectPackageManager,
  fetchIndex,
  installCommand,
  installDependencies,
  readConfig,
  resolveItems,
  writeConfig,
  writeFiles,
} from './lib.ts'

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
}

const CONFIG_HINT = cyan('runek.config.json')

const HELP = `${bold('runek')} — pull procedural 3D component source into your project

${bold('Usage')}
  runek init [options]              Create ${CONFIG_HINT} and the component directory
  runek add <name...> [options]     Add components (and their dependencies)
  runek list [options]              List everything in the registry

${bold('Options')}
  --registry <url|path>   Registry base (default: ${DEFAULT_CONFIG.registry})
  --dir <path>            Install directory (default: ${DEFAULT_CONFIG.dir})
  --overwrite             Overwrite files that already exist
  --no-install            Print the dependency install command instead of running it
  --force                 (init) overwrite an existing config
  -h, --help              Show this help

${bold('Examples')}
  runek init
  runek add player terrain bookshelf
  runek list --registry ./registry
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

main().catch((err: unknown) => {
  console.error(red(`✖ ${err instanceof Error ? err.message : String(err)}`))
  process.exit(1)
})
