import { javascript } from '@codemirror/lang-javascript'
import { syntaxTree } from '@codemirror/language'
import { type Diagnostic, setDiagnostics } from '@codemirror/lint'
import { EditorView } from '@codemirror/view'
import { assignNodeIds, parseWorld, validateWorld, type WorldData } from '@runek/core/data'
import { useEffect, useMemo, useRef, useState } from 'react'
import { copyText, worldText } from '../actions'
import { Panel } from '../panels/Panel'
import { live } from '../scene/refs'
import { SCHEMA } from '../schema'
import {
  commit,
  runCode,
  select,
  setCode,
  setSandbox,
  stopCode,
  toast,
  useWorkshop,
} from '../state/store'
import { Editor } from './Editor'
import { EXAMPLES } from './examples'
import {
  type CodeStyle,
  generateApp,
  installCommands,
  type PackageManager,
  registryNames,
} from './generate'
import { nodePathOf, pathAt, rangeOf } from './json-tree'
import { setNodeRange, worldJsonExtensions } from './world-json'

type Tab = 'json' | 'app' | 'install'

const getCustom = () => useWorkshop.getState().sandbox.registry

function WorldJson({ minimal }: { minimal: boolean }) {
  const world = useWorkshop((s) => s.world)
  const selection = useWorkshop((s) => s.selection)
  const derived = useMemo(() => worldText(world, { minimal }), [world, minimal])
  const [draft, setDraft] = useState<string | null>(null)
  const fromEditor = useRef<WorldData | null>(null)
  const view = useRef<EditorView | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const selectedFromEditor = useRef<string | null>(null)
  const extensions = useMemo(
    () => [
      ...worldJsonExtensions(getCustom),
      EditorView.updateListener.of((update) => {
        if (!update.selectionSet || !update.transactions.some((tr) => tr.isUserEvent('select')))
          return
        const state = update.state
        const { path } = pathAt(syntaxTree(state), state.doc, state.selection.main.head)
        const nodePath = nodePathOf(path)
        if (!nodePath) return
        const r = rangeOf(syntaxTree(state), state.doc, [...nodePath, 'id'])
        if (!r) return
        try {
          const id = JSON.parse(state.doc.sliceString(r.from, r.to))
          if (typeof id === 'string' && id !== useWorkshop.getState().selection) {
            selectedFromEditor.current = id
            select(id)
          }
        } catch {}
      }),
    ],
    [],
  )

  useEffect(() => {
    if (world !== fromEditor.current) setDraft(null)
  }, [world])

  // Highlight (and reveal, unless the cursor put it there) the selected node.
  useEffect(() => {
    const v = view.current
    if (!v) return
    const doc = v.state.doc.toString()
    if (!selection) {
      v.dispatch({ effects: setNodeRange.of(null) })
      return
    }
    const at = doc.indexOf(`"id": "${selection}"`)
    if (at < 0) return
    const tree = syntaxTree(v.state)
    const nodePath = nodePathOf(pathAt(tree, v.state.doc, at + 2).path)
    const r = nodePath ? rangeOf(tree, v.state.doc, nodePath) : null
    if (!r) return
    const reveal = selectedFromEditor.current !== selection
    selectedFromEditor.current = null
    v.dispatch({
      effects: [
        setNodeRange.of(r),
        ...(reveal ? [EditorView.scrollIntoView(r.from, { y: 'start', yMargin: 24 })] : []),
      ],
    })
  }, [selection, derived, draft])

  const onChange = (text: string) => {
    setDraft(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      let parsed: WorldData
      try {
        parsed = parseWorld(text)
      } catch {
        return
      }
      if (validateWorld(parsed, SCHEMA, getCustom()).some((i) => i.severity === 'error')) return
      const next = assignNodeIds(parsed)
      fromEditor.current = next
      commit(next, 'code:json')
    }, 300)
  }

  return (
    <Editor
      value={draft ?? derived}
      onChange={onChange}
      extensions={extensions}
      onView={(v) => {
        view.current = v
      }}
      label="world.json"
    />
  )
}

function AppTsx() {
  const code = useWorkshop((s) => s.code)
  const world = useWorkshop((s) => s.world)
  const style = useWorkshop((s) => s.codeStyle)
  const error = useWorkshop((s) => s.sandbox.error)
  const running = useWorkshop((s) => s.sandbox.running)
  const autoRun = useWorkshop((s) => s.sandbox.autoRun)
  const view = useRef<EditorView | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const extensions = useMemo(() => [javascript({ jsx: true, typescript: true })], [])

  useEffect(() => {
    if (code === null)
      setCode(generateApp(world, style, { resolve: (p) => live.ground?.position(p) }))
  }, [])

  useEffect(() => {
    const v = view.current
    if (!v) return
    const diagnostics: Diagnostic[] = []
    if (error?.line) {
      const line = v.state.doc.line(Math.min(error.line, v.state.doc.lines))
      const from = Math.min(line.to, line.from + Math.max(0, (error.column ?? 1) - 1))
      diagnostics.push({
        from,
        to: Math.max(from + 1, line.to),
        severity: 'error',
        message: error.message,
      })
    }
    v.dispatch(setDiagnostics(v.state, diagnostics))
  }, [error, code])

  if (code === null) return null
  return (
    <Editor
      value={code}
      label="App.tsx"
      extensions={extensions}
      onView={(v) => {
        view.current = v
      }}
      onChange={(text) => {
        setCode(text)
        clearTimeout(timer.current)
        if (running && autoRun) timer.current = setTimeout(runCode, 600)
      }}
    />
  )
}

