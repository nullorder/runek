---
title: The workshop
summary: Build a world in your browser, tune every prop, edit it as JSON or live TSX, put one component in the lab, dress a person in the dressing room, and share it all as a link.
category: guide
order: 11
---

The [workshop](/workshop) is Runek's in-browser workbench: the room next to the library, where the world you build renders live and the tools float over it. Nothing is installed and nothing leaves your browser. The whole session is a `WorldData` value, so a share link is just that value, compressed into the URL.

You can also walk there: in the [library](/library), the door on the right wall with the green ring leads to it.

## Four modes

- **Build** composes a world. The **Outliner** lists the nodes (drag to reorder or nest them under a `Group`), and its **+ Add**, **Templates** and **Snippets** tabs drop things at the point the camera looks at. Click anything in the room to select it, then move or rotate it with the gizmo (`g`, `r`), or edit it in the **Inspector**.
- **Lab** puts one component on a pedestal with instruments: bounds in meters, a 1.8 m figure for scale, wireframe, normals, colliders, triangle and draw-call counts, and how long it took to build. The **seed grid** shows 9, 16 or 25 seeds side by side; **A / B** compares two prop sets; **check determinism** builds the component twice and compares geometry hashes.
- **Code** opens the code panel: `world.json`, a live `App.tsx`, and the install commands for your world.
- **Dress** opens the dressing room, a room of its own for customising a `Person` (below).

## The dressing room

Behind the door in the hall's west wall is a room for one job: dressing a person. Select a `Person` and press **customize** in the inspector (or click the doorway, press `4`, or pick **Dress**), and it stands on a turntable platform under good light. Edits land on the figure in your scene as you make them, so undo works as usual and **revert** puts back what you came in with. With no person selected you dress a new figure, then **add to scene**.

The **Avatar** panel has a tab per part of the figure, and the camera frames that part:

- **Looks**: the seed (with a 3 × 3 grid of the neighbouring seeds to pick from), the `kind` preset, and the `skin` bundles.
- **Body**: style, gender, age, build, height, skin tone.
- **Face**: eye color and size, brows, nose, lips, blush, facial hair.
- **Hair**: style and color.
- **Clothes**: the outfit, the colors it takes, and the layer stack. Layers go inner to outer and the order decides the fit: a top above the trousers is tucked in, one below hangs over them. Drag to reorder, open a layer for its color, sleeves, neckline and length, or add one from the garment tiles.
- **Hat & extras**, **Pose** (pose, emote, speech bubble, name tag), and **More** for behavior: routes, interaction, colliders.

Every trait shows where its value comes from: **set** by you, from the **skin** or **kind**, **seeded**, or the component's **default**. ⟲ clears what you set, so the skin, kind or seed decides again. 📌 pins what the seed chose, so it stays when the seed changes. **🎲 shuffle** rerolls only the open tab (on Looks, it picks a new seed). Choices you make are written into the figure's part objects (`body`, `face`, `hair`), the canonical form.

**export .look.json** downloads the look (who the figure is and what it wears, not where it stands) as a `Person` node, and **import…** puts one on the figure. **use as play avatar** dresses the world's `Player` body in the same look, adding a `Player` if the world has none.

## Every prop, generated

The inspector is not hand-written. At build time the docs site reads each component's TypeScript (its props interface, the defaults in its signature, the JSDoc) and turns it into a schema. Numbers get sliders, colors get swatches that show the palette slot they fall back to, string unions become segmented choices or dropdowns, `[x, y, z]` gets three scrubbable fields, and nested specs (a `Person`'s `clothes`, a `Wall`'s `openings`) get list editors. A dot marks props you changed, and ⟲ resets one to its default (it disappears from the file). Drag a number's label sideways to scrub it.

Callbacks and React children can't live in a world file; the inspector lists them under **Code-only props**, to use from `App.tsx`. **Export → Prop schema** downloads the whole schema as JSON.

## world.json and App.tsx

The `world.json` tab is the world itself, two ways: edit the room and the file updates; edit the file and the room follows (after a short pause). Completion knows component names, props, enum values and palette slots; inside a `nodes` array, type `node:` for a node or `snippet:` for a group. If the JSON is broken, the room keeps the last good world and the error is marked in the gutter. **minimal** hides props equal to their defaults.

`App.tsx` is a real React file that runs live. It starts generated from your world, either rendering the JSON with `WorldRenderer` (the *data* style) or spelled out component by component (the *JSX* style). `import world from './world.json'` always gives the current world, so the inspector keeps working while your code runs. Export a `registry` with your own components and the outliner accepts them as node types. The **new ▾** menu has examples: a custom seeded component, a `useFrame` animation, interactions and click handlers, and a world generated in a loop.

The code runs in a sandboxed iframe with its own origin: it can't read this site's storage, cookies or page, and it can import only React, three.js, React Three Fiber, drei, Rapier, `@runek/core` and `@runek/components`. A loop that never yields is stopped. Links that carry code ask before running it.

## Stages

The room around your world is a stage, not part of it, and it is never exported:

- **Room**: the Workshop hall, with a 20 × 20 m build plot.
- **Plot**: an open plot under the sky, for terrain and islands.
- **None**: your world alone, exactly as your app would render it.

## Walk it

**▶ Play** (or `p`) hides the tools and drops a first-person `Player` where the camera was looking (or uses your world's own `Player`). `Esc` brings you back. In the Room stage, walking out of the door leads back to the library.

## Take it home

- **Share → Copy link** puts the world, the stage and the camera in the URL. There is no server: anyone with the link gets the same world, rebuilt from the same seeds.
- **Export** downloads `world.json`, `App.tsx`, a PNG of the view (2×, optionally transparent), or the prop schema.
- The **Install** tab lists the exact `npx @runek/cli add …` command for the components your world uses.
- Drop a `.world.json` anywhere on the page to open it, or link to one: `/workshop?src=https://…/world.json` loads it from any static host that allows it.

Your work autosaves in the browser. **Templates** start you from a reading room, a village square, an island cove, an office, a campsite at dusk, or a line-up of people.

## Keyboard

| Keys | |
|---|---|
| `⌘K` | Command palette: add anything, load templates, jump to a node |
| `⌘Z` · `⇧⌘Z` | Undo · redo |
| `g` · `r` | Move · rotate |
| `f` · `Home` | Frame the selection · frame everything |
| `d` · `⌫` | Duplicate · delete |
| `⌘C` · `⌘V` | Copy · paste nodes as JSON (paste a whole world too) |
| `p` · `Esc` | Play · back |
| `Tab` | Hide or show all panels |
| `1` `2` `3` `4` | Build, Lab, Code, Dress |
| `⌘↵` | Run App.tsx |
| `?` | All shortcuts |
