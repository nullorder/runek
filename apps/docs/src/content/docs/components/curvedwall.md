---
title: "CurvedWall"
summary: "An arc of wall around the origin — solid concrete or a floor-to-ceiling glass curtain wall with mullions. Compose several arcs to leave door gaps; chords carry cuboid colliders."
category: component
component: curvedwall
order: 100
---

## Add it

```bash
npx @runek/cli add curvedwall
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.12.0`, `three@^0.184.0`.

## Use it

```tsx
import { CurvedWall } from './runek/CurvedWall'

<CurvedWall position={[0, 0, 0]} />
```

## Props

```ts
export interface CurvedWallProps extends WorldComponentProps {
  /** Arc centerline radius, in units. The component origin is the circle's center. */
  radius?: number
  /** Sweep angle in radians, centered on the local +Z axis. */
  arc?: number
  height?: number
  thickness?: number
  /** `glass` renders a transparent curtain wall with mullions; `solid` a plain wall. */
  style?: CurvedWallStyle
  /** Chord segments; defaults from `radius × arc`, more segments reading as smoother. */
  segments?: number
  /** Solid wall color; defaults to the world palette's `wall` slot. */
  color?: string
  /** Glass tint (glass style). */
  glassColor?: string
  /** Mullion and rail color (glass style); defaults to the palette's `metal` slot. */
  frameColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/curvedwall.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/curvedwall.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add curvedwall</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
