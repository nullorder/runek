---
title: "PictureLight"
summary: "A brass picture light on one or two arms that washes the face below it: over a picture on a wall, or on the top of a bookshelf. Can light only after dusk."
category: component
component: picturelight
order: 100
---

## Add it

```bash
npx @runek/cli add picturelight
```

Pulls `@runek/core@^0.15.0`, `three@^0.184.0`.

## Use it

```tsx
import { PictureLight } from './runek/PictureLight'

<PictureLight position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "PictureLight", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `0.5` | Length of the hood, in units. |
| `reach` | `number` | `0.16` | How far the hood stands out from the mount, in units. |
| `fall` | `number` | `1.2` | How far below the mount the light falls, in units: the picture's or the shelf's height. |
| `color` | `color` |  | Hood, arms, and back plate; defaults to the palette's `accent` (brass). |
| `lightColor` | `color` | `"#ffe6c0"` | The light and the glowing bulb. |
| `intensity` | `number` | `6` | Light strength. |
| `on` | `boolean` | `true` | Switched on. |
| `nightOnly` | `boolean` | `false` | Light only while the world's sun is down. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/picturelight.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/picturelight.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add picturelight</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
