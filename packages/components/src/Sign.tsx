import { Text } from '@react-three/drei'
import { useWorld, type Vec3, type WorldFonts } from '@runek/core'
import type { ReactNode } from 'react'

export interface SignProps {
  /** The text to render. */
  children: ReactNode
  position?: Vec3
  rotation?: Vec3
  /**
   * Which world font role to render in (`display` for titles/signage, `body`
   * for labels). The world declares the actual face via `<World fonts>`; an
   * undeclared role falls back to the font bundled in `@runek/core`. (Named
   * `variant`, not `role`, so it doesn't trip JSX a11y linters.)
   */
  variant?: keyof WorldFonts
  /** Explicit font URL, overriding the world role. */
  font?: string
  /** Cap height in units. */
  size?: number
  /** Text color. Defaults to the world palette's `accent` slot. */
  color?: string
  /** Wrap width in units; omit to keep the text on one line. */
  maxWidth?: number
  letterSpacing?: number
  anchorX?: 'left' | 'center' | 'right'
  anchorY?: 'top' | 'middle' | 'bottom'
  /** Soft colored halo around the glyphs, for a glow without bloom. */
  glow?: boolean
}

/**
 * In-world text. The one component that renders glyphs, and so the single
 * carve-out to the no-assets rule (CONTRACT §4): it ships no font of its own,
 * drawing only from the world's declared `fonts` or the default bundled in
 * `@runek/core`. Decorative: it registers no colliders (mount it on a surface
 * that has one, e.g. a Wall).
 */
export function Sign({
  children,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  variant = 'display',
  font,
  size = 0.3,
  color,
  maxWidth,
  letterSpacing = 0,
  anchorX = 'center',
  anchorY = 'middle',
  glow = false,
}: SignProps) {
  const { unit, fonts, palette } = useWorld()
  const face = font ?? fonts[variant]
  const ink = color ?? palette.accent

  return (
    <Text
      font={face}
      position={position}
      rotation={rotation}
      fontSize={size * unit}
      color={ink}
      maxWidth={maxWidth !== undefined ? maxWidth * unit : undefined}
      letterSpacing={letterSpacing}
      anchorX={anchorX}
      anchorY={anchorY}
      outlineWidth={glow ? 0.02 * unit : 0}
      outlineColor={ink}
      outlineBlur={glow ? '45%' : 0}
      outlineOpacity={glow ? 0.5 : 1}
    >
      {children}
    </Text>
  )
}
