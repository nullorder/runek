---
title: "AcousticPanel"
summary: "A fabric-wrapped acoustic absorber panel proud of a slim frame, wall-mounted from its back like Poster, or turned face down as a ceiling cloud. Seeded fabric. Decorative."
category: component
component: acoustic-panel
order: 100
---

## Add it

```bash
npx @runek/cli add acoustic-panel
```

Pulls `@runek/core@^0.17.0`.

## Use it

```tsx
import { AcousticPanel } from './runek/AcousticPanel'

<AcousticPanel position={[0, 0, 0]} width={0.6} height={1.2} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "AcousticPanel", "props": { "position": [0, 0, 0], "width": 0.6, "height": 1.2, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `0.6` | Width, in units. |
| `height` | `number` | `1.2` | Height, in units. |
| `depth` | `number` | `0.05` | Out from the wall, in units. |
| `color` | `color` |  | The fabric. Seeded from muted studio colours when unset. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/acoustic-panel.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/acoustic-panel.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add acoustic-panel</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
