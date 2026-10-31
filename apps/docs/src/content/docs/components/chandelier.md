---
title: "Chandelier"
summary: "A hanging chandelier: a chain, a turned brass body, one or two rings of curved arms with candle bulbs, and optional glass drops. Instanced, with one shared light; can light only after dusk."
category: component
component: chandelier
order: 100
---

## Add it

```bash
npx @runek/cli add chandelier
```

Pulls `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Chandelier } from './runek/Chandelier'

<Chandelier position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Chandelier", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `arms` | `number` |  | Arms on the lower tier. Seeded (5 to 8) when unset. |
| `tiers` | `1 \| 2` |  | One ring of arms, or two (the upper one smaller). Seeded when unset. |
| `radius` | `number` | `0.45` | Reach of the lower arms from the center, in units. |
| `drop` | `number` | `0.4` | Chain length from the ceiling to the body, in units. |
| `crystals` | `boolean` |  | Glass drops hanging from the arms. Seeded when unset. |
| `color` | `color` |  | Frame, arms, and cups; defaults to the palette's `accent` (brass). |
| `lightColor` | `color` | `"#ffd9a0"` | The light and the glowing bulb. |
| `intensity` | `number` | `22` | Light strength. |
| `on` | `boolean` | `true` | Switched on. |
| `nightOnly` | `boolean` | `false` | Light only while the world's sun is down. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Migrate

**v0.16.0 → v0.17.0.** `Chandelier` no longer mounts its own three.js light. It registers a `useLight` emitter, and the world lends it one of a fixed pool of real lights while it matters to the view. Inside `<World>` nothing changes; in your own `<Canvas>`, wrap the scene in `<LightBudget>` or it gives no light.

<div class="migration">
<div class="migration__col">
<div class="migration__tag">v0.16.0</div>

```tsx
<Canvas>
  <Chandelier />
</Canvas>
```

</div>
<div class="migration__col migration__col--after">
<div class="migration__tag">v0.17.0</div>

```tsx
import { LightBudget } from '@runek/core'

<Canvas>
  <LightBudget>
    <Chandelier />
  </LightBudget>
</Canvas>
```

</div>
</div>

- A world with more lamps in view than its budget lights the nearest and brightest first (6 point lights and 2 spotlights by default): raise `<World lightBudget>` if a room needs more.
- If you edited your copy to reach its light (a ref to the `<pointLight>`), use the emitter instead: `useLight` returns it, and you can write its `intensity` every frame.
- A copy pulled at 0.17.0 imports `useLight`, `useMaterial` and `Dynamic` from `@runek/core` 0.17.0; `runek add` picks the registry snapshot that matches the core you have.
- The crystal drops are glossy see-through glass rather than refractive (`transmission`), which made three.js draw every solid object in the world a second time each frame. To get refraction back in your copy, swap the drops' look for a `meshPhysicalMaterial` with `transmission`, and expect that cost.

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/chandelier.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/chandelier.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add chandelier</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
