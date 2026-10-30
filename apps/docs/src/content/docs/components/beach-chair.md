---
title: "BeachChair"
summary: "A sun lounger for a beach or pool deck: a slatted frame on four legs along local Z, a flat bed and a back raised on a hinge (recline), cushioned. Seeded cushion and teak or white frame. One cuboid collider round the bed."
category: component
component: beach-chair
order: 100
---

## Add it

```bash
npx @runek/cli add beach-chair
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.16.0`.

## Use it

```tsx
import { BeachChair } from './runek/BeachChair'

<BeachChair position={[0, 0, 0]} recline={0.7} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "BeachChair", "props": { "position": [0, 0, 0], "recline": 0.7, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | `1.9` | Along local Z, in units. |
| `width` | `number` | `0.66` | Width, in units. |
| `height` | `number` | `0.36` | To the top of the cushion on the bed, in units. |
| `recline` | `number` | `0.7` | How far the back is raised from flat, in radians. |
| `color` | `color` |  | The cushion. Seeded from beach colours when unset. |
| `frameColor` | `color` |  | The frame. Seeded teak or white when unset. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/beach-chair.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/beach-chair.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add beach-chair</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
