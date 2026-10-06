---
title: "Whiteboard"
summary: "A whiteboard on a rolling stand or a wall, with seeded marker diagrams (boxes, arrows, lines of writing) and optional text across the top."
category: component
component: whiteboard
order: 100
---

## Add it

```bash
npx @runek/cli add whiteboard
```

Pulls `sign`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Whiteboard } from './runek/Whiteboard'

<Whiteboard position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Whiteboard", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `1.6` | Board width, in units. |
| `height` | `number` | `1` | Board height, in units. |
| `mount` | `"stand" \| "wall"` | `"stand"` |  |
| `text` | `string` |  | Written across the top of the board in marker. |
| `doodles` | `boolean` | `true` | Seeded marker diagrams (boxes, arrows, lines). Set false for a clean board. |
| `color` | `color` |  | Frame and stand; defaults to the palette's `metal`. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/whiteboard.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/whiteboard.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add whiteboard</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
