import { useEffect, useState } from 'react'
import { copyText, exportPng } from '../actions'
import { jsxFor } from '../code/generate'
import { Catalog } from '../outliner/Outliner'
import { Panel } from '../panels/Panel'
import { live } from '../scene/refs'
import { hasSeed, SCHEMA } from '../schema'
import {
  type Instrument,
  type LabBackdrop,
  type LabGround,
  type LabLight,
  setLab,
  setLabType,
  setStage,
  toggleInstrument,
  useWorkshop,
} from '../state/store'
import { useLabMeasure } from './measure'

const INSTRUMENTS: [Instrument, string, string][] = [
  ['bounds', 'bounds', 'Bounding box with its size in meters'],
  ['scale', 'scale', 'A 1.8 m figure and a 1 m ruler'],
  ['wireframe', 'wireframe', 'Show the mesh edges'],
  ['normals', 'normals', 'Vertex normals (small meshes)'],
  ['colliders', 'colliders', 'Physics colliders'],
  ['turntable', 'turntable', 'Spin the subject'],
  ['stats', 'stats', 'Frame rate, draw calls, triangles'],
]

const fmt = (n: number) => n.toLocaleString()

function Stats() {
  const stats = useLabMeasure((s) => s.stats)
  const show = useWorkshop((s) => s.lab.instruments.stats)
  const [frame, setFrame] = useState(live.stats)
  useEffect(() => {
    const t = setInterval(() => setFrame({ ...live.stats }), 500)
    return () => clearInterval(t)
  }, [])
  if (!stats) return <p className="ws-muted ws-pad">Measuring…</p>
  return (
    <dl className="ws-readout">
      <div>
        <dt>build</dt>
        <dd>{stats.buildMs === null ? '…' : `${fmt(stats.buildMs)} ms`}</dd>
      </div>
      <div>
        <dt>size</dt>
        <dd>{stats.size ? stats.size.map((v) => v.toFixed(2)).join(' × ') : '–'} m</dd>
      </div>
      <div>
        <dt>triangles</dt>
        <dd>{fmt(stats.triangles)}</dd>
      </div>
      <div>
        <dt>meshes</dt>
        <dd>
          {stats.meshes}
          {stats.instances ? ` (${fmt(stats.instances)} instances)` : ''}
        </dd>
      </div>
      <div>
        <dt>geometries · materials</dt>
        <dd>
          {stats.geometries} · {stats.materials}
        </dd>
      </div>
      {show && (
        <div>
          <dt>frame</dt>
          <dd>
            {frame.fps} fps · {frame.calls} calls
          </dd>
        </div>
      )}
    </dl>
  )
}

