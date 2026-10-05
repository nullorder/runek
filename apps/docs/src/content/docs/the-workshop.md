---
title: The workshop
summary: Build a world in your browser, tune every prop, edit it as JSON or live TSX, put one component in the lab, and share it all as a link.
category: guide
order: 11
---

The [workshop](/workshop) is Runek's in-browser workbench: the room next to the library, where the world you build renders live and the tools float over it. Nothing is installed and nothing leaves your browser. The whole session is a `WorldData` value, so a share link is just that value, compressed into the URL.

You can also walk there: in the [library](/library), the door on the right wall with the green ring leads to it.

## Three modes

- **Build** composes a world. The **Outliner** lists the nodes (drag to reorder or nest them under a `Group`), and its **+ Add**, **Templates** and **Snippets** tabs drop things at the point the camera looks at. Click anything in the room to select it, then move or rotate it with the gizmo (`g`, `r`), or edit it in the **Inspector**.
- **Lab** puts one component on a pedestal with instruments: bounds in meters, a 1.8 m figure for scale, wireframe, normals, colliders, triangle and draw-call counts, and how long it took to build. The **seed grid** shows 9, 16 or 25 seeds side by side; **A / B** compares two prop sets; **check determinism** builds the component twice and compares geometry hashes.
- **Code** opens the code panel: `world.json`, a live `App.tsx`, and the install commands for your world.

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
| `1` `2` `3` | Build, Lab, Code |
| `⌘↵` | Run App.tsx |
| `?` | All shortcuts |
