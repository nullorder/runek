---
title: "Table"
summary: "Table with a top and four legs."
category: component
component: table
order: 100
---

## Add it

```bash
npx @runek/cli add table
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.6.0`.

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

See it live with editable props in the **[gallery →](/gallery/table)**.
