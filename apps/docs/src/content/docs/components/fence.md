---
title: "Fence"
summary: "Posts and rails with seeded weathering; encloses yards and paths. One footprint collider."
category: component
component: fence
order: 100
---

## Add it

```bash
npx @runek/cli add fence
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Fence } from './runek/Fence'

<Fence position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Fence", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `length` | `number` | `6` | Total length along local X, in units. |
| `height` | `number` | `1.1` | Height, in units. |
| `postSpacing` | `number` | `1.5` | Spacing between posts, in units. |
| `rails` | `number` | `2` | Number of horizontal rails. |
| `color` | `color` | palette `wood` | Defaults to the world palette's `wood` slot. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/fence.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/fence.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add fence</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
