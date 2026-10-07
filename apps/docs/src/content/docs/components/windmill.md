---
title: "Windmill"
summary: "A tapered tower with a conical cap and four sails that turn each frame; tower collider, seeded blade phase."
category: component
component: windmill
order: 100
---

## Add it

```bash
npx @runek/cli add windmill
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Windmill } from './runek/Windmill'

<Windmill position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Windmill", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `height` | `number` | `7` | Tower height, in units. |
| `radius` | `number` | `2` | Tower base radius, in units. |
| `sailLength` | `number` | `4.5` | Sail (blade) length, in units. |
| `sailSpeed` | `number` | `0.4` | Sail rotation speed, in radians per second. |
| `color` | `color` |  | Tower color (defaults to the world palette's `wall`). |
| `trimColor` | `color` |  | Cap, door, and sail-frame color (defaults to the world palette's `wood`). |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/windmill.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/windmill.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add windmill</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
