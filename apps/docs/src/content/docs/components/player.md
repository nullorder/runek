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

Pulls `@react-three/drei@^10.7.7`, `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.17.0`, `ecctrl@^1.0.97`, `three@^0.184.0`.

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
| `fov` | `number` | `140` | How wide the first-person view is, in degrees across, on a 16:9 screen. The default, 140, takes in most of what both eyes see, so the world wraps around you instead of sitting behind a window. Like most games it follows the screen's shape, not its size: a wider screen (an ultrawide or curved monitor) keeps the same angle top to bottom and sees more across, up to 200°; a narrower one sees less across, down to 110°, then holds that and opens up top to bottom, until a tall phone screen just shows less across. It is drawn through a gently curved (Panini) lens: true to life straight ahead, the sides squeezed in rather than stretched as a flat camera would. Third-person and overhead keep the world camera's own lens. |
| `peripheralBlur` | `number` | `4` | How blurred the very edge of the first-person view is, in CSS pixels, easing to sharp toward the centre the way peripheral vision does; turn to look at something and it comes into focus. 0 turns it off. |
| `children` | `node` (code only) |  | Custom avatar visual, replacing the default capsule. Size it to the capsule envelope (1.3 units tall, centered at the character origin, so feet go at y = -0.65); the Player lowers it onto the ground beneath the floating capsule. It is hidden in first-person view. In world JSON, nest it as a child node of the Player. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/player.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/player.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add player</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
