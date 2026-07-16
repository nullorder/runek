---
title: "Clouds"
summary: "Drifting clouds built from clustered soft blobs (no textures); layer above a Sky."
category: component
component: clouds
order: 100
---

## Add it

```bash
npx @runek/cli add clouds
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Clouds } from './runek/Clouds'

<Clouds position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface CloudsProps {
  position?: Vec3
  rotation?: Vec3
  /** Number of clouds. */
  count?: number
  /** Spread `[width, depth]`, in units. */
  area?: [number, number]
  /** Height above the origin, in units. */
  height?: number
  /** Drift speed along +X, in units/sec (0 holds still). */
  drift?: number
  color?: string
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/clouds.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/clouds.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add clouds</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
