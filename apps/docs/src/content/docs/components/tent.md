---
title: "Tent"
summary: "An A-frame ridge tent: striped wind-rippled fabric, entrance flaps pinned open, guy ropes and stakes; solid sides and back, open front."
category: component
component: tent
order: 100
---

## Add it

```bash
npx @runek/cli add tent
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Tent } from './runek/Tent'

<Tent position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Tent", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `3` | Width across the tent (local X), in units. |
| `depth` | `number` | `3.6` | Depth front-to-back (local Z); the entrance faces +Z. |
| `height` | `number` | `2.2` | Ridge height, in units. |
| `color` | `color` |  | Fabric color; defaults to the palette's `fabric`. |
| `stripeColor` | `color` |  | Alternate stripe color; defaults to the palette's `wall`. |
| `poleColor` | `color` |  | Pole color; defaults to the palette's `woodDark`. |
| `wind` | `number` | `0.05` | Billow depth as a fraction of the width. |
| `windSpeed` | `number` | `2.5` | Wind ripple speed. |
| `sag` | `number` | `0.03` | Static inward drape of the fabric between ridge and ground, as a fraction of the width. |
| `collider` | `boolean` | `true` | Solid walls (the two sides + the back) you can't walk through; the front stays open. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/tent.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/tent.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add tent</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