function Determinism() {
  const check = useLabMeasure((s) => s.check)
  const type = useWorkshop((s) => s.lab.type)
  const start = () => {
    useLabMeasure.setState({ check: { status: 'running' } })
    setLab({ checkRun: useWorkshop.getState().lab.checkRun + 1 })
  }
  return (
    <div className="ws-check">
      <button
        type="button"
        className="ws-btn ws-btn--small"
        onClick={start}
        disabled={check.status === 'running'}
      >
        {check.status === 'running' ? 'building twice…' : 'check determinism'}
      </button>
      {check.status === 'done' && (
        <div className={`ws-check__result ${check.deterministic ? 'is-ok' : 'is-bad'}`}>
          <strong>{check.deterministic ? '✓ deterministic' : '✗ not deterministic'}</strong>
          <span>
            same props built twice: <code>{check.hashes?.a}</code> {check.deterministic ? '=' : '≠'}{' '}
            <code>{check.hashes?.again}</code>
          </span>
          {check.diff && <span>{check.diff}</span>}
          {check.seedSensitive !== null && check.seedSensitive !== undefined && (
            <span>
              seed + 1: <code>{check.hashes?.other}</code>{' '}
              {check.seedSensitive
                ? '(the seed changes the geometry ✓)'
                : `(${type} looks the same for both seeds)`}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function Diff() {
  const props = useWorkshop((s) => s.lab.props)
  const propsB = useWorkshop((s) => s.lab.propsB)
  if (!propsB)
    return <p className="ws-muted ws-pad">Click B in the view (or “fork”) to start a variant.</p>
  const keys = [...new Set([...Object.keys(props), ...Object.keys(propsB)])].filter(
    (k) => JSON.stringify(props[k]) !== JSON.stringify(propsB[k]),
  )
  return (
    <div className="ws-diff">
      {!keys.length && (
        <p className="ws-muted ws-pad">A and B are identical. Edit B in the inspector.</p>
      )}
      {keys.map((k) => (
        <div key={k} className="ws-diff__row">
          <span>{k}</span>
          <code className="is-a">{JSON.stringify(props[k]) ?? 'default'}</code>
          <code className="is-b">{JSON.stringify(propsB[k]) ?? 'default'}</code>
        </div>
      ))}
    </div>
  )
}

function Section({
  title,
  children,
  open = true,
}: {
  title: string
  children: React.ReactNode
  open?: boolean
}) {
  return (
    <details className="ws-section" open={open}>
      <summary>
        <span>{title}</span>
      </summary>
      <div className="ws-section__body">{children}</div>
    </details>
  )
}

function Tools() {
  const lab = useWorkshop((s) => s.lab)
  const stage = useWorkshop((s) => s.stage)
  const seeded = hasSeed(lab.type)
  const props = lab.editing === 'b' && lab.propsB ? lab.propsB : lab.props
  const name = SCHEMA[lab.type]?.name
  return (
    <Panel id="lab">
      <div className="ws-labtools">
        <div className="ws-seg ws-seg--wide">
          {(
            [
              ['single', 'single'],
              ['seeds', 'seed grid'],
              ['compare', 'A / B'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              className={lab.view === v ? 'is-on' : ''}
              disabled={v === 'seeds' && !seeded}
              title={v === 'seeds' && !seeded ? `${lab.type} has no seed` : undefined}
              onClick={() =>
                setLab({
                  view: v,
                  ...(v === 'compare' && !lab.propsB
                    ? { propsB: { ...lab.props }, editing: 'b' as const }
                    : {}),
                })
              }
            >
              {label}
            </button>
          ))}
        </div>

        {lab.view === 'seeds' && (
          <Section title="Seed grid">
            <div className="ws-row">
              <div className="ws-seg ws-seg--small">
                {([3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={lab.grid === n ? 'is-on' : ''}
                    onClick={() => setLab({ grid: n })}
                  >
                    {n}×{n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="ws-icon"
                title="Previous page"
                onClick={() =>
                  setLab({ seedBase: Math.max(1, lab.seedBase - lab.grid * lab.grid) })
                }
              >
                ‹
              </button>
              <span className="ws-muted">
                {lab.seedBase}–{lab.seedBase + lab.grid * lab.grid - 1}
              </span>
              <button
                type="button"
                className="ws-icon"
                title="Next page"
                onClick={() => setLab({ seedBase: lab.seedBase + lab.grid * lab.grid })}
              >
                ›
              </button>
              <button
                type="button"
                className="ws-btn ws-btn--small"
                onClick={() => setLab({ seedBase: 1 + Math.floor(Math.random() * 9000) })}
              >
                🎲
              </button>
            </div>
            <p className="ws-muted ws-pad">
              Click a cell to adopt its seed, shift-click to pin it.
            </p>
            {lab.pinned.length > 0 && (
              <div className="ws-pins">
                {lab.pinned.map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    className={`ws-chipbtn ${props.seed === seed ? 'is-on' : ''}`}
                    onClick={() => setLab({ props: { ...lab.props, seed } })}
                  >
                    {seed}
                  </button>
                ))}
              </div>
            )}
          </Section>
        )}

        {lab.view === 'compare' && (
          <Section title="Compare">
            <div className="ws-row">
              <button
                type="button"
                className="ws-btn ws-btn--small"
                onClick={() => setLab({ props: lab.propsB ?? lab.props, propsB: lab.props })}
              >
                swap
              </button>
              <button
                type="button"
                className="ws-btn ws-btn--small"
                onClick={() =>
                  setLab({
                    props: lab.propsB ?? lab.props,
                    propsB: null,
                    view: 'single',
                    editing: 'a',
                  })
                }
              >
                keep B
              </button>
              <button
                type="button"
                className="ws-btn ws-btn--small"
                onClick={() => setLab({ propsB: { ...lab.props }, editing: 'b' })}
              >
                fork A
              </button>
            </div>
            <Diff />
          </Section>
        )}

        <Section title="Light & backdrop">
          <div className="ws-seg ws-seg--small ws-wrap">
            {(['studio', 'morning', 'noon', 'dusk', 'night'] as LabLight[]).map((l) => (
              <button
                key={l}
                type="button"
                className={lab.light === l ? 'is-on' : ''}
                onClick={() => setLab({ light: l })}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="ws-seg ws-seg--small ws-wrap">
            {(['stage', 'grey', 'checker', 'transparent'] as LabBackdrop[]).map((b) => (
              <button
                key={b}
                type="button"
                className={lab.backdrop === b ? 'is-on' : ''}
                onClick={() => setLab({ backdrop: b })}
              >
                {b === 'stage' ? `stage: ${stage}` : b}
              </button>
            ))}
          </div>
          {lab.backdrop === 'stage' && (
            <div className="ws-seg ws-seg--small ws-wrap">
              {(['room', 'plot', 'none'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={stage === s ? 'is-on' : ''}
                  onClick={() => setStage(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="ws-seg ws-seg--small ws-wrap">
            {(['pedestal', 'grid', 'floor', 'terrain', 'none'] as LabGround[]).map((g) => (
              <button
                key={g}
                type="button"
                className={lab.ground === g ? 'is-on' : ''}
                onClick={() => setLab({ ground: g })}
              >
                {g}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Instruments">
          <div className="ws-instruments">
            {INSTRUMENTS.map(([key, label, hint]) => (
              <button
                key={key}
                type="button"
                className={`ws-chipbtn ${lab.instruments[key] ? 'is-on' : ''}`}
                title={hint}
                onClick={() => toggleInstrument(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {lab.view === 'single' && <Stats />}
          <Determinism />
        </Section>

        <Section title="Take it home">
          <div className="ws-row ws-wrap">
            <button
              type="button"
              className="ws-btn ws-btn--small"
              onClick={() => copyText(jsxFor(lab.type, props), 'JSX copied')}
            >
              copy JSX
            </button>
            <button
              type="button"
              className="ws-btn ws-btn--small"
              onClick={() =>
                copyText(
                  JSON.stringify({ type: lab.type, props }, null, 2),
                  'Node copied: paste it into the scene (⌘V)',
                )
              }
            >
              copy node
            </button>
            {name && (
              <button
                type="button"
                className="ws-btn ws-btn--small"
                onClick={() => copyText(`npx @runek/cli add ${name}`, 'Install command copied')}
              >
                copy add
              </button>
            )}
            <button type="button" className="ws-btn ws-btn--small" onClick={() => exportPng(false)}>
              PNG
            </button>
            <button
              type="button"
              className="ws-btn ws-btn--small"
              onClick={() => exportPng(true)}
              title="Set the backdrop to transparent first for a cut-out"
            >
              PNG (alpha)
            </button>
          </div>
          <pre className="ws-snippet">{jsxFor(lab.type, props)}</pre>
        </Section>
      </div>
    </Panel>
  )
}

/** Lab mode's panels: the component picker and the lab tools. The inspector is shared. */
export default function LabPanels() {
  const type = useWorkshop((s) => s.lab.type)
  return (
    <>
      <Panel id="picker">
        <Catalog active={type} onPick={setLabType} />
      </Panel>
      <Tools />
    </>
  )
}
