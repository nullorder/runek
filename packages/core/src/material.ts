import { useEffect, useMemo } from 'react'
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

export type MaterialKind = 'standard' | 'basic' | 'physical'

/**
 * How a surface looks, as plain values: everything a shared material is keyed on. Two parts
 * anywhere in the world with the same look draw with one material, which is what lets the renderer
 * (and the static batcher) treat them as one.
 */
export interface MaterialLook {
  /** `standard` (lit, the default), `basic` (unlit) or `physical` (clearcoat, sheen). */
  kind?: MaterialKind
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
const scratch = new Color()

/** The cache key for a look: same key, same material. Colors compare by value, key order and
 *  unset fields don't matter. */
export function materialKey(look: MaterialLook): string {
  const { kind = 'standard', ...params } = look
  const parts: string[] = []
  for (const name of Object.keys(params).sort()) {
    const value = params[name as keyof typeof params]
    if (value === undefined) continue
    parts.push(
      `${name}=${COLOR_KEYS.has(name) ? scratch.set(value as ColorRepresentation).getHexString(SRGBColorSpace) : value}`,
    )
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
    const { kind = 'standard', ...params } = look
    const material = new KINDS[kind](params)
    material.name = `runek:${key}`
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

/**
 * One shared, read-only material for a static look: every part in the world with the same look
 * draws with the same instance. Use it for anything that doesn't change after mount; a material
 * whose properties animate (a hover highlight, a flicker, a texture you draw into) stays your own.
 *
 * ```tsx
 * const wood = useMaterial({ color: palette.wood, roughness: 0.85 })
 * <mesh material={wood}><boxGeometry /></mesh>
 * ```
 */
export function useMaterial(look: MaterialLook): Material {
  const key = materialKey(look)
  // Keyed by value: a fresh `look` object with the same values keeps the same material.
  const material = useMemo(() => sharedMaterial(look, key), [key])
  useEffect(() => {
    retainMaterial(key)
    return () => releaseMaterial(key)
  }, [key])
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
  const entries = Object.entries(looks) as [string, MaterialLook][]
  const keys = entries.map(([, look]) => materialKey(look))
  const signature = keys.join('\n')
  // Keyed by value, like `useMaterial`.
  const materials = useMemo(() => {
    const out = (Array.isArray(looks) ? [] : {}) as Record<string, Material>
    entries.forEach(([name, look], i) => {
      out[name] = sharedMaterial(look, keys[i])
    })
    return out as { [K in keyof T]: Material }
  }, [signature])
  useEffect(() => {
    const held = signature.split('\n').filter(Boolean)
    for (const key of held) retainMaterial(key)
    return () => {
      for (const key of held) releaseMaterial(key)
    }
  }, [signature])
  return materials
}
