---
title: "Compass"
summary: "A screen-fixed HUD compass: a glassy dial in a corner of the canvas whose rose card swings with the camera heading, with a fixed lubber line and an optional wind + bearing readout — works with any traversal that drives the camera (on foot or at a vehicle's chase-cam)."
category: component
component: compass
order: 100
---

## Add it

```bash
npx @runek/cli add compass
```

Pulls `@react-three/drei@^10.7.7`, `@react-three/fiber@^9.6.1`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Compass } from './runek/Compass'

<Compass position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Compass", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `corner` | `"top-left" \| "top-right" \| "bottom-left" \| "bottom-right"` | `"bottom-left"` | Screen corner the dial sits in. |
| `size` | `number` | `108` | Dial diameter, in CSS px (shrinks ~22% on narrow viewports). |
| `inset` | `[number, number]` | `[16, 16]` | Inset from the corner edges, in CSS px `[x, y]`. |
| `readout` | `boolean` | `true` | Show the wind + bearing readout pill under the dial. |
| `north` | `number` | `0` | World yaw (radians) the dial reads as north, using the same convention as `Player`/`Helm` yaw: 0 faces +Z, so the default makes +Z north (and -X east). |
| `accentColor` | `color` | `"#c0392b"` | North needle + north letter color. Compass-north red; no palette slot fits. |
| `position` | `[x, y, z]` |  | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` |  | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/compass.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/compass.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add compass</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
