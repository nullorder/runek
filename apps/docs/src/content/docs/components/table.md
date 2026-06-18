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

Pulls `core`, `@react-three/rapier@^2.2.0`.

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

See it live with editable props in the **[gallery →](/gallery/table)**.