function Install() {
  const world = useWorkshop((s) => s.world)
  const [pm, setPm] = useState<PackageManager>('npm')
  const commands = installCommands(world, pm)
  const names = registryNames(world)
  const all = commands.join('\n')
  return (
    <div className="ws-install">
      <div className="ws-seg ws-seg--small">
        {(['npm', 'pnpm', 'yarn', 'bun'] as const).map((p) => (
          <button
            key={p}
            type="button"
            className={pm === p ? 'is-on' : ''}
            onClick={() => setPm(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <p className="ws-muted">
        Pull the source of every component this world uses into your project (you own it, edit it
        freely), then render the world file:
      </p>
      <div className="ws-cmd">
        <pre>{all}</pre>
        <button
          type="button"
          className="ws-btn ws-btn--small"
          onClick={() => copyText(all, 'Commands copied')}
        >
          copy
        </button>
      </div>
      <p className="ws-muted">
        Save the world as <code>src/world.json</code> and use the App.tsx tab (data style) as your
        entry.
      </p>
      <div className="ws-install__list">
        {names.map((n) => {
          const title = Object.keys(SCHEMA).find((k) => SCHEMA[k].name === n)
          return (
            <a
              key={n}
              href={`/docs/components/${n}`}
              target="_blank"
              rel="noreferrer"
              className="ws-chipbtn"
              title={title ? SCHEMA[title].description : undefined}
            >
              {title ?? n} ↗
            </a>
          )
        })}
      </div>
    </div>
  )
}

function AppActions() {
  const running = useWorkshop((s) => s.sandbox.running)
  const autoRun = useWorkshop((s) => s.sandbox.autoRun)
  const style = useWorkshop((s) => s.codeStyle)
  const [menu, setMenu] = useState(false)
  const regenerate = (next: CodeStyle) => {
    const { world, code } = useWorkshop.getState()
    if (
      code &&
      !confirm(
        'Replace App.tsx with a freshly generated file? Your edits will be lost (copy them first if you need them).',
      )
    )
      return
    useWorkshop.setState({ codeStyle: next })
    setCode(generateApp(world, next, { resolve: (p) => live.ground?.position(p) }))
    setMenu(false)
  }
  return (
    <>
      <button
        type="button"
        className="ws-btn ws-btn--small ws-btn--primary"
        title="Run (⌘↵)"
        onClick={runCode}
      >
        ▶ run
      </button>
      {running && (
        <button
          type="button"
          className="ws-btn ws-btn--small"
          title="Back to the workshop view"
          onClick={stopCode}
        >
          ■ stop
        </button>
      )}
      <button
        type="button"
        className={`ws-chipbtn ${autoRun ? 'is-on' : ''}`}
        title="Re-run as you type (while running)"
        onClick={() => setSandbox({ autoRun: !autoRun })}
      >
        auto
      </button>
      <div className="ws-menu">
        <button type="button" className="ws-btn ws-btn--small" onClick={() => setMenu(!menu)}>
          new ▾
        </button>
        {menu && (
          <div className="ws-menu__list">
            <button type="button" onClick={() => regenerate('data')}>
              From this world: data {style === 'data' ? '·' : ''}
              <small>WorldRenderer + the live world.json</small>
            </button>
            <button type="button" onClick={() => regenerate('jsx')}>
              From this world: JSX {style === 'jsx' ? '·' : ''}
              <small>every component spelled out</small>
            </button>
            {EXAMPLES.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  if (useWorkshop.getState().code && !confirm(`Replace App.tsx with “${e.title}”?`))
                    return
                  setCode(e.code)
                  setMenu(false)
                  runCode()
                  toast(e.description)
                }}
              >
                {e.title}
                <small>{e.description}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default function CodePanel() {
  const [tab, setTab] = useState<Tab>('json')
  const [minimal, setMinimal] = useState(false)
  const error = useWorkshop((s) => s.sandbox.error)
  return (
    <Panel id="code" className="ws-codepanel">
      <div className="ws-tabs" role="tablist">
        {(
          [
            ['json', 'world.json'],
            ['app', 'App.tsx'],
            ['install', 'Install'],
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
            {id === 'app' && error ? <b className="ws-badge">!</b> : null}
          </button>
        ))}
        <span className="ws-tabs__spacer" />
        <span className="ws-tabs__actions">
          {tab === 'json' && (
            <>
              <button
                type="button"
                className={`ws-chipbtn ${minimal ? 'is-on' : ''}`}
                title="Hide props equal to their defaults"
                onClick={() => setMinimal(!minimal)}
              >
                minimal
              </button>
              <button
                type="button"
                className="ws-btn ws-btn--small"
                onClick={() =>
                  copyText(
                    worldText(useWorkshop.getState().world, { minimal }),
                    'world.json copied',
                  )
                }
              >
                copy
              </button>
            </>
          )}
          {tab === 'app' && <AppActions />}
        </span>
      </div>
      <div className="ws-codepanel__body">
        {tab === 'json' && <WorldJson minimal={minimal} />}
        {tab === 'app' && <AppTsx />}
        {tab === 'install' && <Install />}
      </div>
    </Panel>
  )
}
