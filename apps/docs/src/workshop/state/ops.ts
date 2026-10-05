import {
  assignNodeIds,
  type CompositeDef,
  type JsonValue,
  unpackComposite,
  type WorldData,
  type WorldNode,
} from '@runek/core/data'

export type Vec3 = [number, number, number]

export interface Located {
  node: WorldNode
  /** The list holding the node (a parent's `children` or the world's `nodes`). */
  list: WorldNode[]
  index: number
  parent: WorldNode | null
  /** Tree path as the ground index numbers it (`"3/0"`). */
  path: string
}

export function locate(
  nodes: WorldNode[],
  id: string,
  parent: WorldNode | null = null,
  prefix = '',
): Located | null {
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]
    const path = prefix ? `${prefix}/${index}` : `${index}`
    if (node.id === id) return { node, list: nodes, index, parent, path }
    if (node.children) {
      const found = locate(node.children, id, node, path)
      if (found) return found
    }
  }
  return null
}

export function walk(
  nodes: WorldNode[],
  visit: (node: WorldNode, depth: number) => void,
  depth = 0,
) {
  for (const node of nodes) {
    visit(node, depth)
    if (node.children) walk(node.children, visit, depth + 1)
  }
}

/** Rebuild the tree with `fn` applied to the node with `id` (return null to remove it). */
function mapNode(
  nodes: WorldNode[],
  id: string,
  fn: (node: WorldNode) => WorldNode | null,
): WorldNode[] {
  let changed = false
  const out: WorldNode[] = []
  for (const node of nodes) {
    if (node.id === id) {
      changed = true
      const next = fn(node)
      if (next) out.push(next)
      continue
    }
    if (node.children) {
      const children = mapNode(node.children, id, fn)
      if (children !== node.children) {
        changed = true
        out.push({ ...node, children })
        continue
      }
    }
    out.push(node)
  }
  return changed ? out : nodes
}

export const updateNode = (
  world: WorldData,
  id: string,
  fn: (node: WorldNode) => WorldNode,
): WorldData => ({
  ...world,
  nodes: mapNode(world.nodes, id, fn),
})

/** Merge into a node's props; an `undefined` value removes the key (back to the default). */
export function patchProps(
  world: WorldData,
  id: string,
  patch: Record<string, JsonValue | undefined>,
): WorldData {
  return updateNode(world, id, (node) => {
    const props: Record<string, JsonValue> = { ...node.props }
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete props[key]
      else props[key] = value
    }
    const next: WorldNode = { ...node, props }
    if (!Object.keys(props).length) delete next.props
    return next
  })
}

export function setAnchor(
  world: WorldData,
  id: string,
  anchor: WorldNode['anchor'],
  y: number,
): WorldData {
  return updateNode(world, id, (node) => {
    const at = asVec3(node.props?.position) ?? [0, 0, 0]
    const next: WorldNode = {
      ...node,
      props: { ...node.props, position: [at[0], round(y), at[2]] },
    }
    if (anchor) next.anchor = anchor
    else delete next.anchor
    return next
  })
}

export const removeNode = (world: WorldData, id: string): WorldData => ({
  ...world,
  nodes: mapNode(world.nodes, id, () => null),
})

