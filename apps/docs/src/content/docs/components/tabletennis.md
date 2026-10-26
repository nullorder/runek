---
title: "TableTennis"
summary: "A regulation table tennis table with its lines, a net, a folding undercarriage, and paddles and a ball left on it."
category: component
component: tabletennis
order: 100
---

## Add it

```bash
npx @runek/cli add tabletennis
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.16.0`.

## Use it

```tsx
import { TableTennis } from './runek/TableTennis'

<TableTennis position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "TableTennis", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `color` |  | The playing top. Seeded (blue or green) when unset. |
| `lineColor` | `color` | `"#f4f4f4"` | White lines along the edges and down the middle. |
| `frameColor` | `color` |  | Legs and net posts; defaults to the palette's `metal`. |
| `paddles` | `boolean` | `true` | Two paddles lying on the table. |
| `ball` | `boolean` | `true` | A ball on the table. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/tabletennis.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/tabletennis.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add tabletennis</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
