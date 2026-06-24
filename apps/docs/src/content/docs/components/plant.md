---
title: "Plant"
summary: "Potted plant: a tapered planter and a seeded cluster of foliage."
category: component
component: plant
order: 100
---

## Add it

```bash
npx @runek/cli add plant
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.9.0`, `three@^0.184.0`.

## Use it

```tsx
import { Plant } from './runek/Plant'

<Plant position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface PlantProps {
  position?: Vec3
  rotation?: Vec3
  height?: number
  /** Planter color; defaults to the world palette's `wood` slot. */
  potColor?: string
  /** Foliage color; defaults to the world palette's `foliage` slot. */
  foliageColor?: string
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/plant.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/plant.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add plant</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/plant)**.
