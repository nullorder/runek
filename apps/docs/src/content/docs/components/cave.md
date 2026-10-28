---
title: "Cave"
summary: "The mouth of a sea cave: a seeded, faceted stone vault opening toward +Z, dark inside, with boulders fallen either side. Set it into a Cliff at the waterline. No collider, so a boat can go in."
category: component
component: cave
order: 100
---

## Add it

```bash
npx @runek/cli add cave
```

Pulls `@runek/core@^0.16.0`, `three@^0.184.0`.

## Use it

```tsx
import { Cave } from './runek/Cave'

<Cave position={[0, 0, 0]} radius={3.5} height={3.2} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Cave", "props": { "position": [0, 0, 0], "radius": 3.5, "height": 3.2, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `radius` | `number` | `3.5` | Radius of the hollow, in units. |
| `height` | `number` | `3.2` | Height of the vault over the origin, in units. |
| `mouth` | `number` | `1.1` | How wide the mouth is, in radians round the vault. |
| `color` | `color` | palette `stone` | Rock. Defaults to the world palette's `stone` slot, as `Cliff` does. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/cave.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/cave.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add cave</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