function stripIds(node: WorldNode): WorldNode {
  const { id: _id, ...rest } = node
  return rest.children ? { ...rest, children: rest.children.map(stripIds) } : rest
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** Insert copies of `nodes` (fresh ids) into the root or under `parentId`. Returns the new ids. */
export function insertNodes(
  world: WorldData,
  nodes: WorldNode[],
  { parentId = null, index }: { parentId?: string | null; index?: number } = {},
): { world: WorldData; ids: string[] } {
  const fresh = nodes.map((n) => stripIds(clone(n)))
  const insert = (list: WorldNode[]) => {
    const at = index === undefined ? list.length : Math.max(0, Math.min(index, list.length))
    return [...list.slice(0, at), ...fresh, ...list.slice(at)]
  }
  const next = parentId
    ? updateNode(world, parentId, (parent) => ({
        ...parent,
        children: insert(parent.children ?? []),
      }))
    : { ...world, nodes: insert(world.nodes) }
  const withIds = assignNodeIds(next)
  const before = new Set<string>()
  walk(world.nodes, (n) => n.id && before.add(n.id))
  const ids: string[] = []
  const list = parentId ? (locate(withIds.nodes, parentId)?.node.children ?? []) : withIds.nodes
  for (const n of list) if (n.id && !before.has(n.id)) ids.push(n.id)
  return { world: withIds, ids }
}

export function duplicateNode(world: WorldData, id: string, offset: Vec3 = [0.5, 0, 0.5]) {
  const found = locate(world.nodes, id)
  if (!found) return { world, ids: [] as string[] }
  const copy = clone(found.node)
  const at = asVec3(copy.props?.position) ?? [0, 0, 0]
  copy.props = { ...copy.props, position: at.map((v, i) => round(v + offset[i])) as Vec3 }
  return insertNodes(world, [copy], { parentId: found.parent?.id ?? null, index: found.index + 1 })
}

const contains = (node: WorldNode, id: string): boolean =>
  node.id === id || !!node.children?.some((child) => contains(child, id))

/** Move a node to `index` within `parentId`'s children (or the root). Refuses cycles. */
export function moveNode(
  world: WorldData,
  id: string,
  parentId: string | null,
  index: number,
): WorldData {
  const found = locate(world.nodes, id)
  if (!found) return world
  if (parentId && contains(found.node, parentId)) return world
  const sameList = (found.parent?.id ?? null) === parentId
  const target = sameList && found.index < index ? index - 1 : index
  const without = removeNode(world, id)
  const insert = (list: WorldNode[]) => {
    const at = Math.max(0, Math.min(target, list.length))
    return [...list.slice(0, at), found.node, ...list.slice(at)]
  }
  return parentId
    ? updateNode(without, parentId, (parent) => ({
        ...parent,
        children: insert(parent.children ?? []),
      }))
    : { ...without, nodes: insert(without.nodes) }
}

export function unpackNode(world: WorldData, id: string, def: CompositeDef): WorldData {
  return assignNodeIds(
    updateNode(world, id, (node) => ({ ...unpackComposite(node, def), id: node.id })),
  )
}

/** Group the given root-level siblings under a new `Group`. */
export function groupNodes(world: WorldData, ids: string[]): { world: WorldData; id?: string } {
  const picked = world.nodes.filter((n) => n.id && ids.includes(n.id))
  if (!picked.length) return { world }
  const first = world.nodes.findIndex((n) => n.id && ids.includes(n.id))
  const rest = world.nodes.filter((n) => !(n.id && ids.includes(n.id)))
  const group: WorldNode = { type: 'Group', props: { position: [0, 0, 0] }, children: picked }
  const next = assignNodeIds({
    ...world,
    nodes: [...rest.slice(0, first), group, ...rest.slice(first)],
  })
  return { world: next, id: next.nodes[first].id }
}

/** Offset the top-level positions of a batch of nodes, e.g. to drop a snippet at a point. */
export function offsetNodes(nodes: WorldNode[], [dx, dy, dz]: Vec3): WorldNode[] {
  return nodes.map((node) => {
    const at = asVec3(node.props?.position) ?? [0, 0, 0]
    return {
      ...node,
      props: { ...node.props, position: [round(at[0] + dx), round(at[1] + dy), round(at[2] + dz)] },
    }
  })
}

export function usedTypes(world: WorldData): string[] {
  const types = new Set<string>()
  walk(world.nodes, (node) => types.add(node.type))
  return [...types].sort()
}

export function countNodes(nodes: WorldNode[]) {
  let n = 0
  walk(nodes, () => n++)
  return n
}

export const round = (n: number) => Math.round(n * 1000) / 1000

export const asVec3 = (value: unknown): Vec3 | undefined =>
  Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'number')
    ? (value as Vec3)
    : undefined

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Drop props equal to their schema default, recursively: the minimal file. */
export function stripDefaults(
  world: WorldData,
  defaults: (type: string) => Record<string, JsonValue | undefined>,
): WorldData {
  const strip = (nodes: WorldNode[]): WorldNode[] =>
    nodes.map((node) => {
      const known = defaults(node.type)
      const next: WorldNode = { ...node }
      if (node.props) {
        const props = Object.fromEntries(
          Object.entries(node.props).filter(
            ([key, value]) => !(key in known && equal(known[key], value)),
          ),
        )
        if (Object.keys(props).length) next.props = props
        else delete next.props
      }
      if (node.children) next.children = strip(node.children)
      return next
    })
  return { ...world, nodes: strip(world.nodes) }
}

export const withoutIds = (world: WorldData): WorldData => ({
  ...world,
  nodes: world.nodes.map(stripIds),
})
