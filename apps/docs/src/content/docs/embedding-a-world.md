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
| `connect-src` | `data:` | The default font bundled in `@runek/core` is a `data:` URL, fetched from that worker. Fonts your world declares in `fonts` need their own origins here too. |

So a host that otherwise allows only itself ends up with:

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval' blob:;
connect-src 'self' data:;
```

`worker-src` falls back to `script-src`, so it needs nothing unless your policy sets it, in which case add `blob:` there too. `img-src` and `font-src` need nothing: no component loads an image or a CSS font. Development servers usually want more than this (inline scripts for hot reload), which is between you and your bundler.

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

Pathfinding stays in your app: compute the waypoints (a small graph through your doorways is plenty) and hand them over. If a new trip starts before the last one ended, `tripAt(waypoints, departAt, Date.now())` gives where the figure had got to, in the same node-local frame, as the start of the next.

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
