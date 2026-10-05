import { useEffect, useRef, useState } from 'react'
import { setOpen } from '../panels/layout'
import { pushLog, setSandbox, stopCode, useWorkshop } from '../state/store'
import { isFromSandbox, type ToSandbox, wrap } from './protocol'

const SANDBOX_URL = '/workshop/sandbox'
/** No heartbeat for this long while running means the sandbox is stuck (a busy loop). */
const STALL_MS = 4000
/** A sandbox that hasn't said hello by now failed to load. */
const BOOT_MS = 20000

/** The viewport while App.tsx runs: an opaque-origin iframe, fed the code and the live world. */
export default function SandboxView() {
  const frame = useRef<HTMLIFrameElement>(null)
  const [generation, setGeneration] = useState(0)
  const ready = useRef(false)
  const failed = useRef(false)
  const lastBeat = useRef(performance.now())
  const runId = useWorkshop((s) => s.sandbox.runId)
  const world = useWorkshop((s) => s.world)
  const error = useWorkshop((s) => s.sandbox.error)

  const send = (message: ToSandbox) => frame.current?.contentWindow?.postMessage(wrap(message), '*')
  const run = () => {
    const { code, world } = useWorkshop.getState()
    if (code !== null) send({ kind: 'run', code, world })
  }

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || !isFromSandbox(event.data)) return
      const message = event.data
      switch (message.kind) {
        case 'ready':
          ready.current = true
          lastBeat.current = performance.now()
          run()
          break
        case 'heartbeat':
          lastBeat.current = performance.now()
          break
        case 'ran':
          setSandbox({ registry: message.registry, error: null })
          break
        case 'error':
          setSandbox({
            error: {
              phase: message.phase,
              message: message.message,
              line: message.line,
              column: message.column,
            },
          })
          pushLog({
            level: 'error',
            text: `${message.line ? `App.tsx:${message.line} ` : ''}${message.message}`,
          })
          setOpen(useWorkshop.getState().mode, 'console', true)
          break
        case 'log':
          pushLog({ level: message.level, text: message.text })
          break
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [generation])

  useEffect(() => {
    if (ready.current) run()
    else if (failed.current) {
      failed.current = false
      setGeneration((g) => g + 1)
    }
  }, [runId])

  useEffect(() => {
    if (ready.current) send({ kind: 'world', world })
  }, [world])

  useEffect(() => {
    if (ready.current) return
    const timer = setTimeout(() => {
      if (ready.current) return
      failed.current = true
      setSandbox({
        error: {
          phase: 'runtime',
          message: 'The sandbox did not start. Check your connection and press run again.',
        },
      })
      pushLog({ level: 'error', text: 'The sandbox page did not load in time.' })
    }, BOOT_MS)
    return () => clearTimeout(timer)
  }, [generation])

  useEffect(() => {
    const timer = setInterval(() => {
      if (!ready.current || document.hidden) return
      if (performance.now() - lastBeat.current > STALL_MS) {
        ready.current = false
        pushLog({
          level: 'error',
          text: 'The sandbox stopped responding (a loop that never yields?). Restarted it; auto-run is off.',
        })
        setSandbox({
          autoRun: false,
          error: { phase: 'runtime', message: 'Sandbox stopped responding and was restarted.' },
        })
        setGeneration((g) => g + 1)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="ws-sandbox">
      <iframe
        key={generation}
        ref={frame}
        title="App.tsx, running"
        src={SANDBOX_URL}
        sandbox="allow-scripts allow-pointer-lock"
        onLoad={() => {
          lastBeat.current = performance.now()
        }}
      />
      <div className="ws-sandbox__badge">
        <span className={`ws-dotlive ${error ? 'is-error' : ''}`} /> App.tsx{' '}
        {error ? 'has an error' : 'running'} ·
        <button type="button" className="ws-link" onClick={stopCode}>
          back to the workshop
        </button>
      </div>
    </div>
  )
}
