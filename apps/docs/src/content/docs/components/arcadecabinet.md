---
title: "ArcadeCabinet"
summary: "An upright arcade cabinet cut to the classic profile, with a lit marquee, joystick and buttons, and a screen running a seeded pixel game."
category: component
component: arcadecabinet
order: 100
---

## Add it

```bash
npx @runek/cli add arcadecabinet
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { ArcadeCabinet } from './runek/ArcadeCabinet'

<ArcadeCabinet position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "ArcadeCabinet", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `0.66` | Cabinet width, in units. |
| `color` | `color` |  | Body color. Seeded when unset. |
| `accent` | `color` |  | Side-art stripe and marquee glow. Seeded when unset. |
| `on` | `boolean` | `true` | Lit screen showing a seeded game; off, dark glass. |
| `players` | `1 \| 2` |  | Control sets on the panel (one or two players). Seeded when unset. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/arcadecabinet.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/arcadecabinet.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add arcadecabinet</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
