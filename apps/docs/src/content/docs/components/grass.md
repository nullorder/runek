---
title: "Grass"
summary: "Instanced grass blades (seeded scatter)."
category: component
component: grass
order: 100
---

## Add it

```bash
npx @runek/cli add grass
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Grass } from './runek/Grass'

<Grass position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface GrassProps {
  position?: Vec3
  rotation?: Vec3
  /** Patch extent `[width, depth]`, in units. */
  area?: [number, number]
  count?: number
  height?: number
  /** Defaults to the world palette's `foliage` slot. */
  color?: string
  /** Wind sway strength; 0 disables the animation. */
  sway?: number
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/grass.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/grass.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add grass</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
