---
title: "Person"
summary: "A proportioned, clothed, articulated figure generated from a seed: style templates (anime by default, realistic as the alternate), role presets, gender/age/build silhouettes, hair, outfits, hats and accessories, swappable cosmetic skins (named presets or custom bundles), poses, idle breathing, and a head that turns to watch you. Give it a patrol or a wander radius and it walks: a route that is a pure function of the clock, following the ground, with a walk cycle and a step aside for the player and other walkers. Place one at a spawn point, or use it as the Player's third-person body."
category: component
component: person
order: 100
---

## Add it

```bash
npx @runek/cli add person
```

Pulls `sign`, `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Person } from './runek/Person'

<Person position={[0, 0, 0]} />
```

## Props

```ts
export interface PersonProps extends WorldComponentProps {
  /** Visual template: `anime` (default) has a bigger head, large lit eyes, a tapered chin,
   *  longer legs, and a chunky fringe; `realistic` keeps canonical human proportions. */
  style?: PersonStyle
  /** Role preset: fills `outfit`, `hat`, and `accessories` unless you set them. */
  kind?: PersonKind
  /** Silhouette cues only; every trait it influences stays overridable. Seeded when unset. */
  gender?: PersonGender
  /** Head-to-body ratio, stature, and (for `elder`) a stooped spine. */
  age?: PersonAge
  /** Standing height, in units. Every other measurement derives from it. */
  height?: number
  /** Limb thickness and torso depth. Seeded when unset. */
  build?: PersonBuild
  /** Skin color; seeded from a curated set of tones when unset. */
  skinTone?: string
  /** Cosmetic loadout: a preset name from `PERSON_SKINS` (e.g. `"winter"`) or a custom
   *  `PersonSkin` bundle. Individual props win over it. Plain JSON either way, so an editor
   *  or an in-world UI can swap a figure's whole look by writing this one prop. */
  skin?: PersonSkinName | PersonSkin
  hair?: PersonHair
  hairColor?: string
  facialHair?: PersonFacialHair
  outfit?: PersonOutfit
  /** Shirt/dress color; defaults to a seeded shade of the palette's `fabric`. */
  topColor?: string
  /** Trouser/skirt color; defaults to a seeded shade of the palette's `woodDark`. */
  bottomColor?: string
  /** Shoe color; defaults to the palette's `metal`. */
  shoeColor?: string
  hat?: PersonHat
  accessories?: PersonAccessory[]
  /** Static joint set. `wave` also animates the raised forearm. */
  pose?: PersonPose
  /** Walk these waypoints, relative to `position` and turning with `rotation`, in units.
   *  Height follows the ground; a waypoint's y lifts the figure above it. */
  patrol?: Vec3[]
  /** Wander a seeded loop of five points within this radius of `position`, in units. `patrol`
   *  wins when both are set. */
  wander?: number
  /** Walking speed, in units per second. Defaults by age: child 1.0, adult 1.3, elder 0.8. */
  speed?: number
  /** Seconds held at each waypoint. Walking always stands; the authored `pose` plays here. */
  pause?: number
  /** `loop` walks from the last waypoint back to the first; `pingpong` retraces the route. */
  loop?: RouteLoop
  /** Walk-cycle speed, in units per second, for a figure something else moves (a cart, a
   *  script). Unset, a route drives it, and a `Player`'s body walks at the avatar's speed. */
  gait?: number
  /** Breathing, weight shift, and blinking. */
  idle?: boolean
  /** Turn the head toward the player's avatar (or the camera, when no `Player` is mounted)
   *  when it comes within `lookRadius`. */
  lookAt?: boolean
  /** How close the avatar must be for `lookAt` to engage, in units. */
  lookRadius?: number
  /** Floating name above the head. */
  label?: string
  /** Capsule collider, so the figure is something you bump into. */
  collider?: boolean
  /** Render as a bare visual with no `RigidBody` — for a parent that owns the physics
   *  (e.g. as `Player`'s third-person avatar). When false, `collider` is ignored. */
  physics?: boolean
  detail?: PersonDetail
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/person.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/person.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add person</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
