---
title: "Book"
summary: "A single procedural book — standing, lying, or open — with a seeded cover and optional click interaction; the standalone sibling of Bookshelf's instanced spines."
category: component
component: book
order: 100
---

## Add it

```bash
npx @runek/cli add book
```

Pulls `@react-three/drei@^10.7.7`, `@runek/core@^0.12.0`.

## Use it

```tsx
import { Book } from './runek/Book'

<Book position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface BookProps {
  position?: Vec3
  rotation?: Vec3
  /** Cover width (spine to fore-edge), in units. */
  width?: number
  /** Spine length, in units. */
  height?: number
  /** Closed page-block thickness, in units. */
  thickness?: number
  /**
   * `lying` rests on its back cover (spine on the -x edge); `standing` stands
   * upright on its bottom edge; `open` lies opened flat at the spine.
   */
  pose?: BookPose
  /** Cover color. Defaults to a seeded cloth-bound color. */
  color?: string
  pageColor?: string
  /** Shown as a hover label when the book is interactive. */
  title?: string
  /** Navigated to on click when no `onSelect` is given. */
  href?: string
  /** Called on click. Optional, so the book still renders from data. */
  onSelect?: () => void
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/book.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/book.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add book</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
