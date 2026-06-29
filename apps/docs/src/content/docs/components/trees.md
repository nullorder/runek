---
title: "Trees"
summary: "L-system trees grown by a 3D turtle, deterministic from seed."
category: component
component: trees
order: 100
---

## Add it

```bash
npx @runek/cli add trees
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`, `three@^0.184.0`.

## Use it

```tsx
import { Trees } from './runek/Trees'

<Trees position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface TreesProps {
  position?: Vec3
  rotation?: Vec3
  seed?: number
  iterations?: number
  /** Base branch length, in units. */
  segmentLength?: number
  /** Branching angle, in radians. */
  angle?: number
  /** Defaults to the world palette's `bark` slot. */
  trunkColor?: string
  /** Defaults to the world palette's `foliage` slot. */
  leafColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/trees.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/trees.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add trees</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
