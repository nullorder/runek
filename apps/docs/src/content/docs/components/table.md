---
title: "Table"
summary: "Table with a top on four legs, or on pedestals with rounded ends for a conference table."
category: component
component: table
order: 100
---

## Add it

```bash
npx @runek/cli add table
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Table } from './runek/Table'

<Table position={[0, 0, 0]} />
```

## Props

```ts
export interface TableProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  depth?: number
  height?: number
  thickness?: number
  /** Four `legs` at the corners, or `pedestal` columns on crossed feet (one, or two for a table
   *  longer than 2 units): a conference table. */
  base?: 'legs' | 'pedestal'
  /** `round` makes the short ends semicircles: a racetrack top, as conference tables have. */
  ends?: 'square' | 'round'
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/table.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/table.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add table</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
