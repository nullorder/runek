---
title: Embedding a world in an app
summary: Host a world beside ordinary UI, in a browser or a desktop webview. Content security policy, lazy loading, input that yields to the page, pausing, and figures driven by app state.
category: guide
order: 22
---

A Runek world doesn't have to be the whole page. It can be one panel of a larger app: a map beside a sidebar, a room under a chat composer, a scene in a desktop app's webview. This guide covers what changes when it is.

## Content security policy

A world needs three things a strict policy usually blocks. On top of whatever your app already allows:

| Directive | Add | Why |
|---|---|---|
| `script-src` | `'wasm-unsafe-eval'` | Rapier, the physics engine, is WebAssembly. Without it the world fails to start. |
| `script-src` | `blob:` | Text (`Sign`, a `Person`'s `label`, interaction prompts) is laid out in a worker that loads its code from `blob:` URLs. |
| `connect-src` | `data:` | The default font bundled in `@runek/core` and the box face for characters no font has are `data:` URLs, fetched from that worker. Fonts your world declares in `fonts` need their own origins here too. |

So a host that otherwise allows only itself ends up with:

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval' blob:;
connect-src 'self' data:;
```

`worker-src` falls back to `script-src`, so it needs nothing unless your policy sets it, in which case add `blob:` there too. Nothing else is fetched for text, whatever it says: `Sign` sets troika's default font to a face built in code that draws a box for anything the world's fonts lack, so troika never looks a character up on its CDN. If your app draws its own drei `<Text>` before any `Sign` loads, do the same first: `configureTextBuilder({ defaultFontURL: lastResortFont() })` from `troika-three-text` and `@runek/core`. `img-src` and `font-src` need nothing: no component loads an image or a CSS font. Development servers usually want more than this (inline scripts for hot reload), which is between you and your bundler.

In Tauri the policy lives in `app.security.csp` in `tauri.conf.json`.

## Desktop webviews

Every desktop webview runs WebGL2, which is all a world needs:

- **macOS** uses WKWebView (Safari's engine).
- **Windows** uses WebView2 (Chromium).
- **Linux** uses WebKitGTK, the slowest of the three. A room or a house is fine; for a large world, lean on each component's level of detail and keep `Person` counts modest.

## Load it lazily

three.js, Rapier, and drei are a large download. Put the world behind `React.lazy` so the rest of your app starts without them:

```tsx
const Room = lazy(() => import('./world/Room'))

export function RoomPage() {
  return (
    <Suspense fallback={<p>Loading the room…</p>}>
      <Room />
    </Suspense>
  )
}
```

The editor ships from its own entry, `@runek/core/editor`, and is the only part that imports `leva`. An app that never mounts `WorldEditor` doesn't need `leva` installed.

## Input that yields to the page

`World` reads the keyboard from the whole window, but never keys aimed at a text field, a select, or editable text, so typing "wasd" into a composer beside the canvas never walks the avatar. Pointer look listens on the canvas only, so panels drawn over it already take the pointer.

Switch the keyboard off entirely while a modal is open:

```tsx
<World input={!modalOpen}>…</World>
```

Keys held when input switches off are released, so none stay stuck down.

## Pause when hidden

A world in a tab nobody is looking at should cost nothing. `paused` stops the frame loop and physics: no rendering, no steps, no input.

```tsx
<World paused={!pageVisible}>…</World>
```

Anything driven by the wall clock is simply where it should be on resume. A `Person` on a route was never stepping along it; its position is a function of the time, so pausing for an hour and resuming puts it exactly where an hour of walking would have.

## A view of the whole place

An app showing many figures at once usually wants to open on all of them. `view="overhead"` puts the camera high above the avatar at a fixed tilt; it follows as the avatar walks, scroll zooms, and WASD walks relative to the screen. Give the world a `view` control and the player can switch between overhead, third person, and first person:

```tsx
<World avatar="overhead" controls={{ view: ['KeyV'] }}>
  <Player />
</World>
```

## Figures driven by app state

When people in the world stand for something live in your app (agents, players, orders), give each one a trip whenever its state moves it. A trip is a `route` with a start time:

```tsx
<Person
  seed={hashOf(agent.id)}
  position={trip.from}
  route={trip.waypoints}            // relative to position, like patrol
  departAt={trip.startedAt}         // epoch ms
  pose="work"                       // held on arrival
  onArrive={() => report(agent.id, trip.to)}
/>
```

Before `departAt` the figure waits at the first point; after the last it stays put, facing the way it came, in its `pose`. Because the position is a function of `(route, departAt, now)`, two windows showing the same world agree, and reopening the page puts everyone mid-stride where they should be without replaying anything.

`onArrive` fires once per trip, on the first frame the trip is over. That includes a trip that ended while the world was paused or not mounted at all, so the arrival is always reported; dedupe by `departAt` if your app remounts the world.

Pathfinding stays in your app: compute the waypoints (a small graph through your doorways is plenty) and hand them over. If a new trip starts before the last one ended, `tripAt(waypoints, departAt, now())` (with `now` from `useWorld()`, or `Date.now` in app code that runs on the system clock) gives where the figure had got to, in the same node-local frame, as the start of the next.

## Several players, one world

Routes, trips and a live time of day are functions of the wall clock, so two windows on one machine always agree. Players on different machines agree only as far as their system clocks do, and those can be seconds apart. Give the world the clock your server keeps, estimated the usual way from round trips, and every figure, trip and sunset lines up for everyone:

```tsx
const offset = useServerClockOffset() // your app's estimate, in ms
const now = useCallback(() => Date.now() + offset, [offset])

<World now={now}>{/* … */}</World>
```

`departAt` is then a time on that clock too. `now` isn't part of the world file: it's a fact about where the world runs, like `paused`.

When the server rejects a move (too fast, through a wall) or respawns the player, put the avatar where it says with the teleport handle. It moves the camera along with the body, so the correction doesn't show as a sweep:

```tsx
const { playerControl } = useWorld()
socket.on('correct', ({ x, y, z }) => playerControl?.current?.teleport([x, y, z]))
```

`Player` takes the body's size and speeds as props (`height`, `radius`, `eyeHeight`, `speed`, `sprintSpeed`, and `cameraDistance` for third person), so an avatar can match the scale of your world and of the `Person` figures in it:

```tsx
<Player height={1.75} eyeHeight={1.62} speed={4} sprintSpeed={6.5}>
  <Person physics={false} height={1.75} position={[0, -0.875, 0]} />
</Player>
```

The body turns to face the way the avatar travels and holds that heading when it stops (in first person, it turns to the camera at rest). What it is doing is published every physics step in every view as `useWorld().playerMotion`: ground `speed`, `distance` covered, `vertical` speed, `grounded`, the body's `heading`, and where the camera looks relative to it (`lookYaw`, `lookPitch`). It's plain numbers written in place, so send it with the position:

```tsx
const { player, playerMotion } = useWorld()
const eye = new Vector3()
setInterval(() => {
  const motion = playerMotion?.current
  if (!player?.current || !motion) return
  player.current.getWorldPosition(eye) // the eyes: `eyeHeight` above the feet
  socket.emit('move', { eye: eye.toArray(), ...motion })
}, 100)
```

On the other side, hand a remote player's latest motion to a `Person` through `PlayerMotionContext`, and turn it by the `heading`. It strides from the same `distance` and looks where that player looks, so it matches what they see of their own body:

```tsx
import { PlayerMotionContext } from '@runek/core'

const motion = useRef(remote.motion) // Object.assign(motion.current, msg) as messages arrive
const [x, y, z] = remote.eye
<group position={[x, y - 1.62, z]} rotation={[0, motion.current.heading, 0]}>
  <PlayerMotionContext.Provider value={motion}>
    <Person physics={false} height={1.75} seed={remote.seed} />
  </PlayerMotionContext.Provider>
</group>
```

## Your own animation

A `Person` animates itself with a procedural walk cycle. To drive it with something else (a clip library, motion matching, poses off the network), give it a `poseSource`, or put a `PoseSourceContext` around many figures. Each frame the source gets what the figure knows about its motion (`speed`, `distance` walked, `heading`, `grounded`, `vertical`, look direction, `legLength`) and a pose reset to the T-pose, fills it, and returns `true`:

```tsx
import { PoseSourceContext, type PoseSourceFactory } from './runek/Person'

const e = new Euler()
const stroll: PoseSourceFactory = () => ({
  update(ctx, out) {
    const phase = (ctx.distance / (ctx.legLength * 1.6)) * Math.PI * 2
    const swing = Math.sin(phase) * Math.min(ctx.speed / 1.3, 1) * 0.5
    out.rotations.leftUpperArm.setFromEuler(e.set(0, 0, -1.3)) // arms down from the T-pose
    out.rotations.rightUpperArm.setFromEuler(e.set(0, 0, 1.3))
    out.rotations.leftUpperLeg.setFromEuler(e.set(-swing, 0, 0)) // negative x swings forward
    out.rotations.rightUpperLeg.setFromEuler(e.set(swing, 0, 0))
    return true
  },
})

<PoseSourceContext.Provider value={stroll}>{/* every Person below walks this way */}</PoseSourceContext.Provider>
```

A pose names bones as VRM 1.0 does (`hips`, `spine`, `chest`, `leftUpperArm`, `leftLowerLeg` and so on, listed in `HUMANOID_BONES`), each rotation relative to a T-pose facing +Z, plus a `hips` offset in units. The same pose reads the same on every figure, whatever its build. Names a figure has no bone for (`upperChest`, the shoulders) fold into the bones below them, and the toes drop out. Stride from `ctx.distance` rather than time and the feet stay planted at any speed, on a route walker, a figure with an explicit `gait`, or a `Player`'s body.

The authored `pose` still plays over the source while the figure stands (a seated figure sits, `wave` and `drink` take the right arm), and the head still turns to look. Return `false` for a frame to leave the figure to its own walk cycle; removing the source brings it back without a remount. To share clips with a glTF rig, `humanoidFromTPose(root, bones)` measures one standing in T-pose into the same table, and `applyPose` drives it.

## Your own renderer

`<World>` draws with a `WebGLRenderer` unless you pass `renderer`: renderer parameters, an instance, or a function (sync or async) that gets the default parameters and returns a renderer. It goes to R3F's `Canvas` as `gl`, so three's `WebGPURenderer` runs a world like this:

```tsx
import { WebGPURenderer } from 'three/webgpu'

<World
  renderer={async (props) => {
    const renderer = new WebGPURenderer(props)
    await renderer.init()
    return renderer
  }}
>
  {/* … */}
</World>
```

`shadowRate` keeps its meaning under both renderers. Lamps light more under WebGPU: three's tiled lighting shades many point lights at once, so instead of lending a handful of lights to the lamps nearest the view, the world gives every `useLight` point lamp a light of its own (up to `lightBudget.point`, default 1024), and a street of two hundred lamps is lit end to end with no hand-offs as you walk. Spotlights are still lent from `lightBudget.spot`, and a lamp with no `distance` reaches 20 m under tiled lighting, which culls each light by its reach. The tiled lighting code loads only when the renderer is WebGPU. Under WebGPU, components that build their materials from `useMaterial` looks render as they do under WebGL; those that write their own shaders (`Grass`, `Lake`, `Ocean`, `Portal`, `Rift`, `Screen`'s static, `Person` skin, `Sky`, `Sign` text and the first-person lens) don't yet, and are tracked in [#67](https://github.com/nullorder/runek/issues/67).

## Actions near a figure

Give a figure `actions` and a prompt appears over it when the avatar comes close, showing the key bound to each:

```tsx
<World controls={{ talk: ['KeyT'], info: ['KeyI'] }}>
  <Person
    actions={[
      { id: 'talk', label: 'Talk', control: 'talk' },
      { id: 'info', label: 'Info', control: 'info' },
    ]}
    actionRadius={2}
    onAction={(id) => (id === 'talk' ? openChat(agent) : openSheet(agent))}
  />
</World>
```

Only the nearest figure in range shows its prompt and takes the key, so two people standing together never both answer `T`. Keys come through the world's keyboard, so they yield to text fields, `input={false}`, and `paused` like everything else. The prompt reads its key names from the world's `controls`, so remapping `talk` relabels it.

Anything else can offer actions the same way by wrapping it in `Interactable` (with `use: ['KeyE']` in the world's `controls`):

```tsx
<Interactable actions={[{ id: 'sit', label: 'Sit', control: 'use' }]} onAction={sitDown}>
  <Sofa />
</Interactable>
```

Clicking works the same way: a `Book` or a `Bookshelf` book only lights up and takes a click once the avatar is within `reach` of it (3 units from its eyes by default), so a shelf across the room can't be opened from where you stand. With no `Player` mounted, as in an orbit-camera viewer or the editor, everything stays clickable. Your own clickable meshes can follow the same rule with `useReach` from `@runek/core`:

```tsx
const inReach = useReach() // or useReach(2) for a tighter reach
<mesh onClick={(e) => inReach(e.point) && open()} />
```

## The first-person lens

In first person, `Player` draws the world through a gently curved lens instead of the camera's flat projection, and softens the edges of the view the way peripheral vision does (`peripheralBlur`, 0 to turn it off). Like most games, the view follows the canvas's shape rather than its size: 140° across on a 16:9 canvas (set it with `fov`), more across on a wider one (about 160° at 21:9, up to 200°), and less on a narrower one, down to 110°, below which a tall canvas like an upright phone just shows less across. Up to 150° across it draws the world once and warps it; wider (an ultrawide) it draws it three times, so a very wide canvas costs more. It takes over the frame's render while it's on, so a post-processing pass that also renders the scene itself won't combine with it; use third person, or a lower-level effect, if you need one.

Clicks and hovers already follow the lens. If you pin a drei `<Html>` label to something in the world, give it `calculatePosition={useLensPosition()}` from `@runek/core` so it stays on its target near the edges of the view:

```tsx
const labelAt = useLensPosition()
<Html position={[0, 1, 0]} calculatePosition={labelAt}>…</Html>
```
