import type { JsonValue, WorldNode } from '@runek/core/data'
import { copyText, download } from '../actions'
import { jsxFor } from '../code/generate'
import { locate, walk } from '../state/ops'
import {
  addNodes,
  dressProps,
  replaceNode,
  setDress,
  toast,
  useWorkshop,
  writeDress,
} from '../state/store'
import { avatarBody, lookFile, lookOf, parseLook, wearLook } from './traits'

type Props = Record<string, JsonValue>

const get = () => useWorkshop.getState()
const placed = (props: Props) => {
  const { position: _p, rotation: _r, ...rest } = props
  return rest
}

/** Put the new figure into the scene where the room was entered from; the room keeps dressing it. */
export function addDressToScene() {
  const { dress, world } = get()
  const back = dress.back?.target ?? [0, 0, 0]
  const props = { ...dress.draft, position: [back[0], world.ground ?? 0, back[2]] }
  const [id] = addNodes([{ type: 'Person', props }])
  if (id) {
    setDress({ target: id, original: props })
    toast('Added to the scene: edits now land on it')
  }
}

/** Dress the play avatar in this look: the world's `Player` body, or a new `Player` wearing it. */
export function useAsAvatar() {
  const state = get()
  const look = lookOf(dressProps(state))
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
  const back = state.dress.back?.target ?? [0, 0, 0]
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
  const props = dressProps(get())
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
    writeDress(wearLook(dressProps(get()), look))
    toast(`Wearing ${file.name}`)
  } catch (error) {
    toast(`Couldn't read ${file.name}: ${(error as Error).message}`)
  }
}

export const copyJsx = () => copyText(jsxFor('Person', placed(dressProps(get()))), 'JSX copied')

export const copyNode = () =>
  copyText(
    JSON.stringify({ type: 'Person', props: placed(dressProps(get())) }, null, 2),
    'Person node copied',
  )

/** The scene node the room is dressing, if it still exists. */
export function dressTarget() {
  const { dress, world } = get()
  return dress.target ? (locate(world.nodes, dress.target)?.node ?? null) : null
}
