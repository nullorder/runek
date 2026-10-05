#!/usr/bin/env node
// Derive a JSON prop schema for every registry component from its TypeScript
// source: types, literal unions, tuples, nested specs, destructured defaults,
// palette fallbacks and JSDoc. The workshop bundles the result.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const here = dirname(fileURLToPath(import.meta.url))
const componentsDir = join(here, '../../../packages/components/src')
const registryIndex = join(here, '../../../registry/registry.json')
const outFile = join(here, '../src/workshop/schema/props.json')
const MAX_DEPTH = 4

const program = ts.createProgram([join(componentsDir, 'registry.ts')], {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  resolveJsonModule: true,
  allowImportingTsExtensions: true,
})
const checker = program.getTypeChecker()
const registryFile = program.getSourceFile(join(componentsDir, 'registry.ts'))

const docOf = (symbol) => ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim()

const isNumberLike = (t) => (t.flags & ts.TypeFlags.NumberLike) !== 0
const isStringLike = (t) => (t.flags & ts.TypeFlags.StringLike) !== 0
const isBooleanLiteral = (t) => (t.flags & ts.TypeFlags.BooleanLiteral) !== 0
const isUndefined = (t) => (t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void)) !== 0

const nameOfType = (t) => t.aliasSymbol?.name ?? t.getSymbol()?.name

function describe(type, ctx, depth, hint) {
  const text = checker.typeToString(type)
  if (/ReactNode|ReactElement|JSX\.Element/.test(text)) return { type: 'node' }
  if (type.getCallSignatures().length > 0) return { type: 'function' }

  if (type.isUnion()) {
    const parts = type.types.filter((t) => !isUndefined(t))
    if (parts.length === 1) return describe(parts[0], ctx, depth, hint)
    if (parts.every(isBooleanLiteral)) return { type: 'boolean' }
    if (parts.every((t) => t.isStringLiteral()))
      return { type: 'enum', options: parts.map((t) => t.value) }
    if (parts.every((t) => t.isNumberLiteral()))
      return { type: 'enum', options: parts.map((t) => t.value) }
    const literals = parts.filter((t) => t.isStringLiteral())
    const bools = parts.filter(isBooleanLiteral)
    const rest = parts.filter((t) => !t.isStringLiteral() && !isBooleanLiteral(t))
    if (rest.length === 1 && isStringLike(rest[0]) && !bools.length) {
      return { type: 'string', suggestions: literals.map((t) => t.value) }
    }
    const variants = []
    if (bools.length) variants.push({ type: 'boolean' })
    if (literals.length) variants.push({ type: 'enum', options: literals.map((t) => t.value) })
    for (const t of rest) variants.push(describe(t, ctx, depth, hint))
    return { type: 'union', variants }
  }

  if (isBooleanLiteral(type) || type.flags & ts.TypeFlags.Boolean) return { type: 'boolean' }
  if (type.isStringLiteral()) return { type: 'enum', options: [type.value] }
  if (type.isNumberLiteral()) return { type: 'enum', options: [type.value] }
  if (isNumberLike(type)) return { type: 'number' }
  if (isStringLike(type)) return { type: 'string' }

  if (checker.isTupleType(type)) {
    const items = checker.getTypeArguments(type).map((t) => describe(t, ctx, depth + 1, hint))
    if (items.length === 3 && items.every((i) => i.type === 'number')) return { type: 'vec3' }
    return { type: 'tuple', items }
  }
  if (checker.isArrayType(type)) {
    const [item] = checker.getTypeArguments(type)
    return { type: 'array', items: describe(item, ctx, depth + 1, hint) }
  }

  if (type.flags & ts.TypeFlags.Object && type.getProperties().length > 0) {
    if (depth >= MAX_DEPTH) return { type: 'unknown', text }
    const raw = nameOfType(type)
    const name = !raw || raw === '__type' || raw === '__object' ? `${ctx.component}.${hint}` : raw
    if (
      /^(Object3D|Group|Mesh|Vector3|Color|Euler|Quaternion|Ref|RefObject|MutableRefObject)$/.test(
        name,
      )
    ) {
      return { type: 'unknown', text }
    }
    if (!(name in ctx.defs)) {
      ctx.defs[name] = null
      ctx.defs[name] = { props: describeProps(type, ctx, depth + 1, null) }
    }
    return { type: 'object', ref: name }
  }
  return { type: 'unknown', text }
}

