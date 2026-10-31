---
title: "Piano"
summary: "A grand piano: a lacquered case on three legs, the lid propped open, eighty-eight keys, a pedal lyre and a bench a Person can sit on. One cuboid collider round the case."
category: component
component: piano
order: 100
---

## Add it

```bash
npx @runek/cli add piano
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Piano } from './runek/Piano'

<Piano position={[0, 0, 0]} lid={0.6} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Piano", "props": { "position": [0, 0, 0], "lid": 0.6 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `lid` | `number` | `0.6` | How far the lid is propped open, in radians; 0 shuts it. |
| `bench` | `boolean` | `true` | A bench in front of the keys. |
| `color` | `color` | `"#0e0e10"` | The case. Black lacquer unless given. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/piano.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/piano.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add piano</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
