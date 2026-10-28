---
title: "NeonStrip"
summary: "A neon tube along local X: a white-hot core in a coloured sleeve with a soft halo, glowing at any hour. Decorative; light washes nearby walls in its colour through the world's light pool."
category: component
component: neon-strip
order: 100
---

## Add it

```bash
npx @runek/cli add neon-strip
```

Pulls `@runek/core@^0.16.0`.

## Use it

```tsx
import { NeonStrip } from './runek/NeonStrip'

<NeonStrip position={[0, 0, 0]} length={2} color="#2fd8ff" light={true} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "NeonStrip", "props": { "position": [0, 0, 0], "length": 2, "color": "#2fd8ff", "light": true } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | `2` | Length along local X, in units, centred on the origin. |
| `color` | `color` | `"#ff2fb3"` | The glow. |
| `thickness` | `number` | `0.03` | Tube diameter, in units. |
| `light` | `boolean` | `false` | Cast real light as well as glowing, from the middle of the tube. Leave it off on most strips: the world lends real lights to only a few emitters at a time. |
| `intensity` | `number` | `3` |  |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/neon-strip.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/neon-strip.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add neon-strip</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
