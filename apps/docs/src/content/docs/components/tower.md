---
title: "Tower"
summary: "A procedural city tower from a seeded shape grammar: podium, setback, shaft and crown, with street, service, podium, tower and crown bands drawn by one shared facade shader (shop bays, lit windows with rooms behind them, trims, posters and leaks), so towers batch. Four eras (concrete, tenement, glass, makeshift) set the massing and dressing. Faces listed in `frontage` get relief and the facade kit: shop names, blade and roof signs, awnings, shutters, AC units, pipes, vending machines, cables across the street and light pooled on the pavement. Lit after dusk at the world's luminance levels. Colliders over the footprint and along each street face."
category: component
component: tower
order: 100
---

## Add it

```bash
npx @runek/cli add tower
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Tower } from './runek/Tower'

<Tower position={[0, 0, 0]} height={48} era="tenement" frontage={["+z"]} cableSpan={12} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Tower", "props": { "position": [0, 0, 0], "height": 48, "era": "tenement", "frontage": ["+z"], "cableSpan": 12, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position of the tower's base centre [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Rotation [x, y, z] in radians. Towers stand upright: only the turn about Y is meant to be used. |
| `seed` | `number` | `1` | Seeds the massing, the window pattern, which windows are lit, every prop and sign, and any unset look props. |
| `width` | `number` | `16` | Ground footprint along local X, in units. The podium fills it and the collider matches it. |
| `depth` | `number` | `16` | Ground footprint along local Z, in units. |
| `height` | `number` | `60` | Height to the roof, in units. Rooftop plant and masts stand above it. |
| `windows` | `"glass" \| "office" \| "grid" \| "ribbon"` |  | Window layout: `grid` (apartments), `office` (small dense panes), `ribbon` (continuous bands) or `glass` (curtain wall). Seeded by era when unset. |
| `lit` | `number` |  | Share of windows lit at night, 0 to 1. Seeded when unset. |
| `trim` | `string` |  | Neon trim along the parapets and crown, and the color of the tower's main sign, lit at the world's `sign` luminance level. `"none"` for a plain tower. Seeded when unset. |
| `cornerStrips` | `boolean` |  | Also run the trim colour up the corners. |
| `shopfronts` | `boolean` | `true` | Shop bays along the ground floor. |
| `color` | `color` |  | Wall colour. Defaults to the world palette's `wall`. |
| `era` | `"glass" \| "concrete" \| "tenement" \| "makeshift"` |  | Which era built it: `concrete` (squat, heavy, stencilled), `tenement` (balconies, sign frames, drum lanterns), `glass` (a thin glass slab with a clock in its crown) or `makeshift` (cages, shacks, cable). Seeded among the first, second and last when unset. |
| `podium` | `number` |  | Podium height in units, for a tower tall and wide enough to have a shaft (at least 34 high and 10 across). Seeded between 15 and 25 when unset. |
| `frontage` | `"+z" \| "+x" \| "-z" \| "-x"[]` | `[]` | The faces that front a street: `+z`, `+x`, `-z`, `-x` in the tower's own frame. Each gets piers, a fascia, signs and the instanced kit props, and the first one listed carries the tower's big sign. Empty by default, so a tower costs one merged mesh until it is told where the street is. |
| `name` | `string` |  | The shop name on the main sign. Seeded when unset. |
| `cableSpan` | `number` | `0` | Wall to wall distance across the street in units. Above 0, cables sag across it from the first face in `frontage`. |
| `light` | `boolean` | `false` | Ask the world for a real light in front of the main shop. Pooled, so only the ones that matter to the view are lit. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/tower.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/tower.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add tower</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
