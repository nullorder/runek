import { useFrame } from '@react-three/fiber'
import { useMemo, useState } from 'react'
import { currentHours, type SunState, sunState } from './time'
import { useWorld } from './useWorld'

/**
 * The sun for the world's time-of-day (`<World time>` / `timezone`), for day/night-aware
 * components such as a lamp that lights at dusk. A pinned time is read straight from the world;
 * a live clock re-renders only when the sun has moved enough to matter (about a minute).
 */
export function useSun(): SunState {
  const { time } = useWorld()
  const [liveHours, setLiveHours] = useState(() => currentHours(time))
  useFrame(() => {
    if (!time.live) return
    const h = currentHours(time)
    setLiveHours((prev) => (Math.abs(h - prev) > 0.02 ? h : prev))
  })
  const hours = time.live ? liveHours : time.hours
  return useMemo(() => sunState(hours), [hours])
}
