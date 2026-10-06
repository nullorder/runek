import type { SyntaxNode, Tree } from '@lezer/common'
import type { JsonPath } from '@runek/core/data'

type Text = { sliceString: (from: number, to: number) => string }

const unquote = (raw: string) => {
  try {
    return JSON.parse(raw) as string
  } catch {
    return raw.replace(/^"|"$/g, '')
  }
}

const valueNode = (property: SyntaxNode) => {
  let child = property.firstChild
  while (child && (child.name === 'PropertyName' || child.name === ':')) child = child.nextSibling
  return child
}

const elements = (array: SyntaxNode) => {
  const out: SyntaxNode[] = []
  for (let c = array.firstChild; c; c = c.nextSibling) {
    if (!['[', ']', ',', '⚠'].includes(c.name)) out.push(c)
  }
  return out
}

/** The source range a JSON path points at (the key for `key`, else the value). */
export function rangeOf(
  tree: Tree,
  text: Text,
  path: JsonPath,
  key = false,
): { from: number; to: number } | null {
  let node: SyntaxNode | null = tree.topNode.firstChild
  let keyNode: SyntaxNode | null = null
  for (const step of path) {
    if (!node) return null
    if (typeof step === 'number') {
      if (node.name !== 'Array') return null
      node = elements(node)[step] ?? null
      keyNode = null
    } else {
      if (node.name !== 'Object') return null
      let found: SyntaxNode | null = null
      for (let p = node.firstChild; p; p = p.nextSibling) {
        if (p.name !== 'Property') continue
        const name = p.getChild('PropertyName')
        if (name && unquote(text.sliceString(name.from, name.to)) === step) {
          found = p
          keyNode = name
        }
      }
      if (!found) return null
      node = valueNode(found)
    }
  }
  const target = key && keyNode ? keyNode : node
  return target ? { from: target.from, to: target.to } : null
}

/** The JSON path of a syntax node's value. */
export function pathOfNode(node: SyntaxNode, text: Text): JsonPath {
  const path: JsonPath = []
  let current: SyntaxNode | null = node
  while (current) {
    const parent: SyntaxNode | null = current.parent
    if (!parent) break
    if (parent.name === 'Property') {
      const name = parent.getChild('PropertyName')
      if (name) path.unshift(unquote(text.sliceString(name.from, name.to)))
      current = parent.parent
      continue
    }
    if (parent.name === 'Array') {
      const at = current
      const index = elements(parent).findIndex((e) => e.from === at.from)
      if (index >= 0) path.unshift(index)
    }
    current = parent
  }
  return path
}

/** The JSON path of the value under a position, plus whether it sits on a key. */
export function pathAt(
  tree: Tree,
  text: Text,
  pos: number,
): { path: JsonPath; onKey: boolean; node: SyntaxNode } {
  const node = tree.resolveInner(pos, -1)
  return { path: pathOfNode(node, text), onKey: node.name === 'PropertyName', node }
}

/** The innermost object or array holding a position, and its path. */
export function containerAt(
  tree: Tree,
  text: Text,
  pos: number,
): { node: SyntaxNode; path: JsonPath } | null {
  let node: SyntaxNode | null = tree.resolveInner(pos, -1)
  while (
    node &&
    !(
      (node.name === 'Object' || node.name === 'Array') &&
      node.from < pos &&
      (node.to > pos || !node.lastChild || !['}', ']'].includes(node.lastChild.name))
    )
  ) {
    node = node.parent
  }
  return node ? { node, path: pathOfNode(node, text) } : null
}

/** The property a position sits in the value of (after its colon). */
export function propertyAt(tree: Tree, text: Text, pos: number): JsonPath | null {
  let node: SyntaxNode | null = tree.resolveInner(pos, -1)
  while (node && node.name !== 'Property') {
    if (node.name === 'Object' || node.name === 'Array') return null
    node = node.parent
  }
  if (!node) return null
  const name = node.getChild('PropertyName')
  const owner = node.parent
  if (!name || !owner) return null
  return [...pathOfNode(owner, text), unquote(text.sliceString(name.from, name.to))]
}

/** The path of the world node (an element of `nodes` / `children`) enclosing a path. */
export function nodePathOf(path: JsonPath): JsonPath | null {
  let last = -1
  for (let i = 0; i < path.length - 1; i++) {
    if ((path[i] === 'nodes' || path[i] === 'children') && typeof path[i + 1] === 'number')
      last = i + 1
  }
  return last < 0 ? null : path.slice(0, last + 1)
}

export function valueAt(data: unknown, path: JsonPath): unknown {
  let v: unknown = data
  for (const step of path) {
    if (v === null || typeof v !== 'object') return undefined
    v = (v as Record<string | number, unknown>)[step]
  }
  return v
}
