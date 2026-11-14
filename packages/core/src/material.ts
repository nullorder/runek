import { useContext, useEffect, useMemo } from 'react'
import {
  Color,
  type ColorRepresentation,
  type Material,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Side,
  SRGBColorSpace,
} from 'three'
import { WorldContext } from './context'

export type MaterialKind = 'standard' | 'basic' | 'physical'

/**
 * The surfaces a component can name in a look's `slot`, so a world can answer them with materials
 * of its own (`<World materials>`). A component picks the one that fits and still gives a full look,
 * which is what draws when the world doesn't answer.
 */
export const MATERIAL_SLOTS = {
  asphalt: 'Road decks and other bitumen paving.',
  concrete: 'Cast concrete: slabs, kerbs, plinths, bare structural walls.',
  stone: 'Cut and natural stone: masonry, paving, steps, rock.',
  brick: 'Brickwork.',
  plaster: 'Rendered or painted walls, inside and out.',
  floor: 'Interior floor finishes: boards, tiles, screed.',
  roofing: 'Roof coverings: tiles, shingles, thatch, sheet.',
  wood: 'Timber, joinery and wooden furniture.',
  glass: 'Glazing: windows, glass walls, rails.',
  'metal.painted': 'Painted or powder-coated metal: poles, frames, appliances.',
  'metal.bare': 'Unpainted metal: steel, chrome, brass, cast iron.',
  fabric: 'Upholstery, rugs, curtains, canvas.',
  leather: 'Leather upholstery and goods.',
  plastic: 'Molded plastic and laminate.',
  ceramic: 'Glazed ceramic and porcelain: tiles, tableware, sanitaryware.',
  ground: 'Soil and terrain cover.',
  sand: 'Beaches, shores and dunes.',
  foliage: 'Leaves, hedges and grass.',
  bark: 'Tree trunks and branches.',
} as const

export type MaterialSlot = keyof typeof MATERIAL_SLOTS

/**
 * How a surface looks, as plain values: everything a shared material is keyed on. Two parts
 * anywhere in the world with the same look draw with one material, which is what lets the renderer
 * (and the static batcher) treat them as one.
 */
export interface MaterialLook {
  /** `standard` (lit, the default), `basic` (unlit) or `physical` (clearcoat, sheen). */
  kind?: MaterialKind
  /** The surface this look stands for (one of `MATERIAL_SLOTS`, e.g. `asphalt`), so a world can
   *  draw it with a material of its own. Unanswered, the look draws as given. */
  slot?: MaterialSlot | (string & {})
  color?: ColorRepresentation
  emissive?: ColorRepresentation
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
  opacity?: number
  transparent?: boolean
  side?: Side
  flatShading?: boolean
  toneMapped?: boolean
  depthWrite?: boolean
  depthTest?: boolean
  fog?: boolean
  vertexColors?: boolean
  wireframe?: boolean
  alphaTest?: number
  polygonOffset?: boolean
  polygonOffsetFactor?: number
  polygonOffsetUnits?: number
  clearcoat?: number
  clearcoatRoughness?: number
  sheen?: number
  sheenColor?: ColorRepresentation
  sheenRoughness?: number
  ior?: number
  specularIntensity?: number
  iridescence?: number
}

/** What a world answers a slot with: one material for every look naming it, or a function that
 *  makes one from the look (its colors, roughness, `kind`). */
export type SlotResolver = Material | ((look: MaterialLook) => Material)

/** A world's answers to material slots, by slot name. Slots it leaves out draw as the look says. */
export type MaterialSlots = Partial<Record<MaterialSlot, SlotResolver>> &
  Record<string, SlotResolver | undefined>

const COLOR_KEYS = new Set(['color', 'emissive', 'sheenColor'])
const KINDS = {
  standard: MeshStandardMaterial,
  basic: MeshBasicMaterial,
  physical: MeshPhysicalMaterial,
} as const

// A material nobody uses is disposed after this long, so a remount or a live edit that comes
// back to the same look reuses it instead of recompiling.
const DISPOSE_AFTER = 2000

interface Entry {
  material: Material
  users: number
  timer: ReturnType<typeof setTimeout> | null
}

const shared = new Map<string, Entry>()
// Every material handed out through a look, built here or resolved through a slot: what the
// static batcher may merge.
const batchable = new WeakSet<Material>()
const scratch = new Color()
const srgb = { r: 0, g: 0, b: 0 }

