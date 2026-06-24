---
title: Worlds as data
summary: Because every component is a pure function of props, a whole world serializes to plain JSON.
category: guide
order: 20
---

Every component is a deterministic function of its props, so an entire scene can be
described as **data** — a list of `{ type, props }` — then rendered, saved, diffed,
and edited like any file.

## The shape

```ts
interface WorldData {
  version: 1
  meta?: WorldMeta // the world's identity (title, authors, license, source)
  unit?: number
  gravity?: [number, number, number]
  ground?: number // baseline ground level (Y); floor + water default to it
  time?: string // pinned time-of-day "HH:MM" (reproducible day/night)
  timezone?: string // OR an IANA zone for a live, clock-driven day/night
  avatar?: 'first' | 'third' // default player camera view
  palette?: Partial<WorldPalette> // color-slot overrides for the whole world
  fonts?: Partial<WorldFonts> // fonts the world ships, by role (display, body)
  fog?: { color: string; near: number; far: number }
  nodes: WorldNode[]
}

interface WorldNode {
  type: string // a registry key, e.g. "Bookshelf"
  id?: string // stable identity; the editor fills this in (see below)
  props?: Record<string, JsonValue>
  children?: WorldNode[]
}
```

A small world:

```json
{
  "version": 1,
  "palette": { "wood": "#7a5a40" },
  "nodes": [
    { "type": "Terrain", "props": { "size": [40, 40] } },
    { "type": "Bookshelf", "props": { "position": [0, 1, 0], "seed": 42 } },
    { "type": "Player" }
  ]
}
```

The look of a world is data too: `palette` re-themes every component at once and
`fog` sets the atmosphere — both diff as cleanly as any node.

## World settings (the rules)

A handful of top-level fields are the world's **rules**: values components read
through `useWorld()` to decide how the world looks and plays, not geometry. They
resolve onto the world context the same way `unit`, `gravity`, and `palette` do —
set once on the world, read everywhere.

```json
{
  "version": 1,
  "time": "21:30",
  "avatar": "third",
  "nodes": [{ "type": "Sky" }, { "type": "LightRig" }, { "type": "Player" }]
}
```

- **`time`** pins a fixed time-of-day (`"HH:MM"`, 24-hour), so the world is fully
  reproducible: the same file lights the same way every time. **`timezone`** (an IANA
  zone like `"Asia/Kolkata"`) makes the world *live* instead — the day/night state
  tracks the real clock, an explicit exception to determinism. A pin wins if both are
  set. Day/night-aware components read the resolved value as `useWorld().time`: `Sky`
  arcs the sun overhead by day and swaps to a dark, starlit dome at night, and
  `LightRig` follows it with golden-hour tints and dim moonlight.
- **`avatar`** (`"first"` or `"third"`) is the default camera view. `Player` uses it
  unless its own `view` prop is set — an explicit prop always wins.
- **`ground`** is the baseline ground level (a `Y` value, default `0`): the datum that
  `Floor` and water like `Lake` default their placement to. In a coastal world it is
  effectively your **sea level**, the terrain rises from it and the water sits at it,
  so moving `ground` shifts a whole world's datum at once (a sunken basin, a plateau).
  Open water sits at or below it (a floating lake is a bug); an explicit `position`
  still wins.
- **`fonts`** are the typefaces the world ships, keyed by role (`display` for
  titles and signage, `body` for labels). They are the one exception to the
  no-assets moat: components hold no fonts, so the world declares them and `Sign`
  draws from them. An undeclared role falls back to the pixel font bundled in
  `@runek/core`, so `Sign` always renders even with no `fonts` set.

Every setting is optional with a sensible default (a bright midday, first-person), so
a world that declares none renders exactly as before.

## Render it

`<WorldRenderer>` maps each node's `type` through a registry of components:

```tsx
import { WorldRenderer, parseWorld } from '@runek/core'
import { registry } from './runek/registry'

const world = parseWorld(await (await fetch('/my.world.json')).text())

<WorldRenderer data={world} registry={registry} />
```

## Save it

`serializeWorld(data)` returns pretty JSON. The runtime editor
(`<WorldEditor>`) edits a `WorldData` live and exports it with the same call,
so a world round-trips: render, edit, serialize, commit.

## Identity & contribution

A world is a creative work, so its identity travels *in the file* under `meta`
(the way `package.json` carries a package's name, author, and `repository`):

```ts
interface WorldMeta {
  title?: string
  description?: string
  authors?: { name: string; url?: string }[]
  license?: string // a world is content, so a CC license often fits better than MIT
  source?: { url: string; path?: string; branch?: string } // the canonical repo
}
```

`meta` is optional, and so is every field within it. When present, both
`<WorldRenderer>` (walk) and `<WorldEditor>` (edit) show a small **ⓘ** that opens an
"About this world" panel with the title, authors, license, and a link to the source
repo. A world with no `meta` still renders.

When `meta.source` points at a GitHub repo, the editor also gains a **Contribute**
action with two paths. *Fork this world* opens GitHub's fork page for your own
deployable copy. *Suggest changes upstream* downloads the edited JSON plus a PNG
snapshot of the view and opens GitHub's edit-file URL, which auto-forks for
non-collaborators, so your change becomes a normal pull request with no backend,
account, or token. Non-GitHub hosts fall back to opening the repo.

## Stable node ids

Each `WorldNode` can carry an optional `id`. You don't write these by hand: the editor
assigns one to any node missing it on load and preserves the rest. Ids give nodes a
durable identity across edits, and `serializeWorld` writes keys in a canonical order,
so a pull request shows only what actually changed.
