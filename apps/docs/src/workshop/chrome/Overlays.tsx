import { useEffect, useState } from 'react'
import { SHORTCUTS } from '../shortcuts'
import { runCode, setSandbox, useWorkshop } from '../state/store'

export function Toasts() {
  const toast = useWorkshop((s) => s.toast)
  const [visible, setVisible] = useState<typeof toast>(null)
  useEffect(() => {
    if (!toast) return
    setVisible(toast)
    const t = setTimeout(() => setVisible(null), 3200)
    return () => clearTimeout(t)
  }, [toast])
  if (!visible) return null
  return (
    <div className="ws-toast" role="status" key={visible.n}>
      {visible.text}
    </div>
  )
}

export function HelpSheet() {
  const open = useWorkshop((s) => s.helpOpen)
  if (!open) return null
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: clicking the backdrop dismisses; Esc does the same from the keyboard
    <div
      className="ws-modal"
      onClick={(e) => e.target === e.currentTarget && useWorkshop.setState({ helpOpen: false })}
      role="presentation"
    >
      <div
        className="ws-modal__card"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <header>
          <strong>Keyboard</strong>
          <button
            type="button"
            className="ws-icon"
            onClick={() => useWorkshop.setState({ helpOpen: false })}
          >
            ✕
          </button>
        </header>
        <dl className="ws-keysheet">
          {SHORTCUTS.map(([keys, what]) => (
            <div key={keys}>
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
        <p className="ws-muted">
          Drag panels by their title, resize from the corner, double-click a title to collapse. Drop
          a <code>.world.json</code> anywhere to open it.
        </p>
      </div>
    </div>
  )
}

/** A shared link carried code: show it before anything runs. */
export function CodeGate() {
  const gated = useWorkshop((s) => s.sandbox.gated)
  const code = useWorkshop((s) => s.code)
  const [show, setShow] = useState(false)
  if (!gated || !code) return null
  return (
    <div className="ws-modal" role="presentation">
      <div
        className="ws-modal__card ws-gate"
        role="dialog"
        aria-modal="true"
        aria-label="Run shared code?"
      >
        <header>
          <strong>This link contains code</strong>
        </header>
        <p>
          It came with an <code>App.tsx</code>. It runs in a sandbox with no access to this site's
          storage, cookies or page, but it is still someone else's code: have a look first.
        </p>
        {show && <pre className="ws-gate__code">{code}</pre>}
        <div className="ws-gate__actions">
          <button type="button" className="ws-btn" onClick={() => setShow(!show)}>
            {show ? 'Hide code' : 'View code'}
          </button>
          <button
            type="button"
            className="ws-btn"
            onClick={() => setSandbox({ gated: false, running: false })}
          >
            Don't run
          </button>
          <button
            type="button"
            className="ws-btn ws-btn--primary"
            onClick={() => {
              useWorkshop.setState({ mode: 'code' })
              runCode()
            }}
          >
            Run it
          </button>
        </div>
      </div>
    </div>
  )
}
