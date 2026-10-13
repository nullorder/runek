import { PERSON_COLORS } from '@runek/components'

/** Clothing colors beyond the world palette: neutrals, then a few saturated ones. */
export const FASHION = [
  '#f4f2ec',
  '#22252b',
  '#5c6067',
  '#3b4a6b',
  '#5b7fa3',
  '#2f5d50',
  '#6f7d3c',
  '#7a2e2e',
  '#b8463a',
  '#d97b4a',
  '#c9a227',
  '#8a6f9e',
  '#b5476b',
  '#a68a64',
]

export const SKIN = PERSON_COLORS.skin
export const EYES = [...PERSON_COLORS.eyes, '#8a5a3b', '#4f8f8a', '#7a6aa8']
/** The seeded hair colors, then dyed ones. */
export const HAIR = [...PERSON_COLORS.hair, '#e8e1d5', '#3f5fa8', '#b5476b', '#3f8a5f']
export const LIPS = ['#c98a7a', '#b5676a', '#9c4f55', '#8a3b45', '#d48f8f', '#7a4a3c', '#c0566b']
