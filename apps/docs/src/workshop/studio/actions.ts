import type { JsonValue, WorldNode } from '@runek/core/data'
import { copyText, download } from '../actions'
import { jsxFor } from '../code/generate'
import { locate, walk } from '../state/ops'
import {
  addNodes,
  replaceNode,
  setStudio,
  studioProps,
  toast,
  useWorkshop,
  writeStudio,
} from '../state/store'
import { avatarBody, lookFile, lookOf, parseLook, wearLook } from './traits'

type Props = Record<string, JsonValue>

const get = () => useWorkshop.getState()
const placed = (props: Props) => {
  const { position: _p, rotation: _r, ...rest } = props
  return rest
}

/** Put the new figure into the scene where the room was entered from; the room keeps editing it. */
export function addFigureToScene() {
  const { studio, world } = get()
  const back = studio.back?.target ?? [0, 0, 0]
  const props = { ...studio.draft, position: [back[0], world.ground ?? 0, back[2]] }
  const [id] = addNodes([{ type: 'Person', props }])
  if (id) {
    setStudio({ target: id, original: props })
    toast('Added to the scene: edits now land on it')
  }
}

/** Give the play avatar this look: the world's `Player` body, or a new `Player` wearing it. */
export function useAsAvatar() {
  const state = get()
  const look = lookOf(studioProps(state))
  let player: WorldNode | null = null
  walk(state.world.nodes, (node) => {
    if (!player && node.type === 'Player') player = node
  })
  const found = player as WorldNode | null
  if (found?.id) {
    replaceNode(found.id, (node) => {
      const children = [...(node.children ?? [])]
      const i = children.findIndex((c) => c.type === 'Person')
      const current = i >= 0 ? (children[i].props as Props | undefined) : undefined
      const body: WorldNode = {
        ...(i >= 0 ? children[i] : {}),
        type: 'Person',
        props: avatarBody(look, current),
      }
      if (i >= 0) children[i] = body
      else children.unshift(body)
      return { ...node, children }
    })
    toast('The play avatar wears this look now')
    return
  }
  const back = state.studio.back?.target ?? [0, 0, 0]
  addNodes([
    {
      type: 'Player',
      props: { position: [back[0], (state.world.ground ?? 0) + 1.6, back[2]] },
      children: [{ type: 'Person', props: avatarBody(look) }],
    },
  ])
  toast('Added a Player wearing this look (press Play in build mode to walk it)')
}

export function exportLook() {
  const props = studioProps(get())
  const name = typeof props.label === 'string' ? props.label : `person-${props.seed ?? 1}`
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'person'
  download(`${slug}.look.json`, `${JSON.stringify(lookFile(props), null, 2)}\n`)
  toast(`Downloaded ${slug}.look.json`)
}

export async function importLook(file: File) {
  try {
    const look = parseLook(await file.text())
    writeStudio(wearLook(studioProps(get()), look))
    toast(`Wearing ${file.name}`)
  } catch (error) {
    toast(`Couldn't read ${file.name}: ${(error as Error).message}`)
  }
}

export const copyJsx = () => copyText(jsxFor('Person', placed(studioProps(get()))), 'JSX copied')

export const copyNode = () =>
  copyText(
    JSON.stringify({ type: 'Person', props: placed(studioProps(get())) }, null, 2),
    'Person node copied',
  )

/** The scene node the room is editing, if it still exists. */
export function studioTarget() {
  const { studio, world } = get()
  return studio.target ? (locate(world.nodes, studio.target)?.node ?? null) : null
}
