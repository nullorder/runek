---
title: "MagazineRack"
summary: "A freestanding magazine rack: side panels and a back leaning back, sloped tiers with a lip holding magazines covers out, and newspapers on the foot. Covers shared with Newspapers. One cuboid collider."
category: component
component: magazine-rack
order: 100
---

## Add it

```bash
npx @runek/cli add magazine-rack
```

Pulls `newspapers`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { MagazineRack } from './runek/MagazineRack'

<MagazineRack position={[0, 0, 0]} tiers={3} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "MagazineRack", "props": { "position": [0, 0, 0], "tiers": 3, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `0.6` | Across, in units. |
| `tiers` | `number` | `3` | Sloped tiers of magazines, 1 to 4. |
| `color` | `color` | palette `woodDark` | Defaults to the world palette's `woodDark` slot. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/magazine-rack.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/magazine-rack.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add magazine-rack</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
