---
title: The World provider
summary: "<World> sets up the canvas, lighting, physics, and controls — every component lives inside it."
category: guide
order: 12
---

`<World>` is the root of every Runek scene. It wires up the React Three Fiber canvas, a default light rig, the Rapier physics world, and keyboard controls, then exposes scene-wide settings to its children through context.

```tsx
import { World } from '@runek/core'
import { Bookshelf } from './runek/Bookshelf'
import { Player } from './runek/Player'

<World>
  <Bookshelf position={[0, 1, 0]} seed={7} />
  <Player />
</World>
```

## What it sets up

- A `<Canvas>` with shadows and a sensible default camera.
- A default **light rig** (ambient + a shadow-casting sun). Turn it off with `lights={false}` to supply your own — e.g. `<LightRig>`.
- A Rapier `<Physics>` world. Every component registers its colliders here.
- `KeyboardControls` so `<Player>` (and your own input) work out of the box.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `unit` | `number` | `1` | World scale: `1` unit = 1 meter. Read it via `useWorld()`. |
| `gravity` | `[x, y, z]` | `[0, -9.81, 0]` | Physics gravity. |
| `lights` | `boolean` | `true` | Render the default lights. Set `false` to use your own. |
| `palette` | `Partial<WorldPalette>` | built-in | Override color slots; every component re-themes at once. |
| `controls` | `Record<string, string[]>` | built-in | Remap input bindings (action → key codes); serializable. |
| `fog` | `{ color, near, far }` | off | Linear distance fog; pair the color with the sky's horizon. |
| `input` | `boolean` | `true` | Read the keyboard. Set `false` to ignore it, e.g. while a modal is open. |
| `paused` | `boolean` | `false` | Stop rendering and physics until set back to `false`. |
| `lightBudget` | `number \| { point, spot }` | `{ point: 6, spot: 2 }` | Real lights the world lends to its lamps (`useLight` emitters), each frame to the ones that matter most to the view. |
| `shadowRate` | `number` | `30` | How many times a second shadow maps are redrawn. `Infinity` redraws every frame. |
| `batching` | `boolean \| { cell }` | `true` | Merge static parts that share a material into one mesh per material per 20 m cell (or `cell` m). Moving parts and anything inside `<Dynamic>` stay as they are. |
| `dpr` | `number \| [min, max]` | `[1, 1.5]` | Pixel ratio to render at. A range follows the screen's own up to `max` and steps toward `min` while frames run slow. |
| `now` | `() => number` | `Date.now` | The world's wall clock, in epoch milliseconds. Walking figures, trips, live day/night and `Clock` read it; pass a server-synced clock so every player sees the same world. |
| `renderer` | R3F `gl` | WebGL | The renderer to draw with: parameters, an instance, or a (sync or async) factory. See [Embedding a world](/docs/embedding-a-world#your-own-renderer). |
| `debug` | `boolean` | `false` | Draw Rapier collider wireframes. |

## Controls

Input bindings are a world setting, not a hardcode. The defaults move with
WASD and steer the camera with the arrow keys (Left/Right turn, Up/Down look
— in first *and* third person, composing with mouse-drag). Override any
subset; the rest keep their defaults:

```tsx
<World controls={{ forward: ['KeyW', 'KeyZ'], leftward: ['KeyA', 'KeyQ'] }}>
  {/* AZERTY-friendly: ZQSD moves too */}
</World>
```

Keys are `KeyboardEvent.code` names. Bind an action to `[]` to disable it, or
add your own action names — they become bindings any component can read with
drei's `useKeyboardControls`. The resolved map is available to components at
`useWorld().controls`. For a completely custom drei map there's still the
low-level `keyboardMap` prop, which wins verbatim when given.

## Sharing the page

A world often sits beside ordinary UI: a chat box, a settings form, a modal. Keys typed into a text field (`input`, `textarea`, `select`, or anything `contenteditable`) are left to the page, so typing "wasd" into a form never walks the avatar. To ignore the keyboard entirely, pass `input={false}`. Keys held at that moment are released, and so are keys held when the window loses focus. Mouse look listens on the canvas only, so anything drawn over the canvas already takes the pointer.

When the world isn't on screen (a background tab of your app, a hidden panel), `paused` stops the frame loop and the physics steps so the world costs nothing:

```tsx
<World paused={!visible} input={!modalOpen}>
  {/* … */}
</World>
```

On resume, animations carry on from where they stopped, and anything driven by the wall clock (a walking `Person`) is already where it should be. `WorldRenderer` and `WorldEditor` take both props too.

## The palette

Components default their colors to named slots — `wood`, `wall`, `foliage`, `waterDeep`, and friends — read from context. Override any subset on `<World>` and the whole scene re-themes; explicit color props on a component still win:

```tsx
<World palette={{ wood: '#7a5a40', foliage: '#557d3c' }}>
  <Bookshelf seed={7} />          {/* frame picks up the new wood */}
  <Trees seed={4} />              {/* leaves pick up the new foliage */}
  <Chair color="#222" />          {/* explicit prop beats the palette */}
</World>
```

The full slot list is the `WorldPalette` interface in `@runek/core`.

## useWorld()

Components read the shared scale from the provider so they size consistently:

```tsx
import { useWorld } from '@runek/core'

function MyThing() {
  const { unit, palette } = useWorld()
  const width = 2 * unit // 2 meters, whatever the world's scale
  const color = palette.wood // themed with the rest of the world
  // …
}
```

While a `Player` is mounted, `useWorld().player?.current` is its avatar (an `Object3D` at eye
height), so a component can react to where the player *is* rather than where the camera is.
In third person those differ: the camera trails a few meters behind. Read it inside
`useFrame`, and fall back to the camera when it's `null` (no `Player`, e.g. an orbit view).

`useWorld().playerControl?.current` moves the avatar after it has spawned: a checkpoint, fast
travel, a respawn, or a position the server corrected. The camera comes along, so the view
doesn't sweep across the world, and the avatar arrives at rest unless you keep its velocity:

```tsx
const { playerControl } = useWorld()
playerControl?.current?.teleport([0, 2, -12], { yaw: Math.PI })
```

`position` is in world coordinates, like `Player`'s own `position`, and `yaw` (radians, 0 faces
+z) turns the view. The handle is a ref, so keep `playerControl` and call it from anywhere, a
network message handler or a button outside the canvas included. A `Rift` carries the avatar
through the same call.

`useWorld().now()` is the world's clock in epoch milliseconds (`<World now>`, or `Date.now`).
Anything that moves or tells time by the wall clock reads it instead of `Date.now()`.

Next: [the component contract](/docs/the-component-contract) — the rules every component follows.
