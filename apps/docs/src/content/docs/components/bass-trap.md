---
title: "BassTrap"
summary: "A floor-to-ceiling corner bass trap: a foam column with a plinth and cap, origin on the corner with the room toward +X and +Z. Seeded foam. Decorative."
category: component
component: bass-trap
order: 100
---

## Add it

```bash
npx @runek/cli add bass-trap
```

Pulls `@runek/core@^0.16.0`.

## Use it

```tsx
import { BassTrap } from './runek/BassTrap'

<BassTrap position={[0, 0, 0]} size={0.3} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "BassTrap", "props": { "position": [0, 0, 0], "size": 0.3, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `height` | `number` | `3` | Floor to ceiling, in units. |
| `size` | `number` | `0.3` | How far its face runs along each wall from the corner, in units. |
| `color` | `color` |  | The foam. Seeded from muted studio colours when unset. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/bass-trap.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/bass-trap.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add bass-trap</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
