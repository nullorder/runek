---
title: Getting started
summary: Pull components into your project with the CLI and compose your first walkable world.
category: guide
order: 10
---

Runek ships as a source registry. The `runek` CLI copies editable component source
into your project and installs what it needs.

## Install components

```bash
npx runek init                          # writes runek.config.json + the install dir
npx runek add player terrain bookshelf  # pulls source + core + installs peer deps
npx runek list                          # browse the catalog
```

`add` resolves dependencies for you: every component pulls in `core` (the `<World>`
provider, seeded `rng`, and contract types), and `house` pulls the walls, floor,
roof, door, and window it composes from.

## Compose a world

The CLI installs into `src/runek/` by default and repoints the core import, so the
files resolve out of the box:

```tsx
import { World } from './runek/core'
import { Bookshelf } from './runek/Bookshelf'
import { Player } from './runek/Player'
import { Terrain } from './runek/Terrain'

export function FirstWorld() {
  return (
    <World>
      <Terrain size={[40, 40]} />
      <Bookshelf position={[0, 1, 0]} seed={42} />
      <Player />
    </World>
  )
}
```

`<World>` sets up the canvas, lighting, physics, and keyboard controls. `<Player>`
is a first-person controller by default — drop in and walk.

## Same seed, same world

Geometry is a pure function of props and `seed`. The same `seed` produces the same
bookshelf — the same books, the same arrangement — on every machine, every render.
Change the seed to roll a new variation; commit the number to lock it forever.
