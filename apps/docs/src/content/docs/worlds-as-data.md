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
  unit?: number
  gravity?: [number, number, number]
  palette?: Partial<WorldPalette> // color-slot overrides for the whole world
  fog?: { color: string; near: number; far: number }
  nodes: WorldNode[]
}

interface WorldNode {
  type: string // a registry key, e.g. "Bookshelf"
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
(`<WorldEditor>`) edits a `WorldData` live and exports it with the same call —
so a world round-trips: render → edit → serialize → commit.
