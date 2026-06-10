---
title: "Bookshelf"
summary: "Procedurally generated bookshelf with seeded books and one cuboid collider."
category: component
component: bookshelf
order: 100
---

## Add it

```bash
npx runek add bookshelf
```

Pulls `core`, `@react-three/rapier@^2.2.0`, `three@^0.184.0`.

## Use it

```tsx
import { Bookshelf } from './runek/Bookshelf'

<Bookshelf position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface BookshelfProps {
  position?: Vec3
  rotation?: Vec3
  /** Outer dimensions in units. */
  width?: number
  height?: number
  depth?: number
  shelves?: number
  /** Fraction of shelf space filled with books, 0–1. */
  fill?: number
  /** Frame color. Defaults to the world palette's `wood` slot. */
  color?: string
  /** Back-panel color. Defaults to the world palette's `woodDark` slot. */
  backColor?: string
  seed?: number
}
```

See it live with editable props in the **[gallery →](/gallery/bookshelf)**.
