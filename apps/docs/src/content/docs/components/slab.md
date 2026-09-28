---
title: "Slab"
summary: "A rounded structural plate (pill or ellipse) for curved-modernist decks, cantilevered roofs, terraces, or a lawn disc. Walkable, with a single convex-hull collider."
category: component
component: slab
order: 100
---

## Add it

```bash
npx @runek/cli add slab
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Slab } from './runek/Slab'

<Slab position={[0, 0, 0]} />
```

## Props

```ts
export interface SlabProps extends WorldComponentProps {
  /** Footprint `[width, depth]`, in units. The top surface sits at the component origin. */
  size?: [number, number]
  /** `pill` is a rounded rectangle, `disc` an ellipse. */
  shape?: SlabShape
  /** Pill corner radius, in units; clamped to half the smaller extent (a full stadium). */
  cornerRadius?: number
  thickness?: number
  /** Curve smoothness of the rounded edges. */
  curveSegments?: number
  /** Defaults to the world palette's `wall` slot. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/slab.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/slab.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add slab</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
