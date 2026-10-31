---
title: "Ship"
summary: "A big three-masted sailing ship you can board and walk through: a plank up from the dock, the waist, the quarterdeck with its wheel, the forecastle with its bell and bowsprit, a gun deck with a cannon at every port and hammocks slung forward, a cargo hold, and the captain's cabin under the stern windows. Lanterns light the decks below. Seeded planking, sails, gunport lids and cargo; moored and steady."
category: component
component: ship
order: 100
---

## Add it

```bash
npx @runek/cli add ship
```

Pulls `barrel`, `bed`, `chair`, `crate`, `flag`, `staircase`, `table`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { Ship } from './runek/Ship'

<Ship position={[0, 0, 0]} sails="set" guns={8} gangway="starboard" seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Ship", "props": { "position": [0, 0, 0], "sails": "set", "guns": 8, "gangway": "starboard", "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `length` | `number` | `36` | Hull length from stern to stem, in units (30 to 60). Deck heights, stairs and doors keep human scale; the length spreads the layout. |
| `beam` | `number` | `10` | Hull breadth at its widest, in units (8 to 16). |
| `masts` | `number` | `3` | 3 for fore, main and mizzen; 2 drops the mizzen; 1 keeps only the main. |
| `sails` | `"none" \| "set" \| "furled"` | `"set"` | Sails set and drawing, furled on their yards, or bare spars. |
| `guns` | `number` | `8` | Cannons a side on the gun deck (0 for none); the waist carries a few more. |
| `gangway` | `"none" \| "starboard" \| "port"` | `"starboard"` | Which side the boarding plank runs out from, or none. |
| `gangwayDrop` | `number` | `3.8` | How far below the main deck the plank's shore end sits, in units: a dock deck's height under the main deck (which stands 4.8 above the waterline). |
| `furnish` | `boolean` | `true` | Fit out the cabin, crew quarters, mess and hold with furniture and cargo. |
| `lanterns` | `boolean` | `true` | Hang lit lanterns below decks and on the stern. |
| `flag` | `boolean` | `true` | Fly a flag from the main truck. |
| `collider` | `boolean` | `true` | The hull, decks and fittings are solid (board it and walk the decks). Off, they are a bare visual; the stairs and furniture it is fitted out with keep their own colliders. |
| `hullColor` | `color` |  | Topsides colour; defaults to the world palette's `woodDark`. |
| `bandColor` | `color` | `"#a8742c"` | The painted band along the gunports. |
| `deckColor` | `color` |  | Deck planking; defaults to the palette's `floor`. |
| `sailColor` | `color` | `"#e9e0c8"` |  |
| `flagColor` | `color` | `"#1b1b1b"` |  |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/ship.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/ship.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add ship</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
