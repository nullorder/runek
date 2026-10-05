// Insert a guard call at the top of every braced loop body in compiled JavaScript, so a
// runaway loop throws instead of freezing the sandbox. A small scanner, not a parser: it
// skips strings, template literals, comments and regex literals, and leaves brace-less
// loops alone (the host's heartbeat still catches those).

const WORD = /[A-Za-z0-9_$]/
const REGEX_AFTER =
  /[(,=:[!&|?{};+\-*%<>~^]$|(?:^|[^A-Za-z0-9_$])(?:return|typeof|case|do|else|in|of|new|delete|void|throw|yield|await)$/

export const GUARD = '__runekLoop'

export function guardLoops(source: string): string {
  let out = ''
  let i = 0
  let id = 0
  let lastSignificant = ''
  const pendingBodies: number[] = []

  const skipString = (from: number, quote: string) => {
    let j = from + 1
    while (j < source.length && source[j] !== quote) {
      if (source[j] === '\\') j++
      j++
    }
    return j + 1
  }

  const skipTemplate = (from: number): number => {
    let j = from + 1
    while (j < source.length && source[j] !== '`') {
      if (source[j] === '\\') j += 2
      else if (source[j] === '$' && source[j + 1] === '{') {
        let depth = 1
        j += 2
        while (j < source.length && depth > 0) {
          const c = source[j]
          if (c === '`') j = skipTemplate(j)
          else if (c === '"' || c === "'") j = skipString(j, c)
          else {
            if (c === '{') depth++
            else if (c === '}') depth--
            j++
          }
        }
      } else j++
    }
    return j + 1
  }

  const skipRegex = (from: number) => {
    let j = from + 1
    let inClass = false
    while (j < source.length) {
      const c = source[j]
      if (c === '\\') j++
      else if (c === '[') inClass = true
      else if (c === ']') inClass = false
      else if (c === '/' && !inClass) break
      else if (c === '\n') return from + 1
      j++
    }
    j++
    while (j < source.length && /[a-z]/.test(source[j])) j++
    return j
  }

  /** Index just past the `)` matching the `(` at `start`, skipping nested literals. */
  const matchParen = (start: number) => {
    let depth = 0
    let j = start
    while (j < source.length) {
      const c = source[j]
      if (c === '"' || c === "'") j = skipString(j, c)
      else if (c === '`') j = skipTemplate(j)
      else {
        if (c === '(') depth++
        else if (c === ')' && --depth === 0) return j + 1
        j++
      }
    }
    return -1
  }

  const nextNonSpace = (from: number) => {
    let j = from
    while (j < source.length && /\s/.test(source[j])) j++
    return j
  }

  while (i < source.length) {
    const c = source[i]
    const next = source[i + 1]

    if (c === '/' && next === '/') {
      const end = source.indexOf('\n', i)
      const stop = end === -1 ? source.length : end
      out += source.slice(i, stop)
      i = stop
      continue
    }
    if (c === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2)
      const stop = end === -1 ? source.length : end + 2
      out += source.slice(i, stop)
      i = stop
      continue
    }
    if (c === '"' || c === "'" || c === '`' || (c === '/' && REGEX_AFTER.test(lastSignificant))) {
      const stop = c === '`' ? skipTemplate(i) : c === '/' ? skipRegex(i) : skipString(i, c)
      out += source.slice(i, stop)
      lastSignificant = 'x'
      i = stop
      continue
    }

    if (WORD.test(c) && (i === 0 || !WORD.test(source[i - 1]))) {
      let j = i
      while (j < source.length && WORD.test(source[j])) j++
      const word = source.slice(i, j)
      const prev = source.slice(0, i).trimEnd().at(-1)
      out += word
      i = j
      lastSignificant = word
      if (prev === '.') continue

      if (word === 'do') {
        const brace = nextNonSpace(i)
        if (source[brace] === '{') pendingBodies.push(brace)
      } else if (word === 'for' || word === 'while') {
        let paren = nextNonSpace(i)
        if (source.startsWith('await', paren)) paren = nextNonSpace(paren + 5)
        if (source[paren] === '(') {
          const close = matchParen(paren)
          if (close !== -1) {
            const brace = nextNonSpace(close)
            if (source[brace] === '{') pendingBodies.push(brace)
          }
        }
      }
      continue
    }

    out += c
    if (c === '{' && pendingBodies[0] === i) {
      pendingBodies.shift()
      out += `${GUARD}(${id++});`
    }
    if (!/\s/.test(c)) lastSignificant += c
    if (lastSignificant.length > 16) lastSignificant = lastSignificant.slice(-16)
    i++
  }
  return out
}

/** The runtime half: a loop that keeps going within one task for longer than `limitMs` throws. */
export function createLoopGuard(limitMs = 2000, now = () => performance.now()) {
  const active = new Map<number, number>()
  return (id: number) => {
    const t = now()
    const start = active.get(id)
    if (start === undefined) {
      active.set(id, t)
      queueMicrotask(() => active.delete(id))
      return
    }
    if (t - start > limitMs) {
      active.delete(id)
      throw new Error(
        `A loop ran for over ${limitMs / 1000}s without yielding and was stopped (an infinite loop?).`,
      )
    }
  }
}
