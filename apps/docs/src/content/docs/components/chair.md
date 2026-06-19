---
title: "Chair"
summary: "Chair with seat, back, and legs."
category: component
component: chair
order: 100
---

## Add it

```bash
npx @runek/cli add chair
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.6.0`.

## Use it

```tsx
import { Chair } from './runek/Chair'

<Chair position={[0, 0, 0]} />
```

## Props

```ts
export interface ChairProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  depth?: number
  seatHeight?: number
  backHeight?: number
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/chair.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/chair.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add chair</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/chair)**.
