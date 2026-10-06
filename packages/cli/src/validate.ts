// `runek validate`: check a world file against the registry's prop schema with core's
// `validateWorld`, loaded from the user's project like check-world's ground math.
import { basename } from 'node:path'
import { type CoreData, listFiles, loadCoreData } from './check.ts'
import type { SchemaMap } from './lib.ts'

export type JsonPath = (string | number)[]

export type ValidationIssue = {
  path: JsonPath
  message: string
  severity: 'error' | 'warning'
}

type ValidateWorld = (data: unknown, schema: SchemaMap, custom?: string[]) => ValidationIssue[]

export type ValidationReport = {
  valid: boolean
  errors: number
  warnings: number
  issues: (ValidationIssue & { pathString: string })[]
}

export async function loadValidator(bases: string[]): Promise<ValidateWorld> {
  const core = (await loadCoreData(bases, 'validate')) as CoreData & {
    validateWorld?: ValidateWorld
  }
  if (typeof core.validateWorld !== 'function') {
    throw new Error(
      'validate needs a newer @runek/core (one that exports validateWorld); update @runek/core to 0.14 or newer',
    )
  }
  return core.validateWorld
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

/** `["nodes", 3, "props", "colr"]` → `nodes[3].props.colr`. */
export function pathString(path: JsonPath): string {
  const text = path.reduce<string>((out, step) => {
    if (typeof step === 'number') return `${out}[${step}]`
    if (!IDENTIFIER.test(step)) return `${out}[${JSON.stringify(step)}]`
    return out ? `${out}.${step}` : step
  }, '')
  return text || '(world)'
}

/** Component types that have source in the install dir but no schema entry: your own. */
export function customTypes(dir: string, schema: SchemaMap): string[] {
  const types = new Set<string>()
  for (const file of listFiles(dir, /^[A-Z]\w*\.tsx?$/)) {
    const type = basename(file).replace(/\.tsx?$/, '')
    if (!(type in schema)) types.add(type)
  }
  return [...types].sort()
}

/** Parse world JSON, turning a syntax error into an issue with its line and column. */
export function parseWorldText(
  text: string,
): { data: unknown; issue?: undefined } | { data?: undefined; issue: ValidationIssue } {
  try {
    return { data: JSON.parse(text) }
  } catch (err) {
    const reason = (err as Error).message.split(/, "|, \.\.\."| in JSON|\n/)[0]
    const at = syntaxErrorAt(text)
    const where = at < 0 ? '' : ` (${lineColumn(text, at)})`
    return { issue: { path: [], severity: 'error', message: `Invalid JSON: ${reason}${where}` } }
  }
}

function lineColumn(text: string, position: number): string {
  const before = text.slice(0, position).split('\n')
  return `line ${before.length}, column ${before[before.length - 1].length + 1}`
}

/** Offset of the first JSON syntax error, or -1. V8 only sometimes reports a position. */
export function syntaxErrorAt(text: string): number {
  let i = 0
  const fail = (): never => {
    throw i
  }
  const ws = () => {
    while (i < text.length && ' \t\n\r'.includes(text[i])) i++
  }
  const string = () => {
    i++
    while (i < text.length && text[i] !== '"') {
      if (text[i] < ' ') fail()
      i += text[i] === '\\' ? 2 : 1
    }
    if (i >= text.length) fail()
    i++
  }
  const value = (): void => {
    ws()
    const open = text[i]
    if (open === '{' || open === '[') {
      const close = open === '{' ? '}' : ']'
      i++
      ws()
      if (text[i] === close) {
        i++
        return
      }
      for (;;) {
        if (open === '{') {
          ws()
          if (text[i] !== '"') fail()
          string()
          ws()
          if (text[i] !== ':') fail()
          i++
        }
        value()
        ws()
        if (text[i] !== ',' && text[i] !== close) fail()
        if (text[i++] === close) return
      }
    }
    if (open === '"') {
      string()
      return
    }
    const literal = text.slice(i).match(/^(true|false|null|-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?)/)
    if (!literal) fail()
    i += (literal as RegExpMatchArray)[0].length
  }
  try {
    value()
    ws()
    if (i < text.length) fail()
    return -1
  } catch (at) {
    return at as number
  }
}

export function buildReport(issues: ValidationIssue[]): ValidationReport {
  const errors = issues.filter((i) => i.severity === 'error').length
  return {
    valid: errors === 0,
    errors,
    warnings: issues.length - errors,
    issues: issues.map(({ path, severity, message }) => ({
      path,
      pathString: pathString(path),
      severity,
      message,
    })),
  }
}

/** Errors always fail; warnings fail only under `--strict`. */
export function exitCode(report: ValidationReport, strict: boolean): number {
  return report.errors > 0 || (strict && report.warnings > 0) ? 1 : 0
}
