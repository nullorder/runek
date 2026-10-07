---
title: "OfficeChair"
summary: "A swivel office chair: five-star base on casters, gas column, padded seat, low or high back, optional arms. Seats a Person in sit or type pose."
category: component
component: officechair
order: 100
---

## Add it

```bash
npx @runek/cli add officechair
```

Pulls `@react-three/drei@^10.7.7`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`.

## Use it

```tsx
import { OfficeChair } from './runek/OfficeChair'

<OfficeChair position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "OfficeChair", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `seatHeight` | `number` | `0.47` | Top of the seat cushion, in units. |
| `back` | `"low" \| "high"` |  | Seeded when unset. |
| `arms` | `boolean` |  | Armrests. Seeded when unset. |
| `color` | `color` |  | Seat and back; defaults to the palette's `fabric`. |
| `frameColor` | `color` |  | Base, column, and arms; defaults to the palette's `metal`. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/officechair.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/officechair.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add officechair</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
