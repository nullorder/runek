---
title: "Bridge"
summary: "Plank deck spanning a gap, optionally arched, with railings and slab colliders that follow the deck."
category: component
component: bridge
order: 100
---

## Add it

```bash
npx @runek/cli add bridge
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`.

## Use it

```tsx
import { Bridge } from './runek/Bridge'

<Bridge position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Bridge", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `length` | `number` | `6` | Span along local X, in units. |
| `width` | `number` | `2` | Walkway width along local Z, in units. |
| `arch` | `number` | `0` | Arch rise at the center, in units (0 = flat). |
| `rails` | `boolean` | `true` | Side railings. |
| `color` | `color` | palette `wood` | Deck color; defaults to the world palette's `wood` slot. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/bridge.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/bridge.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add bridge</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
