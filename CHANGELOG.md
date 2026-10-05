# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/nullorder/runek/compare/v0.13.0...HEAD)

### Added

- `Person` is configurable part by part, all as plain JSON: `body`
  (`build`, `tone`, `height`), `face` (eye color and size, brow color
  and weight, `nose` shape, lip color and fullness, `blush`), `hair`
  as `{ style, color }`, and `clothes`, an ordered list of garment
  layers (`tshirt`, `shirt`, `sweater`, `vest`, `tunic`, `coat`,
  `dress`, `robe`, `apron`, `trousers`, `jeans`, `shorts`, `skirt`,
  `shoes`, `boots`, `belt`, `scarf`, `cape`), each with its own
  `color` and, for tops, `sleeves` and `neck`. Layers go inner to
  outer and the order decides the fit: a shirt listed before the
  jeans is tucked in. `clothes={[]}` is the bare base body. The flat
  props (`outfit`, `topColor`, `skinTone`, `hairColor`, ...) still
  work as shorthands. New `swept` hairstyle and `preppy` skin.
- `useWorld().player`: a ref to the mounted `Player`'s avatar (at eye
  height), or `null` when there's no `Player`. Components can react to
  where the player stands instead of where the camera is.
- The ground is queryable: `groundAt(x, z)` returns the highest walkable
  top at a point, computed from the same functions that build the
  meshes (no raycasts, no physics). `createGroundIndex(world, registry)`
  indexes a world once; `useGround()` gives the query inside a world;
  `checkWorld` reports problems. All of it also ships from the React-free
  `@runek/core/data` entry, for Node scripts and tests.
- Anchored nodes: a world node's `anchor` (`"ground"` or `"surface"`)
  makes its `position[1]` an offset above the ground at its (x, z), so
  props stay on uneven terrain. The file keeps the offset, so moving or
  reseeding the terrain re-seats everything anchored to it. Works for
  any node, including groups, composites, and `Player`.
- Surfaces: `Terrain` and `Shore` (terrain), `Dock`, `Floor`, and `Slab`
  (decks), and `Lake` (water) publish their tops as `Component.surface`,
  with the math in a plain `surfaces/*.ts` module that `runek add`
  copies alongside the component. People, trees, furniture, and
  buildings (including the `house` and `room` composites) are marked
  `groundSitting`.
- Editor: **Drop to ground** / **Drop to surface** for the selection, an
  **Anchor** switch that keeps the node in place, and anchored nodes
  slide along the ground when dragged.
- `runek check-world <file>`: flags buried and floating nodes and open
  water standing above its shore, with a suggested Y for each.
  `--fix` writes them into the file; `--strict` exits non-zero for CI.
- `Terrain` accepts `rotation`, like every other component.
- Guide: "Placing things on uneven ground".
- `Person` walks. `patrol` takes waypoints relative to its `position`
  (they turn with `rotation`); `wander` takes a radius and walks a
  seeded loop inside it. `speed` (by age: 1.3 m/s for an adult),
  `pause` at each waypoint, and `loop` (`"loop"` or `"pingpong"`) shape
  the route. Where a figure is on its route depends only on the clock
  and the seed, so everyone viewing the world sees it in the same place.
  It follows the ground under it, eases in and out of each stop, turns
  into its corners, and swings its arms and legs in a walk cycle keyed
  to the distance walked, so feet don't slide. The authored `pose` plays
  at each pause (a merchant walks to the stall, then works). Walkers
  step aside for the player and for each other (passing on the right
  when head-on), and wait when a wall blocks both sides. A walking
  figure's collider is kinematic; a standing one costs what it did.
- `Person` `gait`: the walk-cycle speed for a figure something else
  moves. As a `Player`'s body it now walks in step with the avatar
  instead of sliding.
