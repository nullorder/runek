---
title: "Rocks"
summary: "Faceted rocks with convex-hull colliders (seeded scatter)."
category: component
component: rocks
order: 100
---

## Add it

```bash
npx @runek/cli add rocks
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Rocks } from './runek/Rocks'

<Rocks position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Rocks", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `count` | `number` | `6` |  |
| `spread` | `number` | `3` | Cluster radius, in units. |
| `size` | `number` | `0.6` | Mean rock radius, in units. |
| `hue` | `number` | `30` |  |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/rocks.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/rocks.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add rocks</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
