import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import { json } from '@codemirror/lang-json'
import { syntaxTree } from '@codemirror/language'
import { type Diagnostic, linter } from '@codemirror/lint'
import { type Extension, StateEffect, StateField } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view'
import { DEFAULT_PALETTE } from '@runek/core'
import { describeType, type JsonPath, validateWorld } from '@runek/core/data'
import { COMPONENT_NAMES, SCHEMA } from '../schema'
import type { PropSchema } from '../schema/types'
import { SNIPPETS } from '../snippets'
import { containerAt, nodePathOf, propertyAt, rangeOf } from './json-tree'

type KeyInfo = [string, string, string]

const WORLD_KEYS: KeyInfo[] = [
  ['version', '1', 'Format version (always 1)'],
  ['meta', '{ "title": "" }', 'Title, description, authors, license, source'],
  ['time', '"12:00"', 'Pinned time of day, "HH:MM"'],
  ['timezone', '"UTC"', 'IANA zone for a live clock'],
  ['palette', '{}', 'Color slot overrides for every component'],
  ['fog', '{ "color": "#9fb4c8", "near": 30, "far": 140 }', 'Linear distance fog'],
  ['ground', '0', 'Baseline ground level (Y)'],
  ['gravity', '[0, -9.81, 0]', 'Physics gravity'],
  ['unit', '1', 'Meters per unit'],
  ['avatar', '"first"', 'Default camera: first, third, overhead'],
  ['controls', '{}', 'Key bindings: action → KeyboardEvent codes'],
  ['fonts', '{}', 'Font URLs by role (display, body)'],
  ['nodes', '[]', 'The placed components'],
]

const NODE_KEYS: KeyInfo[] = [
  ['type', '""', 'Component name'],
  ['props', '{}', 'Component props'],
  ['anchor', '"ground"', 'Measure Y from the ground ("ground" or "surface")'],
  ['children', '[]', 'Nested nodes (inside a Group, Player, Interactable)'],
  ['id', '""', 'Stable identity (filled in automatically)'],
]

/** Tell the editor which node to highlight (the scene's selection). */
export const setNodeRange = StateEffect.define<{ from: number; to: number } | null>()

const nodeMark = Decoration.mark({ class: 'ws-cm-node' })

const nodeHighlight = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(set, tr) {
    let next = set.map(tr.changes)
    for (const e of tr.effects) {
      if (e.is(setNodeRange))
        next = e.value
          ? Decoration.set([nodeMark.range(e.value.from, e.value.to)])
          : Decoration.none
    }
    return next
  },
  provide: (f) => EditorView.decorations.from(f),
})

/** Where JSON.parse failed, best effort across engines. */
function parsePosition(message: string, text: string): number {
  const at = message.match(/position (\d+)/)
  if (at) return Number(at[1])
  const lc = message.match(/line (\d+) column (\d+)/)
  if (lc) {
    const lines = text.split('\n')
    let pos = 0
    for (let i = 0; i < Number(lc[1]) - 1 && i < lines.length; i++) pos += lines[i].length + 1
    return pos + Number(lc[2]) - 1
  }
  return text.length
}

function worldLinter(getCustom: () => string[]) {
  return linter(
    (view) => {
      const text = view.state.doc.toString()
      let data: unknown
      try {
        data = JSON.parse(text)
      } catch (error) {
        const message = (error as Error).message
        const pos = Math.min(parsePosition(message, text), text.length)
        return [
          {
            from: Math.max(0, pos - 1),
            to: Math.min(text.length, pos + 1),
            severity: 'error',
            message: `JSON: ${message}. The room keeps the last good world.`,
          },
        ]
      }
      const tree = syntaxTree(view.state)
      return validateWorld(data, SCHEMA, getCustom()).map((issue): Diagnostic => {
        const range = rangeOf(tree, view.state.doc, issue.path, issue.key) ?? {
          from: 0,
          to: Math.min(1, text.length),
        }
        return { ...range, severity: issue.severity, message: issue.message }
      })
    },
    { delay: 250 },
  )
}

const preview = (prop: PropSchema) => {
  if (prop.default !== undefined) return JSON.stringify(prop.default)
  switch (prop.type) {
    case 'number':
      return '0'
    case 'boolean':
      return 'true'
    case 'vec3':
      return '[0, 0, 0]'
    case 'enum':
      return JSON.stringify(prop.options[0])
    case 'color':
      return '"#ffffff"'
    case 'array':
      return '[]'
    case 'object':
      return '{}'
    case 'tuple':
      return `[${prop.items.map(() => 0).join(', ')}]`
    default:
      return '""'
  }
}

function nodeSnippet(type: string) {
  const props: string[] = ['"position": [0, 0, 0]']
  if (SCHEMA[type]?.props.seed) props.push(`"seed": ${1 + Math.floor(Math.random() * 999)}`)
  return `{ "type": "${type}", "props": { ${props.join(', ')} } }`
}

/** The type of the node whose object contains `path`. */
function typeOf(state: EditorView['state'], nodePath: JsonPath) {
  const r = rangeOf(syntaxTree(state), state.doc, [...nodePath, 'type'])
  if (!r) return undefined
  try {
    return JSON.parse(state.doc.sliceString(r.from, r.to)) as string
  } catch {
    return undefined
  }
}

