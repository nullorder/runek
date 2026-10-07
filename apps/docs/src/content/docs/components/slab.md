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

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Slab } from './runek/Slab'

<Slab position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Slab", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `[number, number]` | `[8, 8]` | Footprint `[width, depth]`, in units. The top surface sits at the component origin. |
| `shape` | `"pill" \| "disc"` | `"pill"` | `pill` is a rounded rectangle, `disc` an ellipse. |
| `cornerRadius` | `number` |  | Pill corner radius, in units; clamped to half the smaller extent (a full stadium). |
| `thickness` | `number` | `0.35` | Thickness, in units. |
| `curveSegments` | `number` | `24` | Curve smoothness of the rounded edges. |
| `color` | `color` | palette `wall` | Defaults to the world palette's `wall` slot. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/slab.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/slab.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add slab</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
