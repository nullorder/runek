export const HISTORY_LIMIT = 200
/** Edits with the same key this close together become one undo step (a slider drag). */
export const COALESCE_MS = 1200

export interface History<T> {
  past: T[]
  future: T[]
  lastKey: string | null
  lastAt: number
}

export const emptyHistory = <T>(): History<T> => ({
  past: [],
  future: [],
  lastKey: null,
  lastAt: 0,
})

/** Record `current` as undoable before it is replaced, unless this edit continues the last one. */
export function record<T>(
  history: History<T>,
  current: T,
  key: string | null,
  now: number,
): History<T> {
  if (key && key === history.lastKey && now - history.lastAt < COALESCE_MS) {
    return { ...history, future: [], lastAt: now }
  }
  const past = [...history.past, current]
  if (past.length > HISTORY_LIMIT) past.shift()
  return { past, future: [], lastKey: key, lastAt: now }
}

export function undo<T>(history: History<T>, current: T): { history: History<T>; value: T } | null {
  const prev = history.past.at(-1)
  if (prev === undefined) return null
  return {
    value: prev,
    history: {
      past: history.past.slice(0, -1),
      future: [current, ...history.future],
      lastKey: null,
      lastAt: 0,
    },
  }
}

export function redo<T>(history: History<T>, current: T): { history: History<T>; value: T } | null {
  const [next, ...future] = history.future
  if (next === undefined) return null
  return {
    value: next,
    history: { past: [...history.past, current], future, lastKey: null, lastAt: 0 },
  }
}
