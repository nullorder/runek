---
title: "Lighthouse"
summary: "A banded lighthouse with a gallery, a glazed lantern and a lamp whose two beams sweep round after dusk; the lamp lights its surroundings through the world's light pool. One cylinder collider."
category: component
component: lighthouse
order: 100
---

## Add it

```bash
npx @runek/cli add lighthouse
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.16.0`, `three@^0.184.0`.

## Use it

```tsx
import { Lighthouse } from './runek/Lighthouse'

<Lighthouse position={[0, 0, 0]} height={12} nightOnly={false} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Lighthouse", "props": { "position": [0, 0, 0], "height": 12, "nightOnly": false } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `height` | `number` | `12` | Height of the tower to the gallery, in units. |
| `radius` | `number` | `1.6` | Radius at the foot, in units; it tapers to two thirds of this at the top. |
| `bands` | `number` | `5` | Bands of colour up the tower. |
| `color` | `color` | `"#f4f1ea"` |  |
| `bandColor` | `color` | `"#c0392b"` |  |
| `lightColor` | `color` | `"#fff2c4"` | The lamp and its beams. |
| `speed` | `number` | `0.6` | How fast the beams sweep round, in radians a second. |
| `nightOnly` | `boolean` | `true` | Shine only while the world's sun is down. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/lighthouse.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/lighthouse.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add lighthouse</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
