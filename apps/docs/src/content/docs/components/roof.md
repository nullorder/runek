---
title: "Roof"
summary: "Flat or gable roof."
category: component
component: roof
order: 100
---

## Add it

```bash
npx @runek/cli add roof
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`.

## Use it

```tsx
import { Roof } from './runek/Roof'

<Roof position={[0, 0, 0]} />
```

## Props

```ts
export interface RoofProps {
  position?: Vec3
  rotation?: Vec3
  /** `[width, depth]` in units. The roof rests with its base at the component origin. */
  size?: [number, number]
  style?: RoofStyle
  /** Ridge height for a gable roof, in units. */
  peak?: number
  thickness?: number
  overhang?: number
  /** Defaults to the world palette's `roof` slot. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/roof.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/roof.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add roof</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
