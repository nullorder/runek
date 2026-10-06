---
title: Runek for agents
summary: "The fast path for a coding agent: find components, install them, write a world as JSON, check it, and preview it."
category: guide
order: 13
---

Runek is built to be driven by coding agents as much as by people. A world is JSON, every prop is described by a published schema, and the CLI checks your work and prints errors you can act on. This page is the short version of everything else in these docs.

## 1. Discover

- **[llms.txt](/llms.txt)** indexes every guide and component with a one-line description. **[llms-full.txt](/llms-full.txt)** is every page in one file.
- Every docs page has a Markdown twin: add `.md` to its URL (`/docs/components/bench.md`).
- From a terminal:

```bash
npx @runek/cli list --json        # the catalog: name, title, category, description
npx @runek/cli info bench         # one component: props, types, defaults, deps, an example
npx @runek/cli info bench --json  # the same, as JSON
```

- The machine-readable sources behind all of this:
  - [`/r/registry.json`](/r/registry.json): the catalog.
  - [`/r/props.json`](/r/props.json): every prop of every component (type, default, palette slot, doc), keyed by the world-data `type`.
  - [`/r/world.schema.json`](/r/world.schema.json): a JSON Schema for world files.
  - `/r/components/<name>.json`: one component's full source plus its dependencies.

## 2. Install

```bash
npx @runek/cli init                         # once: writes runek.config.json, creates src/runek/
npx @runek/cli add player terrain bench sky # copies source into src/runek/, installs npm deps
```

`add` resolves everything a component needs (other components as source, npm packages including `@runek/core`). Pass `--no-install` to print the install command instead of running it. The copied files are yours to edit.

## 3. Compose a world

Write the world as data. Start the file with `$schema` so editors (and you) get validation and completion:

```json
{
  "$schema": "https://runek.nullorder.org/r/world.schema.json",
  "version": 1,
  "time": "17:30",
  "nodes": [
    { "type": "Sky" },
    { "type": "LightRig" },
    { "type": "Terrain", "props": { "size": [80, 80], "seed": 3 } },
    { "type": "Bench", "anchor": "ground", "props": { "position": [2, 0, -4], "rotation": [0, 1.57, 0] } },
    { "type": "Player", "props": { "position": [0, 2, 6] } }
  ]
}
```

Render it with `WorldRenderer` and a registry map of the components you added (keys are the node `type`s):

```tsx
import { type ComponentRegistry, parseWorld, WorldRenderer } from '@runek/core'
import { Bench } from './runek/Bench'
import { LightRig } from './runek/LightRig'
import { Player } from './runek/Player'
import { Sky } from './runek/Sky'
import { Terrain } from './runek/Terrain'
import worldJson from './world.json'

const registry: ComponentRegistry = { Bench, LightRig, Player, Sky, Terrain }
const world = parseWorld(JSON.stringify(worldJson))

export const App = () => <WorldRenderer data={world} registry={registry} />
```

Or skip the JSON and write the same world as JSX inside `<World>` (see [Getting started](/docs/getting-started)). Both are equivalent; JSON is easier to generate, diff, and check.

## 4. Check

```bash
npx @runek/cli validate world.json         # unknown types, unknown props, wrong value types, with "did you mean"
npx @runek/cli check-world world.json      # things buried in or floating above the ground
npx @runek/cli check-world world.json --fix  # write the suggested heights back into the file
```

Both take `--json` for structured output and `--strict` to exit non-zero (for CI). Fix what `validate` reports before you look at the scene: a misspelled prop renders silently with its default.

## 5. Preview

```bash
npx @runek/cli preview world.json
```

prints a link to the [workshop](/docs/the-workshop) with your world loaded: walk it, tune props in the inspector, and copy the edited JSON back. Nothing is uploaded; the world travels in the link itself.

## Conventions

- **Units:** 1 unit = 1 meter. Y is up. Rotations are radians, as `[x, y, z]` Euler angles (a quarter turn about the vertical axis is `[0, Math.PI / 2, 0]`, in JSON `[0, 1.5708, 0]`).
- **`type`** is the PascalCase component name (`Bookshelf`, not `bookshelf`). `add` takes the lowercase registry name; the node takes the title. `Group` is a built-in container for `children`.
- **Props go under `props`.** Node-level keys are only `type`, `id`, `anchor`, `props`, and `children`.
- **`seed`** (an integer) picks a variation. The same seed always gives the same geometry; change it to roll a new one, keep it to lock one in. Every component accepts `seed`, but some have nothing to vary: `props.json` marks those `"seeded": false`, so don't spend effort picking seeds for them.
- **`anchor: "ground"`** makes `position[1]` a height above the terrain at that spot, so nothing ends up buried. Use `"surface"` to stand on the highest thing there (a dock, a floor). See [Placing things on uneven ground](/docs/placing-things-on-uneven-ground).
- **Colors** are CSS color strings. Leave them unset to follow the world `palette`, which re-themes every component at once.
- **Callbacks and React children** (`onEnter`, `onSelect`, ...) can't live in JSON. The props tables mark them "code only"; use them from TSX.
- Only ever use props listed in the component's props table or in `props.json`. Defaults are listed too, so leave out anything you don't need to change.

## Common mistakes

| Mistake | Fix |
|---|---|
| `{ "type": "bench" }` | `{ "type": "Bench" }`: the PascalCase title. |
| `{ "type": "Bench", "position": [0, 0, 0] }` | Put it under `props`: `{ "type": "Bench", "props": { "position": [0, 0, 0] } }`. |
| `"rotation": [0, 90, 0]` | Radians: `[0, 1.5708, 0]`. |
| Props float or sink on hilly terrain | Add `"anchor": "ground"` and set `position[1]` to `0`, or run `check-world --fix`. |
| A component renders but isn't in your app | It needs `npx @runek/cli add <name>` and an entry in your registry map. |
| No `"version": 1` | Every world file starts with it. |

## The agent skill

The same workflow, condensed into a skill file your coding agent loads on its own when you work with Runek:

```bash
npx @runek/cli skill                          # writes .claude/skills/runek/SKILL.md
npx @runek/cli skill --out path/to/SKILL.md   # anywhere else your agent reads skills from
```

The source is served at [`/r/agents/SKILL.md`](/r/agents/SKILL.md).
