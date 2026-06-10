---
title: "Shelf"
summary: "Wall shelf with planks."
category: component
component: shelf
order: 100
---

## Add it

```bash
npx runek add shelf
```

Pulls `core`, `@react-three/rapier@^2.2.0`.

## Use it

```tsx
import { Shelf } from './runek/Shelf'

<Shelf position={[0, 0, 0]} />
```

## Props

```ts
export interface ShelfProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  height?: number
  depth?: number
  shelves?: number
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}
```

See it live with editable props in the **[gallery →](/gallery/shelf)**.
