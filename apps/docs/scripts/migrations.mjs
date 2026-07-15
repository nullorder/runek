// Hand-authored migration guides, keyed by registry item name. gen-component-docs
// merges these into each generated component page as a side-by-side before/after
// panel (see `.migration` in global.css). Add an entry whenever a minor changes a
// component's API or default behavior; entries accumulate across versions.
//
// Shape: { from, to, summary, before: { lang, code }, after: { lang, code }, notes? }

export const MIGRATIONS = {
  wall: [
    {
      from: '0.11.0',
      to: '0.12.0',
      summary:
        'The single `opening` prop became `openings`, an array, so one wall can carry a door and windows together. The `WallOpening` shape itself is unchanged (`offset`, `width`, `height`, `sill`).',
      before: {
        lang: 'tsx',
        code: `<Wall
  width={9}
  opening={{ width: 1, height: 2.1 }}
/>`,
      },
      after: {
        lang: 'tsx',
        code: `<Wall
  width={9}
  openings={[
    { width: 1, height: 2.1 },
    { offset: 3, width: 1.3, height: 1.2, sill: 1 },
  ]}
/>`,
      },
      notes: [
        'Mechanical migration: wrap the object in an array — `opening={X}` becomes `openings={[X]}`; in world files, `"opening": {…}` becomes `"openings": [{…}]`.',
        'Openings are laid out by `offset` (center offset from the wall center, in units) and must not overlap horizontally.',
      ],
    },
  ],

  house: [
    {
      from: '0.11.0',
      to: '0.12.0',
      summary:
        '`House` is no longer a coded component with parametric props — the registry name now resolves to a **composite**: a data arrangement of `Level`s, a `Door`, `Window`s, a `Staircase`, a gable `Roof`, and a `Plant`. The default house is a two-level dwelling with a working staircase.',
      before: {
        lang: 'tsx',
        code: `import { House } from './runek/House'

<House
  size={[9, 9]}
  height={3}
  roofStyle="gable"
  wallColor="#b8a888"
/>`,
      },
      after: {
        lang: 'tsx',
        code: `import { WorldNodes } from '@runek/core'
import { registry } from './runek/registry'

<WorldNodes
  nodes={[{ type: 'House', props: { seed: 7 } }]}
  registry={registry}
/>`,
      },
      notes: [
        'World files with default props need nothing: `{ "type": "House" }` keeps rendering, now by expanding the composite.',
        'Nodes that relied on the old parametric props (`size`, `height`, `roofStyle`, `wallColor`, `roofColor`) can bake the exact old single-storey look with [`scripts/migrate-buildings.mjs`](https://github.com/nullorder/runek/blob/main/scripts/migrate-buildings.mjs), which replaces each node with the equivalent arrangement of parts.',
        'To customize a house, **Unpack** the instance in the editor, or edit `composites/house.json` after `runek add house`. An instance `seed` re-rolls the arrangement.',
        'The `HouseProps` type no longer exists.',
      ],
    },
  ],

  room: [
    {
      from: '0.11.0',
      to: '0.12.0',
      summary:
        '`Room` is no longer a coded component — the registry name now resolves to a **composite**: one `Level` with a front doorway. For JSX composition, reach for `Level` directly; it is the same walls-plus-floor ring with per-side openings.',
      before: {
        lang: 'tsx',
        code: `import { Room } from './runek/Room'

<Room size={[8, 8]} doorWidth={1.4} roof />`,
      },
      after: {
        lang: 'tsx',
        code: `import { Level } from './runek/Level'

<Level
  size={[8, 8]}
  walls={{ front: { openings: [{ width: 1.4, height: 2 }] } }}
/>`,
      },
      notes: [
        'World files need nothing: `{ "type": "Room" }` keeps rendering via the composite.',
        'The old `roof` ceiling is a `Floor` on top: `<Floor position={[0, 3.2, 0]} size={[8, 8]} />` (its origin is its top surface), or unpack the composite and extend it.',
        '[`scripts/migrate-buildings.mjs`](https://github.com/nullorder/runek/blob/main/scripts/migrate-buildings.mjs) bakes old `Room` nodes with non-default props into the equivalent parts.',
        'The `RoomProps` type no longer exists.',
      ],
    },
  ],

  roof: [
    {
      from: '0.11.0',
      to: '0.12.0',
      summary:
        'No signature break, but gable roofs now cap their open triangular ends with wall-colored prisms (the attic used to show the sky). The old look is one prop away.',
      before: {
        lang: 'tsx',
        code: `<Roof style="gable" />
// v0.11.0: gable ends rendered open`,
      },
      after: {
        lang: 'tsx',
        code: `<Roof style="gable" />
// v0.12.0: ends are capped by default

<Roof style="gable" ends={false} />
// opt back into the open look`,
      },
      notes: ['The caps default to the palette `wall` slot; override with `endColor`.'],
    },
  ],
}
