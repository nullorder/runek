import { createContext } from 'react'
import type { WorldContextValue } from './types'

export const WorldContext = createContext<WorldContextValue>({
  unit: 1,
  gravity: [0, -9.81, 0],
})
