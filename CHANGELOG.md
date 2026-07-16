# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/nullorder/runek/compare/v0.10.4...HEAD)

### Added

- Docs library: the reading-room shelves are labeled category sections
  (Intro / Guides / Reference) instead of an unlabeled even deal, so a
  new doc only joins its own section rather than reshuffling every
  shelf. Reference docs (CLI, changelog) now shelve too, and the
  changelog book reads the root `CHANGELOG.md` in-world. Books spread
  across each case's rows (the CLI reference sits on the Reference
  shelf's top row, the changelog on its bottom). The painted RUNEK
  mark carries the current version beneath it.
- `BookSpec.shelf`: pin a `Bookshelf` book to a specific row (0 = top,
  clamped); books without a row keep auto-packing bottom-up around the
  placed ones.
- `Book` component: a single procedural book — `standing`, `lying`, or
  `open` — with a seeded cloth cover and optional `href`/`onSelect`
  interaction (hover pop + title label). The standalone, placeable
  sibling of `Bookshelf`'s instanced spines; decorative, no collider.
  The gallery wing's guide books now use it (open, on their stands).
- **`controls`: input bindings are a world setting.** A partial
  `action → KeyboardEvent.code[]` map merged over the defaults, on
  `WorldData`/`<World>` and resolved at `useWorld().controls` — remap
  for AZERTY (`{ "forward": ["KeyW", "KeyZ"] }`), disable an action
  with `[]`, or add custom action names your own components read via
  `useKeyboardControls`. Orthogonal to `avatar`; the JSX `keyboardMap`
  prop remains the verbatim escape hatch and wins when given.

- **Composites**: a new registry kind holding a named *arrangement* of
  component nodes as JSON instead of code. A world places one node
  (`{ "type": "House" }`); the renderer expands the arrangement in place,
  and an instance `seed` deterministically re-rolls children that don't
  pin their own. The editor lists composites in its add menu and gains an
  **Unpack** action that replaces an instance with an editable `Group`
  subtree. `runek add <composite>` copies the arrangement JSON plus the
  source of every part it references. (CONTRACT §11.)
- `Level` component: a stackable wall ring plus optional slab, with
  per-side wall configs (openings, color, or an omitted side) and a
  stairwell hole — the unit buildings are composed from.
- `Floor` gains a rectangular `opening` (a stairwell hole); the slab
  splits into strips around it so collision matches the visual.
- Built-in `Group` node type in worlds-as-data: a plain transform
  container for children.
