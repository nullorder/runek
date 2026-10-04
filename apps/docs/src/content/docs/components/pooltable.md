---
title: "PoolTable"
summary: "A pool table with rails, cushions, six pockets, and sixteen instanced balls, racked or scattered mid-game."
category: component
component: pooltable
order: 100
---

## Add it

```bash
npx @runek/cli add pooltable
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { PoolTable } from './runek/PoolTable'

<PoolTable position={[0, 0, 0]} />
```

## Props

```ts
export interface PoolTableProps extends WorldComponentProps {
  /** Outer length along local X, in units. */
  length?: number
  /** Outer width along local Z, in units. */
  width?: number
  /** Height of the playing surface, in units. */
  height?: number
  /** Seeded when unset. */
  balls?: PoolBalls
  /** The cloth. Seeded from a few classic colors when unset. */
  color?: string
  /** Rails and legs; defaults to the palette's `wood`. */
  frameColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/pooltable.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/pooltable.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add pooltable</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