// The 8-bit sRGB channels, unclamped: the hex string while all three are in range, so colors
// that print the same share a material; past 1 (an HDR glow feeding bloom) the multiplier stays
// in the key instead of clamping to `ff`.
function colorKey(value: ColorRepresentation): string {
  scratch.set(value).getRGB(srgb, SRGBColorSpace)
  const channels = [srgb.r, srgb.g, srgb.b].map((c) => Math.round(c * 255))
  if (channels.some((n) => n < 0 || n > 255)) return channels.join(',')
  return channels.map((n) => n.toString(16).padStart(2, '0')).join('')
}

/** The cache key for a look: same key, same material. Colors compare by value (including
 *  brightness above 1), key order and unset fields don't matter. The `slot` is left out: two looks
 *  that only differ by slot draw the same until a world answers one of them. */
export function materialKey(look: MaterialLook): string {
  const { kind = 'standard', slot: _slot, ...params } = look
  const parts: string[] = []
  for (const name of Object.keys(params).sort()) {
    const value = params[name as keyof typeof params]
    if (value === undefined) continue
    parts.push(`${name}=${COLOR_KEYS.has(name) ? colorKey(value as ColorRepresentation) : value}`)
  }
  return `${kind}|${parts.join(';')}`
}

function sweepLater(key: string, entry: Entry) {
  if (entry.timer) clearTimeout(entry.timer)
  entry.timer = setTimeout(() => {
    entry.timer = null
    if (entry.users > 0 || shared.get(key) !== entry) return
    entry.material.dispose()
    shared.delete(key)
  }, DISPOSE_AFTER)
}

/**
 * The shared material for `look`, created on first use. Prefer `useMaterial` in components, which
 * also keeps it alive while mounted; an instance nothing retains is disposed shortly after.
 * Shared materials are read-only: never change one's properties (a hovered highlight, a flicker),
 * keep a material of your own for anything that animates.
 */
export function sharedMaterial(look: MaterialLook, key = materialKey(look)): Material {
  let entry = shared.get(key)
  if (!entry) {
    const { kind = 'standard', slot: _slot, ...params } = look
    const material = new KINDS[kind](params)
    material.name = `runek:${key}`
    batchable.add(material)
    entry = { material, users: 0, timer: null }
    shared.set(key, entry)
    sweepLater(key, entry)
  }
  return entry.material
}

/** Keep `key`'s material alive; pair with `releaseMaterial`. */
export function retainMaterial(key: string) {
  const entry = shared.get(key)
  if (!entry) return
  entry.users++
  if (entry.timer) {
    clearTimeout(entry.timer)
    entry.timer = null
  }
}

export function releaseMaterial(key: string) {
  const entry = shared.get(key)
  if (!entry) return
  entry.users = Math.max(0, entry.users - 1)
  if (entry.users === 0) sweepLater(key, entry)
}

/** How many shared materials exist right now (for perf checks and tests). */
export function sharedMaterialCount() {
  return shared.size
}

/** Whether `material` came from a look (built from it or answered through a slot), or was
 *  marked with `shareMaterial`, so it is shared and read-only and the static batcher may merge
 *  what it draws. */
export function isSharedMaterial(material: Material): boolean {
  return batchable.has(material)
}

/**
 * Mark a material a component made itself as shared: one instance used by every part that draws
 * that way and never changed per part (a facade `ShaderMaterial` whose per-building look rides
 * in vertex attributes), so the static batcher merges what it draws like any look's material.
 * The component still owns it. A material that changes after mount must not be marked.
 */
export function shareMaterial<M extends Material>(material: M): M {
  batchable.add(material)
  return material
}

const resolved = new WeakMap<object, Map<string, Material>>()

/** The world's answer to `look.slot` in `slots`, if it has one. */
export function slotResolver(
  look: MaterialLook,
  slots: MaterialSlots | undefined,
): SlotResolver | undefined {
  return look.slot === undefined ? undefined : slots?.[look.slot]
}

/**
 * The material `resolver` answers `look` with, made once per resolver, slot and look and kept for
 * as long as the resolver lives. The material belongs to the app that gave the resolver: core
 * shares it but never disposes it.
 */
