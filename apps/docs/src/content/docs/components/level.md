---
title: "Level"
summary: "A stackable wall ring plus optional slab: per-side openings, sides that can be omitted, and a stairwell hole — the unit a building is composed from."
category: component
component: level
order: 100
---

## Add it

```bash
npx @runek/cli add level
```

Pulls `floor`, `wall`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Level } from './runek/Level'

<Level position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Level", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `size` | `[number, number]` | `[8, 8]` | Interior footprint `[width, depth]`, in units. |
| `height` | `number` | `3` | Height, in units. |
| `thickness` | `number` | `0.2` | Thickness, in units. |
| `walls` | `LevelWalls` |  | Per-side wall configs; an omitted side renders a solid wall. |
| `floor` | `boolean \| LevelFloorConfig` | `true` | The slab underfoot; `false` for none, or a config with a stairwell `opening`. |
| `color` | `color` | palette `wall` | Defaults to the world palette's `wall` slot. |
| `seed` | `number` |  | Reserved for procedural variation. |

### `LevelWalls`

| Prop | Type | Default | Description |
|---|---|---|---|
| `front` | `LevelWallConfig` |  |  |
| `back` | `LevelWallConfig` |  |  |
| `left` | `LevelWallConfig` |  |  |
| `right` | `LevelWallConfig` |  |  |

### `LevelWallConfig`

| Prop | Type | Default | Description |
|---|---|---|---|
| `present` | `boolean` |  | Set `false` to leave this side open (porch, lean-to). |
| `openings` | `WallOpening[]` |  |  |
| `color` | `color` | palette `wall` | Defaults to the level `color`, then the world palette's `wall` slot. |

### `WallOpening`

| Prop | Type | Default | Description |
|---|---|---|---|
| `offset` | `number` |  | Horizontal center offset from the wall center, in units. |
| `width` | `number` | **required** |  |
| `height` | `number` | **required** |  |
| `sill` | `number` |  | Height of the opening's base above the wall base, in units. |

### `LevelFloorConfig`

| Prop | Type | Default | Description |
|---|---|---|---|
| `opening` | `FloorOpening` |  |  |
| `thickness` | `number` |  |  |
| `color` | `color` | palette `floor` | Defaults to the world palette's `floor` slot. |

### `FloorOpening`

| Prop | Type | Default | Description |
|---|---|---|---|
| `x` | `number` |  | Hole center offset from the slab center along X, in units. |
| `z` | `number` |  | Hole center offset from the slab center along Z, in units. |
| `width` | `number` | **required** |  |
| `depth` | `number` | **required** |  |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/level.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/level.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add level</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