function describeProps(type, ctx, depth, defaults) {
  const props = {}
  for (const symbol of type.getProperties()) {
    const decl = symbol.valueDeclaration ?? symbol.declarations?.[0]
    if (!decl) continue
    const propType = checker.getTypeOfSymbolAtLocation(symbol, decl)
    const entry = describe(propType, ctx, depth, symbol.name)
    const doc = docOf(symbol)
    if (doc) entry.doc = doc
    if (symbol.flags & ts.SymbolFlags.Optional) entry.optional = true
    const slot = doc.match(/palette's `(\w+)` slot/)
    if (slot) entry.palette = slot[1]
    if (defaults && symbol.name in defaults) {
      const d = defaults[symbol.name]
      if (d.computed) entry.computed = d.text
      else entry.default = d.value
    }
    if (entry.type === 'string' && isColor(symbol.name, entry)) entry.type = 'color'
    // A text child (Sign) is authored as a plain string in world data.
    if (entry.type === 'node' && /\btext\b/i.test(doc))
      Object.assign(entry, { type: 'string', multiline: true })
    props[symbol.name] = entry
  }
  return props
}

function isColor(name, entry) {
  if (/(colou?r|tint|tone|accent|screen|outline)$/i.test(name) || entry.palette) return true
  return typeof entry.default === 'string' && /^#[0-9a-f]{3,8}$/i.test(entry.default)
}

const COMPUTED = Symbol('computed')

function evaluate(node, file) {
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  if (node.kind === ts.SyntaxKind.NullKeyword) return null
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node)
  ) {
    return evaluate(node.expression, file)
  }
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
    const v = evaluate(node.operand, file)
    return typeof v === 'number' ? -v : COMPUTED
  }
  if (ts.isPropertyAccessExpression(node)) {
    if (node.getText(file) === 'Math.PI') return Math.PI
    const owner = evaluate(node.expression, file)
    if (owner && typeof owner === 'object' && !Array.isArray(owner) && node.name.text in owner) {
      return owner[node.name.text]
    }
    return COMPUTED
  }
  if (ts.isBinaryExpression(node)) {
    const a = evaluate(node.left, file)
    const b = evaluate(node.right, file)
    if (typeof a !== 'number' || typeof b !== 'number') return COMPUTED
    switch (node.operatorToken.kind) {
      case ts.SyntaxKind.AsteriskToken:
        return a * b
      case ts.SyntaxKind.SlashToken:
        return a / b
      case ts.SyntaxKind.PlusToken:
        return a + b
      case ts.SyntaxKind.MinusToken:
        return a - b
      default:
        return COMPUTED
    }
  }
  if (ts.isArrayLiteralExpression(node)) {
    const out = node.elements.map((e) => evaluate(e, file))
    return out.includes(COMPUTED) ? COMPUTED : out
  }
  if (ts.isObjectLiteralExpression(node)) {
    const out = {}
    for (const p of node.properties) {
      if (!ts.isPropertyAssignment(p)) return COMPUTED
      const v = evaluate(p.initializer, file)
      if (v === COMPUTED) return COMPUTED
      out[p.name.getText(file)] = v
    }
    return out
  }
  if (ts.isIdentifier(node)) {
    let symbol = checker.getSymbolAtLocation(node)
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol)
    const decl = symbol?.valueDeclaration
    if (decl && ts.isVariableDeclaration(decl) && decl.initializer) {
      return evaluate(decl.initializer, decl.getSourceFile())
    }
  }
  return COMPUTED
}

function destructuredDefaults(fn) {
  const param = fn.parameters[0]
  const out = {}
  if (!param || !ts.isObjectBindingPattern(param.name)) return out
  const file = fn.getSourceFile()
  for (const el of param.name.elements) {
    if (!el.initializer) continue
    const key = (el.propertyName ?? el.name).getText(file)
    const value = evaluate(el.initializer, file)
    out[key] =
      value === COMPUTED ? { computed: true, text: el.initializer.getText(file) } : { value }
  }
  return out
}

function registryObject() {
  let found
  ts.forEachChild(registryFile, function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(registryFile) === 'registry') {
      found = node.initializer
    }
    ts.forEachChild(node, visit)
  })
  return found
}

const components = {}
for (const prop of registryObject().properties) {
  if (ts.isShorthandPropertyAssignment(prop)) {
    const name = prop.name.text
    let symbol = checker.getShorthandAssignmentValueSymbol(prop)
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol)
    const fn = symbol?.declarations?.find(ts.isFunctionDeclaration)
    if (!fn) continue
    const ctx = { component: name, defs: {} }
    const param = fn.parameters[0]
    const props = param
      ? describeProps(checker.getTypeAtLocation(param), ctx, 0, destructuredDefaults(fn))
      : {}
    const doc = docOf(symbol)
    components[name] = {
      kind: 'component',
      ...(doc ? { doc } : {}),
      props,
      ...(Object.keys(ctx.defs).length ? { defs: ctx.defs } : {}),
    }
  } else if (ts.isPropertyAssignment(prop)) {
    const name = prop.name.getText(registryFile)
    const json = prop.initializer.getText(registryFile).match(/^(\w+)/)?.[1]
    const imp = registryFile.statements.find(
      (s) => ts.isImportDeclaration(s) && s.importClause?.name?.text === json,
    )
    const def = JSON.parse(readFileSync(join(componentsDir, imp.moduleSpecifier.text), 'utf8'))
    components[name] = {
      kind: 'composite',
      ...(def.description ? { doc: def.description } : {}),
      props: {
        position: { type: 'vec3', optional: true },
        rotation: { type: 'vec3', optional: true },
        seed: {
          type: 'number',
          optional: true,
          doc: 'Cascades to the seeded parts of the arrangement.',
        },
      },
    }
  }
}

const index = JSON.parse(readFileSync(registryIndex, 'utf8')).items
for (const [title, entry] of Object.entries(components)) {
  const item = index.find((i) => i.title === title)
  if (item)
    Object.assign(entry, {
      name: item.name,
      category: item.category,
      description: item.description,
    })
}

mkdirSync(dirname(outFile), { recursive: true })
writeFileSync(outFile, `${JSON.stringify(components)}\n`)
console.log(`prop schema → ${Object.keys(components).length} components`)
