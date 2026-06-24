---
title: "Shelf"
summary: "Wall shelf with planks."
category: component
component: shelf
order: 100
---

## Add it

```bash
npx @runek/cli add shelf
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.9.0`.

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

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/shelf.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/shelf.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add shelf</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/shelf)**.
