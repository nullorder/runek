import {
  type PersonTrait,
  type PersonTraitSource,
  type ResolvedPerson,
  resolvePerson,
} from '@runek/components'
import { DEFAULT_PALETTE } from '@runek/core'
import type { JsonValue } from '@runek/core/data'
import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { schemaFor } from '../schema'
import type { PropType } from '../schema/types'
import { studioProps, useWorkshop, writeStudio } from '../state/store'
import { type Crop, TILE_BASE, TileImage } from './tiles'
import { getPath, TRAITS, type TraitId, writeTrait } from './traits'

type Props = Record<string, JsonValue>

interface StudioContext {
  props: Props
  resolved: ResolvedPerson
  palette: Record<string, string>
  /** Write one trait; `key` coalesces a drag into one undo step. */
  write: (id: TraitId, value: JsonValue | undefined, key?: string) => void
  /** Replace the whole props object. */
  replace: (next: Props, key?: string) => void
}

const Ctx = createContext<StudioContext | null>(null)

export function StudioProvider({ children }: { children: ReactNode }) {
  const props = useWorkshop((s) => studioProps(s))
  const worldPalette = useWorkshop((s) => s.world.palette)
  const unit = useWorkshop((s) => s.world.unit)
  const value = useMemo<StudioContext>(() => {
    const palette = { ...DEFAULT_PALETTE, ...worldPalette } as Record<string, string>
    return {
      props,
      palette,
      resolved: resolvePerson(props as never, palette as never, unit ?? 1),
      write: (id, v, key) => writeStudio(writeTrait(props, id, v), key ?? null),
      replace: (next, key) => writeStudio(next, key ?? null),
    }
  }, [props, worldPalette, unit])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStudio() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStudio outside StudioProvider')
  return ctx
}

const SOURCE: Record<PersonTraitSource, [string, string]> = {
  prop: ['set', 'You set this'],
  skin: ['skin', 'From the skin bundle'],
  kind: ['kind', 'From the kind preset'],
  seed: ['seeded', 'Rolled from the seed'],
  default: ['default', "The component's default"],
}

/** Enum options of a Person prop (or the enum side of a union), straight from the prop schema. */
export function optionsOf(name: string): string[] {
  const type = schemaFor('Person')?.props[name] as PropType | undefined
  const enumOf = (t: PropType | undefined): string[] =>
    t?.type === 'enum'
      ? t.options.map(String)
      : t?.type === 'union'
        ? t.variants.flatMap(enumOf)
        : t?.type === 'array'
          ? enumOf(t.items)
          : []
  return enumOf(type)
}

export function defOptions(def: string, field: string): string[] {
  const t = schemaFor('Person')?.defs?.[def]?.props[field]
  return t?.type === 'enum' ? t.options.map(String) : []
}

/** Trait value with a pin-ready form (the layer list without the computed `tucked`). */
const pinnable = (trait: PersonTrait<unknown>): JsonValue | undefined => {
  if (trait.value === null) return undefined
  if (Array.isArray(trait.value))
    return trait.value.map((v) => {
      if (v && typeof v === 'object') {
        const { tucked: _t, ...rest } = v as Record<string, JsonValue>
        return rest
      }
      return v as JsonValue
    })
  return trait.value as JsonValue
}

/** One trait: label, where its value came from, pin (keep what the seed chose), reset. */
export function TraitRow({
  id,
  children,
  hint,
}: {
  id: TraitId
  children: ReactNode
  hint?: string
}) {
  const { props, resolved, write } = useStudio()
  const def = TRAITS[id]
  const trait = 'resolved' in def ? resolved[def.resolved] : null
  const set = trait ? trait.from === 'prop' : getPath(props, def.path) !== undefined
  const source = trait ? trait.from : set ? 'prop' : 'default'
  const [badge, title] = SOURCE[source]
  const pin = trait && !set ? pinnable(trait) : undefined
  return (
    <div className="ws-trait">
      <div className="ws-trait__head">
        <span className="ws-trait__label" title={hint}>
          {def.label}
        </span>
        <span className={`ws-src is-${source}`} title={title}>
          {badge}
        </span>
        <span className="ws-trait__tools">
          {pin !== undefined && (
            <button
              type="button"
              className="ws-icon"
              title="Pin: keep this value even if the seed, skin, or kind changes"
              onClick={() => write(id, pin)}
            >
              📌
            </button>
          )}
          {set && (
            <button
              type="button"
              className="ws-reset"
              title="Reset: let the skin, kind, or seed decide again"
              onClick={() => write(id, undefined)}
            >
              ⟲
            </button>
          )}
        </span>
      </div>
      {children}
    </div>
  )
}

export function Tiles({
  options,
  value,
  onPick,
  props,
  crop = 'body',
  base = TILE_BASE,
  small = false,
}: {
  options: string[]
  value: unknown
  onPick: (option: string) => void
  /** The tile figure's props for an option; without it tiles are text only. */
  props?: (option: string) => Props
  crop?: Crop
  base?: Props
  small?: boolean
}) {
  return (
    <div className={`ws-tiles ${props ? '' : 'is-text'} ${small ? 'is-small' : ''}`}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`ws-tile ${value === option ? 'is-on' : ''}`}
          aria-pressed={value === option}
          onClick={() => onPick(option)}
        >
          {props && (
            <TileImage
              job={{
                id: `${crop}:${JSON.stringify({ ...base, ...props(option) })}`,
                props: { ...base, ...props(option) },
                crop,
              }}
              fallback={option.slice(0, 2)}
            />
          )}
          <span className="ws-tile__name">{option}</span>
        </button>
      ))}
    </div>
  )
}

export function Swatches({
  colors,
  value,
  onPick,
}: {
  colors: readonly string[]
  value: string | undefined
  onPick: (color: string) => void
}) {
  const current = value?.toLowerCase()
  return (
    <div className="ws-swatches">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className={`ws-swatch-dot ${current === color.toLowerCase() ? 'is-on' : ''}`}
          style={{ background: color }}
          title={color}
          aria-label={color}
          onClick={() => onPick(color)}
        />
      ))}
      <label className="ws-swatch-dot is-custom" title="Any color">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value ?? '') ? value : '#808080'}
          onChange={(e) => onPick(e.target.value)}
        />
      </label>
    </div>
  )
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (n: number) => void
}) {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)))
  return (
    <div className="ws-row-number">
      <input
        type="range"
        className="ws-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="ws-slider__value">{value.toFixed(decimals)}</span>
    </div>
  )
}

export function Choice({
  options,
  value,
  onPick,
}: {
  options: string[]
  value: unknown
  onPick: (option: string) => void
}) {
  return (
    <div className="ws-seg ws-seg--wrap">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          className={value === option ? 'is-on' : ''}
          onClick={() => onPick(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
