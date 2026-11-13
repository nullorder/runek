---
title: "VendingMachine"
summary: "A vending machine against a wall: a matte case and a lit window of goods at the world's screen luminance level. Drawn by the world's shared facade-kit meshes. One cuboid collider."
category: component
component: vending-machine
order: 100
---

## Add it

```bash
npx @runek/cli add vending-machine
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { VendingMachine } from './runek/VendingMachine'

<VendingMachine position={[0, 0, 0]} color="#40332a" lamp="#b8e8c8" seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "VendingMachine", "props": { "position": [0, 0, 0], "color": "#40332a", "lamp": "#b8e8c8", "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Middle of the back of the machine at the ground [x, y, z] in units. It faces local +Z. |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. Turn about Y so local +Z points away from the wall behind it. |
| `seed` | `number` | `1` | Seeds the rows of goods in the window. |
| `color` | `color` | `"#3a2f45"` | Case color. |
| `lamp` | `color` | `"#ffcf9a"` | Lamp color of the window, lit at the world's `screen` luminance level. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/vending-machine.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/vending-machine.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add vending-machine</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
