---
title: "Cliff"
summary: "A rocky promontory: a low-poly, seed-jittered truncated cone with a flattish plateau and a convex-hull collider."
category: component
component: cliff
order: 100
---

## Add it

```bash
npx @runek/cli add cliff
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`, `three@^0.184.0`.

## Use it

```tsx
import { Cliff } from './runek/Cliff'

<Cliff position={[0, 0, 0]} />
```

## Props

```ts
export interface CliffProps extends WorldComponentProps {
  /** Base radius at the waterline, in units. */
  radius?: number
  /** Plateau (top) radius, in units. */
  topRadius?: number
  /** Height from the base to the plateau, in units. */
  height?: number
  /** Radial facets — fewer reads as blockier rock. */
  segments?: number
  /** Surface jitter, as a fraction of a facet. */
  rough?: number
  /** Rock color; defaults to the palette's `stone`. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/cliff.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/cliff.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add cliff</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
