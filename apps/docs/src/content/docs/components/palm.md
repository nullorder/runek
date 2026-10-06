---
title: "Palm"
summary: "A coconut palm: leaning bowed trunk and a crown of drooping instanced fronds, deterministic from seed."
category: component
component: palm
order: 100
---

## Add it

```bash
npx @runek/cli add palm
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Palm } from './runek/Palm'

<Palm position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Palm", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `height` | `number` | `6` | Trunk height, in units. |
| `lean` | `number` | `0.18` | Sideways lean of the crown, as a fraction of height. |
| `fronds` | `number` | `11` | Frond count. |
| `frondLength` | `number` | `2.2` | Frond length, in units. |
| `trunkColor` | `color` | palette `bark` | Defaults to the world palette's `bark` slot. |
| `frondColor` | `color` | palette `foliage` | Defaults to the world palette's `foliage` slot. |
| `coconuts` | `boolean` | `true` | Grow a coconut cluster under the crown. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/palm.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/palm.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add palm</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
