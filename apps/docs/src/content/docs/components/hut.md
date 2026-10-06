---
title: "Hut"
summary: "A round hut: a post-ribbed wall on a stone base, a framed doorway and window, under a shaggy thatch cone; one cylinder collider."
category: component
component: hut
order: 100
---

## Add it

```bash
npx @runek/cli add hut
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Hut } from './runek/Hut'

<Hut position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Hut", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `radius` | `number` | `3` | Wall radius, in units. |
| `wallHeight` | `number` | `2.9` | Wall height at the eaves, in units. |
| `roofHeight` | `number` | `1.5` | Conical roof height above the eaves, in units. |
| `doorWidth` | `number` | `1.3` | Doorway width at the front (local +Z), in units. |
| `wallColor` | `color` |  | Wall color; defaults to the palette's `wall`. |
| `roofColor` | `color` |  | Roof color; defaults to the palette's `roof`. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/hut.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/hut.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add hut</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
