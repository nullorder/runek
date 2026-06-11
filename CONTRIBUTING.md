# Contributing to Runek

Thanks for wanting to add to the world. Runek is a **source registry** of
procedural 3D components for React Three Fiber — contributing a component means
adding a small, deterministic, asset-free building block that anyone can pull into
their project and own.

Please be respectful and constructive in issues and reviews.

## The five principles (the moat)

Every contribution is weighed against these. A feature that needs a binary asset or
a server gets questioned.

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

This repo uses [`just`](https://just.systems) as the task runner — run `just` to
list every recipe. Node ≥ 20 and pnpm are required.

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

1. **Write it.** Create `packages/components/src/<Name>.tsx` following the
   [component contract](./CONTRACT.md) — typed `<Name>Props`, deterministic from
   `seed`, geometry in `useMemo`, colliders proportional to gameplay surface, no
   assets, respects `unit` from `useWorld()`. Default colors to world-palette
   slots (`useWorld().palette`) and render repeated geometry as an
   `InstancedMesh` (see `Bookshelf`, `Trees`, `Grass`).

2. **Export it.** Add to `packages/components/src/index.ts` (the type and the
   component, kept alphabetical):

   ```ts
   export type { CrateProps } from './Crate'
   export { Crate } from './Crate'
   ```

   And register it in `packages/components/src/registry.ts` so data-driven worlds
   can render it by name:

   ```ts
   import { Crate } from './Crate'
   export const registry: ComponentRegistry = { /* …, */ Crate /* , … */ }
   ```

3. **Add it to the registry index.** Append an entry to
   [`registry/registry.json`](./registry/registry.json):

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

   `dependencies` and `registryDependencies` are **derived from your imports** —
   you don't hand-write them.

4. **Regenerate the registry and docs:**

   ```sh
   just registry    # builds registry/components/*.json (inlined source + derived deps)
   just gen-docs    # writes apps/docs/src/content/docs/components/<name>.md
   ```

   Optionally tune the gallery preview camera/props in
   `apps/docs/src/lib/preview.ts` (most components are fine with the defaults).

5. **Verify:**

   ```sh
   just check       # lint + typecheck + test + build (must pass)
   just docs        # eyeball it at /gallery and /docs
   ```

## Conventions

- **TypeScript everywhere.** Typed props *are* the contract.
- **Biome** for lint + format — run `just fmt` before committing.
- **Avoid over-commenting.** Let clean names carry meaning; comment the *why*, not
  the *what*.
- **Source-first.** Packages ship TypeScript source; no build step for libraries.
- Centralized versions: dependency versions live in the `catalog:` block of
  `pnpm-workspace.yaml`; package versions move in lockstep via `just version X.Y.Z`.
  Don't hand-edit either.

## Pull requests

- Keep PRs focused; one component or one concern per PR.
- `just check` must be green.
- Write self-contained commit messages and PR descriptions — assume the reader has
  no internal context.
- By contributing, you agree your work is licensed under the project's
  [MIT license](./LICENSE).
