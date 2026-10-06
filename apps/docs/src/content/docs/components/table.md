---
title: "Table"
summary: "Table with a top on four legs, or on pedestals with rounded ends for a conference table."
category: component
component: table
order: 100
---

## Add it

```bash
npx @runek/cli add table
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Table } from './runek/Table'

<Table position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Table", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `width` | `number` | `1.2` | Width, in units. |
| `depth` | `number` | `0.8` | Depth, in units. |
| `height` | `number` | `0.75` | Height, in units. |
| `thickness` | `number` | `0.05` | Thickness, in units. |
| `base` | `"legs" \| "pedestal"` | `"legs"` | Four `legs` at the corners, or `pedestal` columns on crossed feet (one, or two for a table longer than 2 units): a conference table. |
| `ends` | `"square" \| "round"` | `"square"` | `round` makes the short ends semicircles: a racetrack top, as conference tables have. |
| `color` | `color` | palette `wood` | Defaults to the world palette's `wood` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/table.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/table.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add table</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