- `useWorld().walkers` (the figures walking right now, for components
  that want to steer around them) and `PlayerMotionContext` (the
  enclosing `Player`'s live speed).
- `World` `input`: set `false` to ignore the keyboard (e.g. while a
  modal is open). Keys held at that moment are released.
- `World` `paused`: stops the frame loop and physics, so a world that
  isn't on screen costs nothing. Animations resume where they stopped.
- `isEditableTarget(target)`: whether a key event belongs to a text
  field rather than the world.
- `Person` takes trips: `route` is a one-way walk through waypoints
  (relative to `position`, like `patrol`) that sets off at `departAt`
  (epoch ms), waits at its first point before then, and stays at its
  last point after, in its `pose`. Where it is depends only on the
  clock, so every viewer agrees and a reopened page needs no replay.
  `onArrive` fires once per trip, even when the arrival happened while
  the world was paused or unmounted. `tripAt()` gives where a trip had
  got to, for starting the next one from there.
- `Person` `actions`, `actionRadius`, and `onAction`: walk near a
  figure and a prompt over its head shows what you can do (`T Talk`,
  `I Info`) with the keys the world's `controls` bind; press one and
  `onAction` gets its id. Only the nearest figure in range shows a
  prompt and takes the key, and keys yield to text fields.
- `Interactable`: wrap anything in it to offer the player the same
  prompt and actions (sit on a sofa, use a desk).
- `useInteraction(anchor, { actions, radius, onAction })` in core, the
  hook behind both, for components that draw their own prompt;
  `keyLabel(code)` turns `KeyT` into `T` for display.
- `useWorld().keyboard`: the key events the world reads (none aimed at
  text fields, none while `input` is off or the world is paused).
- `Sign` `outline`: a crisp edge in a color, so text reads against any
  background.
- `Desk`: a work desk on slim legs, a drawer pedestal, or side panels,
  with a modesty panel at the back. Base and drawer count are seeded.
- `Monitor`: a desk monitor on a foot, plate, or legs. Switched on,
  its screen glows in its `screen` color with a few seeded windows of
  text on it; `on={false}` is dark glass.
- `Sofa`: one to four seats, with square, rolled, or slim arms, split
  or bench cushions in soft shades of the fabric, pegs or a plinth,
  and throw pillows, all seeded and each pinnable.
- Guide: "Embedding a world in an app" (content security policy,
  desktop webviews, lazy loading, input, pausing, and figures driven by
  app state).
- `Person` poses `type` (seated, fingers on the keys), `play` (hands
  on controls), `drink` (a mug held at the chest, sipped now and then),
  and `lie` (on its back, centered on `position`, head toward -Z, so it
  takes a `Bed`'s position and rotation at mattress height).
- `Person` `bubble`: a short line in a speech bubble over the head.
  `emote`: a small animated sign instead (`sleep` rising z's, `alert`
  a bouncing !, `think` pulsing dots, `happy` a heart, `coffee` a
  steaming cup), drawn from shapes and the world font.
- Office and casual clothes: `hoodie` and `blazer` garment layers,
  `outfit` shorthands `tshirt`, `sweater`, `hoodie`, and `blazer`, a
  `chef` hat, and the `office`, `casual`, `hoodie`, and `chef` skins.
- `Player` `view="overhead"` (and `avatar: "overhead"` in a world):
  the camera high above at a fixed tilt, following the avatar, with
  scroll to zoom and WASD walking relative to the screen. A `view`
  control in the world's `controls` cycles first, third, and overhead
  at runtime, keeping the avatar where it stands.
- `OfficeChair`, `Tv` (on a stand, a console, or a wall, with a seeded
  picture), `Whiteboard` (seeded marker diagrams and optional `text`),
  `Fridge`, `CoffeeMachine` (espresso or drip, with steam),
  `ArcadeCabinet` (a seeded pixel game on its screen), and `PoolTable`
  (balls racked or mid-game).
- `Table` `base="pedestal"` and `ends="round"`, for a conference table;
  `Counter` `hob` for a kitchen stove (a glass cooktop and an oven).
- `Sign` `onBounds`: the laid-out text's size, for fitting a backdrop.

### Changed

- **Breaking:** `WorldEditor` moved to its own entry point. Import it
  from `@runek/core/editor` instead of `@runek/core`. `leva` is now an
  optional peer dependency, needed only by apps that use the editor.
- The world no longer reads keys typed into a text field (`input`,
  `textarea`, `select`, or `contenteditable`), so typing "wasd" into a
  form beside the canvas doesn't walk the avatar. Keys held when the
  window loses focus are released instead of staying stuck down.
- `@runek/cli` declares Node 24 or newer (`engines.node` was `>=20`),
  matching the version the repo develops and tests on.
- `Person` has a new look: one continuous sculpted body (no seams at
  the joints) with a sculpted face, eyelids that blink, eyes that
  follow you, and hands with fingers, skinned to an 18-bone skeleton
  so it bends as one. Clothes, hair, and hats are layers fitted to the
  body, so any garment fits any build, age, or style. The default
  `style` is now `stylized` (an animated-film look); `realistic` and
  `anime` remain. Meshes build in the background a few milliseconds at
  a time, coarse first; full detail builds only within ~10 units of
  the camera, and identical figures share one build.
- `Person` turns its head toward the player's avatar, not the camera.
  In third person the camera trails behind, so figures used to look
  past you; now they meet your avatar's eyes, and `lookRadius` is
  measured from the avatar. Without a `Player` (e.g. an orbit view) it
  still watches the camera. A `Person` used as the `Player`'s own body
  no longer tries to track anything.
- `Player`'s capsule no longer tips over: its rotation is locked and
  only the visible body turns to face the way it walks. At low frame
  rates the old balancing could topple the avatar. The avatar also
  starts facing the way the camera looks.
- A seated `Person`'s name, bubble, and prompt sit over its head at
  seat height instead of floating at standing height.
- `Player` holds still until there's ground under it (or half a second
  passes) before gravity takes over, so a spawn can't drop through a
  collider that hasn't arrived yet.

### Fixed

- Setting one `Person` trait (a skin tone, a build) no longer
  reshuffles the seeded rolls of the others.
- A `Player` spawned over displaced `Terrain` could fall through it:
  the trimesh collider was derived one render after the mesh. `Terrain`
  now builds it in the same render.

## [0.13.0](https://github.com/nullorder/runek/compare/v0.12.0...v0.13.0) - 2026-09-18

### Added

- `Person` component: a procedural human figure, so worlds can have
  people in them. The body is built from smooth lathe surfaces (tapered
  limbs, one hip-to-shoulder torso profile) on an articulated joint rig
  that breathes, shifts its weight, blinks, and turns its head to watch
  you; detail drops to a cheap silhouette past ~18 units. A `style`
  template sets the whole look: `anime` (default; bigger head, large
  lit eyes, tapered chin, longer legs, chunky fringe) or `realistic`
  (canonical 7.5-head proportions). Traits resolve explicit prop first,
  then the `skin` cosmetic bundle, then the `kind` role preset
  (villager, merchant, guard, sailor, farmer, noble, scholar,
  traveler), then the seed, so `<Person seed={3} />` is a complete
  villager and every prop narrows it: `gender`, `age`, `height`,
  `build`, `skinTone`, `hair`, `facialHair`, `outfit`, clothing colors,
  `hat`, `accessories`, and `pose`. `skin` (a `PersonSkin`) bundles
  clothes, colors, headwear, hair, and accessories as one plain-JSON
  prop, so an editor or in-world UI can swap a figure's whole look in
  a single write; nine named presets ship as `PERSON_SKINS` (festival,
  harvest, winter, voyage, ceremony, atelier, pirate, bartender,
  sailor — wardrobe only, never hair), and `skin` accepts a preset
  name (`"winter"`) or a bundle. `position` is the spawn point; one capsule collider
  makes the figure solid, and `physics={false}` yields a bare visual
  you can hand to `Player` as a third-person body. Movement and
  dialogue come later.

- `Slab` component: a rounded structural plate (`pill` or `disc`) for
  curved-modernist floor decks, cantilevered roofs, terraces, or a lawn
  disc. Walkable, one convex-hull collider; top surface at the origin
  like `Floor`.
- `CurvedWall` component: an arc of wall around the origin — `solid`
  concrete or a floor-to-ceiling `glass` curtain wall with mullions and
  rails. Instanced chords, each carrying a cuboid collider; compose
  several arcs to leave door gaps.
- `Pool` component: a built swimming pool flush with the deck — coping
  rim, walkable plastered basin with corner exit steps, translucent
  water just under the lip.
- `Palm` component: a coconut palm with a leaning bowed trunk and a
  crown of drooping instanced fronds; seed drives lean, spread, and the
  coconut cluster.
- Docs library: a librarian and a traveler now stand in the reading
  room, and the player's third-person body is a `Person`.

### Fixed

- Contribute modal: "Suggest changes upstream" downloads `world.json`
  and `snapshot.png` with one button instead of two, so the snapshot
  that step 4 asks for is no longer skipped. The PNG is now named
  `snapshot.png` to match the instructions (was `world-snapshot.png`).

## [0.12.0](https://github.com/nullorder/runek/compare/v0.11.0...v0.12.0) - 2026-07-19

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

## [0.11.0](https://github.com/nullorder/runek/compare/v0.10.4...v0.11.0) - 2026-07-10

### Added

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
