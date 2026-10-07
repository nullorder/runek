---
title: "Bush"
summary: "Clustered foliage blobs, seeded; the mid-height density between Grass and Trees."
category: component
component: bush
order: 100
---

## Add it

```bash
npx @runek/cli add bush
```

Pulls `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Bush } from './runek/Bush'

<Bush position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Bush", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `radius` | `number` | `0.6` | Overall radius, in units. |
| `blobs` | `number` | `7` | Number of foliage blobs. |
| `color` | `color` | palette `foliage` | Defaults to the world palette's `foliage` slot. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/bush.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/bush.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add bush</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
