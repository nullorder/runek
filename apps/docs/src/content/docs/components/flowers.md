---
title: "Flowers"
summary: "Instanced seeded wildflowers (stem + colored head) scattered over a patch."
category: component
component: flowers
order: 100
---

## Add it

```bash
npx @runek/cli add flowers
```

Pulls `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Flowers } from './runek/Flowers'

<Flowers position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Flowers", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `area` | `[number, number]` | `[6, 6]` | Patch extent `[width, depth]`, in units. |
| `count` | `number` | `60` |  |
| `height` | `number` | `0.4` | Height, in units. |
| `stemColor` | `color` | palette `foliage` | Stem color; defaults to the world palette's `foliage` slot. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/flowers.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/flowers.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add flowers</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
