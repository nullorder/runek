---
title: "Rocks"
summary: "Faceted rocks with convex-hull colliders (seeded scatter)."
category: component
component: rocks
order: 100
---

## Add it

```bash
npx @runek/cli add rocks
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.0`.

## Use it

```tsx
import { Rocks } from './runek/Rocks'

<Rocks position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface RocksProps {
  position?: Vec3
  rotation?: Vec3
  count?: number
  /** Cluster radius, in units. */
  spread?: number
  /** Mean rock radius, in units. */
  size?: number
  hue?: number
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/rocks.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/rocks.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add rocks</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/rocks)**.
