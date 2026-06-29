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
| `fog` | `{ color, near, far }` | off | Linear distance fog; pair the color with the sky's horizon. |
| `debug` | `boolean` | `false` | Draw Rapier collider wireframes. |

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

Next: [the component contract](/docs/the-component-contract) — the rules every component follows.
