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
| `luminance` | `Partial<WorldLuminance>` | all `1` | How bright glowing surfaces are, per kind (`screen`, `sign`, `tube`, `lamp`, `flame`). See [Luminance](#luminance). |
| `materials` | `MaterialSlots` | none | Materials of your own for named surfaces (`asphalt`, `glass`, `wood`, …). Code only. See [Material slots](#material-slots). |
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

## Luminance

Glowing surfaces (a screen, neon, a bulb, a flame) are drawn unlit, and how bright each one looks is the world's call, not the component's. `luminance` sets a level per kind of light source, in scene-linear units relative to diffuse white: `1` draws a color at face value, `4` four times brighter. Above 1 a surface goes past what the display shows, which is what feeds bloom when you add a post-processing pass.

| Level | What follows it |
|---|---|
| `screen` | `Screen`, `Monitor`, `Tv`, arcade screens |
| `sign` | a `Sign` with `lit` |
| `tube` | `NeonStrip`, an arcade marquee |
| `lamp` | the bulbs of `Lamp`, `CeilingLight`, `DeskLamp`, `Chandelier`, `PictureLight`, `Lighthouse`, and the shades and glass they light |
| `flame` | `Campfire`, `TikiTorch` |

```tsx
<World luminance={{ lamp: 6, tube: 4, screen: 1.5 }}>
  {/* street lamps outshine neon, neon outshines the shop's screens */}
</World>
```

Every level defaults to `1`, so a world that sets none looks as it always has. Changing one rescales every surface of that kind at once. The light a lamp casts on its surroundings is still its own `intensity` prop. In your own components, read the levels with `useLuminance()` and build the shared material for a glowing color with `glowLook`:

```tsx
import { glowLook, useLuminance, useMaterials } from '@runek/core'

const { tube } = useLuminance()
const m = useMaterials({ core: glowLook('#ffffff', tube), sleeve: glowLook(color, tube) })
```

## Material slots

A component builds every surface from a look of plain colors and numbers, which keeps it asset-free. A look can also name the surface it stands for, its `slot`: a road deck is `asphalt`, a window pane `glass`, a table top `wood`. `materials` answers slots with materials of your own, so one entry changes every surface of that kind in the world, with no component edits:

```tsx
import { MeshPhysicalMaterial, MeshStandardMaterial } from 'three'
import type { MaterialSlots } from '@runek/core'

// Module scope (or useMemo): a new function on every render would make new materials.
const materials: MaterialSlots = {
  // One material for every look naming the slot.
  glass: new MeshPhysicalMaterial({ roughness: 0.05, transparent: true, opacity: 0.3 }),
  // Or a function of the component's look, called once per distinct look.
  asphalt: (look) => new MeshStandardMaterial({ color: look.color, roughness: 0.9, map: asphaltTexture }),
}

<World materials={materials}>…</World>
```

A slot you leave out draws as the component's look says, so removing an entry puts the component's own surface back, and a world that sets none renders exactly as before. The materials you return are yours: the world shares them like any other (the static batcher merges what they draw unless they're transparent) but never disposes them, and any textures they carry are your app's assets, as with a `Screen`'s `texture`. `materials` holds functions, so it lives in code, not in a world file; `WorldRenderer` and `WorldEditor` pass it through like the other runtime props.

| Slot | Surfaces |
|---|---|
| `asphalt` | road decks |
| `concrete` | slabs, kerbs, plinths |
| `stone` | masonry, paving, steps, rock |
| `brick` | brickwork |
| `plaster` | rendered and painted walls |
| `floor` | interior floor finishes |
| `roofing` | roof coverings, thatch |
| `wood` | timber, joinery, wooden furniture |
| `glass` | windows, glass walls and rails |
| `metal.painted` | poles, frames, appliance bodies |
| `metal.bare` | chrome, steel, brass |
| `fabric` | upholstery, rugs, canvas, sails |
| `leather` | leather upholstery |
| `plastic` | molded plastic: bezels, consoles |
| `ceramic` | tiles, tableware, pots |
| `ground` | soil, terrain, dirt paths |
| `sand` | shores and beaches |
| `foliage` | leaves, hedges |
| `bark` | trunks and branches |

The same list is `MATERIAL_SLOTS` in `@runek/core`. In your own components, add the slot that fits to the look and keep the rest of it complete, since that is what draws when the world doesn't answer:

```tsx
const m = useMaterials({
  deck: { slot: 'asphalt', color: palette.stone, roughness: 1 },
  kerb: { slot: 'concrete', color: palette.wall, roughness: 1 },
})
```

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
+z) turns the view and the body. The handle is a ref, so keep `playerControl` and call it from
anywhere, a network message handler or a button outside the canvas included. A `Rift` carries
the avatar through the same call.

`useWorld().playerMotion?.current` is what the avatar is doing, in every view: ground `speed`,
`distance` covered, `vertical` speed, `grounded`, the body's `heading`, and where the camera
looks relative to it (`lookYaw`, `lookPitch`). It is written in place after every physics step,
so keep the ref and read it whenever you need it, a network send included. The body `Player`
carries reads the same record through `PlayerMotionContext` (see [embedding a
world](/docs/embedding-a-world#several-players-one-world) for feeding a remote copy).

`useWorld().materials` holds the world's slot answers (absent when it gives none); `useMaterial` reads it for you.

`useWorld().luminance` holds the resolved levels; `useLuminance()` reads the same with the defaults filled in under a hand-rolled provider.

`useWorld().now()` is the world's clock in epoch milliseconds (`<World now>`, or `Date.now`).
Anything that moves or tells time by the wall clock reads it instead of `Date.now()`.

Next: [the component contract](/docs/the-component-contract) — the rules every component follows.
