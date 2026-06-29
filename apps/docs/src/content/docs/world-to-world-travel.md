---
title: World-to-world travel
summary: "Portal is a sensor gate that fires when the avatar (or a vehicle) walks through it — wire it to swap worlds, change levels, or teleport."
category: guide
order: 30
---

A Runek `<World>` is a self-contained scene: its own canvas, its own physics world. To move between scenes — island to island, level to level, room to room — you need an in-world affordance that says "go here," and a host that listens. `Portal` is that affordance.

```tsx
import { Portal } from './runek/Portal'

// Data-only: walking through navigates the browser.
<Portal position={[0, 0, 8]} to="/level-2.html" label="Level 2" />

// Or drive an in-app transition yourself:
<Portal position={[0, 0, 8]} label="Foosha" onEnter={() => goTo('/foosha.world.json')} />
```

## The data and the event

`Portal` follows the contract's rule for interactive components ([§1](/docs/the-component-contract)): the *data* of the interaction stays JSON-serializable, and the callback is optional, so a world still renders and round-trips from data without any code wired up.

- **`to`** — a URL or route, plain data. With no `onEnter`, entering the gate does `window.location.href = to` (the same fallback `Bookshelf` uses for a book's `href`). This is all a hand-authored, data-only world needs.
- **`onEnter(to)`** — an optional callback. When set, it runs *instead* of navigating, so your app can react however it likes: fade the screen, swap the mounted world JSON, push a route. The destination `to` is passed straight through, so one handler can serve many gates.

Because `onEnter` is optional and `to` is serializable, the gate is fully expressible in a `*.world.json` and still drives real navigation out of the box.

## The physics

The trigger is a **Rapier sensor** (a collider that reports overlaps without blocking movement), sized a little larger than the visible ring. Two details make it robust:

- **It fires for vehicles, not just walkers.** Rapier's default collision events only cover a *dynamic* body (the avatar capsule) against the fixed gate. `Portal` also enables `KINEMATIC_FIXED` active-collision types, so a **kinematic** vehicle — a scripted boat or cart moved with `setNextKinematicTranslation` — trips it too.
- **It ignores the scenery.** The handler skips any *fixed* body (`bodyType() === Fixed`), so the gate never fires against the terrain or props it sits among — only against something that moves through it. The sensor is also kept deep along the approach axis so a fast vehicle can't tunnel past it between frames.

The gate registers no solid collider — you can always walk through it; only the sensor matters.

## Reacting across the canvas boundary

There's a catch worth knowing. `<WorldRenderer>` (and `<World>`) mount their own React Three Fiber `<Canvas>`, which React renders with a **separate reconciler**. React context from your page does **not** cross into the scene, and the scene can't reach your app shell through props. So an `onEnter` fired inside the world can't directly call `setState` in the component that rendered `<WorldRenderer>`.

Bridge it with a **module-level store** — a plain singleton both React roots import:

```ts
// voyage.ts — shared by the in-world Portal and the app shell
let pending: string | null = null
const subs = new Set<() => void>()

export const requestVoyage = (to: string) => {
  pending = to
  subs.forEach((fn) => fn())
}
export const getVoyage = () => pending
export const clearVoyage = () => {
  pending = null
}
export const subscribeVoyage = (fn: () => void) => {
  subs.add(fn)
  return () => subs.delete(fn)
}
```

```tsx
// in the world: registered so JSON can place it
<Portal to="/foosha.world.json" onEnter={requestVoyage} />

// in the app shell, outside the canvas:
const pending = useSyncExternalStore(subscribeVoyage, getVoyage)
useEffect(() => {
  if (!pending) return
  fadeOut().then(() => {
    setWorldFile(pending) // swap the mounted world JSON
    clearVoyage()
  })
}, [pending])
```

The store is the seam between the two worlds — the scene writes to it, the page reads from it.

## When to use it

- **World-to-world travel** — the driving case: a hub or an open area with gates to other scenes.
- **Level / area transitions** and **teleports** within a project.

## When not to

For a *single continuous space*, don't teleport — move the camera or the player. A Portal is for crossing a seam between scenes, not for getting around inside one.
