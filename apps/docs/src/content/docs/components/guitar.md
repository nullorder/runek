---
title: "Guitar"
summary: "An acoustic, electric or bass guitar leaning on a floor stand; the kind and finish are seeded. Decorative."
category: component
component: guitar
order: 100
---

## Add it

```bash
npx @runek/cli add guitar
```

Pulls `@runek/core@^0.17.0`.

## Use it

```tsx
import { Guitar } from './runek/Guitar'

<Guitar position={[0, 0, 0]} kind="electric" seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Guitar", "props": { "position": [0, 0, 0], "kind": "electric", "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `kind` | `"acoustic" \| "electric" \| "bass"` |  | Seeded when unset. |
| `color` | `color` |  | The body. Seeded from a few finishes for its kind when unset. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/guitar.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/guitar.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add guitar</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
