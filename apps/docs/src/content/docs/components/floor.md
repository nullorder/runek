---
title: "Floor"
summary: "Flat floor slab with a fixed collider; optional stairwell opening."
category: component
component: floor
order: 100
---

## Add it

```bash
npx @runek/cli add floor
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Floor } from './runek/Floor'

<Floor position={[0, 0, 0]} />
```

## Props

```ts
export interface FloorProps {
  position?: Vec3
  rotation?: Vec3
  /** `[width, depth]` in units. The top surface sits at the component origin. */
  size?: [number, number]
  thickness?: number
  /** A hole in the slab (stairwell); the slab splits into strips around it. */
  opening?: FloorOpening
  /** Defaults to the world palette's `floor` slot. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/floor.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/floor.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add floor</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
