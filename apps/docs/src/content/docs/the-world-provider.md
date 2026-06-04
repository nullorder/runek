---
title: The World provider
summary: "<World> sets up the canvas, lighting, physics, and controls — every component lives inside it."
category: guide
order: 12
---

`<World>` is the root of every Runek scene. It wires up the React Three Fiber
canvas, a default light rig, the Rapier physics world, and keyboard controls, then
exposes scene-wide settings to its children through context.

```tsx
import { World } from './runek/core'
import { Bookshelf } from './runek/Bookshelf'
import { Player } from './runek/Player'

<World>
  <Bookshelf position={[0, 1, 0]} seed={7} />
  <Player />
</World>
```

## What it sets up

- A `<Canvas>` with shadows and a sensible default camera.
- A default **light rig** (ambient + a shadow-casting sun). Turn it off with
  `lights={false}` to supply your own — e.g. `<LightRig>`.
- A Rapier `<Physics>` world. Every component registers its colliders here.
- `KeyboardControls` so `<Player>` (and your own input) work out of the box.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `unit` | `number` | `1` | World scale: `1` unit = 1 meter. Read it via `useWorld()`. |
| `gravity` | `[x, y, z]` | `[0, -9.81, 0]` | Physics gravity. |
| `lights` | `boolean` | `true` | Render the default lights. Set `false` to use your own. |
| `debug` | `boolean` | `false` | Draw Rapier collider wireframes. |

## useWorld()

Components read the shared scale from the provider so they size consistently:

```tsx
import { useWorld } from './runek/core'

function MyThing() {
  const { unit } = useWorld()
  const width = 2 * unit // 2 meters, whatever the world's scale
  // …
}
```

Next: [the component contract](/docs/the-component-contract) — the rules every
component follows.
