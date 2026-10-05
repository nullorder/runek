import type { WorldNode } from '@runek/core/data'
import { useMemo, useState } from 'react'
import { addAtFocus, insertSnippet, loadTemplate } from '../actions'
import { Panel } from '../panels/Panel'
import { catalogGroups, PLACEABLE, SCHEMA } from '../schema'
import { SNIPPETS } from '../snippets'
import { countNodes } from '../state/ops'
import {
  moveTo,
  requestCamera,
  select,
  toggleHidden,
  toggleLocked,
  useWorkshop,
} from '../state/store'
import { TEMPLATES } from '../templates'
import { Thumb } from './Thumbs'

type Tab = 'scene' | 'add' | 'templates' | 'snippets'

const CONTAINERS = new Set(['Group', 'Player', 'Interactable'])

/** A short hint after the type: a Sign's text, a label, a seed. */
function hint(node: WorldNode) {
  const p = node.props ?? {}
  const text = p.children ?? p.label ?? p.name ?? p.text ?? p.bubble
  if (typeof text === 'string' && text) return `“${text.slice(0, 18)}”`
  if (typeof p.kind === 'string') return p.kind
  if (typeof p.seed === 'number') return `seed ${p.seed}`
  return ''
}

type Drop = { id: string; where: 'before' | 'after' | 'inside' } | null

