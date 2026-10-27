# Contributing to Runek

Thanks for wanting to add to the world. Runek is a **source registry** of procedural 3D components for React Three Fiber — contributing a component means adding a small, deterministic, asset-free building block that anyone can pull into their project and own.

Please be respectful and constructive in issues and reviews.

## The five principles (the moat)

Every contribution is weighed against these. A feature that needs a binary asset or a server gets questioned.

1. **Procedural-first** — geometry from props + `seed`; no `.glb`, no textures, no CDN.
2. **A world is data** — every component is a pure, deterministic function of its props.
3. **Seeded determinism** — same seed → same result, everywhere.
4. **Parametric LOD** — detail scales with props/distance.
5. **Local-first** — no backend; a world deploys as a static site.

## Setup

```sh
nvm use            # or fnm use — Node 24, pinned in .nvmrc
just install       # install workspace deps (pnpm)
just docs          # run the docs site (gallery + 3D library — the dev harness)
```

This repo uses [`just`](https://just.systems) as the task runner — run `just` to list every recipe. Node ≥ 24 and pnpm are required.

## Repository layout

```
packages/core/         @runek/core       — <World>, useWorld, seeded rng, contract types
packages/components/   @runek/components — the procedural components
packages/cli/          runek             — the `runek` CLI
apps/docs/             the docs site (also serves the registry at /r)
registry/              registry.json (index) + generated components/*.json
```

Dependency direction is one-way: `app → components → core`.

## Adding a component

1. **Write it.** Create `packages/components/src/<Name>.tsx` following the [component contract](./CONTRACT.md) — typed `<Name>Props`, deterministic from `seed`, geometry in `useMemo`, colliders proportional to gameplay surface, no assets, respects `unit` from `useWorld()`. Default colors to world-palette slots (`useWorld().palette`) and render repeated geometry as an `InstancedMesh` (see `Bookshelf`, `Trees`, `Grass`). Three render rules keep worlds fast as they grow (see CONTRACT §7):
   - **Materials:** take static ones from `useMaterial` / `useMaterials` (see `Bench`, `Lamp`); they're shared and read-only, so a material you change after mount (a flicker, a texture you draw into) stays your own.
   - **Motion:** wrap parts you move, scale, hide or reshape after mount in `<Dynamic>` (see `Clock`'s hands, `Windmill`'s sails), so the world's static batching leaves them alone.
   - **Light:** register light with `useLight(look)` and put the emitter's `ref` where it shines from (see `Lamp`, `CeilingLight` for a spot); never mount a `<pointLight>` yourself. Flicker by writing the emitter's `intensity`.

2. **Export it.** Add to `packages/components/src/index.ts` (the type and the component, kept alphabetical):

   ```ts
   export type { CrateProps } from './Crate'
   export { Crate } from './Crate'
   ```

   And register it in `packages/components/src/registry.ts` so data-driven worlds can render it by name:

   ```ts
   import { Crate } from './Crate'
   export const registry: ComponentRegistry = { /* …, */ Crate /* , … */ }
   ```

3. **Add it to the registry index.** Append an entry to [`registry/registry.json`](./registry/registry.json):

   ```json
   {
     "name": "crate",
     "title": "Crate",
     "type": "registry:component",
     "category": "interiors",
     "description": "A seeded wooden crate with a cuboid collider.",
     "files": [{ "path": "packages/components/src/Crate.tsx", "target": "Crate.tsx" }]
   }
   ```

   `dependencies` and `registryDependencies` are **derived from your imports** — you don't hand-write them.

   Optionally add `"example": { "height": "tall" }` to show props beside `position` and `seed` in the docs page's usage snippet. Pick the ones that show off what the component can do.

4. **Regenerate the registry and docs:**

   ```sh
   just registry    # builds registry/components/*.json (inlined source + derived deps), props.json, world.schema.json
   just gen-docs    # writes apps/docs/src/content/docs/components/<name>.md
   ```

   Optionally tune the gallery preview camera/props in `apps/docs/src/lib/preview.ts` (most components are fine with the defaults).

5. **Verify:**

   ```sh
   just check       # lint + typecheck + test + build (must pass)
   just docs        # eyeball it at /gallery and /docs
   just perf        # render cost of the library world against scripts/perf-budget.json
   ```

   Every component lands in the library's gallery hall, so `just perf` shows what it adds
   per frame. CI runs it on pull requests. If it goes over, cut the cost (instancing, fewer
   shadow casters, no extra scene passes) before raising the budget, and say why in the PR.

## Conventions

- **TypeScript everywhere.** Typed props *are* the contract.
- **Biome** for lint + format — run `just fmt` before committing.
- **Avoid over-commenting.** Let clean names carry meaning; comment the *why*, not the *what*.
- **Source-first.** Packages ship TypeScript source; no build step for libraries.
- Centralized versions: dependency versions live in the `catalog:` block of `pnpm-workspace.yaml`; package versions move in lockstep via `just version X.Y.Z`. Don't hand-edit either.

## Performance

Runek has to stay fast as the catalog grows, and how fast depends on the machine: GPU, operating system and browser all change the picture. The [Performance](https://runek.nullorder.org/docs/performance) page lists measured frame rates per machine, and it only knows the machines someone measured. Adding yours takes one command:

```sh
just perf update   # measures the library world at pixel densities 1, 1.5 and 2 (about 10 minutes)
```

It saves `apps/docs/src/data/perf/<date>-<os>-<cpu>.json`: the OS and version, CPU, core count, memory, GPU, browser and the results, with no hostname, username or paths. Send it as a pull request. Weaker GPUs, Windows, and Linux with a GPU (`--gpu`) are the most useful, since they're the gaps.

Improving the measurement is just as welcome: a new view (a crowd, a large outdoor world), another browser, phones, or a counter that catches a kind of slowdown the budget misses today. It all lives in `scripts/perf.mjs` and `scripts/perf-budget.json`; if you find a slow spot, an issue with your numbers is a good start too.

## Pull requests

- Keep PRs focused; one component or one concern per PR.
- `just check` must be green, and `just perf` within budget.
- Log user-facing changes in [`CHANGELOG.md`](./CHANGELOG.md) under **[Unreleased]**, in the matching [Keep a Changelog](https://keepachangelog.com) category (Added / Changed / Fixed / Removed). A new component is one **Added** line; internal-only chores can skip this.
- Write self-contained commit messages and PR descriptions — assume the reader has no internal context.
- By contributing, you agree your work is licensed under the project's [MIT license](./LICENSE).
