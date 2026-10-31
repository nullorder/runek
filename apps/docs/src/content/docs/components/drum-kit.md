---
title: "DrumKit"
summary: "A five-piece drum kit with hi-hat, crash and ride cymbals on stands and a throne behind it; seeded shell finish. One cuboid collider round the drums."
category: component
component: drum-kit
order: 100
---

## Add it

```bash
npx @runek/cli add drum-kit
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.17.0`.

## Use it

```tsx
import { DrumKit } from './runek/DrumKit'

<DrumKit position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "DrumKit", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `color` |  | The shells. Seeded from a few finishes when unset. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/drum-kit.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/drum-kit.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add drum-kit</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
