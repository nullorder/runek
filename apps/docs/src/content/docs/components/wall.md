---
title: "Wall"
summary: "Wall segment with door/window openings and a fixed collider."
category: component
component: wall
order: 100
---

## Add it

```bash
npx @runek/cli add wall
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`.

## Use it

```tsx
import { Wall } from './runek/Wall'

<Wall position={[0, 0, 0]} />
```

## Props

```ts
export interface WallProps {
  position?: Vec3
  rotation?: Vec3
  /** Length along the wall's local X axis, in units. */
  width?: number
  height?: number
  thickness?: number
  /** Defaults to the world palette's `wall` slot. */
  color?: string
  opening?: WallOpening
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/wall.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/wall.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add wall</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
