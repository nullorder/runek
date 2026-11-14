---
title: "Skyline"
summary: "A district seen from far off: a band of towers across part of the horizon with a few rooms lit and one landmark (spire, dome or stack) picked out in light, in two draws. Scenery past anywhere a body can reach: no colliders."
category: component
component: skyline
order: 100
---

## Add it

```bash
npx @runek/cli add skyline
```

Pulls `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Skyline } from './runek/Skyline'

<Skyline position={[0, 0, 0]} bearing={45} spread={70} landmark="spire" seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Skyline", "props": { "position": [0, 0, 0], "bearing": 45, "spread": 70, "landmark": "spire", "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Where the skyline is seen from [x, y, z] in units: the middle of the place it rings. |
| `rotation` | `[x, y, z]` |  | Accepted for the component contract. Turn a skyline with `bearing`. |
| `seed` | `number` | `1` | Deals out every tower: where it stands, how tall, how wide, which windows are lit. |
| `bearing` | `number` | `180` | Compass bearing of the middle of the district, in degrees: 0 is +Z, 90 is +X. |
| `spread` | `number` | `70` | How many degrees of the horizon it takes up. |
| `distance` | `number` | `620` | How far off its nearest towers stand, in units. Keep it and `depth` under the camera's far plane. |
| `depth` | `number` | `180` | How far back the district goes behind that, in units. |
| `count` | `number` | `60` | How many towers. |
| `heights` | `[number, number]` | `[50, 170]` | Shortest and tallest tower, in units. |
| `landmark` | `"dome" \| "spire" \| "stack"` |  | What stands over the district: a stepped `spire` with a lit collar, a `dome` in rings, or a squat `stack` with chimneys. |
| `landmarkHeight` | `number` | `380` | How tall the landmark is, in units. |
| `accent` | `color` | `"#3d5bff"` | The color of the landmark's lights. |
| `haze` | `color` | `"#1a2238"` | Haze color: the world's fog, so the district sinks into the horizon at its foot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/skyline.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/skyline.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add skyline</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
