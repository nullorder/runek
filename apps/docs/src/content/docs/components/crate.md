---
title: "Crate"
summary: "Slatted wooden crate with seeded plank shades; stacks via a cuboid collider."
category: component
component: crate
order: 100
---

## Add it

```bash
npx @runek/cli add crate
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.0`, `three@^0.184.0`.

## Use it

```tsx
import { Crate } from './runek/Crate'

<Crate position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface CrateProps {
  position?: Vec3
  rotation?: Vec3
  /** Edge length, in units. */
  size?: number
  /** Plank color; defaults to the world palette's `wood` slot. */
  color?: string
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/crate.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/crate.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add crate</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/crate)**.
