import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { fetchPropSchema } from './lib.ts'
import {
  buildReport,
  customTypes,
  exitCode,
  loadValidator,
  parseWorldText,
  pathString,
  syntaxErrorAt,
} from './validate.ts'

const components = fileURLToPath(new URL('../../components/src', import.meta.url))
const localRegistry = fileURLToPath(new URL('../../../registry', import.meta.url))

describe('pathString', () => {
  it('reads like the JSON it points at', () => {
    expect(pathString(['nodes', 3, 'props', 'colr'])).toBe('nodes[3].props.colr')
    expect(pathString(['palette', 'wood-dark'])).toBe('palette["wood-dark"]')
    expect(pathString([])).toBe('(world)')
  })
})

describe('parseWorldText', () => {
  it('reports a syntax error with its line and column', () => {
    const { issue } = parseWorldText('{ "version": 1,\n  "nodes": [ { "type": "Bench" } ,]\n}')
    expect(issue?.severity).toBe('error')
    expect(issue?.message).toMatch(/^Invalid JSON: .*\(line 2, column 35\)$/)
  })

  it('locates errors V8 reports without a position', () => {
    expect(syntaxErrorAt('{"a": [1, 2,]}')).toBe(12)
    expect(syntaxErrorAt('{"a": 1,}')).toBe(8)
    expect(syntaxErrorAt('{"a": "x\\"y"}')).toBe(-1)
    expect(syntaxErrorAt('{"a": 1} x')).toBe(9)
  })
})

describe('validate', () => {
  it('flags typos with suggestions and accepts your own components', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'runek-validate-'))
    mkdirSync(join(dir, 'nested'))
    writeFileSync(join(dir, 'nested', 'MyThing.tsx'), 'export function MyThing() {}')
    writeFileSync(join(dir, 'Bench.tsx'), 'export function Bench() {}')

    const [validateWorld, schema] = await Promise.all([
      loadValidator([components]),
      fetchPropSchema(localRegistry),
    ])
    expect(customTypes(dir, schema)).toEqual(['MyThing'])

    const report = buildReport(
      validateWorld(
        {
          version: 1,
          avatar: 'fourth',
          nodes: [
            { type: 'Bookshelf', props: { seed: '42', colr: '#fff' } },
            { type: 'Benchh' },
            { type: 'MyThing', props: { anything: 1 } },
          ],
        },
        schema,
        customTypes(dir, schema),
      ),
    )
    expect(report).toMatchObject({ valid: false, errors: 1, warnings: 3 })
    expect(report.issues.map((i) => [i.pathString, i.severity])).toEqual([
      ['avatar', 'error'],
      ['nodes[0].props.seed', 'warning'],
      ['nodes[0].props.colr', 'warning'],
      ['nodes[1].type', 'warning'],
    ])
    expect(report.issues[2].message).toContain('Did you mean "color"?')
    expect(report.issues[3].message).toContain('Did you mean "Bench"?')
  })

  it('fails on errors, and on warnings only when strict', () => {
    const warning = buildReport([{ path: ['nodes', 0], severity: 'warning', message: 'w' }])
    expect(exitCode(warning, false)).toBe(0)
    expect(exitCode(warning, true)).toBe(1)
    expect(exitCode(buildReport([{ path: [], severity: 'error', message: 'e' }]), false)).toBe(1)
    expect(buildReport([])).toEqual({ valid: true, errors: 0, warnings: 0, issues: [] })
  })
})
