---
title: "Desk"
summary: "A work desk: a top over slim legs, a drawer pedestal, or side panels, with a modesty panel at the back. Base and drawers seeded, each pinnable. One cuboid collider."
category: component
component: desk
order: 100
---

## Add it

```bash
npx @runek/cli add desk
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Desk } from './runek/Desk'

<Desk position={[0, 0, 0]} />
```

## Props

```ts
export interface DeskProps extends WorldComponentProps {
  /** Width along local X, in units. */
  width?: number
  /** Depth along local Z, in units. The front, where you sit, faces +Z. */
  depth?: number
  /** Height of the work surface, in units. */
  height?: number
  /** Seeded when unset. */
  base?: DeskBase
  /** Drawers in the pedestal, 0 to 4. Seeded when unset; only a `pedestal` desk has them. */
  drawers?: number
  /** Top color; defaults to the palette's `wood`. */
  color?: string
  /** Legs, pedestal, and panels; defaults to the palette's `metal` for legs, else `woodDark`. */
  baseColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/desk.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/desk.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add desk</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
