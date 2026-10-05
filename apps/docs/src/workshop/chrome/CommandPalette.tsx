import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addAtFocus,
  exportPng,
  exportWorld,
  fixIssue,
  insertSnippet,
  loadTemplate,
  worldIssues,
} from '../actions'
import { MODE_PANELS, PANEL_TITLES, resetLayout, togglePanel } from '../panels/layout'
import { PLACEABLE, SCHEMA } from '../schema'
import { SNIPPETS } from '../snippets'
import { walk } from '../state/ops'
import {
  redoWorld,
  requestCamera,
  reseedAll,
  runCode,
  select,
  setLabType,
  setMode,
  setStage,
  startPlay,
  toggleView,
  undoWorld,
  useWorkshop,
  type WorkshopState,
} from '../state/store'
import { TEMPLATES } from '../templates'

interface Command {
  id: string
  label: string
  group: string
  hint?: string
  run: () => void
}

function commands(state: WorkshopState): Command[] {
  const out: Command[] = []
  for (const name of PLACEABLE) {
    out.push({
      id: `add:${name}`,
      group: 'Add',
      label: `Add ${name}`,
      hint: SCHEMA[name]?.category,
      run: () => (state.mode === 'lab' ? setLabType(name) : addAtFocus(name)),
    })
  }
  for (const name of PLACEABLE) {
    out.push({
      id: `lab:${name}`,
      group: 'Lab',
      label: `Open ${name} in the lab`,
      run: () => {
        setLabType(name)
        setMode('lab')
      },
    })
  }
  for (const t of TEMPLATES)
    out.push({
      id: `tpl:${t.id}`,
      group: 'Template',
      label: `Load template: ${t.title}`,
      hint: `${t.stage}`,
      run: () => loadTemplate(t),
    })
  for (const s of SNIPPETS)
    out.push({
      id: `snip:${s.id}`,
      group: 'Snippet',
      label: `Insert snippet: ${s.title}`,
      run: () => insertSnippet(s),
    })
  walk(state.world.nodes, (node) => {
    if (!node.id) return
    const id = node.id
    out.push({
      id: `go:${id}`,
      group: 'Go to',
      label: `${node.type} ${id}`,
      run: () => {
        select(id)
        requestCamera({ kind: 'frame', id })
      },
    })
  })
  out.push(
    {
      id: 'mode:build',
      group: 'Mode',
      label: 'Build mode',
      hint: '1',
      run: () => setMode('build'),
    },
    { id: 'mode:lab', group: 'Mode', label: 'Lab mode', hint: '2', run: () => setMode('lab') },
    { id: 'mode:code', group: 'Mode', label: 'Code mode', hint: '3', run: () => setMode('code') },
    {
      id: 'stage:room',
      group: 'Stage',
      label: 'Stage: Workshop room',
      run: () => setStage('room'),
    },
    { id: 'stage:plot', group: 'Stage', label: 'Stage: open plot', run: () => setStage('plot') },
    { id: 'stage:none', group: 'Stage', label: 'Stage: none', run: () => setStage('none') },
    { id: 'play', group: 'Action', label: 'Play: walk the world', hint: 'p', run: startPlay },
    {
      id: 'run',
      group: 'Action',
      label: 'Run App.tsx',
      hint: '⌘↵',
      run: () => {
        setMode('code')
        runCode()
      },
    },
    { id: 'reseed', group: 'Action', label: 'Re-roll every seed', run: reseedAll },
    {
      id: 'fixall',
      group: 'Action',
      label: 'Drop everything buried or floating onto the ground',
      run: () => {
        for (const issue of worldIssues(useWorkshop.getState().world)) fixIssue(issue.id, issue.fix)
      },
    },
    { id: 'undo', group: 'Action', label: 'Undo', hint: '⌘Z', run: undoWorld },
    { id: 'redo', group: 'Action', label: 'Redo', hint: '⇧⌘Z', run: redoWorld },
    {
      id: 'frame',
      group: 'Camera',
      label: 'Frame everything',
      hint: 'Home',
      run: () => requestCamera({ kind: 'all' }),
    },
    {
      id: 'top',
      group: 'Camera',
      label: 'Top view',
      run: () => requestCamera({ kind: 'preset', preset: 'top' }),
    },
    { id: 'export', group: 'Export', label: 'Download .world.json', run: exportWorld },
    { id: 'png', group: 'Export', label: 'Save a PNG of the view', run: () => exportPng() },
    { id: 'grid', group: 'View', label: 'Toggle grid', run: () => toggleView('grid') },
    {
      id: 'colliders',
      group: 'View',
      label: 'Toggle colliders',
      run: () => toggleView('colliders'),
    },
    { id: 'stats', group: 'View', label: 'Toggle stats', run: () => toggleView('stats') },
    {
      id: 'focus',
      group: 'View',
      label: 'Hide all panels',
      hint: 'Tab',
      run: () => useWorkshop.setState({ focusMode: true }),
    },
    { id: 'layout', group: 'View', label: 'Reset panel layout', run: resetLayout },
    {
      id: 'help',
      group: 'Help',
      label: 'Keyboard shortcuts',
      hint: '?',
      run: () => useWorkshop.setState({ helpOpen: true }),
    },
  )
  for (const id of MODE_PANELS[state.mode]) {
    out.push({
      id: `panel:${id}`,
      group: 'Panel',
      label: `Toggle ${PANEL_TITLES[id]} panel`,
      run: () => togglePanel(state.mode, id),
    })
  }
  return out
}

/** Fuzzy-ish: every query word must appear; earlier and tighter matches rank higher. */
function score(text: string, query: string) {
  const t = text.toLowerCase()
  let total = 0
  for (const word of query.toLowerCase().split(/\s+/).filter(Boolean)) {
    const at = t.indexOf(word)
    if (at < 0) return -1
    total += at === 0 ? 0 : /\W/.test(t[at - 1]) ? 1 : 3
  }
  return total
}

export default function CommandPalette() {
  const state = useWorkshop.getState()
  const all = useMemo(() => commands(state), [state])
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const list = useRef<HTMLDivElement>(null)
  const results = useMemo(() => {
    if (!query.trim()) return all.filter((c) => !['Go to', 'Lab'].includes(c.group)).slice(0, 60)
    return all
      .map((c) => ({ c, s: score(`${c.group} ${c.label}`, query) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => a.s - b.s)
      .slice(0, 60)
      .map((r) => r.c)
  }, [all, query])

  useEffect(() => setActive(0), [query])
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const close = () => useWorkshop.setState({ paletteOpen: false })
  const run = (c?: Command) => {
    if (!c) return
    close()
    c.run()
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: clicking the backdrop dismisses; Esc does the same from the keyboard
    <div
      className="ws-modal ws-modal--top"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div className="ws-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          // biome-ignore lint/a11y/noAutofocus: a command palette is opened to type into
          autoFocus
          className="ws-palette__input"
          placeholder="Add a component, load a template, jump to a node…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(results.length - 1, a + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(0, a - 1))
            } else if (e.key === 'Enter') run(results[active])
            else if (e.key === 'Escape') close()
          }}
        />
        <div className="ws-palette__list" ref={list} role="listbox">
          {results.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-on' : ''}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(c)}
            >
              <span className="ws-palette__group">{c.group}</span>
              <span>{c.label}</span>
              {c.hint && <kbd>{c.hint}</kbd>}
            </button>
          ))}
          {!results.length && <p className="ws-muted ws-pad">Nothing matches.</p>}
        </div>
      </div>
    </div>
  )
}
