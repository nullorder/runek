# Runek

**Procedural 3D components for the web. Compose walkable worlds from code.**

> *Worlds, one rune at a time.*

[![@runek/core on npm](https://img.shields.io/npm/v/%40runek%2Fcore?logo=npm&label=%40runek%2Fcore&color=cb3837)](https://www.npmjs.com/package/@runek/core) [![@runek/cli on npm](https://img.shields.io/npm/v/%40runek%2Fcli?logo=npm&label=%40runek%2Fcli&color=cb3837)](https://www.npmjs.com/package/@runek/cli) [![node](https://img.shields.io/node/v/%40runek%2Fcli?logo=nodedotjs&logoColor=white)](https://nodejs.org) [![license: MIT](https://img.shields.io/npm/l/%40runek%2Fcore?color=blue)](./LICENSE)

Runek is a source registry of procedural 3D components for [React Three Fiber](https://r3f.docs.pmnd.rs/) — pull a component's source into your project and own it (shadcn-style). Every component — a bookshelf, a lake, a whole house — generates its own geometry from props and a `seed`. No binary assets, no model files, no CDN. A whole world is just data: diffable, forkable, version-controlled like any repo.

Think **"shadcn for 3D worlds."**

**[Docs](https://runek.nullorder.org/docs) · [Gallery](https://runek.nullorder.org/gallery) · [Walk the library](https://runek.nullorder.org/library) · [Registry index](https://runek.nullorder.org/r/registry.json)**

> **Status:** `v0.8.0` (in repo; npm publish of `@runek/core` + `@runek/cli` at 0.8.0 pending) — adds **world settings & rules** on top of distribution GA: a world picks a reproducible time-of-day or a live timezone (driving day/night in `Sky` and `LightRig`) and a default avatar view. The 23-component catalog (palette-aware, instanced, day/night-aware), a runtime editor (move/rotate, add/duplicate/delete, undo), and worlds-as-data with world-level palette, fog, time, and avatar. The docs site + component registry are live at [runek.nullorder.org](https://runek.nullorder.org); the prior GA (`@runek/core` + `@runek/cli` 0.6.0) is on npm.

## Demo: Helicon

[**Helicon**](https://helicon.nullorder.org) is the showcase world — a walkable, editable procedural island built **entirely from Runek components**, with its whole scene defined as a single JSON file. It consumes Runek exactly the way your project would: `@runek/core` from npm plus component source copied via `@runek/cli`, so it doubles as a worked end-to-end example of the workflow below.

**[Walk Helicon →](https://helicon.nullorder.org)** · [Source on GitHub](https://github.com/nullorder/helicon)

## Why Runek

- **Procedural-first** — geometry from props + `seed`; no `.glb`, no textures, no CDN.
- **A world is data** — every component is a pure, deterministic function of its props.
- **Seeded determinism** — same seed → same result, on every machine and every render.
- **Re-themeable** — components default their colors to a world palette; swap the palette, re-skin the world.
- **Parametric LOD** — detail scales with props and distance.
- **Local-first** — no backend; a world deploys as a static site.
- **You own the components** — component source is copied into your project to edit and fork; the small `@runek/core` runtime comes from npm (shadcn-style: own the components, depend on the primitives).

## Install

```sh
npx @runek/cli init                          # writes runek.config.json + the install dir
npx @runek/cli add player terrain bookshelf  # pulls source + deps into your project
npx @runek/cli list                          # browse the catalog
```

`add` copies editable component source into your project (default `src/runek/`), resolves dependencies, and installs the npm packages it needs, including `@runek/core`.

## Compose your first world

```tsx
import { World } from '@runek/core'
import { Bookshelf } from './runek/Bookshelf'
import { Player } from './runek/Player'
import { Terrain } from './runek/Terrain'

export function FirstWorld() {
  return (
    <World>
      <Terrain size={[40, 40]} />
      <Bookshelf position={[0, 1, 0]} seed={42} fill={0.8} />
      <Player />
    </World>
  )
}
```

Same `seed` → same world, every time.

## Repository layout

```
packages/
  core/         @runek/core        — <World>, useWorld, seeded rng, contract types
  components/   @runek/components   — the procedural components
  cli/          @runek/cli          — the CLI (init / add / list); bin: runek
apps/
  docs/         the docs site (flat docs + a walkable 3D library); serves the registry at /r
registry/       registry.json (index) + generated components/*.json
```

## Development

```sh
just install      # install workspace deps (pnpm)
just docs         # run the docs site (the in-repo dev harness)
just check        # full gate: lint + typecheck + test + build
```

Run `just` to list every recipe. Requires Node 24 (pinned in `.nvmrc`) and pnpm. Built on React 19, React Three Fiber 9, Rapier, ecctrl, and drei.

## Contributing

Component contributions are welcome. Start with [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the dev setup and the step-by-step "add a component" flow, and check your work against the [component contract](./CONTRACT.md).

[![made with Pixelspace](https://pixelspace.anirudha.dev/badge.svg)](https://pixelspace.anirudha.dev)

## License

[MIT](LICENSE) © nullorder
