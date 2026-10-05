import * as drei from '@react-three/drei'
import * as fiber from '@react-three/fiber'
import * as rapier from '@react-three/rapier'
import * as components from '@runek/components'
import type { WorldData } from '@runek/core'
import * as core from '@runek/core'
import * as React from 'react'
import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import * as THREE from 'three'
import { createLoopGuard } from './loop-guard'
import { type FromSandbox, isToSandbox, type LogLevel, locateInStack, wrap } from './protocol'
import { evaluate, FUNCTION_OFFSET, TranspileError, transpile } from './transpile'

const asModule = (ns: object) => ({
  __esModule: true,
  ...ns,
  default: (ns as { default?: unknown }).default ?? ns,
})

const worldModule = { __esModule: true, default: { version: 1, nodes: [] } as WorldData }

const MODULES = {
  react: asModule(React),
  'react/jsx-runtime': asModule(jsxRuntime),
  three: asModule(THREE),
  '@react-three/fiber': asModule(fiber),
  '@react-three/drei': asModule(drei),
  '@react-three/rapier': asModule(rapier),
  '@runek/core': asModule(core),
  '@runek/components': asModule(components),
  './world.json': worldModule,
}

const post = (message: FromSandbox) => window.parent.postMessage(wrap(message), '*')

const reportError = (error: unknown) => {
  const err = error instanceof Error ? error : new Error(String(error))
  post({
    kind: 'error',
    phase: 'runtime',
    message: err.message,
    ...locateInStack(err.stack, FUNCTION_OFFSET),
  })
}

const format = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.message
  try {
    return JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? `${v}n` : v)) ?? String(value)
  } catch {
    return String(value)
  }
}

function captureConsole() {
  for (const level of ['log', 'info', 'warn', 'error'] as LogLevel[]) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      original(...args)
      post({ kind: 'log', level, text: args.map(format).join(' ').slice(0, 2000) })
    }
  }
}

class Boundary extends Component<{ children: ReactNode; version: number }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    reportError(error)
  }
  componentDidUpdate(prev: { version: number }) {
    if (prev.version !== this.props.version && this.state.failed) this.setState({ failed: false })
  }
  render() {
    return this.state.failed ? <Failed /> : this.props.children
  }
}

function Failed() {
  return (
    <div className="sandbox-failed">
      <span>App.tsx threw. See the console panel for details.</span>
    </div>
  )
}

/** The iframe side of the live App.tsx: evaluates code it is sent, re-renders on world updates. */
export default function Sandbox() {
  const [app, setApp] = useState<{ Root: React.ComponentType; version: number } | null>(null)
  const [, setWorldVersion] = useState(0)

  useEffect(() => {
    captureConsole()
    const onError = (event: ErrorEvent) => reportError(event.error ?? event.message)
    const onRejection = (event: PromiseRejectionEvent) => reportError(event.reason)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || !isToSandbox(event.data)) return
      const message = event.data
      worldModule.default = message.world
      if (message.kind === 'world') {
        setWorldVersion((v) => v + 1)
        return
      }
      try {
        const { code } = transpile(message.code)
        const exports = evaluate(code, MODULES, createLoopGuard())
        const Root = exports.default
        if (typeof Root !== 'function') {
          throw new Error(
            'App.tsx needs a default export: a React component, e.g. `export default function App() {…}`.',
          )
        }
        const custom = exports.registry
        post({
          kind: 'ran',
          registry:
            custom && typeof custom === 'object'
              ? Object.keys(custom).filter((name) => !(name in components.registry))
              : [],
        })
        setApp((prev) => ({ Root: Root as React.ComponentType, version: (prev?.version ?? 0) + 1 }))
      } catch (error) {
        if (error instanceof TranspileError) {
          post({
            kind: 'error',
            phase: 'transpile',
            message: error.message,
            line: error.line,
            column: error.column,
          })
        } else reportError(error)
      }
    }
    window.addEventListener('message', onMessage)
    const heartbeat = setInterval(() => post({ kind: 'heartbeat' }), 500)
    post({ kind: 'ready' })
    return () => {
      window.removeEventListener('message', onMessage)
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      clearInterval(heartbeat)
    }
  }, [])

  if (!app) return null
  const { Root, version } = app
  return (
    <Boundary version={version}>
      <Root key={version} />
    </Boundary>
  )
}
