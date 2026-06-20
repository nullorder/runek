---
title: "Staircase"
summary: "Stepped staircase with per-step colliders."
category: component
component: staircase
order: 100
---

## Add it

```bash
npx @runek/cli add staircase
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.6.0`.

## Use it

```tsx
import { Staircase } from './runek/Staircase'

<Staircase position={[0, 0, 0]} />
```

## Props

```ts
export interface StaircaseProps {
  position?: Vec3
  rotation?: Vec3
  steps?: number
  /** Total rise, in units. Ascends along +y and +z from the origin. */
  totalHeight?: number
  width?: number
  /** Total run (depth), in units. */
  depth?: number
  /** Defaults to the world palette's `stone` slot. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/staircase.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/staircase.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add staircase</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/staircase)**.
