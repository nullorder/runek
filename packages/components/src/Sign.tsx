import { Text } from '@react-three/drei'
import {
  type FontRole,
  type LuminanceLevel,
  lastResortFont,
  useLuminance,
  useMaterial,
  useTextFont,
  useWorld,
  type Vec3,
} from '@runek/core'
import { Children, type ReactNode, useMemo } from 'react'
import { Color, DoubleSide, FrontSide } from 'three'
// @ts-expect-error troika-three-text (what drei's Text draws with) ships no types
import { configureTextBuilder } from 'troika-three-text'

// Whatever a text's font lacks, troika draws from its default font, and without one it looks the
// character up on a public CDN. Runek's box face, built in code, claims every character, so no
// text ever leaves the fonts the world declared. troika takes this once, before its first text.
const CONFIGURED = Symbol.for('runek.textBuilder')
const page = globalThis as { [CONFIGURED]?: boolean }
if (!page[CONFIGURED]) {
  page[CONFIGURED] = true
  configureTextBuilder({ defaultFontURL: lastResortFont() })
}

export interface SignProps {
  /** The text to render. */
  children: ReactNode
  position?: Vec3
  rotation?: Vec3
  /** Accepted for the component contract; this component has no seeded variation yet. */
  seed?: number
  /**
   * Which world font role to render in (`display` for titles/signage, `body`
   * for labels). The world declares the actual face via `<World fonts>`; an
   * undeclared role falls back to the font bundled in `@runek/core`. Text the face
   * can't fully draw is drawn in the world's `fallback` font that covers more of it;
   * characters no declared font has draw as boxes. (Named `variant`, not `role`, so it
   * doesn't trip JSX a11y linters.)
   */
  variant?: FontRole
  /** Explicit font URL, overriding the world role. The world's `fallback` fonts still apply. */
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
  /** A crisp edge in this color, so the text reads against any background. Wins over `glow`. */
  outline?: string
  /** Glow: unlit by the scene and brightened by the world's `sign` luminance level, so lettering
   *  reads as light and, above 1, blooms. Name another level (`screen`, `tube`) to glow at that
   *  one instead. */
  lit?: boolean | LuminanceLevel
  /** Read from both sides, for a sign that stands free of a wall (hanging, on a roof, on a glass
   *  door): two faces back to back, each front-side only, so neither shows the other mirrored. */
  twoSided?: boolean
  /** Called with the laid-out text's width and height, in world units, whenever it changes:
   *  for fitting a backdrop behind it. */
  onBounds?: (width: number, height: number) => void
}

/**
 * In-world text. The one component that renders glyphs, and so the single
 * carve-out to the no-assets rule (CONTRACT §4): it ships no font of its own,
 * drawing only from the world's declared `fonts` or the default bundled in
 * `@runek/core`. `lit` makes it glow at a world luminance level, `twoSided` reads
 * it from behind as well. Decorative: it registers no colliders (mount it on a
 * surface that has one, e.g. a Wall).
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
  outline,
  lit = false,
  twoSided = false,
  onBounds,
}: SignProps) {
  const { unit, fonts, palette } = useWorld()
  const luminance = useLuminance()
  const face = useTextFont(font ?? fonts[variant], textOf(children))
  const ink = color ?? palette.accent
  const level = lit ? luminance[lit === true ? 'sign' : lit] : 1
  const tint = useMemo(() => (lit ? new Color(ink).multiplyScalar(level) : ink), [lit, ink, level])
  // The glyphs' base material, shared: troika keeps each text's color on its own derived copy.
  const material = useMaterial({
    kind: 'basic',
    transparent: true,
    side: twoSided ? FrontSide : DoubleSide,
    toneMapped: !lit,
  })

  const text = (anchor: SignProps['anchorX'], report?: SignProps['onBounds']) => (
    <Text
      font={face}
      material={material}
      fontSize={size * unit}
      color={tint}
      maxWidth={maxWidth !== undefined ? maxWidth * unit : undefined}
      letterSpacing={letterSpacing}
      anchorX={anchor}
      anchorY={anchorY}
      outlineWidth={outline ? '9%' : glow ? 0.02 * unit : 0}
      outlineColor={outline ?? tint}
      outlineBlur={outline || !glow ? 0 : '45%'}
      outlineOpacity={outline || !glow ? 1 : 0.5}
      onSync={
        report
          ? (mesh: { textRenderInfo?: { blockBounds: number[] } }) => {
              const b = mesh.textRenderInfo?.blockBounds
              if (b) report(b[2] - b[0], b[3] - b[1])
            }
          : undefined
      }
    >
      {children}
    </Text>
  )

  // The back face is turned half a turn, so its anchor mirrors to cover the same span.
  const back = anchorX === 'left' ? 'right' : anchorX === 'right' ? 'left' : 'center'
  return (
    <group position={position} rotation={rotation}>
      {text(anchorX, onBounds)}
      {twoSided && <group rotation={[0, Math.PI, 0]}>{text(back)}</group>}
    </group>
  )
}

/** The text drei's `Text` draws from `children`: its strings and numbers, joined. */
function textOf(children: ReactNode): string {
  let text = ''
  Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') text += child
  })
  return text
}
