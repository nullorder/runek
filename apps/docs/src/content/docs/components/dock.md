---
title: "Dock"
summary: "A plank jetty on pilings reaching out over water; walkable deck colliders, side stringers, and seaward mooring posts."
category: component
component: dock
order: 100
---

## Add it

```bash
npx @runek/cli add dock
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Dock } from './runek/Dock'

<Dock position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Dock", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | `10` | How far the jetty reaches out from the shore (local +Z), in units. |
| `width` | `number` | `3` | Walkway width (local X), in units. |
| `depth` | `number` | `4` | How deep the pilings sink below the deck surface, in units. |
| `color` | `color` |  | Deck color; defaults to the world palette's `wood`. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/dock.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/dock.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add dock</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
