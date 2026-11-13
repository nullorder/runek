---
title: "BladeSign"
summary: "A board standing out from a wall with one word stacked down both faces in the world's display font, lit at the world's sign luminance level, with tube edges. Drawn by the world's shared facade-kit meshes. Decorative: no collider."
category: component
component: blade-sign
order: 100
---

## Add it

```bash
npx @runek/cli add blade-sign
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { BladeSign } from './runek/BladeSign'

<BladeSign position={[0, 0, 0]} text="TEA" color="#39ff88" />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "BladeSign", "props": { "position": [0, 0, 0], "text": "TEA", "color": "#39ff88" } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Bottom of the board at the wall [x, y, z] in units. The board stands out along local +Z. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. Turn about Y so local +Z points out of the wall. |
| `seed` | `number` |  | Accepted for the component contract. This component has no seeded variation. |
| `text` | `string` | `"NOODLE"` | The word to stack, top to bottom. Spaces are dropped. |
| `letter` | `number` | `0.55` | Letter height in units. 0.3 reads at 20 m, 1.5 at 100 m. |
| `color` | `color` | `"#ff6418"` | Lamp color of the letters and the edge tubes. |
| `gap` | `number` | `0.3` | Gap between the wall and the board, in units. |
| `tube` | `boolean` | `true` | Run a tube down both edges of the board. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/blade-sign.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/blade-sign.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add blade-sign</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
