---
title: "Campfire"
summary: "Stone ring, a tepee of logs, and an animated flame with a warm flickering light."
category: component
component: campfire
order: 100
---

## Add it

```bash
npx @runek/cli add campfire
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Campfire } from './runek/Campfire'

<Campfire position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Campfire", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `radius` | `number` | `0.5` | Radius, in units. |
| `logColor` | `color` | palette `wood` | Log color; defaults to the world palette's `wood` slot. |
| `flameColor` | `color` | `"#ff7a1a"` |  |
| `intensity` | `number` | `14` |  |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/campfire.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/campfire.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add campfire</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
