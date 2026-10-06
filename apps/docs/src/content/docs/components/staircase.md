---
title: "Staircase"
summary: "Stepped staircase with per-step colliders."
category: component
component: staircase
order: 100
---

## Add it

```bash
npx @runek/cli add staircase
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Staircase } from './runek/Staircase'

<Staircase position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Staircase", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `steps` | `number` | `6` |  |
| `totalHeight` | `number` | `1.5` | Total rise, in units. Ascends along +y and +z from the origin. |
| `width` | `number` | `1.2` | Width, in units. |
| `depth` | `number` | `2.4` | Total run (depth), in units. |
| `color` | `color` | palette `stone` | Defaults to the world palette's `stone` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/staircase.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/staircase.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add staircase</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
