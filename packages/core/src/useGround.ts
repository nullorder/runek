import { useContext, useMemo } from 'react'
import { GroundContext, WorldContext } from './context'
import type { GroundQuery } from './ground'

/**
 * The ground query for the current world: the highest surface at (x, z). Under a
 * `WorldRenderer`/`WorldEditor` it reads the world's surfaces (terrain, docks, floors); in a
 * hand-composed `<World>` with no index it returns the flat `ground` baseline.
 */
export function useGround(): GroundQuery {
  const index = useContext(GroundContext)
  const { ground } = useContext(WorldContext)
  return useMemo(() => index?.groundAt ?? (() => ground), [index, ground])
}
