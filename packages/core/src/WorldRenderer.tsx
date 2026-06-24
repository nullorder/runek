import { World, type WorldProps } from './World'
import { WorldAbout } from './WorldAbout'
import { WorldNodes } from './WorldNodes'
import type { ComponentRegistry, WorldData } from './world-data'

export interface WorldRendererProps
  extends Omit<
    WorldProps,
    'children' | 'unit' | 'gravity' | 'palette' | 'fog' | 'time' | 'timezone' | 'avatar'
  > {
  data: WorldData
  registry: ComponentRegistry
}

/** Render a `WorldData` object inside a `<World>`, resolving each node via the registry. */
export function WorldRenderer({ data, registry, ...worldProps }: WorldRendererProps) {
  return (
    <>
      <World
        unit={data.unit}
        gravity={data.gravity}
        palette={data.palette}
        fog={data.fog}
        time={data.time}
        timezone={data.timezone}
        avatar={data.avatar}
        {...worldProps}
      >
        <WorldNodes nodes={data.nodes} registry={registry} />
      </World>
      <WorldAbout meta={data.meta} />
    </>
  )
}