function Tree({
  nodes,
  depth,
  parentId,
  drop,
  setDrop,
}: {
  nodes: WorldNode[]
  depth: number
  parentId: string | null
  drop: Drop
  setDrop: (d: Drop) => void
}) {
  const selection = useWorkshop((s) => s.selection)
  const hidden = useWorkshop((s) => s.hidden)
  const locked = useWorkshop((s) => s.locked)
  const custom = useWorkshop((s) => s.sandbox.registry)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  return (
    <ul className="ws-tree">
      {nodes.map((node, index) => {
        const id = node.id as string
        const known = node.type === 'Group' || !!SCHEMA[node.type] || custom.includes(node.type)
        const open = !collapsed[id]
        const marker = drop?.id === id ? `is-drop-${drop.where}` : ''
        return (
          <li key={id}>
            {/* biome-ignore lint/a11y/useSemanticElements: the row holds its own hide/lock buttons, which a <button> can't contain */}
            <div
              role="button"
              tabIndex={0}
              aria-pressed={selection === id}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !locked[id]) select(id)
              }}
              className={`ws-tree__row ${selection === id ? 'is-selected' : ''} ${hidden[id] ? 'is-hidden' : ''} ${marker}`}
              style={{ paddingLeft: 6 + depth * 14 }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/x-runek-node', id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes('text/x-runek-node')) return
                e.preventDefault()
                const r = e.currentTarget.getBoundingClientRect()
                const y = (e.clientY - r.top) / r.height
                const canNest = CONTAINERS.has(node.type)
                const where =
                  canNest && y > 0.3 && y < 0.7 ? 'inside' : y < 0.5 ? 'before' : 'after'
                if (drop?.id !== id || drop.where !== where) setDrop({ id, where })
              }}
              onDragLeave={() => drop?.id === id && setDrop(null)}
              onDrop={(e) => {
                e.preventDefault()
                const dragged = e.dataTransfer.getData('text/x-runek-node')
                setDrop(null)
                if (!dragged || dragged === id || !drop) return
                if (drop.where === 'inside') moveTo(dragged, id, node.children?.length ?? 0)
                else moveTo(dragged, parentId, drop.where === 'before' ? index : index + 1)
              }}
              onClick={() => !locked[id] && select(id)}
              onDoubleClick={() => requestCamera({ kind: 'frame', id })}
            >
              {node.children?.length ? (
                <button
                  type="button"
                  className="ws-tree__chev"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCollapsed({ ...collapsed, [id]: open })
                  }}
                >
                  {open ? '▾' : '▸'}
                </button>
              ) : (
                <span className="ws-tree__chev" />
              )}
              <span className={`ws-tree__type ${known ? '' : 'is-unknown'}`}>{node.type}</span>
              {node.anchor && (
                <span className="ws-tree__anchor" title={`anchored to ${node.anchor}`}>
                  ⚓
                </span>
              )}
              <span className="ws-tree__hint">{hint(node)}</span>
              <span className="ws-tree__tools">
                <button
                  type="button"
                  className={`ws-icon ${hidden[id] ? 'is-on' : ''}`}
                  title={hidden[id] ? 'Show' : 'Hide (view only)'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleHidden(id)
                  }}
                >
                  {hidden[id] ? '◌' : '◉'}
                </button>
                <button
                  type="button"
                  className={`ws-icon ${locked[id] ? 'is-on' : ''}`}
                  title={locked[id] ? 'Unlock' : 'Lock (no picking)'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLocked(id)
                  }}
                >
                  {locked[id] ? '🔒' : '·'}
                </button>
              </span>
            </div>
            {node.children?.length && open ? (
              <Tree
                nodes={node.children}
                depth={depth + 1}
                parentId={id}
                drop={drop}
                setDrop={setDrop}
              />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function SceneTab() {
  const world = useWorkshop((s) => s.world)
  const [drop, setDrop] = useState<Drop>(null)
  if (!world.nodes.length) {
    return (
      <div className="ws-empty">
        <p>The plot is empty.</p>
        <p className="ws-muted">
          Add a component, start from a template, or paste world JSON (⌘V).
        </p>
      </div>
    )
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a drop zone for reordering to the end; rows are keyboard-reachable
    <div
      className="ws-tree-wrap"
      onDragOver={(e) => e.dataTransfer.types.includes('text/x-runek-node') && e.preventDefault()}
      onDrop={(e) => {
        const dragged = e.dataTransfer.getData('text/x-runek-node')
        if (dragged && !drop) moveTo(dragged, null, world.nodes.length)
        setDrop(null)
      }}
    >
      <Tree nodes={world.nodes} depth={0} parentId={null} drop={drop} setDrop={setDrop} />
    </div>
  )
}

export function Catalog({ onPick, active }: { onPick: (type: string) => void; active?: string }) {
  const [query, setQuery] = useState('')
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const names = q
      ? PLACEABLE.filter(
          (n) =>
            n.toLowerCase().includes(q) ||
            SCHEMA[n]?.description?.toLowerCase().includes(q) ||
            SCHEMA[n]?.category?.includes(q),
        )
      : PLACEABLE
    return catalogGroups(names)
  }, [query])
  return (
    <div className="ws-catalog">
      <input
        className="ws-text ws-catalog__search"
        placeholder={`Search ${PLACEABLE.length} components…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const first = groups[0]?.names[0]
            if (first) onPick(first)
          }
        }}
      />
      {groups.map(({ category, names }) => (
        <section key={category}>
          <h4>{category}</h4>
          <div className="ws-catalog__grid">
            {names.map((name) => (
              <button
                key={name}
                type="button"
                className={`ws-catalog__item ${active === name ? 'is-on' : ''}`}
                title={SCHEMA[name]?.description}
                onClick={() => onPick(name)}
              >
                <Thumb type={name} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
      {!groups.length && <p className="ws-muted ws-pad">No component matches “{query}”.</p>}
    </div>
  )
}

function TemplatesTab() {
  return (
    <div className="ws-cards">
      {TEMPLATES.map((t) => (
        <button key={t.id} type="button" className="ws-card" onClick={() => loadTemplate(t)}>
          <strong>{t.title}</strong>
          <span>{t.description}</span>
          <span className="ws-muted">
            {countNodes(t.world.nodes)} nodes · {t.stage} stage
            {t.world.time ? ` · ${t.world.time}` : ''}
          </span>
        </button>
      ))}
    </div>
  )
}

function SnippetsTab() {
  return (
    <div className="ws-cards">
      {SNIPPETS.map((s) => (
        <button key={s.id} type="button" className="ws-card" onClick={() => insertSnippet(s)}>
          <strong>{s.title}</strong>
          <span>{s.description}</span>
          <span className="ws-muted">{s.nodes.length} nodes, dropped at the camera focus</span>
        </button>
      ))}
    </div>
  )
}

export default function Outliner() {
  const [tab, setTab] = useState<Tab>('scene')
  const count = useWorkshop((s) => countNodes(s.world.nodes))
  return (
    <Panel id="outliner">
      <div className="ws-tabs" role="tablist">
        {(
          [
            ['scene', `Scene ${count}`],
            ['add', '+ Add'],
            ['templates', 'Templates'],
            ['snippets', 'Snippets'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? 'is-on' : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="ws-tabbody">
        {tab === 'scene' && <SceneTab />}
        {tab === 'add' && <Catalog onPick={addAtFocus} />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'snippets' && <SnippetsTab />}
      </div>
    </Panel>
  )
}
