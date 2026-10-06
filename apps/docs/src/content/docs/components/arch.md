---
title: "Arch"
summary: "Freestanding gateway: two piers and a semicircular arch of voussoirs. Composes with Wall."
category: component
component: arch
order: 100
---

## Add it

```bash
npx @runek/cli add arch
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Arch } from './runek/Arch'

<Arch position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Arch", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `width` | `number` | `2.4` | Clear opening width, in units. |
| `height` | `number` | `2.6` | Height to the springline (top of the piers), in units. |
| `depth` | `number` | `0.6` | Depth, in units. |
| `thickness` | `number` | `0.4` | Pier thickness, in units. |
| `blocks` | `number` | `9` | Voussoir blocks forming the semicircular arch. |
| `color` | `color` | palette `stone` | Defaults to the world palette's `stone` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/arch.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/arch.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add arch</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
