---
title: "Sailboat"
summary: "A small procedural sailboat: a station-built low-poly hull, mast, boom, and mainsail, floating at the waterline with a gentle moored bob."
category: component
component: sailboat
order: 100
---

## Add it

```bash
npx @runek/cli add sailboat
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`, `three@^0.184.0`.

## Use it

```tsx
import { Sailboat } from './runek/Sailboat'

<Sailboat position={[0, 0, 0]} />
```

## Props

```ts
export interface SailboatProps extends WorldComponentProps {
  /** Hull length along local Z (bow at +Z), in units. */
  length?: number
  /** Hull maximum beam (width along X), in units. */
  beam?: number
  /** Deck height above the waterline (local y=0), in units. */
  freeboard?: number
  /** Keel depth below the waterline, in units. */
  draft?: number
  /** Mast height above the deck, in units. */
  mastHeight?: number
  /** Boom length aft of the mast, in units. */
  boomLength?: number
  /** Raise the mainsail. */
  sail?: boolean
  /** Gentle moored bobbing on the swell. */
  bob?: boolean
  /** Solid hull collider. */
  collider?: boolean
  /** Render the hull/rig as a bare visual, with no `RigidBody` or collider — for a parent
   *  controller (e.g. a steerable vehicle) that owns the physics body. When false, `position`
   *  and `rotation` place the visual directly and the `collider` prop is ignored. Default true. */
  physics?: boolean
  /** Hull color; defaults to the world palette's `wood`. */
  color?: string
  /** Deck, mast, and boom color; defaults to the palette's `woodDark`. */
  trimColor?: string
  /** Sail color. */
  sailColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/sailboat.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/sailboat.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add sailboat</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
