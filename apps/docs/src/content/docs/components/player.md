---
title: "Player"
summary: "First/third-person character controller (ecctrl wrapper). WASD moves; mouse-drag or the arrow keys steer the camera in either view. Reads the world's `avatar` setting for its default view and the world's `controls` for key bindings."
category: component
component: player
order: 100
---

## Add it

```bash
npx @runek/cli add player
```

Pulls `@react-three/drei@^10.7.7`, `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`, `ecctrl@^1.0.97`, `three@^0.184.0`.

## Use it

```tsx
import { Player } from './runek/Player'

<Player position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Player", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 3, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `view` | `"first" \| "third" \| "overhead"` |  | Camera view: `first` (through the avatar's eyes), `third` (behind it), or `overhead` (high above at a fixed tilt, following it; scroll zooms, WASD walks relative to the screen). Unset defers to the world default (`<World avatar>`); falls back to first-person. An explicit value here always wins. A world `view` control (e.g. `controls: { view: ['KeyV'] }`) cycles the three at runtime. |
| `yaw` | `number` | `0` | Initial camera yaw in radians (0 faces +z). |
| `children` | `node` (code only) |  | Custom avatar visual, replacing the default capsule. Size it to the capsule envelope (~1.3 units tall, centered at the character origin); it is hidden in first-person view. In world JSON, nest it as a child node of the Player. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/player.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/player.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add player</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
