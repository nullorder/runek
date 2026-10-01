---
title: "Person"
summary: "A sculpted, clothed, skinned figure generated from a seed: one continuous body with a sculpted face, lidded eyes that follow you, and hands with fingers, in three style templates (stylized by default, realistic, anime). Every part is configurable as plain JSON: the body (build, tone, height), the face (eyes, brows, nose, lips, blush), hair, and clothing as ordered layers (shirts, sweaters, vests, coats, dresses, robes, trousers, jeans, skirts, shoes, boots, belts, scarves, capes) that fit any body. Role presets, swappable cosmetic skins, hats and accessories, poses, idle breathing and blinking. Give it a patrol or a wander radius and it walks: a route that is a pure function of the clock, following the ground, with a walk cycle and a step aside for the player and other walkers. Meshes build in the background, coarse first, with full detail near the camera. Place one at a spawn point, or use it as the Player's third-person body."
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
  /** Proportion and face template: `stylized` (default) is an animated-film look with a big
   *  head and eyes, small features, and slender limbs; `realistic` keeps canonical human
   *  proportions; `anime` pushes the eyes and legs further. */
  style?: PersonStyle
  /** Role preset: fills `outfit`, `hat`, and `accessories` unless you set them. */
  kind?: PersonKind
  /** Silhouette cues only; every trait it influences stays overridable. Seeded when unset. */
  gender?: PersonGender
  /** Head-to-body ratio, stature, and (for `elder`) a stooped spine. */
  age?: PersonAge
  /** The body: `build`, skin `tone`, and `height`. The flat props below are shorthands for
   *  the same fields; when both are set, this object wins. */
  body?: PersonBodySpec
  /** The face, part by part: eye color and size, brow color and weight, nose shape, lip
   *  color and fullness, blush. */
  face?: PersonFaceSpec
  /** Clothing layers, inner to outer, each with its own type, color, and options. The order
   *  decides the fit: a shirt listed before the jeans is tucked in. Replaces `outfit`; `[]`
   *  is the bare base body (a smooth mannequin). */
  clothes?: PersonGarment[]
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
  /** A style name, or `{ style, color }`. */
  hair?: PersonHair | PersonHairSpec
  hairColor?: string
  facialHair?: PersonFacialHair
  /** One-word outfit; expands to a `clothes` stack (e.g. `tunic`: trousers, tunic, shoes). */
  outfit?: PersonOutfit
  /** Outermost top's color; defaults to a seeded shade of a palette slot. A garment's own
   *  `color` wins over it. */
  topColor?: string
  /** Bottoms' color; defaults to a seeded shade of the palette's `woodDark`, `stone`, or `metal`. */
  bottomColor?: string
  /** Footwear color; defaults to the palette's `metal`. */
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
  /** Turn the head (and eyes) toward the player's avatar (or the camera, when no `Player` is
   *  mounted) when it comes within `lookRadius`. */
  lookAt?: boolean
  /** How close the avatar must be for `lookAt` to engage, in units. */
  lookRadius?: number
  /** Floating name above the head. */
  label?: string
  /** Capsule collider, so the figure is something you bump into. */
  collider?: boolean
  /** Render as a bare visual with no `RigidBody`: for a parent that owns the physics
   *  (e.g. as `Player`'s third-person avatar). When false, `collider` is ignored. */
  physics?: boolean
  /** `auto` builds the full-detail mesh only within ~10 units of the camera; `high` always;
   *  `low` never. */
  detail?: PersonDetail
}
```

## Migrate

**v0.13.0 → v0.14.0.** The figure is rebuilt as one sculpted, skinned body with clothes as layers, and the default `style` is now `stylized`. No prop was removed: every flat prop still works, and the new part objects (`body`, `face`, `hair`, `clothes`) are optional.

<div class="migration">
<div class="migration__col">
<div class="migration__tag">v0.13.0</div>

```tsx
<Person
  seed={4}
  outfit="shirt"
  topColor="#e8e2d2"
  skinTone="#c98d63"
  hairColor="#2b1d14"
/>
```

</div>
<div class="migration__col migration__col--after">
<div class="migration__tag">v0.14.0</div>

```tsx
<Person
  seed={4}
  body={{ tone: '#c98d63' }}
  hair={{ style: 'short', color: '#2b1d14' }}
  clothes={[
    { type: 'shirt', sleeves: 'short', color: '#e8e2d2' },
    { type: 'trousers' },
    { type: 'shoes' },
  ]}
/>
```

</div>
</div>

- Nothing to change to keep a world rendering: the flat props still resolve. The part objects are the long form when you want to set each piece yourself. Pass `style="anime"` for the closest match to the old default look.
- Any trait set as a flat prop no longer shifts the seeded rolls of the others, so a few figures with explicit colors may roll a different hairstyle than before.
- `clothes` lists layers inner to outer; a top listed before the trousers is tucked in. `clothes={[]}` is the bare base body.

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/person.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/person.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add person</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
