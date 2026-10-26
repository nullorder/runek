import { type RootState, useThree } from '@react-three/fiber'
import { useEffect } from 'react'

declare global {
  interface Window {
    /** Set on `/library?perf`; `scripts/perf.mjs` reads the renderer and scene through it. */
    __runekPerf?: { get: () => RootState }
  }
}

/** The page's query: `?perf` mounts the probe, `yaw` turns the spawn (e.g. to face the gallery),
 *  `dpr` pins the pixel ratio so timings don't depend on where adaptive resolution settled, and
 *  `batching=0` turns static batching off and `shadowRate` sets how often shadows redraw, for
 *  comparison. */
export const perfParams =
  typeof location === 'undefined' ? null : new URLSearchParams(location.search)

/** Exposes the R3F state on `window` for `just perf`. */
export function PerfProbe() {
  const get = useThree((s) => s.get)
  useEffect(() => {
    window.__runekPerf = { get }
    return () => {
      window.__runekPerf = undefined
    }
  }, [get])
  return null
}
