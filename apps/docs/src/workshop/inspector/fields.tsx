import { type JsonValue, matches } from '@runek/core/data'
import { useEffect, useId, useRef, useState } from 'react'
import {
  controlKind,
  emptyValue,
  labelFor,
  type NumberRange,
  numberRange,
  variantOf,
} from '../schema/controls'
import type { ObjectDef, PropSchema, PropType } from '../schema/types'

export type Change = (value: JsonValue | undefined) => void

export interface FieldContext {
  component: string
  defs?: Record<string, ObjectDef>
  palette: Record<string, string>
  /** Prefix for history coalescing keys, so one drag is one undo step. */
  scope: string
}

const isEqual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const fmt = (n: number, step: number) => {
  const decimals = Math.min(4, Math.max(0, -Math.floor(Math.log10(step || 1))))
  return Number(n.toFixed(decimals)).toString()
}

/** A label you can drag horizontally to scrub a number. */
function Scrub({
  children,
  value,
  step,
  onChange,
  title,
}: {
  children: React.ReactNode
  value: number
  step: number
  onChange: (n: number) => void
  title?: string
}) {
  const down = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return
    const el = event.currentTarget
    el.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const start = value
    let moved = false
    const move = (e: PointerEvent) => {
      const dx = e.clientX - startX
      if (Math.abs(dx) > 2) moved = true
      if (moved) {
        const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
        onChange(Number((start + Math.round(dx / 2) * step * mult).toFixed(6)))
      }
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
  }
  return (
    <span
      className="ws-scrub"
      onPointerDown={down}
      title={title ?? 'Drag to scrub (⇧ ×10, ⌥ ×0.1)'}
    >
      {children}
    </span>
  )
}

/** A number input that keeps its own text while typing and commits parsed numbers. */
export function NumberInput({
  value,
  onChange,
  step = 0.1,
  min,
  max,
  integer,
  label,
}: {
  value: number | undefined
  onChange: (n: number) => void
  step?: number
  min?: number
  max?: number
  integer?: boolean
  label?: string
}) {
  const [text, setText] = useState(value === undefined ? '' : fmt(value, step))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setText(value === undefined ? '' : fmt(value, step))
  }, [value, step])
  const commit = (raw: string) => {
    const n = Number(raw)
    if (raw.trim() === '' || !Number.isFinite(n)) return
    onChange(integer ? Math.round(n) : n)
  }
  const input = (
    <input
      className="ws-num"
      type="text"
      inputMode="decimal"
      value={text}
      placeholder="–"
      aria-label={label}
      onFocus={() => {
        focused.current = true
      }}
      onBlur={(e) => {
        focused.current = false
        commit(e.target.value)
        setText(value === undefined ? '' : fmt(value, step))
      }}
      onChange={(e) => {
        setText(e.target.value)
        commit(e.target.value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1
          const next = (value ?? 0) + (e.key === 'ArrowUp' ? 1 : -1) * step * mult
          const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next))
          onChange(integer ? Math.round(clamped) : Number(clamped.toFixed(6)))
        } else if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
  return input
}

function NumberField({
  value,
  onChange,
  range,
}: {
  value: number | undefined
  onChange: (n: number) => void
  range: NumberRange
}) {
  const shown = value ?? range.min
  return (
    <div className="ws-row-number">
      <input
        type="range"
        className="ws-slider"
        min={Math.min(range.min, shown)}
        max={Math.max(range.max, shown)}
        step={range.step}
        value={shown}
        onChange={(e) =>
          onChange(range.integer ? Math.round(Number(e.target.value)) : Number(e.target.value))
        }
      />
      <NumberInput value={value} onChange={onChange} step={range.step} integer={range.integer} />
    </div>
  )
}

const HEX = /^#[0-9a-f]{6}$/i

const toHex = (color: string | undefined) => {
  if (!color) return '#000000'
  if (HEX.test(color)) return color
  if (/^#[0-9a-f]{3}$/i.test(color)) return `#${[...color.slice(1)].map((c) => c + c).join('')}`
  return '#000000'
}

function ColorField({
  value,
  onChange,
  fallback,
  slot,
}: {
  value: string | undefined
  onChange: Change
  fallback?: string
  slot?: string
}) {
  const [text, setText] = useState(value ?? '')
  useEffect(() => setText(value ?? ''), [value])
  const shown = value ?? fallback
  return (
    <div className="ws-color">
      <label
        className="ws-swatch"
        style={{ background: shown ?? 'transparent' }}
        title={
          value === undefined && slot
            ? `From the world palette (${slot}). Pick to override.`
            : 'Pick a color'
        }
      >
        <input type="color" value={toHex(shown)} onChange={(e) => onChange(e.target.value)} />
      </label>
      <input
        className="ws-text ws-text--mono"
        value={text}
        placeholder={slot ? slot : fallback ? 'seeded' : '#rrggbb'}
        onChange={(e) => {
          setText(e.target.value)
          if (
            /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(e.target.value) ||
            /^[a-z]+$/i.test(e.target.value)
          )
            onChange(e.target.value)
        }}
        onBlur={() => setText(value ?? '')}
      />
    </div>
  )
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: (string | number)[]
  value: JsonValue | undefined
  onChange: Change
}) {
  return (
    <div className="ws-seg">
      {options.map((option) => (
        <button
          key={String(option)}
          type="button"
          aria-pressed={value === option}
          className={value === option ? 'is-on' : ''}
          onClick={() => onChange(option)}
        >
          {String(option)}
        </button>
      ))}
    </div>
  )
}

