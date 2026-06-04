---
title: Bookshelf
summary: A procedurally generated bookshelf with seeded books and a single cuboid collider.
category: component
order: 20
component: bookshelf
---

The canonical Runek component. The frame and shelf planks are fixed geometry; the
books are generated from the `seed` — their count, widths, heights, and colors all
roll deterministically. Collision is **one cuboid** for the whole unit, not one
collider per book: collider count tracks gameplay surface, not visual detail.

## Add it

```bash
npx runek add bookshelf
```

This pulls `Bookshelf.tsx` plus `core`, and installs `@react-three/rapier`.

## Use it

```tsx
import { Bookshelf } from './runek/Bookshelf'

<Bookshelf position={[0, 1, 0]} seed={42} shelves={5} fill={0.8} />
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | World position, in units (1 unit = 1 m). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation in radians. |
| `width` | `number` | `1.2` | Outer width. |
| `height` | `number` | `2` | Outer height. |
| `depth` | `number` | `0.3` | Outer depth. |
| `shelves` | `number` | `4` | Number of shelves. |
| `fill` | `number` | `0.7` | Fraction of shelf space filled with books, `0`–`1`. |
| `seed` | `number` | `1` | Seed for the book layout. Same seed → same books. |
