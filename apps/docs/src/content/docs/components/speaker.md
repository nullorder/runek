---
title: "Speaker"
summary: "A loudspeaker facing +Z: a studio monitor on a stand, a floor PA cabinet with two woofers under a horn, or a guitar amp combo with grille cloth and knobs. Seeded kind and finish. One cuboid collider."
category: component
component: speaker
order: 100
---

## Add it

```bash
npx @runek/cli add speaker
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.16.0`, `three@^0.184.0`.

## Use it

```tsx
import { Speaker } from './runek/Speaker'

<Speaker position={[0, 0, 0]} kind="monitor" seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Speaker", "props": { "position": [0, 0, 0], "kind": "monitor", "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `kind` | `"monitor" \| "pa" \| "amp"` |  | Seeded when unset. |
| `color` | `color` |  | The cabinet. Seeded from a few finishes for its kind when unset. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/speaker.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/speaker.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add speaker</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
