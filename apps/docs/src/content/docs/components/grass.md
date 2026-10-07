---
title: "Grass"
summary: "Instanced grass blades (seeded scatter)."
category: component
component: grass
order: 100
---

## Add it

```bash
npx @runek/cli add grass
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Grass } from './runek/Grass'

<Grass position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Grass", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `area` | `[number, number]` | `[10, 10]` | Patch extent `[width, depth]`, in units. |
| `count` | `number` | `600` |  |
| `height` | `number` | `0.35` | Height, in units. |
| `color` | `color` | palette `foliage` | Defaults to the world palette's `foliage` slot. |
| `sway` | `number` | `1` | Wind sway strength; 0 disables the animation. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/grass.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/grass.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add grass</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
