---
title: "Bench"
summary: "Slatted bench with an optional backrest; indoor or outdoor seating."
category: component
component: bench
order: 100
---

## Add it

```bash
npx @runek/cli add bench
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`.

## Use it

```tsx
import { Bench } from './runek/Bench'

<Bench position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Bench", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `length` | `number` | `1.6` | Length, in units. |
| `depth` | `number` | `0.5` | Depth, in units. |
| `seatHeight` | `number` | `0.45` |  |
| `back` | `boolean` | `true` | Include a backrest. |
| `color` | `color` | palette `wood` | Defaults to the world palette's `wood` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/bench.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/bench.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add bench</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
