---
title: "Trees"
summary: "L-system trees grown by a 3D turtle, deterministic from seed."
category: component
component: trees
order: 100
---

## Add it

```bash
npx @runek/cli add trees
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Trees } from './runek/Trees'

<Trees position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Trees", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |
| `iterations` | `number` | `2` |  |
| `segmentLength` | `number` | `0.7` | Base branch length, in units. |
| `angle` | `number` | `0.5` | Branching angle, in radians. |
| `trunkColor` | `color` | palette `bark` | Defaults to the world palette's `bark` slot. |
| `leafColor` | `color` | palette `foliage` | Defaults to the world palette's `foliage` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/trees.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/trees.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add trees</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
