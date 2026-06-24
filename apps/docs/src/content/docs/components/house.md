---
title: "House"
summary: "Composed dwelling: walls with openings, floor, roof, door, and windows."
category: component
component: house
order: 100
---

## Add it

```bash
npx @runek/cli add house
```

Pulls `door`, `floor`, `roof`, `wall`, `window`, `@runek/core@^0.8.0`.

## Use it

```tsx
import { House } from './runek/House'

<House position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface HouseProps {
  position?: Vec3
  rotation?: Vec3
  /** Interior footprint `[width, depth]`, in units. */
  size?: [number, number]
  height?: number
  thickness?: number
  roofStyle?: RoofStyle
  /** Defaults to the world palette's `wall` slot. */
  wallColor?: string
  /** Defaults to the world palette's `roof` slot. */
  roofColor?: string
  /** Reserved for procedural variation. */
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/house.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/house.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add house</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/house)**.
