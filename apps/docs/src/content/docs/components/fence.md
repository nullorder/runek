---
title: "Fence"
summary: "Posts and rails with seeded weathering; encloses yards and paths. One footprint collider."
category: component
component: fence
order: 100
---

## Add it

```bash
npx @runek/cli add fence
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.9.0`.

## Use it

```tsx
import { Fence } from './runek/Fence'

<Fence position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface FenceProps {
  position?: Vec3
  rotation?: Vec3
  /** Total length along local X, in units. */
  length?: number
  height?: number
  /** Spacing between posts, in units. */
  postSpacing?: number
  /** Number of horizontal rails. */
  rails?: number
  /** Defaults to the world palette's `wood` slot. */
  color?: string
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/fence.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/fence.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add fence</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/fence)**.
