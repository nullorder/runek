import { transform } from 'sucrase'
import { GUARD, guardLoops } from './loop-guard'

/** Lines `new Function` adds above the body (`function anonymous(…\n) {\n`). */
export const FUNCTION_OFFSET = 2

export interface Transpiled {
  code: string
}

export class TranspileError extends Error {
  constructor(
    message: string,
    readonly line?: number,
    readonly column?: number,
  ) {
    super(message)
  }
}

/** TSX → CommonJS the sandbox can evaluate. Sucrase keeps line numbers, so stack lines map
 *  straight back to the editor. */
export function transpile(source: string): Transpiled {
  try {
    const { code } = transform(source, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'automatic',
      production: true,
      filePath: 'App.tsx',
    })
    return { code: `${guardLoops(code)}\n//# sourceURL=App.tsx` }
  } catch (error) {
    const err = error as Error & { loc?: { line: number; column: number } }
    const message = err.message.replace(/\s*\(\d+:\d+\)$/, '')
    throw new TranspileError(message, err.loc?.line, err.loc ? err.loc.column + 1 : undefined)
  }
}

export type ModuleTable = Record<string, unknown>

/** Evaluate transpiled code against an allowlisted module table; returns its exports. */
export function evaluate(
  code: string,
  modules: ModuleTable,
  guard: (id: number) => void,
): Record<string, unknown> {
  const require = (name: string) => {
    if (name in modules) return modules[name]
    throw new Error(
      `Cannot import "${name}" in the workshop. Available: ${Object.keys(modules).join(', ')}.`,
    )
  }
  const module = { exports: {} as Record<string, unknown> }
  new Function('require', 'module', 'exports', GUARD, code)(require, module, module.exports, guard)
  return module.exports
}
