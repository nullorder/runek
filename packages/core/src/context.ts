import { createContext } from 'react'
import { DEFAULT_FONTS } from './font'
import type { GroundIndex } from './ground'
import { DEFAULT_CONTROLS } from './keyboard'
import { DEFAULT_PALETTE } from './palette'
import { DEFAULT_WORLD_TIME } from './time'
import type { PlayerMotion, WorldContextValue } from './types'

export const WorldContext = createContext<WorldContextValue>({
  unit: 1,
  gravity: [0, -9.81, 0],
  ground: 0,
  palette: DEFAULT_PALETTE,
  fonts: DEFAULT_FONTS,
  time: DEFAULT_WORLD_TIME,
  controls: DEFAULT_CONTROLS,
})

/** The world's ground index, provided by `WorldRenderer`/`WorldEditor`. */
export const GroundContext = createContext<GroundIndex | null>(null)

/** The enclosing `Player`'s live motion, for the body it carries (a `Person` walks in step with
 *  it). A mutable ref read in `useFrame`, so it re-renders nothing. Null outside a `Player`. */
export const PlayerMotionContext = createContext<{ current: PlayerMotion } | null>(null)
