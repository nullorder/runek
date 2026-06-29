---
title: "Path"
summary: "A meandering ribbon trail from seeded waypoints; decorative, laid just over the ground."
category: component
component: path
order: 100
---

## Add it

```bash
npx @runek/cli add path
```

Pulls `@runek/core@^0.10.4`, `three@^0.184.0`.

## Use it

```tsx
import { Path } from './runek/Path'

<Path position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface PathProps {
  position?: Vec3
  rotation?: Vec3
  /** Length along local Z, in units. */
  length?: number
  width?: number
  /** Lateral meander amplitude, in units. */
  meander?: number
  /** Defaults to the world palette's `ground` slot. */
  color?: string
  segments?: number
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/path.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/path.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add path</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
