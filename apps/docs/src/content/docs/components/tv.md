---
title: "Tv"
summary: "A flat-screen TV on a stand, a low media console, or a wall. Switched on, it shows a seeded picture (sky, sun, hills) drawn from flat shapes."
category: component
component: tv
order: 100
---

## Add it

```bash
npx @runek/cli add tv
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Tv } from './runek/Tv'

<Tv position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Tv", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `1.2` | Screen width, in units. |
| `mount` | `"stand" \| "console" \| "wall"` |  | `stand` and `console` are seeded when unset; `wall` must be asked for. On a wall the origin is the middle of the screen with its back against the wall (local -Z). |
| `on` | `boolean` | `true` | Showing a seeded picture (a sky, a sun, hills) in this tint, or dark glass when off. |
| `screen` | `color` |  | Picture tint. Seeded when unset. |
| `color` | `color` |  | Bezel and stand; defaults to the palette's `metal`. |
| `consoleColor` | `color` |  | The console's wood; defaults to the palette's `woodDark`. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/tv.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/tv.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add tv</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
