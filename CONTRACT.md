# The Runek Component Contract

This is the normative spec every Runek component must satisfy to be accepted into
the registry. It's what PR reviewers check against. The friendly walkthrough lives
in the docs ([The component contract](https://runek.nullorder.org/docs/the-component-contract));
this document is the checklist.

The keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are
used as in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

> **Stability:** the contract is pre-1.0 and **MAY** change on a minor (`0.x.0`)
> bump. It **freezes at 1.0.0**, after which changes follow semver.

---

## 1. Shape

- A component **MUST** be a React function component with a **named export** in
  **PascalCase** (e.g. `Bookshelf`), and **MUST** export a typed props interface
  named `<Name>Props`.
- It **MUST** accept the base props `position`, `rotation`, and `seed`
  (`WorldComponentProps` from `@runek/core`). It **MAY** add its own props.
- Every prop **SHOULD** be **JSON-serializable** (numbers, strings, booleans,
  arrays, plain objects). Function/ref props break [worlds-as-data](https://runek.nullorder.org/docs/worlds-as-data) and **SHOULD NOT** be required.
- Each prop **MUST** have a sensible default, so `<Name />` renders something.
- A component **MAY** be interactive. If so, the *data* of the interaction (what is
  clickable, where a click leads) **MUST** stay JSON-serializable — e.g. a `books`
  array, a per-item `href` — and any event callback (e.g. `onBookSelect`) **MUST**
  be **optional**, so the component still renders and round-trips from data without
  it. See `Bookshelf`.

## 2. Determinism

- A component **MUST** be a **pure, deterministic function of its props**: the same
  props (including `seed`) **MUST** produce the same output on every machine and
  every render.
- All randomness **MUST** come from the seeded RNG (`rng(seed)` and the helpers
  from `@runek/core`). Components **MUST NOT** use `Math.random()`, `Date`, or any
  other ambient nondeterminism to generate geometry.
- When composing child components, child seeds **MUST** be derived stably (e.g.
  `sub(seed, n)`), not shared verbatim.

## 3. Geometry

- Geometry **MUST** be generated inside `useMemo`, **keyed on every
  geometry-affecting prop** (including `seed`). Unrelated re-renders **MUST NOT**
  rebuild geometry.
- Detail **SHOULD** scale with props and/or distance (parametric LOD) where it's
  meaningful.

## 4. No assets (the moat)

- A component **MUST NOT** depend on binary assets: no `.glb`/`.gltf`, no image
  textures, no HDR environment maps, no fonts.
- A component **MUST NOT** fetch anything at runtime or require a CDN. Geometry,
  color, and materials come from code.

## 5. Colliders

- A component that presents a **gameplay surface** (something you stand on, bump
  into, or can't pass through) **MUST** register its own colliders via a Rapier
  `RigidBody`.
- Collider count **SHOULD** be proportional to **gameplay surface, not visual
  detail** — one cuboid for a bookshelf, not one collider per book. Prefer
  `cuboid`/convex hull; use `trimesh` only when a shape genuinely needs arbitrary
  geometry (it's the most expensive).
- Purely decorative or non-solid components (e.g. `Sky`, `LightRig`, `Grass`)
  **MAY** register no colliders.

## 6. Units & orientation

- A component **MUST** read `unit` from `useWorld()` and scale its dimensions by
  it. **1 unit = 1 meter**, **Y is up**, rotations are in **radians**.

## 7. Palette & performance

- Color props **SHOULD** default to a slot of the world palette
  (`useWorld().palette`) so one palette swap re-themes a whole world. An explicit
  color prop **MUST** still override the palette. Fixed colors are acceptable
  only where no slot fits (e.g. seeded book spines).
- Repeated geometry (books, branches, blades, …) **SHOULD** render as an
  `InstancedMesh` — draw calls scale with *kinds* of geometry, not instance
  counts. See `Bookshelf`, `Trees`, and `Grass` for the pattern.

## 8. Dependencies & boundaries

- Shared utilities **MUST** be imported from `@runek/core` only.
- A component **MAY** compose sibling components; each such sibling **MUST** be
  declared as a `registryDependency` (see [CONTRIBUTING](./CONTRIBUTING.md)).
- A component **MUST NOT** import from an app (`apps/*`). Dependency direction is
  one-way: `app → components → core`.
- Third-party npm dependencies are derived automatically from imports — keep them
  minimal and justified.

## 9. World data (the envelope)

These govern the `WorldData` a component is placed into, not individual components.
`@runek/core` handles them, but an author should know the shape round-trips losslessly.

- `WorldData` **MAY** carry optional top-level fields the renderer reads (`unit`,
  `gravity`, `palette`, `fog`) plus **`meta`**, the world's identity (`title`,
  `description`, `authors[]`, `license`, `source`). Every one is optional and additive.
- `parseWorld` **MUST** accept a world without `meta`, **MUST** pass `meta` and unknown
  fields through unchanged (light shape validation only), and a new optional field
  **MUST NOT** require a `version` bump.
- A `WorldNode` **MAY** carry an optional stable **`id`**. The editor assigns ids to
  nodes that lack them and preserves existing ones; ids key React reconciliation and
  selection, with an array-index fallback. Hand-authored worlds need not write ids.
- `serializeWorld` **MUST** emit a canonical key order, so an unchanged node never
  churns the diff.

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
- [ ] `just check` passes (lint, typecheck, test, build)
