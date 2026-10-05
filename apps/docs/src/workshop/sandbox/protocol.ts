import type { WorldData } from '@runek/core'

export const CHANNEL = 'runek-sandbox'

export type LogLevel = 'log' | 'info' | 'warn' | 'error'

export type ToSandbox =
  | { kind: 'run'; code: string; world: WorldData }
  | { kind: 'world'; world: WorldData }

export type FromSandbox =
  | { kind: 'ready' }
  | { kind: 'heartbeat' }
  | { kind: 'ran'; registry: string[] }
  | {
      kind: 'error'
      phase: 'transpile' | 'runtime'
      message: string
      line?: number
      column?: number
    }
  | { kind: 'log'; level: LogLevel; text: string }

type Envelope<T> = T & { channel: typeof CHANNEL }

export const wrap = <T extends object>(message: T): Envelope<T> => ({
  ...message,
  channel: CHANNEL,
})

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export function isToSandbox(data: unknown): data is Envelope<ToSandbox> {
  if (!isObject(data) || data.channel !== CHANNEL) return false
  if (data.kind === 'run') return typeof data.code === 'string' && isObject(data.world)
  if (data.kind === 'world') return isObject(data.world)
  return false
}

const LEVELS = new Set(['log', 'info', 'warn', 'error'])

export function isFromSandbox(data: unknown): data is Envelope<FromSandbox> {
  if (!isObject(data) || data.channel !== CHANNEL) return false
  switch (data.kind) {
    case 'ready':
    case 'heartbeat':
      return true
    case 'ran':
      return Array.isArray(data.registry) && data.registry.every((n) => typeof n === 'string')
    case 'error':
      return (
        (data.phase === 'transpile' || data.phase === 'runtime') &&
        typeof data.message === 'string' &&
        (data.line === undefined || typeof data.line === 'number')
      )
    case 'log':
      return (
        typeof data.level === 'string' && LEVELS.has(data.level) && typeof data.text === 'string'
      )
    default:
      return false
  }
}

/** Where a runtime error points in the user's file, read from a stack that names it `App.tsx`. */
export function locateInStack(stack: string | undefined, offset: number) {
  const match = stack?.match(/App\.tsx:(\d+):(\d+)/)
  if (!match) return {}
  return { line: Math.max(1, Number(match[1]) - offset), column: Number(match[2]) }
}