function complete(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/"?[\w$:.-]*"?/)
  if (!word && !context.explicit) return null
  const from = word ? word.from : context.pos
  const tree = syntaxTree(context.state)
  const doc = context.state.doc
  const prev = doc
    .sliceString(Math.max(0, from - 200), from)
    .replace(/\s+$/, '')
    .at(-1)
  const options: Completion[] = []

  if (prev === ':') {
    const path = propertyAt(tree, doc, from)
    if (!path) return null
    const key = path.at(-1)
    const nodePath = nodePathOf(path)
    if (key === 'type' && nodePath && nodePath.length === path.length - 1) {
      return {
        from,
        options: [...COMPONENT_NAMES, 'Group'].map((n) => ({
          label: `"${n}"`,
          type: 'class',
          detail: SCHEMA[n]?.category,
          info: SCHEMA[n]?.description,
        })),
      }
    }
    if (key === 'anchor')
      return { from, options: ['"ground"', '"surface"'].map((label) => ({ label, type: 'enum' })) }
    if (key === 'avatar' && path.length === 1)
      return {
        from,
        options: ['"first"', '"third"', '"overhead"'].map((label) => ({ label, type: 'enum' })),
      }
    if (nodePath && path[path.length - 2] === 'props' && typeof key === 'string') {
      const type = typeOf(context.state, nodePath)
      const prop = type ? SCHEMA[type]?.props[key] : undefined
      if (prop?.type === 'enum')
        return {
          from,
          options: prop.options.map((o) => ({ label: JSON.stringify(o), type: 'enum' })),
        }
      if (prop?.type === 'boolean')
        return { from, options: ['true', 'false'].map((label) => ({ label, type: 'keyword' })) }
      if (prop?.type === 'union') {
        for (const v of prop.variants) {
          if (v.type === 'enum')
            options.push(...v.options.map((o) => ({ label: JSON.stringify(o), type: 'enum' })))
          if (v.type === 'boolean')
            options.push({ label: 'true', type: 'keyword' }, { label: 'false', type: 'keyword' })
        }
        return options.length ? { from, options } : null
      }
      if (prop?.palette) {
        const color = DEFAULT_PALETTE[prop.palette as keyof typeof DEFAULT_PALETTE] ?? '#ffffff'
        return {
          from,
          options: [
            { label: JSON.stringify(color), type: 'constant', detail: `palette ${prop.palette}` },
          ],
        }
      }
    }
    return null
  }

  const container = containerAt(tree, doc, from)
  if (!container) return null
  const { node, path } = container

  if (node.name === 'Object' && (prev === '{' || prev === ',')) {
    const last = path.at(-1)
    const nodePath = nodePathOf(path)
    const keyOption = ([name, value, info]: KeyInfo, boost = 0): Completion => ({
      label: name,
      type: 'property',
      info,
      apply: `"${name}": ${value}`,
      boost,
    })
    if (path.length === 0) options.push(...WORLD_KEYS.map((k) => keyOption(k)))
    else if (last === 'props' && nodePath && nodePath.length === path.length - 1) {
      const type = typeOf(context.state, nodePath)
      for (const [name, prop] of Object.entries((type && SCHEMA[type]?.props) || {})) {
        if (prop.type === 'function' || prop.type === 'node') continue
        options.push({
          label: name,
          type: 'property',
          detail: describeType(prop),
          info: prop.doc,
          apply: `"${name}": ${preview(prop)}`,
        })
      }
    } else if (nodePath && nodePath.length === path.length)
      options.push(...NODE_KEYS.map((k, i) => keyOption(k, 5 - i)))
    else if (last === 'palette') {
      for (const [slot, color] of Object.entries(DEFAULT_PALETTE))
        options.push({
          label: slot,
          type: 'property',
          detail: color,
          apply: `"${slot}": "${color}"`,
        })
    } else if (last === 'fog') {
      options.push(
        keyOption(['color', '"#9fb4c8"', 'Fog color']),
        keyOption(['near', '30', 'Fog starts']),
        keyOption(['far', '140', 'Fully fogged']),
      )
    }
    return options.length ? { from, options, validFor: /^"?[\w$]*"?$/ } : null
  }

  if (
    node.name === 'Array' &&
    (prev === '[' || prev === ',') &&
    (path.at(-1) === 'nodes' || path.at(-1) === 'children')
  ) {
    for (const type of COMPONENT_NAMES) {
      options.push({
        label: `node:${type}`,
        type: 'class',
        detail: SCHEMA[type]?.category,
        info: SCHEMA[type]?.description,
        apply: nodeSnippet(type),
      })
    }
    for (const s of SNIPPETS) {
      options.push({
        label: `snippet:${s.title}`,
        type: 'text',
        detail: `${s.nodes.length} nodes`,
        info: s.description,
        apply: s.nodes.map((n) => JSON.stringify(n)).join(',\n'),
        boost: -2,
      })
    }
    return { from, options, validFor: /^[\w:]*$/ }
  }
  return null
}

export function worldJsonExtensions(getCustom: () => string[]): Extension[] {
  return [
    json(),
    worldLinter(getCustom),
    json().language.data.of({ autocomplete: complete }),
    nodeHighlight,
  ]
}
