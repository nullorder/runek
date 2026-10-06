---
title: "Pillar"
summary: "Column with a plinth, a tapered (optionally fluted) shaft, and a capital."
category: component
component: pillar
order: 100
---

## Add it

```bash
npx @runek/cli add pillar
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Pillar } from './runek/Pillar'

<Pillar position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Pillar", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `height` | `number` | `3` | Height, in units. |
| `radius` | `number` | `0.28` | Shaft radius at the base, in units. |
| `flutes` | `number` | `0` | Vertical flutes around the shaft; 0 = smooth. |
| `color` | `color` | palette `stone` | Defaults to the world palette's `stone` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/pillar.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/pillar.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add pillar</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