function Select({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: (string | number)[]
  value: JsonValue | undefined
  onChange: Change
  placeholder?: string
}) {
  return (
    <select
      className="ws-select"
      value={value === undefined ? '' : String(value)}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') return onChange(undefined)
        const option = options.find((o) => String(o) === raw)
        onChange(option)
      }}
    >
      <option value="">{placeholder ?? 'default'}</option>
      {options.map((option) => (
        <option key={String(option)} value={String(option)}>
          {String(option)}
        </option>
      ))}
    </select>
  )
}

function Toggle({
  value,
  onChange,
  fallback,
}: {
  value: boolean | undefined
  onChange: Change
  fallback?: boolean
}) {
  const on = value ?? fallback ?? false
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`ws-toggle ${on ? 'is-on' : ''} ${value === undefined ? 'is-default' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span />
    </button>
  )
}

export function Vec3Input({
  value,
  onChange,
  step = 0.1,
  labels = ['x', 'y', 'z'],
  degrees = false,
}: {
  value: [number, number, number] | undefined
  onChange: (v: [number, number, number]) => void
  step?: number
  labels?: string[]
  degrees?: boolean
}) {
  const v = value ?? [0, 0, 0]
  const shown = degrees ? v.map((r) => (r * 180) / Math.PI) : v
  const set = (i: number, n: number) => {
    const next = [...v] as [number, number, number]
    next[i] = degrees ? Number(((n * Math.PI) / 180).toFixed(5)) : n
    onChange(next)
  }
  return (
    <div className="ws-vec">
      {shown.map((n, i) => (
        <span key={labels[i]} className={`ws-vec__axis ws-axis-${i}`}>
          <Scrub value={n} step={step} onChange={(x) => set(i, x)}>
            {labels[i]}
          </Scrub>
          <NumberInput value={n} step={step} onChange={(x) => set(i, x)} label={labels[i]} />
        </span>
      ))}
    </div>
  )
}

function TupleInput({
  value,
  size,
  onChange,
  lockable,
}: {
  value: number[] | undefined
  size: number
  onChange: Change
  lockable?: boolean
}) {
  const [locked, setLocked] = useState(false)
  const v = value ?? Array.from({ length: size }, () => 0)
  const set = (i: number, n: number) => {
    const next = [...v]
    if (locked && v[i]) {
      const k = n / v[i]
      for (let j = 0; j < next.length; j++) next[j] = Number((v[j] * k).toFixed(4))
    }
    next[i] = n
    onChange(next)
  }
  return (
    <div className="ws-vec">
      {v.map((n, i) => (
        <span key={`${i}-${size}`} className="ws-vec__axis">
          <Scrub value={n} step={0.1} onChange={(x) => set(i, x)}>
            {size === 2 ? ['w', 'd'][i] : i}
          </Scrub>
          <NumberInput value={n} onChange={(x) => set(i, x)} />
        </span>
      ))}
      {lockable && (
        <button
          type="button"
          className={`ws-icon ${locked ? 'is-on' : ''}`}
          title="Lock aspect"
          onClick={() => setLocked(!locked)}
        >
          {locked ? '🔒' : '🔓'}
        </button>
      )}
    </div>
  )
}

function JsonInput({
  value,
  onChange,
  rows = 4,
}: {
  value: JsonValue | undefined
  onChange: Change
  rows?: number
}) {
  const format = (v: JsonValue | undefined) => (v === undefined ? '' : JSON.stringify(v, null, 1))
  const [text, setText] = useState(format(value))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setText(format(value)), [value])
  return (
    <div className="ws-json">
      <textarea
        className="ws-text ws-text--mono"
        rows={rows}
        spellCheck={false}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (e.target.value.trim() === '') {
            setError(null)
            return
          }
          try {
            JSON.parse(e.target.value)
            setError(null)
          } catch (err) {
            setError((err as Error).message)
          }
        }}
        onBlur={() => {
          if (text.trim() === '') return onChange(undefined)
          try {
            onChange(JSON.parse(text))
          } catch {}
        }}
      />
      {error && <span className="ws-field__error">{error}</span>}
    </div>
  )
}

/** The editor for one value of a schema type (used for props, list rows and object fields). */
export function ValueEditor({
  name,
  type,
  schema,
  value,
  onChange,
  ctx,
}: {
  name: string
  type: PropType
  schema?: PropSchema
  value: JsonValue | undefined
  onChange: Change
  ctx: FieldContext
}) {
  const kind = controlKind(type)
  const fallback = schema?.default
  switch (kind) {
    case 'number':
      return (
        <NumberField
          value={typeof value === 'number' ? value : (fallback as number | undefined)}
          onChange={onChange}
          range={numberRange(ctx.component, name, schema ?? (type as PropSchema))}
        />
      )
    case 'color':
      return (
        <ColorField
          value={typeof value === 'string' ? value : undefined}
          onChange={onChange}
          fallback={
            typeof fallback === 'string'
              ? fallback
              : schema?.palette
                ? ctx.palette[schema.palette]
                : undefined
          }
          slot={schema?.palette}
        />
      )
    case 'boolean':
      return (
        <Toggle
          value={typeof value === 'boolean' ? value : undefined}
          onChange={onChange}
          fallback={fallback as boolean | undefined}
        />
      )
    case 'segmented':
      return (
        <Segmented
          options={(type as { options: (string | number)[] }).options}
          value={value ?? fallback}
          onChange={onChange}
        />
      )
    case 'select':
      return (
        <Select
          options={(type as { options: (string | number)[] }).options}
          value={value}
          onChange={onChange}
          placeholder={fallback !== undefined ? `default (${String(fallback)})` : 'default'}
        />
      )
    case 'vec3':
      return <Vec3Input value={value as [number, number, number] | undefined} onChange={onChange} />
    case 'pair':
    case 'tuple':
      return (
        <TupleInput
          value={(value ?? fallback) as number[] | undefined}
          size={(type as { items: PropType[] }).items.length}
          onChange={onChange}
          lockable={kind === 'pair'}
        />
      )
    case 'string':
    case 'text':
      return (
        <StringInput
          value={value as string | undefined}
          onChange={onChange}
          multiline={kind === 'text'}
          suggestions={(type as { suggestions?: string[] }).suggestions}
          fallback={fallback as string | undefined}
        />
      )
    case 'object':
      return (
        <ObjectEditor
          refName={(type as { ref: string }).ref}
          value={value}
          onChange={onChange}
          ctx={ctx}
        />
      )
    case 'list':
      return (
        <ListEditor
          name={name}
          items={(type as { items: PropType }).items}
          value={value}
          onChange={onChange}
          ctx={ctx}
        />
      )
    case 'union':
      return (
        <UnionEditor
          name={name}
          type={type as Extract<PropType, { type: 'union' }>}
          schema={schema}
          value={value}
          onChange={onChange}
          ctx={ctx}
        />
      )
    default:
      return <JsonInput value={value} onChange={onChange} />
  }
}

function StringInput({
  value,
  onChange,
  multiline,
  suggestions,
  fallback,
}: {
  value: string | undefined
  onChange: Change
  multiline?: boolean
  suggestions?: string[]
  fallback?: string
}) {
  const list = useId()
  if (multiline) {
    return (
      <textarea
        className="ws-text"
        rows={2}
        value={value ?? ''}
        placeholder={fallback}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <>
      <input
        className="ws-text"
        value={value ?? ''}
        placeholder={fallback ?? ''}
        list={suggestions?.length ? list : undefined}
        onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
      />
      {suggestions?.length ? (
        <datalist id={list}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </>
  )
}

function ObjectEditor({
  refName,
  value,
  onChange,
  ctx,
}: {
  refName: string
  value: JsonValue | undefined
  onChange: Change
  ctx: FieldContext
}) {
  const def = ctx.defs?.[refName]
  if (!def) return <JsonInput value={value} onChange={onChange} />
  const obj = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<
    string,
    JsonValue
  >
  return (
    <div className="ws-sub">
      {Object.entries(def.props)
        .filter(([, prop]) => prop.type !== 'function' && prop.type !== 'node')
        .map(([key, prop]) => (
          <Field
            key={key}
            name={key}
            schema={prop}
            value={obj[key]}
            ctx={{ ...ctx, scope: `${ctx.scope}.${key}` }}
            onChange={(v) => {
              const next = { ...obj }
              if (v === undefined) delete next[key]
              else next[key] = v
              onChange(Object.keys(next).length ? next : undefined)
            }}
          />
        ))}
    </div>
  )
}

function ListEditor({
  name,
  items,
  value,
  onChange,
  ctx,
}: {
  name: string
  items: PropType
  value: JsonValue | undefined
  onChange: Change
  ctx: FieldContext
}) {
  const list = Array.isArray(value) ? value : []
  const set = (next: JsonValue[]) => onChange(next)
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= list.length) return
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    set(next)
  }
  return (
    <div className="ws-list">
      {list.map((item, i) => (
        <div key={i} className="ws-list__row">
          <div className="ws-list__head">
            <span className="ws-muted">#{i + 1}</span>
            <span className="ws-list__tools">
              <button type="button" className="ws-icon" title="Up" onClick={() => move(i, -1)}>
                ↑
              </button>
              <button type="button" className="ws-icon" title="Down" onClick={() => move(i, 1)}>
                ↓
              </button>
              <button
                type="button"
                className="ws-icon"
                title="Remove"
                onClick={() => set(list.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </span>
          </div>
          <ValueEditor
            name={name}
            type={items}
            value={item}
            ctx={{ ...ctx, scope: `${ctx.scope}[${i}]` }}
            onChange={(v) =>
              set(list.map((x, j) => (j === i ? (v ?? emptyValue(items, ctx.defs)) : x)))
            }
          />
        </div>
      ))}
      <div className="ws-list__foot">
        <button
          type="button"
          className="ws-btn ws-btn--small"
          onClick={() => set([...list, emptyValue(items, ctx.defs)])}
        >
          + add
        </button>
        {value !== undefined && list.length === 0 && (
          <span className="ws-muted">empty list (set)</span>
        )}
      </div>
    </div>
  )
}

const variantLabel = (type: PropType) =>
  type.type === 'object' ? 'custom' : type.type === 'enum' ? 'preset' : type.type

function UnionEditor({
  name,
  type,
  schema,
  value,
  onChange,
  ctx,
}: {
  name: string
  type: Extract<PropType, { type: 'union' }>
  schema?: PropSchema
  value: JsonValue | undefined
  onChange: Change
  ctx: FieldContext
}) {
  const current = variantOf(type, value ?? schema?.default)
  const [active, setActive] = useState(current < 0 ? 0 : current)
  useEffect(() => {
    if (current >= 0) setActive(current)
  }, [current])
  const variant = type.variants[active]
  return (
    <div className="ws-union">
      <div className="ws-seg ws-seg--small">
        {type.variants.map((v, i) => (
          <button
            key={`${v.type}-${i}`}
            type="button"
            className={i === active ? 'is-on' : ''}
            onClick={() => {
              setActive(i)
              if (!matches(v, value)) onChange(i === current ? value : emptyValue(v, ctx.defs))
            }}
          >
            {variantLabel(v)}
          </button>
        ))}
      </div>
      <ValueEditor
        name={name}
        type={variant}
        value={matches(variant, value) ? value : undefined}
        onChange={onChange}
        ctx={ctx}
      />
    </div>
  )
}

/** One labelled prop row: label (scrubbable for numbers), doc, editor, reset. */
export function Field({
  name,
  schema,
  value,
  onChange,
  ctx,
}: {
  name: string
  schema: PropSchema
  value: JsonValue | undefined
  onChange: (value: JsonValue | undefined, key?: string) => void
  ctx: FieldContext
}) {
  const modified = value !== undefined && !isEqual(value, schema.default)
  const key = `${ctx.scope}:${name}`
  const change: Change = (v) => onChange(v, key)
  const kind = controlKind(schema)
  const wide = ['list', 'object', 'union', 'json', 'text'].includes(kind)
  const doc = schema.doc?.split(/(?<=\.)\s/)[0]
  const range = kind === 'number' ? numberRange(ctx.component, name, schema) : null
  const label =
    range && typeof (value ?? schema.default) === 'number' ? (
      <Scrub
        value={(value ?? schema.default) as number}
        step={range.step}
        onChange={(n) => change(range.integer ? Math.round(n) : n)}
        title={schema.doc}
      >
        {labelFor(name)}
      </Scrub>
    ) : (
      <span title={schema.doc}>{labelFor(name)}</span>
    )
  return (
    <div className={`ws-field ${wide ? 'is-wide' : ''} ${modified ? 'is-modified' : ''}`}>
      <div className="ws-field__label">
        {modified && <i className="ws-dot" title="Changed from the default" />}
        {label}
        {value !== undefined && (
          <button
            type="button"
            className="ws-reset"
            title={`Reset to default${schema.default !== undefined ? ` (${JSON.stringify(schema.default)})` : ''}`}
            onClick={() => onChange(undefined, key)}
          >
            ⟲
          </button>
        )}
      </div>
      <div className="ws-field__control">
        <ValueEditor
          name={name}
          type={schema}
          schema={schema}
          value={value}
          onChange={change}
          ctx={ctx}
        />
      </div>
      {doc && wide && <p className="ws-field__doc">{doc}</p>}
    </div>
  )
}

export { ColorField, JsonInput, Segmented, Select, Toggle }
