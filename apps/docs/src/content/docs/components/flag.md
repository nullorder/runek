---
title: "Flag"
summary: "A cloth flag on a pole; the cloth ripples per-frame, pinned at the luff. Thin pole collider."
category: component
component: flag
order: 100
---

## Add it

```bash
npx @runek/cli add flag
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Flag } from './runek/Flag'

<Flag position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Flag", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `poleHeight` | `number` | `6` | Pole height, in units. |
| `fly` | `number` | `2.4` | Flag width away from the pole (the fly), in units. |
| `drop` | `number` | `1.5` | Flag height (the drop), in units. |
| `waveSpeed` | `number` | `3` | Ripple speed. |
| `waveAmplitude` | `number` | `0.22` | Ripple depth as a fraction of the fly. |
| `color` | `color` |  | Cloth color; defaults to the world palette's `fabric`. |
| `poleColor` | `color` |  | Pole color; defaults to the palette's `wood`. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/flag.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/flag.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add flag</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
