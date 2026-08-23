---
title: "Pool"
summary: "A built swimming pool flush with the deck: coping rim, walkable plastered basin with corner exit steps, and a translucent water surface."
category: component
component: pool
order: 100
---

## Add it

```bash
npx @runek/cli add pool
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.12.0`.

## Use it

```tsx
import { Pool } from './runek/Pool'

<Pool position={[0, 0, 0]} />
```

## Props

```ts
export interface PoolProps extends WorldComponentProps {
  /** Water surface `[width, depth]`, in units. */
  size?: [number, number]
  /** Basin depth below the deck, in units. */
  depth?: number
  /** Coping ledge width around the rim, in units. */
  coping?: number
  /** Build exit steps into one corner of the basin. */
  steps?: boolean
  /** Coping color; defaults to the world palette's `wall` slot. */
  copingColor?: string
  /** Basin plaster color. */
  basinColor?: string
  /** Defaults to the world palette's `waterShallow` slot. */
  waterColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/pool.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/pool.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add pool</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
