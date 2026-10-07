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

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Cliff } from './runek/Cliff'

<Cliff position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Cliff", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `radius` | `number` | `10` | Base radius at the waterline, in units. |
| `topRadius` | `number` | `6` | Plateau (top) radius, in units. |
| `height` | `number` | `12` | Height from the base to the plateau, in units. |
| `segments` | `number` | `8` | Radial facets — fewer reads as blockier rock. |
| `rough` | `number` | `0.35` | Surface jitter, as a fraction of a facet. |
| `color` | `color` |  | Rock color; defaults to the palette's `stone`. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/cliff.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/cliff.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add cliff</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
