import { describe, expect, it } from 'vitest'
import { createLoopGuard, GUARD, guardLoops } from './loop-guard'
import { CHANNEL, isFromSandbox, isToSandbox, locateInStack, wrap } from './protocol'
import { evaluate, FUNCTION_OFFSET, TranspileError, transpile } from './transpile'

describe('guardLoops', () => {
  it('guards braced for, while, do and for-await bodies', () => {
    const out = guardLoops(
      'for (let i = 0; i < f(1, (2)); i++) { a() }\nwhile (x) {}\ndo { y() } while (z)\nasync function q(){ for await (const v of s) { } }',
    )
    expect(out.match(new RegExp(`${GUARD}\\(\\d+\\)`, 'g'))).toHaveLength(4)
    expect(out).toContain(`do {${GUARD}(2);`)
  })

  it('ignores loop words in strings, templates, comments, regexes and members', () => {
    const src = [
      "const s = 'for (a) {'",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: a template literal is the test input
      'const t = `while (b) { ${"for (c) {"} }`',
      '// for (d) {',
      '/* while (e) { */',
      'const r = /for (f) {/g',
      'obj.for(1); obj.while(2)',
    ].join('\n')
    expect(guardLoops(src)).toBe(src)
  })

  it('leaves brace-less loops and division alone', () => {
    const src = 'for (;;) x++\nconst half = a / 2 / b'
    expect(guardLoops(src)).toBe(src)
  })
})

describe('createLoopGuard', () => {
  it('throws when one run outlasts the limit and resets between tasks', async () => {
    let t = 0
    const guard = createLoopGuard(100, () => t)
    guard(0)
    t = 50
    expect(() => guard(0)).not.toThrow()
    t = 200
    expect(() => guard(0)).toThrow(/infinite loop/)
    await Promise.resolve()
    t = 1000
    expect(() => guard(0)).not.toThrow()
  })
})

describe('transpile + evaluate', () => {
  it('runs TSX against an allowlisted module table', () => {
    const { code } = transpile(
      "import world from './world.json'\nconst n: number = world.nodes.length\nexport default n",
    )
    const exports = evaluate(
      code,
      { './world.json': { __esModule: true, default: { nodes: [1, 2] } } },
      () => {},
    )
    expect(exports.default).toBe(2)
  })

  it('rejects modules outside the allowlist', () => {
    const { code } = transpile("import fs from 'node:fs'\nexport default fs")
    expect(() => evaluate(code, {}, () => {})).toThrow(/Cannot import "node:fs"/)
  })

  it('stops a runaway loop', () => {
    const { code } = transpile('let i = 0\nwhile (true) { i++ }')
    expect(() => evaluate(code, {}, createLoopGuard(20))).toThrow(/infinite loop/)
  })

  it('reports syntax errors with a position', () => {
    try {
      transpile('const a = 1\nconst = 2')
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(TranspileError)
      expect((error as TranspileError).line).toBe(2)
    }
  })

  it('keeps line numbers, so stacks map back to the source', () => {
    const { code } = transpile("const a: string = 'x'\n\nthrow new Error('boom')")
    try {
      evaluate(code, {}, () => {})
    } catch (error) {
      expect(locateInStack((error as Error).stack, FUNCTION_OFFSET).line).toBe(3)
    }
  })
})

describe('protocol', () => {
  it('accepts well-formed messages on the channel only', () => {
    expect(isToSandbox(wrap({ kind: 'run', code: 'x', world: { version: 1, nodes: [] } }))).toBe(
      true,
    )
    expect(isToSandbox({ kind: 'run', code: 'x', world: {} })).toBe(false)
    expect(isFromSandbox(wrap({ kind: 'ran', registry: ['Beacon'] }))).toBe(true)
    expect(isFromSandbox({ channel: CHANNEL, kind: 'ran', registry: [1] })).toBe(false)
    expect(isFromSandbox(wrap({ kind: 'log', level: 'debug', text: '' }))).toBe(false)
    expect(isFromSandbox(wrap({ kind: 'error', phase: 'runtime', message: 'x', line: 3 }))).toBe(
      true,
    )
  })
})
