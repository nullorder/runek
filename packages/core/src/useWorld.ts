import { use, useContext } from 'react'
import { WorldContext } from './context'
import type { CodeRanges } from './coverage'
import { fontCoverage, pickFace } from './font'
import { DEFAULT_LUMINANCE, type WorldLuminance } from './luminance'

export const useWorld = () => useContext(WorldContext)

/** The world's luminance levels, every one filled (the defaults under a hand-rolled provider
 *  that leaves them out). */
export function useLuminance(): WorldLuminance {
  return useContext(WorldContext).luminance ?? DEFAULT_LUMINANCE
}

const faceSets = new Map<string, Promise<CodeRanges[]>>()

/**
 * The font to draw `text` in, given its role font `face`: the face itself, or, when the world
 * declares `fallback` fonts and the face can't draw all of `text`, the declared face that covers
 * the most of it. Suspends while the fonts' coverage loads. Hand the result to drei's `Text` as
 * `font`; characters it still lacks draw as boxes from `lastResortFont()`.
 */
export function useTextFont(face: string, text: string): string {
  const fallback = useContext(WorldContext).fonts.fallback
  if (fallback === undefined || (Array.isArray(fallback) && fallback.length === 0)) return face
  const faces = [face, ...(Array.isArray(fallback) ? fallback : [fallback])]
  const key = faces.join('\n')
  let coverage = faceSets.get(key)
  if (!coverage) {
    coverage = Promise.all(faces.map(fontCoverage))
    faceSets.set(key, coverage)
  }
  return pickFace(text, faces, use(coverage))
}
