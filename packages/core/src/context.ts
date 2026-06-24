import { createContext } from 'react'
import { DEFAULT_FONTS } from './font'
import { DEFAULT_PALETTE } from './palette'
import { DEFAULT_WORLD_TIME } from './time'
import type { WorldContextValue } from './types'

export const WorldContext = createContext<WorldContextValue>({
  unit: 1,
  gravity: [0, -9.81, 0],
  palette: DEFAULT_PALETTE,
  fonts: DEFAULT_FONTS,
  time: DEFAULT_WORLD_TIME,
})
