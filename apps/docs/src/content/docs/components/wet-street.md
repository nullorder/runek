---
title: "WetStreet"
summary: "A rain-soaked asphalt street with kerbs: puddles from world-space noise and in the gutters, darkened glossy asphalt, lane, edge and centre paint, zebras at crossings, and reflections from the world's shared mirror, full in standing water and faint on damp asphalt. A mounted `Rain` rings the puddles and dries and soaks the street with its weather. Decorative: no collider."
category: component
component: wet-street
order: 100
---

## Add it

```bash
npx @runek/cli add wet-street
```

Pulls `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { WetStreet } from './runek/WetStreet'

<WetStreet position={[0, 0, 0]} length={24} width={9} puddles={0.6} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "WetStreet", "props": { "position": [0, 0, 0], "length": 24, "width": 9, "puddles": 0.6, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | `12` | Length along local Z, in units. |
| `width` | `number` | `7` | Width along local X, kerb to kerb, in units. |
| `color` | `color` |  | Asphalt color; defaults to the palette's `stone`. |
| `kerbColor` | `color` |  | Kerb color; defaults to the palette's `floor` (the pavement). |
| `wetness` | `number` | `0.85` | How wet the street is when the weather has soaked it, 0 (dry) to 1 (soaked). |
| `puddles` | `number` | `0.5` | How much of the street stands in puddles then, 0 to 1. |
| `markings` | `boolean` | `true` | Paint lane and edge lines, and a zebra at each crossing. |
| `paint` | `color` | `"#ece6da"` | Lane, edge and zebra paint. |
| `centrePaint` | `color` | `"#c98a3e"` | The centre line. |
| `crossings` | `StreetCrossing[]` | `[]` | Cross streets: no kerbs, lines or gutters inside them, a zebra either side. At most four. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `0` | Seed for the deterministic variation: same seed, same result. |

### `StreetCrossing`

| Prop | Type | Default | Description |
|---|---|---|---|
| `at` | `number` | **required** |  |
| `width` | `number` | **required** |  |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/wet-street.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/wet-street.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add wet-street</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
