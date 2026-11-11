import { useContext } from 'react'
import { WorldContext } from './context'
import { DEFAULT_LUMINANCE, type WorldLuminance } from './luminance'

export const useWorld = () => useContext(WorldContext)

/** The world's luminance levels, every one filled (the defaults under a hand-rolled provider
 *  that leaves them out). */
export function useLuminance(): WorldLuminance {
  return useContext(WorldContext).luminance ?? DEFAULT_LUMINANCE
}
