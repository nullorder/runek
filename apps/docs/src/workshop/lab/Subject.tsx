import { registry } from '@runek/components'
import { isCompositeDef, type JsonValue, WorldNodes } from '@runek/core'
import type { ComponentType } from 'react'

/** One component (or composite) by registry name, from props. */
export function Subject({ type, props }: { type: string; props: Record<string, JsonValue> }) {
  const entry = registry[type]
  if (!entry) return null
  if (isCompositeDef(entry)) {
    return <WorldNodes nodes={[{ type, props }]} registry={registry} />
  }
  if (type === 'Player' || type === 'Interactable') return null
  const Component = entry as ComponentType<Record<string, unknown>>
  return <Component {...props} />
}
