# AGENTS.md

Guidelines for AI agents (Claude Code and others) working in this repository.

## What this is

**Runek** — a copy-paste registry of procedural 3D components for React Three Fiber ("shadcn for 3D worlds"). Every component generates its geometry from props + a `seed`; a whole world is serializable `{ component, props, seed }[]` data. No binary assets, no server, static deploy.

## Repository layout

```
packages/
  core/         @runek/core        — <World>, useWorld, seeded rng, contract types
  components/   @runek/components   — the procedural components (depends on core)
apps/
  helicon/      the showcase world (Vite app; extracts to its own repo at distribution GA)
```

Dependency direction is strictly one-way: `helicon → components → core`. Nothing in the library imports from an app. Standalone worlds live in their own repos; the monorepo holds the library plus a dev/docs harness.

## Commands

```sh
pnpm install      # install workspace deps
pnpm dev          # run the Helicon showcase app (Vite)
pnpm build        # typecheck + production build of the app
pnpm lint         # Biome lint + format check
pnpm format       # Biome auto-format
pnpm typecheck    # tsc --noEmit across all packages
```

Node ≥ 20, pnpm. Before handing off a change, make sure `pnpm typecheck` and `pnpm lint` pass.

## Core principles (the moat — never compromise these)

1. **Procedural-first** — geometry from props + `seed`; no `.glb`, no textures, no CDN.
2. **A world is data** — every component is a pure, deterministic function of its props.
3. **Seeded determinism** — same seed → same result, everywhere.
4. **Parametric LOD** — detail scales with props/distance.
5. **Local-first** — no backend; a world deploys as a static site.

Any feature that requires a binary asset or a server must be questioned against these five.

## The component contract

Every component: accepts `position`, `rotation`, `seed`; generates geometry inside `useMemo` keyed on all geometry-affecting props (including `seed`); registers its own colliders (a Rapier `RigidBody`); respects the `unit` scale from `useWorld()`. Keep collider count proportional to gameplay surface, not visual detail (e.g. one cuboid for a bookshelf, not one per book).

## Code conventions

- **TypeScript everywhere.** Typed props *are* the contract.
- **Avoid over-commenting.** Let clean names and structure carry meaning; comment only the non-obvious (why, not what).
- **Clean, modular code.** Small focused modules; names and file structure that follow mainstream open-source React/TS conventions.
- **Source-first.** Packages ship TypeScript source; the app consumes it directly via Vite. No build step for libraries unless a distribution decision requires it.
- **Units:** 1 unit = 1 meter, Y-up; rotations in radians.
- Formatting/linting is **Biome** (`biome.json`) — 2-space indent, single quotes, semicolons as needed.

## Working agreements

- **Never run `git add` or `git commit` unless explicitly asked.** Leave staging and commits to the user.
- **Planning docs:** if a `plan/` directory is present, it holds the maintainer's internal planning notes (roadmap, architecture, open decisions). It is git-ignored and may differ per contributor — when present, read it and follow it on priority.
- Plan substantial work before writing it.
- Distribution model (registry vs npm) is still open — keep package boundaries clean so either path stays viable.
