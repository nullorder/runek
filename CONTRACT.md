# The Runek Component Contract

This is the normative spec every Runek component must satisfy to be accepted into the registry. It's what PR reviewers check against. The friendly walkthrough lives in the docs ([The component contract](https://runek.nullorder.org/docs/the-component-contract)); this document is the checklist.

The keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are used as in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

> **Stability:** the contract is pre-1.0 and **MAY** change on a minor (`0.x.0`) bump. It **freezes at 1.0.0**, after which changes follow semver.

---

## 1. Shape

- A component **MUST** be a React function component with a **named export** in **PascalCase** (e.g. `Bookshelf`), and **MUST** export a typed props interface named `<Name>Props`.
- It **MUST** accept the base props `position`, `rotation`, and `seed` (`WorldComponentProps` from `@runek/core`). It **MAY** add its own props.
- Every prop **SHOULD** be **JSON-serializable** (numbers, strings, booleans, arrays, plain objects). Function/ref props break [worlds-as-data](https://runek.nullorder.org/docs/worlds-as-data) and **SHOULD NOT** be required.
- Each prop **MUST** have a sensible default, so `<Name />` renders something.
- A component **MAY** be interactive. If so, the *data* of the interaction (what is clickable, where a click leads) **MUST** stay JSON-serializable — e.g. a `books` array, a per-item `href` — and any event callback (e.g. `onBookSelect`) **MUST** be **optional**, so the component still renders and round-trips from data without it. See `Bookshelf`.

## 2. Determinism

- A component **MUST** be a **pure, deterministic function of its props**: the same props (including `seed`) **MUST** produce the same output on every machine and every render.
- All randomness **MUST** come from the seeded RNG (`rng(seed)` and the helpers from `@runek/core`). Components **MUST NOT** use `Math.random()`, `Date`, or any other ambient nondeterminism to generate geometry.
- When composing child components, child seeds **MUST** be derived stably (e.g. `sub(seed, n)`), not shared verbatim.

## 3. Geometry

- Geometry **MUST** be generated inside `useMemo`, **keyed on every geometry-affecting prop** (including `seed`). Unrelated re-renders **MUST NOT** rebuild geometry.
- Detail **SHOULD** scale with props and/or distance (parametric LOD) where it's meaningful.

## 4. No assets (the moat)

- A component **MUST NOT** depend on binary assets: no `.glb`/`.gltf`, no image textures, no HDR environment maps.
- A component **MUST NOT** fetch anything at runtime or require a CDN. Geometry, color, and materials come from code.
- **Text is the one carve-out.** A component that renders text uses a font drawn only from `world.fonts` (declared by the world) or the single default font bundled in `@runek/core`. It still **MUST NOT** ship its own font file or fetch a font from a CDN. Every other component stays asset-free.

## 5. Colliders

- A component that presents a **gameplay surface** (something you stand on, bump into, or can't pass through) **MUST** register its own colliders via a Rapier `RigidBody`.
- Collider count **SHOULD** be proportional to **gameplay surface, not visual detail** — one cuboid for a bookshelf, not one collider per book. Prefer `cuboid`/convex hull; use `trimesh` only when a shape genuinely needs arbitrary geometry (it's the most expensive).
- Purely decorative or non-solid components (e.g. `Sky`, `LightRig`, `Grass`) **MAY** register no colliders.

## 6. Units & orientation

- A component **MUST** read `unit` from `useWorld()` and scale its dimensions by it. **1 unit = 1 meter**, **Y is up**, rotations are in **radians**.

## 7. Palette & performance

- Color props **SHOULD** default to a slot of the world palette (`useWorld().palette`) so one palette swap re-themes a whole world. An explicit color prop **MUST** still override the palette. Fixed colors are acceptable only where no slot fits (e.g. seeded book spines).
- Repeated geometry (books, branches, blades, …) **SHOULD** render as an `InstancedMesh` — draw calls scale with *kinds* of geometry, not instance counts. See `Bookshelf`, `Trees`, and `Grass` for the pattern.

## 8. Dependencies & boundaries

- Shared utilities **MUST** be imported from `@runek/core` only.
- A component **MAY** compose sibling components; each such sibling **MUST** be declared as a `registryDependency` (see [CONTRIBUTING](./CONTRIBUTING.md)).
- A component **MUST NOT** import from an app (`apps/*`). Dependency direction is one-way: `app → components → core`.
- Third-party npm dependencies are derived automatically from imports — keep them minimal and justified.

## 9. World data (the envelope)

These govern the `WorldData` a component is placed into, not individual components. `@runek/core` handles them, but an author should know the shape round-trips losslessly.

- `WorldData` **MAY** carry optional top-level fields the renderer reads (`unit`, `gravity`, `palette`, `fog`) plus **`meta`**, the world's identity (`title`, `description`, `authors[]`, `license`, `source`). Every one is optional and additive.
- A world **MAY** also declare runtime **settings** (the world's "rules") as top-level fields, resolved onto `WorldContext` for components to read via `useWorld()`:
  - **`time`** (`"HH:MM"`, 24h) pins a reproducible time-of-day; **`timezone`** (IANA) instead tracks a live clock. Both resolve to `useWorld().time` (`{ hours, live, timezone? }`). A day/night-aware component (e.g. `Sky`, `LightRig`) **SHOULD** read it, and **MUST** still render with the default (a pinned midday) when unset.
  - **`avatar`** (`'first' | 'third'`) is the world's default camera view, read as `useWorld().avatar`; `Player` uses it when its own `view` is unset. An explicit component prop **MUST** win over the world default (as with palette colors).
  - **`ground`** (a Y baseline, default 0) is the world's ground level, read as `useWorld().ground` (in a coastal world, this baseline is your sea level). Floor-sitting and water components **SHOULD** default their placement to it (open water at or below it, per §10); an explicit `position` wins.
- `parseWorld` **MUST** accept a world without `meta`, **MUST** pass `meta`, the settings above, and unknown fields through unchanged (light shape validation only), and a new optional field **MUST NOT** require a `version` bump.
- A `WorldNode` **MAY** carry an optional stable **`id`**. The editor assigns ids to nodes that lack them and preserves existing ones; ids key React reconciliation and selection, with an array-index fallback. Hand-authored worlds need not write ids.
- `serializeWorld` **MUST** emit a canonical key order, so an unchanged node never churns the diff.

## 10. Water

- An **open water body** (e.g. `Lake`) **MUST** read as filling a depression, never floating above the ground. Its local origin is the **water surface**, and a world **MUST** place that surface **at or below** the surrounding ground level, with the terrain forming the banks. A water sheet hovering over flat ground is a placement bug, not a valid world.
- A water component **SHOULD** treat its origin as the surface plane (so sinking it is a single negative-Y placement) and **MUST NOT** assume it rests on top of the ground. It **SHOULD** default its surface to `world.ground` (§9), so `<Lake />` complies without an explicit `position`.
- **Contained water** held in a component's own vessel (e.g. `Fountain`, `Well`) is the exception: its surface sits inside the basin the component renders, because the vessel, not the terrain, holds it.

## 11. Composites

A **composite** is a registry item whose payload is a *data arrangement* of component nodes (`kind: "composite"`, a `nodes: WorldNode[]` array) rather than source code — `house` and `room` are the canonical examples. The renderer expands an instance eagerly into a group carrying the instance's `position`/`rotation`.

- A composite's `nodes` **MUST** be plain, JSON-serializable `WorldNode`s. No callbacks, no template variables — a composite is one concrete arrangement; variation comes from the instance `seed` and from unpacking.
- Every `type` a composite references **MUST** be a registry item (or the built-in `Group`), and each one **MUST** be declared as a `registryDependency` (derived automatically by the registry build from the node types).
- Seeds follow §2's derivation rule at the data level: an instance `seed` gives each child that doesn't pin its own seed a stable `sub(seed, index)`. A composite **MUST NOT** rely on all children sharing one seed.
- Colliders, units, palette, and the no-assets rule (§4–§7) are satisfied by the referenced components; a composite adds no geometry of its own.
- The optional `bounds` field (`[w, h, d]` in units) is **reserved** for the future streaming/LOD pass; authors **MAY** declare it, renderers currently ignore it.

---

## Conformance checklist

- [ ] Named PascalCase export + exported `<Name>Props` interface
- [ ] Accepts `position`, `rotation`, `seed`; all props default and are JSON-serializable
- [ ] Pure & deterministic; randomness only via `rng`/`sub` from `@runek/core`
- [ ] Geometry built in `useMemo` keyed on geometry props (incl. `seed`)
- [ ] No binary assets, no runtime fetch / CDN
- [ ] Registers colliders proportional to gameplay surface (or none, if decorative)
- [ ] Respects `unit` from `useWorld()` (meters, Y-up, radians)
- [ ] Color props default to world-palette slots; explicit colors still win
- [ ] Repeated geometry is instanced, not one mesh per piece
- [ ] Imports shared code from `@runek/core`; sibling deps declared; no app imports
- [ ] Open water sits at/below ground (surface origin); contained water is in its vessel
- [ ] `just check` passes (lint, typecheck, test, build)