export function resolveSlot(
  resolver: SlotResolver,
  look: MaterialLook,
  key = materialKey(look),
): Material {
  if (typeof resolver !== 'function') {
    batchable.add(resolver)
    return resolver
  }
  let cache = resolved.get(resolver)
  if (!cache) {
    cache = new Map()
    resolved.set(resolver, cache)
  }
  const id = `${look.slot}|${key}`
  let material = cache.get(id)
  if (!material) {
    material = resolver(look)
    batchable.add(material)
    cache.set(id, material)
  }
  return material
}

/** The material for `look` in a world answering `slots`: the slot's answer, or the shared
 *  material built from the look. Hooks retain the second; the first is the app's. */
export function lookMaterial(
  look: MaterialLook,
  slots: MaterialSlots | undefined,
  key = materialKey(look),
): Material {
  const resolver = slotResolver(look, slots)
  return resolver ? resolveSlot(resolver, look, key) : sharedMaterial(look, key)
}

/**
 * One shared, read-only material for a static look: every part in the world with the same look
 * draws with the same instance. Use it for anything that doesn't change after mount; a material
 * whose properties animate (a hover highlight, a flicker, a texture you draw into) stays your own.
 * A look with a `slot` the world answers (`<World materials>`) draws with the world's material.
 *
 * ```tsx
 * const wood = useMaterial({ slot: 'wood', color: palette.wood, roughness: 0.85 })
 * <mesh material={wood}><boxGeometry /></mesh>
 * ```
 */
export function useMaterial(look: MaterialLook): Material {
  const resolver = slotResolver(look, useContext(WorldContext).materials)
  const key = materialKey(look)
  const slot = look.slot
  // Keyed by value: a fresh `look` object with the same values keeps the same material.
  const material = useMemo(
    () => (resolver ? resolveSlot(resolver, look, key) : sharedMaterial(look, key)),
    [key, slot, resolver],
  )
  useEffect(() => {
    if (resolver) return
    retainMaterial(key)
    return () => releaseMaterial(key)
  }, [key, resolver])
  return material
}

/**
 * `useMaterial` for several looks at once, as a record or an array (e.g. one per seeded
 * variant); returns the same shape.
 *
 * ```tsx
 * const m = useMaterials({ frame: { color: wood }, cushion: { color: fabric, roughness: 1 } })
 * ```
 */
export function useMaterials<T extends Record<string, MaterialLook> | MaterialLook[]>(
  looks: T,
): { [K in keyof T]: Material } {
  const slots = useContext(WorldContext).materials
  const entries = Object.entries(looks) as [string, MaterialLook][]
  const keys = entries.map(([, look]) => materialKey(look))
  const signature = entries.map(([, look], i) => `${look.slot ?? ''}|${keys[i]}`).join('\n')
  // Built-in looks to keep alive; answered slots belong to the app.
  const held = keys.filter((_, i) => !slotResolver(entries[i][1], slots)).join('\n')
  // Keyed by value, like `useMaterial`.
  const materials = useMemo(() => {
    const out = (Array.isArray(looks) ? [] : {}) as Record<string, Material>
    entries.forEach(([name, look], i) => {
      out[name] = lookMaterial(look, slots, keys[i])
    })
    return out as { [K in keyof T]: Material }
  }, [signature, slots])
  useEffect(() => {
    const keep = held.split('\n').filter(Boolean)
    for (const key of keep) retainMaterial(key)
    return () => {
      for (const key of keep) releaseMaterial(key)
    }
  }, [held])
  return materials
}

/**
 * The look of an unlit surface glowing `color` at `level` (a world luminance level: read it from
 * `useLuminance()`). Basic and not tone mapped, with the color scaled by the level, so above 1 it
 * reaches bloom. Share it through `useMaterial(s)` like any look; `look` adds the rest (opacity,
 * side).
 *
 * ```tsx
 * const { tube } = useLuminance()
 * const m = useMaterials({ core: glowLook('#ffffff', tube), sleeve: glowLook(color, tube) })
 * ```
 */
export function glowLook(
  color: ColorRepresentation,
  level: number,
  look?: Omit<MaterialLook, 'kind' | 'color' | 'toneMapped'>,
): MaterialLook {
  return {
    ...look,
    kind: 'basic',
    color: new Color(color).multiplyScalar(level),
    toneMapped: false,
  }
}
