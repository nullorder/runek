---
title: "Campfire"
summary: "Stone ring, a tepee of logs, and an animated flame with a warm flickering light."
category: component
component: campfire
order: 100
---

## Add it

```bash
npx @runek/cli add campfire
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Campfire } from './runek/Campfire'

<Campfire position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Campfire", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `radius` | `number` | `0.5` | Radius, in units. |
| `logColor` | `color` | palette `wood` | Log color; defaults to the world palette's `wood` slot. |
| `flameColor` | `color` | `"#ff7a1a"` |  |
| `intensity` | `number` | `14` |  |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Migrate

**v0.16.0 → v0.17.0.** `Campfire` no longer mounts its own three.js light. It registers a `useLight` emitter, and the world lends it one of a fixed pool of real lights while it matters to the view. Inside `<World>` nothing changes; in your own `<Canvas>`, wrap the scene in `<LightBudget>` or it gives no light.

<div class="migration">
<div class="migration__col">
<div class="migration__tag">v0.16.0</div>

```tsx
<Canvas>
  <Campfire />
</Canvas>
```

</div>
<div class="migration__col migration__col--after">
<div class="migration__tag">v0.17.0</div>

```tsx
import { LightBudget } from '@runek/core'

<Canvas>
  <LightBudget>
    <Campfire />
  </LightBudget>
</Canvas>
```

</div>
</div>

- A world with more lamps in view than its budget lights the nearest and brightest first (6 point lights and 2 spotlights by default): raise `<World lightBudget>` if a room needs more.
- If you edited your copy to reach its light (a ref to the `<pointLight>`), use the emitter instead: `useLight` returns it, and you can write its `intensity` every frame.
- A copy pulled at 0.17.0 imports `useLight`, `useMaterial` and `Dynamic` from `@runek/core` 0.17.0; `runek add` picks the registry snapshot that matches the core you have.

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/campfire.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/campfire.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add campfire</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