- Gable `Roof`s cap their open end triangles (`ends`, default on) with
  wall-colored prisms, so the attic no longer shows the sky
  ([Roof migration guide](https://runek.nullorder.org/docs/components/roof#migrate)
  for keeping the old open look).
- `scripts/migrate-buildings.mjs`: bakes pre-composite `House`/`Room`
  nodes (with non-default props) into equivalent part arrangements.
- Docs: "The building kit" guide; the library world's gallery wing ends
  at a walkable two-level show home built from the `house` composite.
- Docs: component pages gain a **Migrate** section — a side-by-side
  before/after panel per version bump. Four components carry a
  0.11.0 → 0.12.0 guide:
  [`Wall`](https://runek.nullorder.org/docs/components/wall#migrate),
  [`House`](https://runek.nullorder.org/docs/components/house#migrate),
  [`Room`](https://runek.nullorder.org/docs/components/room#migrate), and
  [`Roof`](https://runek.nullorder.org/docs/components/roof#migrate).
  Entries live in `apps/docs/scripts/migrations.mjs` and accumulate
  across versions.
- `Hut`, `Tent`, `Counter`, `Stool`, `Road`, and `Cliff` components.
- `Compass` HUD component: a screen-fixed dial that tracks the camera
  heading, with an optional wind and bearing readout.
- `Bookshelf` gains a `label` prop (plus `labelColor` and `labelSize`)
  that draws a `Sign` floating above the shelf frame.
- `Path` gains a `heights` elevation profile so trails can follow the
  terrain they climb.
- `Player` gains a `children` slot for a custom avatar that replaces the
  default capsule and hides in first-person view.
- Keyboard camera control: Left/Right arrows turn (yaw) and Up/Down
  arrows look (pitch), composing with mouse drag.

### Changed

- Arrow-key camera look now works in **first person** too (it was
  third-person only): Left/Right turn, Up/Down look, in both views,
  composing with mouse-drag as before.
- `Bookshelf` defaults to 3 rows (`shelves` was 4); pass `shelves={1}`
  or `shelves={2}` for a shorter case, or any other count.
- **Breaking:** `House` and `Room` are no longer coded components — the
  registry names now resolve to composites (the default `house` is a
  two-level dwelling with a working staircase). Worlds that placed them
  with default props keep rendering; worlds that relied on non-default
  props can bake the old look with `scripts/migrate-buildings.mjs`.
  `HouseProps`/`RoomProps` are gone from `@runek/components`. Migration
  guides:
  [House](https://runek.nullorder.org/docs/components/house#migrate),
  [Room](https://runek.nullorder.org/docs/components/room#migrate).
- **Breaking:** `Wall`'s single `opening` prop is replaced by
  `openings: WallOpening[]` — one wall can now carry a door and windows
  together. Migration (`opening: X` → `openings: [X]`):
  [Wall migration guide](https://runek.nullorder.org/docs/components/wall#migrate).
- **Breaking:** the default `keyboardMap` in `@runek/core` no longer
  binds the arrow keys to movement. WASD moves the character; the arrow
  keys steer the camera.
- Docs site: search moved to Pagefind's Component UI, and the walkable
  library world gained a gallery wing.

### Fixed

- The brand font bundled in `@runek/core` is embedded as woff (was
  woff2, which troika-three-text cannot parse), so text components
  render the brand face instead of falling back to a fetched default.
- Docs generator: props tables were missing for any component whose
  props interface uses an `extends` clause.

## [0.10.4](https://github.com/nullorder/runek/compare/v0.10.2...v0.10.4) - 2026-06-30

### Added

- `Portal` component: a glowing travel gate with a physics sensor that
  fires `onEnter` (or navigates to `to`) when the avatar or a vehicle
  passes through.
- `Signpost` component: a post-and-plank signboard that renders a name
  in the world's display font.

### Fixed

- `WorldNodes` no longer passes an explicit `null` child to leaf nodes,
  which clobbered a component's own `children` default; text authored in
  world JSON (a `Sign`'s label, for example) now round-trips correctly.

## [0.10.2](https://github.com/nullorder/runek/compare/v0.10.1...v0.10.2) - 2026-06-29

### Added

- `Dock`, `Flag`, `Sailboat`, and `Windmill` components.
- `Sailboat` gains a `physics` prop: set it to `false` to render the
  boat as a bare visual so a parent controller (a steerable vehicle)
  can own the physics body.
- Prerelease publish channels: `just publish alpha|beta|rc` ships to the
  matching npm dist-tag and marks the GitHub release a pre-release.

## [0.10.1](https://github.com/nullorder/runek/compare/v0.10.0...v0.10.1) - 2026-06-27

### Added

- `Ocean` component: a procedural animated-shader sea that follows the
  camera and blends into the distance fog, defaulting to the palette's
  water colors and the world ground baseline.
- `Terrain` gains `falloff` (radial island falloff with a shoreline at
  the rim) and `collider` (set `false` for backdrop terrain the player
  never walks).

### Fixed

- `WorldEditor` and `WorldRenderer` forward `ground` and `fonts` to the
  world context instead of silently dropping them.

## [0.10.0](https://github.com/nullorder/runek/compare/v0.6.0...v0.10.0) - 2026-06-26

Folds in the 0.7.0 through 0.9.0 milestones, which were versioned in the
repository but never published to npm.

### Added

- World identity and git-native contribution: `WorldData.meta` (title,
  description, authors, license, source), stable node `id`s with
  `assignNodeIds()`, a canonical key order in `serializeWorld` so
  unchanged nodes never churn a diff, and a `WorldAbout` panel.
- World settings and rules: `<World time>` pins a reproducible
  time-of-day and `<World timezone>` tracks a live clock, driving a
  day/night cycle in `Sky` and `LightRig`; `<World avatar>` sets the
  default camera view for `Player`.
- World fonts and the `Sign` text component: a world declares fonts by
  role and `Sign` renders from them, with a default face bundled in
  `@runek/core`. Text is the single sanctioned exception to the
  asset-free rule.
- 18 components rounding out the catalog: `Fence`, `Bridge`, `Path`,
  `Arch`, `Pillar`, `Bush`, `Flowers`, `Hedge`, `Well`, `Fountain`,
  `Bench`, `Bed`, `Crate`, `Barrel`, `Plant`, `Clouds`, `Campfire`,
  and `Birds`.
- `ground` world baseline (a Y value, default 0) that `Floor` and `Lake`
  place themselves against, plus the open-water rule in `CONTRACT.md`.
- Docs site search (Pagefind).

### Changed

- All workspace packages aligned to a single 0.10.0 version line.
- The release flow regenerates the served registry manifests before
  publishing and refuses to ship from a dirty tree, so manifests can no
  longer drift from the released version.

## [0.6.0](https://github.com/nullorder/runek/compare/015fffc...v0.6.0) - 2026-06-18

### Added

- Clickable `Bookshelf` books: a serializable `books` array
  (`{ id, title?, color?, href? }`) with hover feedback and an
  `onBookSelect` callback; without a callback, a click navigates the
  book's `href`.
- `Clock` component: a procedural analog clock tracking the local system
  clock or a given IANA `timezone`.

### Changed

- **Breaking:** components import the runtime from the published
  `@runek/core` npm package instead of a copy vendored by the CLI, and
  `coreImport` is removed from `runek.config.json`. Core improvements
  now reach existing projects via a normal dependency update.
- **Breaking:** the CLI is published as the scoped `@runek/cli`
  (previously the unscoped `runek`).
- **Breaking:** `Bookshelf`'s `fill` now defaults to `0`, rendering an
  empty shelf; pass `fill` explicitly for the old decorative look.
- The editor exports the world as a `world.json` file download instead
  of copying JSON to the clipboard.

## [0.5.0](https://github.com/nullorder/runek/commits/015fffc) - 2026-06-18

Initial public release.

### Added

- `@runek/core`: the `<World>` provider (canvas, physics, keyboard
  controls, lighting), `useWorld`, deterministic seeded `rng` helpers,
  world palette and fog, and the shared component contract.
- Data-driven worlds: the `WorldData`/`WorldNode` JSON model with
  `serializeWorld`/`parseWorld`, a `WorldRenderer` that mounts world
  data against a component registry, and an in-browser `WorldEditor`
  with selection gizmos and JSON export.
- The `runek` CLI (`init`, `add`, `list`) and the source registry:
  `add` copies editable component source into your project along with
  its dependencies.
- Starter catalog: `Player`, `Terrain`, `Room`, and `Bookshelf`, plus
  the structure, furnishing, nature, and lighting component sets.
- Docs site with flat pages, a live component gallery, and a walkable
  3D library world.
