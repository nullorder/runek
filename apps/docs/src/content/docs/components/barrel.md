---
title: "Barrel"
summary: "Staved barrel bellied at the middle, banded by metal hoops; convex-hull collider."
category: component
component: barrel
order: 100
---

## Add it

```bash
npx @runek/cli add barrel
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`.

## Use it

```tsx
import { Barrel } from './runek/Barrel'

<Barrel position={[0, 0, 0]} />
```

## Props

```ts
export interface BarrelProps {
  position?: Vec3
  rotation?: Vec3
  radius?: number
  height?: number
  /** Stave color; defaults to the world palette's `wood` slot. */
  color?: string
  /** Hoop color; defaults to the world palette's `metal` slot. */
  hoopColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/barrel.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/barrel.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add barrel</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
