---
title: "LightRig"
summary: "Sun + hemisphere/ground fill with shadow configuration."
category: component
component: lightrig
order: 100
---

## Add it

```bash
npx @runek/cli add lightrig
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { LightRig } from './runek/LightRig'

<LightRig position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "LightRig", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `sunPosition` | `[x, y, z]` |  |  |
| `sunColor` | `color` |  |  |
| `sunIntensity` | `number` |  |  |
| `ambient` | `number` |  |  |
| `skyColor` | `color` | `"#bcd4ff"` |  |
| `groundColor` | `color` | `"#4a4030"` |  |
| `shadows` | `boolean` | `true` |  |
| `shadowRange` | `number` | `30` | Half-extent of the shadow camera frustum, in units. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/lightrig.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/lightrig.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add lightrig</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
