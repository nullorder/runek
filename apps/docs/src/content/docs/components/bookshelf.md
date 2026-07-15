---
title: "Bookshelf"
summary: "Procedurally generated bookshelf with seeded books and one cuboid collider."
category: component
component: bookshelf
order: 100
---

## Add it

```bash
npx @runek/cli add bookshelf
```

Pulls `sign`, `@react-three/drei@^10.7.7`, `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.12.0`, `three@^0.184.0`.

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
  /**
   * Fraction of shelf space filled with procedural decoration, 0–1. Defaults to
   * `0` (an empty shelf); set it for a decorative, non-interactive shelf. Ignored
   * when `books` is set.
   */
  fill?: number
  /** Frame color. Defaults to the world palette's `wood` slot. */
  color?: string
  /** Back-panel color. Defaults to the world palette's `woodDark` slot. */
  backColor?: string
  seed?: number
  /**
   * Explicit, addressable books. When provided, these replace the procedural
   * `fill` and are the only books rendered. Pass `[]` for an empty shelf and
   * append to make books appear. A book is clickable when `onBookSelect` is set
   * or it carries an `href`.
   */
  books?: BookSpec[]
  /** Called with the clicked book. When omitted, a book's `href` is navigated to. */
  onBookSelect?: (book: BookSpec) => void
  /**
   * Section label rendered above the shelf, e.g. `"Guides"`. Drawn as a `Sign`
   * in the world's `display` face.
   */
  label?: string
  /** Label color. Defaults to the world palette's `accent` slot. */
  labelColor?: string
  /** Label cap height in units. */
  labelSize?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/bookshelf.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/bookshelf.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add bookshelf</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
