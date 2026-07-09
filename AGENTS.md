# AGENTS.md

Guidelines for AI agents (Claude Code and others) working in this repository.

## What this is

**Runek** — a source registry of procedural 3D components for React Three Fiber ("shadcn for 3D worlds"): you pull a component's source into your project and own it. Every component generates its geometry from props + a `seed`; a whole world is serializable `{ component, props, seed }[]` data. No binary assets, no server, static deploy.

## Repository layout

```
packages/
  core/         @runek/core        — <World>, useWorld, seeded rng, contract types
  components/   @runek/components   — the procedural components (depends on core)
  cli/          runek              — the `runek` CLI: init / add / list (source registry)
apps/
  docs/         the docs site (Astro + R3F): pre-rendered flat Markdown pages + a walkable 3D library world; also serves the registry at /r
registry/       the served source registry: registry.json (index) + generated components/*.json
```

Dependency direction is strictly one-way: `docs → components → core`. Nothing in the library imports from an app. The CLI is standalone (Node built-ins only) and reads the registry. Standalone worlds live in their own repos — **Helicon**, the showcase world, lives at `nullorder/helicon` and consumes Runek via the CLI-vendored source registry; the monorepo holds the library plus the docs harness.

## Distribution: source registry (the shadcn split)

Decided model — **the shadcn split**: users pull editable component **source** into their project via `npx @runek/cli add <name>` (no black box), while the small runtime is the published **`@runek/core`** npm package the components import. `registry/registry.json` is the hand-maintained index; `registry/components/*.json` are **generated** (`just registry`) self-contained manifests with inlined source + auto-derived deps (each component declares `@runek/core` as an npm dependency, pinned to core's version). Component source is written verbatim — there's no import to rewrite. After editing any component or the index, run `just registry` to refresh the manifests.

## Commands

This repo uses [`just`](https://just.systems) as the task runner. Run `just` to list every recipe; prefer these over raw `pnpm`/`biome` calls.

```sh
just            # list all recipes
just install    # install workspace dependencies
just docs       # run the docs site (Astro dev server) — the in-repo dev harness
just check      # full gate: lint + typecheck + test + build
just lint       # Biome lint + format check (no writes)
just fmt        # Biome auto-format + safe fixes
just typecheck  # tsc --noEmit across all packages
just build-docs # production build of the docs site
just test       # run the vitest suites across packages
just registry   # regenerate the served registry (registry/components/*.json)
just cli ...    # run the runek CLI from source, e.g. `just cli add bookshelf --registry ./registry`
just clean      # remove build output + node_modules
```

Node ≥ 20, pnpm. The repo pins **Node 24** via `.nvmrc` (`nvm use` / `fnm use`; CI reads it through `node-version-file`). **Before handing off a change, run `just check`** — lint, typecheck, and build must all pass.

## Versions & dependencies

Both are centralized — do not hand-edit them in individual `package.json` files:

- **Dependency versions** live in one place: the `catalog:` block in `pnpm-workspace.yaml`. Every `package.json` references `"catalog:"` instead of a literal version. To bump a dependency (e.g. three.js), edit its catalog entry **once**, then `just install`.
- **Package versions** are kept in lockstep across all workspace packages. Change them with **`just version X.Y.Z`** (writes every `package.json` via `scripts/set-version.mjs`) — never edit a `version` field by hand.
- Releases: **`just publish`** runs the gate, npm-publishes the `runek` CLI, tags `vX.Y.Z`, and creates a GitHub release (`just publish-help` shows the steps). The component library ships as source via the registry, which goes live by deploying `apps/docs` (serves `/r`).
- **Changelog:** [CHANGELOG.md](CHANGELOG.md) follows [Keep a Changelog](https://keepachangelog.com) + semver. Every user-facing change (new component or prop, behavior change, fix, CLI or release tooling) gets an entry under `## [Unreleased]` in the matching category (Added / Changed / Fixed / Removed), with breaking changes marked **Breaking:**. Internal-only chores can skip it. At release, the Unreleased section is retitled to the new version (with its compare link and date) and a fresh Unreleased section starts. The docs site renders this same file at `/docs/changelog` via `apps/docs/src/content/docs/changelog.mdx`.

## Core principles (the moat — never compromise these)

1. **Procedural-first** — geometry from props + `seed`; no `.glb`, no textures, no CDN.
2. **A world is data** — every component is a pure, deterministic function of its props.
3. **Seeded determinism** — same seed → same result, everywhere.
4. **Parametric LOD** — detail scales with props/distance.
5. **Local-first** — no backend; a world deploys as a static site.

Any feature that requires a binary asset or a server must be questioned against these five.

## The component contract

Every component: accepts `position`, `rotation`, `seed`; generates geometry inside `useMemo` keyed on all geometry-affecting props (including `seed`); registers its own colliders (a Rapier `RigidBody`); respects the `unit` scale from `useWorld()`. Keep collider count proportional to gameplay surface, not visual detail (e.g. one cuboid for a bookshelf, not one per book).

The **normative spec** (MUST/SHOULD + conformance checklist) is [CONTRACT.md](CONTRACT.md); the contributor workflow for adding a component is [CONTRIBUTING.md](CONTRIBUTING.md).

## Code conventions

- **TypeScript everywhere.** Typed props *are* the contract.
- **Avoid over-commenting.** Let clean names and structure carry meaning; comment only the non-obvious (why, not what).
- **Clean, modular code.** Small focused modules; names and file structure that follow mainstream open-source React/TS conventions.
- **Source-first.** Packages ship TypeScript source; the app consumes it directly via Vite. No build step for libraries unless a distribution decision requires it.
- **Units:** 1 unit = 1 meter, Y-up; rotations in radians.
- Formatting/linting is **Biome** (`biome.json`) — 2-space indent, single quotes, semicolons as needed.

## Working agreements

- **Never run `git add` or `git commit` unless explicitly asked.** Leave staging and commits to the user.
- **Planning docs:** if a `plan/` directory is present, it holds the maintainer's internal planning notes. It is git-ignored and may differ per contributor — when present, read it and follow it on priority.
- Plan substantial work before writing it.
- Distribution model (registry vs npm) is still open — keep package boundaries clean so either path stays viable.
