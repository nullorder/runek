---
title: "Sign"
summary: "In-world text rendered in a world font (the one font-using component); falls back to the default bundled in @runek/core."
category: component
component: sign
order: 100
---

## Add it

```bash
npx @runek/cli add sign
```

Pulls `@react-three/drei@^10.7.7`, `@runek/core@^0.10.1`.

## Use it

```tsx
import { Sign } from './runek/Sign'

<Sign position={[0, 0, 0]} />
```

## Props

```ts
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
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/sign.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/sign.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add sign</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/sign)**.
