import { useEffect, useMemo } from 'react'
import { GroundContext } from './context'
import { createGroundIndex, type GroundIndex } from './ground'
import { World, type WorldProps } from './World'
import { WorldAbout } from './WorldAbout'
import { WorldNodes } from './WorldNodes'
import type { ComponentRegistry, WorldData } from './world-data'

export interface WorldRendererProps
  extends Omit<
    WorldProps,
    | 'children'
    | 'unit'
    | 'gravity'
    | 'palette'
    | 'fog'
    | 'time'
    | 'timezone'
    | 'avatar'
    | 'controls'
  > {
  data: WorldData
  registry: ComponentRegistry
}

/** The world's ground index, rebuilt when the data changes, with its warnings logged once. */
export function useGroundIndex(data: WorldData, registry: ComponentRegistry): GroundIndex {
  const index = useMemo(() => createGroundIndex(data, registry), [data, registry])
  useEffect(() => {
    for (const warning of index.warnings) console.warn(warning)
  }, [index])
  return index
}

/** Render a `WorldData` object inside a `<World>`, resolving each node via the registry. */
export function WorldRenderer({ data, registry, ...worldProps }: WorldRendererProps) {
  const ground = useGroundIndex(data, registry)
  return (
    <>
      <World
        unit={data.unit}
        gravity={data.gravity}
        ground={data.ground}
        palette={data.palette}
        fonts={data.fonts}
        fog={data.fog}
        time={data.time}
        timezone={data.timezone}
        avatar={data.avatar}
        controls={data.controls}
        {...worldProps}
      >
        <GroundContext.Provider value={ground}>
          <WorldNodes nodes={data.nodes} registry={registry} ground={ground} />
        </GroundContext.Provider>
      </World>
      <WorldAbout meta={data.meta} />
    </>
  )
}
