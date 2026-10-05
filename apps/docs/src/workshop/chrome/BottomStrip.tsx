import { useEffect, useState } from 'react'
import { MODE_PANELS, PANEL_TITLES, resetLayout, togglePanel, useLayout } from '../panels/layout'
import { useNarrow } from '../panels/Panel'
import { live } from '../scene/refs'
import type { Stage } from '../share/codec'
import {
  requestCamera,
  setGizmo,
  setStage,
  setView,
  toggleView,
  useWorkshop,
  type ViewOptions,
} from '../state/store'

const STAGES: [Stage, string, string][] = [
  ['room', 'Room', 'The Workshop: your world inside the library’s next room'],
  ['plot', 'Plot', 'An open plot under the sky, for outdoor worlds'],
  ['none', 'None', 'Your world alone, exactly as your app renders it'],
]

const TOGGLES: [keyof ViewOptions, string, string][] = [
  ['grid', 'grid', 'Plot grid'],
  ['snap', 'snap', 'Snap moves to the grid step'],
  ['rotationSnap', '15°', 'Snap rotation to 15°'],
  ['colliders', 'colliders', 'Show physics colliders'],
  ['bounds', 'size', 'Selection size in meters'],
  ['stats', 'stats', 'Frame rate, draw calls, triangles'],
]

function Stats() {
  const [s, setS] = useState(live.stats)
  useEffect(() => {
    const t = setInterval(() => setS({ ...live.stats }), 500)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="ws-stats" title="fps · draw calls · triangles">
      {s.fps} fps · {s.calls} calls · {s.triangles.toLocaleString()} tris
    </span>
  )
}

export default function BottomStrip() {
  const mode = useWorkshop((s) => s.mode)
  const stage = useWorkshop((s) => s.stage)
  const view = useWorkshop((s) => s.view)
  const gizmo = useWorkshop((s) => s.gizmo)
  const issues = useWorkshop((s) => s.issueCount)
  const open = useLayout((s) => s.open[mode] ?? {})
  const sheet = useLayout((s) => s.sheet)
  const narrow = useNarrow()

  return (
    <footer className="ws-strip">
      {mode !== 'lab' && (
        <>
          <div className="ws-seg ws-seg--small">
            <span className="ws-strip__label">stage</span>
            {STAGES.map(([id, label, hint]) => (
              <button
                key={id}
                type="button"
                aria-pressed={stage === id}
                className={stage === id ? 'is-on' : ''}
                title={hint}
                onClick={() => setStage(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ws-seg ws-seg--small">
            <button
              type="button"
              className={gizmo === 'translate' ? 'is-on' : ''}
              title="Move (g)"
              onClick={() => setGizmo('translate')}
            >
              move
            </button>
            <button
              type="button"
              className={gizmo === 'rotate' ? 'is-on' : ''}
              title="Rotate (r)"
              onClick={() => setGizmo('rotate')}
            >
              rotate
            </button>
          </div>
          <div className="ws-toggles">
            {TOGGLES.map(([key, label, hint]) => (
              <button
                key={key}
                type="button"
                className={`ws-chipbtn ${view[key] ? 'is-on' : ''}`}
                title={hint}
                onClick={() => toggleView(key)}
              >
                {label}
              </button>
            ))}
            {view.snap && (
              <select
                className="ws-select ws-select--tiny"
                value={view.snapStep}
                onChange={(e) => setView({ snapStep: Number(e.target.value) })}
                title="Snap step (m)"
              >
                {[0.1, 0.25, 0.5, 1].map((s) => (
                  <option key={s} value={s}>
                    {s} m
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="ws-seg ws-seg--small ws-camera">
            {(['perspective', 'top', 'front', 'side'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                title={`${preset} view`}
                onClick={() => requestCamera({ kind: 'preset', preset })}
              >
                {preset === 'perspective' ? 'persp' : preset}
              </button>
            ))}
            <button
              type="button"
              title="Frame everything (Home)"
              onClick={() => requestCamera({ kind: 'all' })}
            >
              all
            </button>
          </div>
        </>
      )}
      <span className="ws-strip__spacer" />
      {view.stats && mode !== 'lab' && <Stats />}
      <div className="ws-strip__panels">
        {MODE_PANELS[mode].map((id) => (
          <button
            key={id}
            type="button"
            className={`ws-chipbtn ${(narrow ? sheet === id && open[id] : open[id]) ? 'is-on' : ''}`}
            onClick={() => {
              if (narrow && open[id] && sheet !== id) useLayout.setState({ sheet: id })
              else togglePanel(mode, id)
            }}
          >
            {PANEL_TITLES[id]}
            {id === 'issues' && issues > 0 ? <b className="ws-badge">{issues}</b> : null}
          </button>
        ))}
        {!narrow && (
          <button
            type="button"
            className="ws-icon"
            title="Reset panel layout"
            onClick={resetLayout}
          >
            ⟲
          </button>
        )}
      </div>
    </footer>
  )
}
