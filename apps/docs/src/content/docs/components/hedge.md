---
title: "Hedge"
summary: "A trimmed green wall with seeded surface tufts; blocks like a Wall."
category: component
component: hedge
order: 100
---

## Add it

```bash
npx @runek/cli add hedge
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.9.0`, `three@^0.184.0`.

## Use it

```tsx
import { Hedge } from './runek/Hedge'

<Hedge position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface HedgeProps {
  position?: Vec3
  rotation?: Vec3
  /** Length along local X, in units. */
  length?: number
  height?: number
  depth?: number
  /** Defaults to the world palette's `foliage` slot. */
  color?: string
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/hedge.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/hedge.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add hedge</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/hedge)**.
