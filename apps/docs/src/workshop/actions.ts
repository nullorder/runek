import { registry } from '@runek/components'
import { checkWorld, parseWorld, serializeWorld, type WorldData } from '@runek/core/data'
import { compactArrays } from './code/format'
import { dropPoint, snapshot } from './scene/refs'
import { SCHEMA } from './schema'
import type { Snippet } from './snippets'
import { asVec3, locate, stripDefaults, withoutIds } from './state/ops'
import {
  addComponent,
  addNodes,
  loadWorld,
  patchNode,
  requestCamera,
  setStage,
  toast,
  useWorkshop,
} from './state/store'
import type { Template } from './templates'

export const focusDrop = () => dropPoint(useWorkshop.getState().focusPoint)

export const addAtFocus = (type: string) => addComponent(type, focusDrop())

export function insertSnippet(snippet: Snippet) {
  addNodes(snippet.nodes, { at: focusDrop() })
  toast(`Inserted “${snippet.title}”`)
}

export function loadTemplate(template: Template) {
  loadWorld(template.world)
  setStage(template.stage)
  requestCamera({ kind: 'restore', camera: template.camera })
  useWorkshop.setState({ previewTime: null })
  toast(`Loaded “${template.title}” · ⌘Z to undo`)
}

export const schemaDefaults = (type: string) =>
  Object.fromEntries(
    Object.entries(SCHEMA[type]?.props ?? {})
      .filter(([, p]) => p.default !== undefined)
      .map(([k, p]) => [k, p.default]),
  )

/** The world as a file: canonical order, optionally with defaults and ids stripped. */
export function worldText(world: WorldData, { minimal = false, ids = true } = {}) {
  let out = minimal ? stripDefaults(world, schemaDefaults) : world
  if (!ids) out = withoutIds(out)
  return compactArrays(serializeWorld(out))
}

export function download(name: string, content: string | Blob, type = 'application/json') {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const slug = (world: WorldData) =>
  (world.meta?.title ?? 'world')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'world'

export function exportWorld() {
  const { world } = useWorkshop.getState()
  download(`${slug(world)}.world.json`, worldText(world))
}

export function exportPng(transparent = false) {
  const url = snapshot(2, transparent)
  if (!url) return toast('Nothing to capture yet')
  const a = document.createElement('a')
  a.href = url
  a.download = `${slug(useWorkshop.getState().world)}.png`
  a.click()
}

export function exportSchema() {
  download('runek-props.json', JSON.stringify(SCHEMA, null, 2))
}

export async function copyText(text: string, what = 'Copied') {
  try {
    await navigator.clipboard.writeText(text)
    toast(what)
  } catch {
    toast('Clipboard is blocked here')
  }
}

/** Load a world from text (file drop, paste, `?src=`): validated as data, never run. */
export function importWorldText(text: string, source = 'file') {
  try {
    const world = parseWorld(text)
    loadWorld(world)
    toast(
      `Loaded ${world.meta?.title ? `“${world.meta.title}”` : 'a world'} from ${source} · ⌘Z to undo`,
    )
    return true
  } catch (error) {
    toast(`Not a world file: ${(error as Error).message}`)
    return false
  }
}

export function worldIssues(world: WorldData) {
  try {
    return checkWorld(world, registry)
  } catch {
    return []
  }
}

/** Apply the check's suggested `position[1]` to a buried or floating node. */
export function fixIssue(id: string | undefined, y: number | undefined) {
  if (!id || y === undefined) return
  const found = locate(useWorkshop.getState().world.nodes, id)
  if (!found) return
  const at = asVec3(found.node.props?.position) ?? [0, 0, 0]
  patchNode(id, { position: [at[0], y, at[2]] })
}
