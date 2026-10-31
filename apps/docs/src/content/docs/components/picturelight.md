---
title: "PictureLight"
summary: "A brass picture light on one or two arms that washes the face below it: over a picture on a wall, or on the top of a bookshelf. Can light only after dusk."
category: component
component: picturelight
order: 100
---

## Add it

```bash
npx @runek/cli add picturelight
```

Pulls `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { PictureLight } from './runek/PictureLight'

<PictureLight position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "PictureLight", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | `0.5` | Length of the hood, in units. |
| `reach` | `number` | `0.16` | How far the hood stands out from the mount, in units. |
| `fall` | `number` | `1.2` | How far below the mount the light falls, in units: the picture's or the shelf's height. |
| `color` | `color` |  | Hood, arms, and back plate; defaults to the palette's `accent` (brass). |
| `lightColor` | `color` | `"#ffe6c0"` | The light and the glowing bulb. |
| `intensity` | `number` | `6` | Light strength. |
| `on` | `boolean` | `true` | Switched on. |
| `nightOnly` | `boolean` | `false` | Light only while the world's sun is down. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Migrate

**v0.16.0 → v0.17.0.** `PictureLight` no longer mounts its own three.js light. It registers a `useLight` emitter, and the world lends it one of a fixed pool of real lights while it matters to the view. Inside `<World>` nothing changes; in your own `<Canvas>`, wrap the scene in `<LightBudget>` or it gives no light.

<div class="migration">
<div class="migration__col">
<div class="migration__tag">v0.16.0</div>

```tsx
<Canvas>
  <PictureLight />
</Canvas>
```

</div>
<div class="migration__col migration__col--after">
<div class="migration__tag">v0.17.0</div>

```tsx
import { LightBudget } from '@runek/core'

<Canvas>
  <LightBudget>
    <PictureLight />
  </LightBudget>
</Canvas>
```

</div>
</div>

- A world with more lamps in view than its budget lights the nearest and brightest first (6 point lights and 2 spotlights by default): raise `<World lightBudget>` if a room needs more.
- If you edited your copy to reach its light (a ref to the `<pointLight>`), use the emitter instead: `useLight` returns it, and you can write its `intensity` every frame.
- A copy pulled at 0.17.0 imports `useLight`, `useMaterial` and `Dynamic` from `@runek/core` 0.17.0; `runek add` picks the registry snapshot that matches the core you have.

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/picturelight.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/picturelight.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add picturelight</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
