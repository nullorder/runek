---
title: "Room"
summary: "Composite: four walls and a floor with a doorway, arranged from one Level. Unpack to customize."
category: component
component: room
order: 100
---

**Room is a composite**: a data arrangement of parts, not code. `add`
copies the arrangement JSON plus the source of every part it references.

## Add it

```bash
npx @runek/cli add room
```

Pulls `level`.

## Use it

Place it in a world by type — the renderer expands the arrangement in place:

```json
{ "type": "Room", "props": { "position": [0, 0, 0], "seed": 1 } }
```

Register the arrangement in your registry map next to the parts it uses:

```ts
import room from './runek/composites/room.json'

const registry = { /* …parts… */, Room: room as unknown as CompositeDef }
```

An instance `seed` deterministically re-rolls every child that doesn't pin its
own. In the editor, **Unpack** replaces an instance with its editable
arrangement (a `Group` of ordinary nodes) for per-instance customization.

## Arrangement

```json
{
  "kind": "composite",
  "name": "Room",
  "description": "Four walls and a floor with a front doorway — one Level with an opening. Unpack it to add a ceiling, windows, or more openings.",
  "bounds": [8, 3, 8],
  "nodes": [
    {
      "type": "Level",
      "props": {
        "size": [8, 8],
        "height": 3,
        "walls": {
          "front": { "openings": [{ "width": 1.4, "height": 2 }] }
        }
      }
    }
  ]
}
```

## Migrate

**v0.11.0 → v0.12.0.** `Room` is no longer a coded component — the registry name now resolves to a **composite**: one `Level` with a front doorway. For JSX composition, reach for `Level` directly; it is the same walls-plus-floor ring with per-side openings.

<div class="migration">
<div class="migration__col">
<div class="migration__tag">v0.11.0</div>

```tsx
import { Room } from './runek/Room'

<Room size={[8, 8]} doorWidth={1.4} roof />
```

</div>
<div class="migration__col migration__col--after">
<div class="migration__tag">v0.12.0</div>

```tsx
import { Level } from './runek/Level'

<Level
  size={[8, 8]}
  walls={{ front: { openings: [{ width: 1.4, height: 2 }] } }}
/>
```

</div>
</div>

- World files need nothing: `{ "type": "Room" }` keeps rendering via the composite.
- The old `roof` ceiling is a `Floor` on top: `<Floor position={[0, 3.2, 0]} size={[8, 8]} />` (its origin is its top surface), or unpack the composite and extend it.
- [`scripts/migrate-buildings.mjs`](https://github.com/nullorder/runek/blob/main/scripts/migrate-buildings.mjs) bakes old `Room` nodes with non-default props into the equivalent parts.
- The `RoomProps` type no longer exists.

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/room.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/room.json</span>
<span class="manifest-card__hint">Self-contained JSON: the inlined arrangement plus resolved dependencies, exactly what <code>runek add room</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
