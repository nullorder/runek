import { World, type WorldProps } from './World'
import { WorldNodes } from './WorldNodes'
import type { ComponentRegistry, WorldData } from './world-data'

export interface WorldRendererProps
  extends Omit<WorldProps, 'children' | 'unit' | 'gravity' | 'palette' | 'fog'> {
  data: WorldData
  registry: ComponentRegistry
}

/** Render a `WorldData` object inside a `<World>`, resolving each node via the registry. */
export function WorldRenderer({ data, registry, ...worldProps }: WorldRendererProps) {
  return (
    <World
      unit={data.unit}
      gravity={data.gravity}
      palette={data.palette}
      fog={data.fog}
      {...worldProps}
    >
      <WorldNodes nodes={data.nodes} registry={registry} />
    </World>
  )
}
