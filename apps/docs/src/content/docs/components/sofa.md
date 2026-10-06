---
title: "Sofa"
summary: "A sofa seating one to four: upholstered frame, seat and back cushions in soft shades of the fabric, square, rolled, or slim arms, pegs or a plinth, and throw pillows. Seeded, each choice pinnable."
category: component
component: sofa
order: 100
---

## Add it

```bash
npx @runek/cli add sofa
```

Pulls `@react-three/drei@^10.7.7`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Sofa } from './runek/Sofa'

<Sofa position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Sofa", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `seats` | `number` | `3` | Seats across, 1 to 4. |
| `depth` | `number` | `0.9` | Depth along local Z, in units. Seats face +Z. |
| `seatHeight` | `number` | `0.44` | Top of the seat cushions, in units. |
| `arms` | `"slim" \| "none" \| "square" \| "rolled"` |  | Seeded when unset. |
| `cushions` | `"split" \| "bench"` |  | Seeded when unset. |
| `legs` | `"pegs" \| "plinth"` |  | Seeded when unset. |
| `pillows` | `number` |  | Throw pillows, 0 to 2. Seeded when unset. |
| `color` | `color` |  | Upholstery; defaults to the palette's `fabric`. |
| `pillowColor` | `color` |  | Throw pillows; defaults to the palette's `accent`. |
| `legColor` | `color` |  | Legs; defaults to the palette's `woodDark`. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/sofa.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/sofa.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add sofa</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
