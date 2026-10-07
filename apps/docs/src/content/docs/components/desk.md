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

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`.

## Use it

```tsx
import { Desk } from './runek/Desk'

<Desk position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Desk", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `1.4` | Width along local X, in units. |
| `depth` | `number` | `0.7` | Depth along local Z, in units. The front, where you sit, faces +Z. |
| `height` | `number` | `0.75` | Height of the work surface, in units. |
| `base` | `"legs" \| "pedestal" \| "panels"` |  | Seeded when unset. |
| `drawers` | `number` |  | Drawers in the pedestal, 0 to 4. Seeded when unset; only a `pedestal` desk has them. |
| `color` | `color` |  | Top color; defaults to the palette's `wood`. |
| `baseColor` | `color` |  | Legs, pedestal, and panels; defaults to the palette's `metal` for legs, else `woodDark`. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/desk.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/desk.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add desk</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
