import { useEffect, useRef, useState } from 'react'
import { Panel } from '../panels/Panel'
import { setSandbox, useWorkshop } from '../state/store'

const LEVELS = ['log', 'info', 'warn', 'error'] as const

/** What the running App.tsx printed, and what went wrong. */
export default function ConsolePanel() {
  const logs = useWorkshop((s) => s.sandbox.logs)
  const error = useWorkshop((s) => s.sandbox.error)
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [logs.length])
  const shown = logs.filter((l) => !hidden[l.level])
  return (
    <Panel
      id="console"
      actions={
        <button
          type="button"
          className="ws-icon"
          title="Clear"
          onClick={() => setSandbox({ logs: [], error: null })}
        >
          ⌫
        </button>
      }
    >
      <div className="ws-console">
        <div className="ws-console__filters">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={`ws-chipbtn ${hidden[level] ? '' : 'is-on'}`}
              onClick={() => setHidden({ ...hidden, [level]: !hidden[level] })}
            >
              {level} {logs.filter((l) => l.level === level).length}
            </button>
          ))}
        </div>
        {error && (
          <div className="ws-console__error">
            <strong>{error.phase === 'transpile' ? 'Syntax error' : 'Error'}</strong>
            {error.line ? ` at line ${error.line}` : ''}: {error.message}
          </div>
        )}
        {shown.length === 0 && !error && (
          <p className="ws-muted ws-pad">console.log from App.tsx shows up here.</p>
        )}
        {shown.map((l, i) => (
          <div key={i} className={`ws-console__line is-${l.level}`}>
            <time>{new Date(l.at).toLocaleTimeString([], { hour12: false })}</time>
            <span>{l.text}</span>
          </div>
        ))}
        <div ref={end} />
      </div>
    </Panel>
  )
}
