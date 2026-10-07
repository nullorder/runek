---
title: "Person"
summary: "A sculpted, clothed, skinned figure generated from a seed: one continuous body with a sculpted face, lidded eyes that follow you, and hands with fingers, in three style templates (stylized by default, realistic, anime). Every part is configurable as plain JSON: the body (build, tone, height), the face (eyes, brows, nose, lips, blush), hair, and clothing as ordered layers (shirts, sweaters, vests, coats, dresses, robes, trousers, jeans, skirts, shoes, boots, belts, scarves, capes) that fit any body. Role presets, swappable cosmetic skins, hats and accessories, poses, idle breathing and blinking. Give it a patrol or a wander radius and it walks: a route that is a pure function of the clock, following the ground, with a walk cycle and a step aside for the player and other walkers. A route with a departure time is a one-way trip (to a desk, to bed) that reports its arrival, and actions put a key prompt over it (Talk, Info) when the player comes near. Meshes build in the background, coarse first, with full detail near the camera. Place one at a spawn point, or use it as the Player's third-person body."
category: component
component: person
order: 100
---

## Add it

```bash
npx @runek/cli add person
```

Pulls `interactable`, `sign`, `@react-three/drei@^10.7.7`, `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.14.0`, `three@^0.184.0`.

## Use it

```tsx
import { Person } from './runek/Person'

<Person position={[0, 0, 0]} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Person", "props": { "position": [0, 0, 0], "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `style` | `"stylized" \| "realistic" \| "anime"` | `"stylized"` | Proportion and face template: `stylized` (default) is an animated-film look with a big head and eyes, small features, and slender limbs; `realistic` keeps canonical human proportions; `anime` pushes the eyes and legs further. |
| `kind` | `"villager" \| "merchant" \| "guard" \| "sailor" \| "farmer" \| "noble" \| "scholar" \| "traveler"` | `"villager"` | Role preset: fills `outfit`, `hat`, and `accessories` unless you set them. |
| `gender` | `"feminine" \| "masculine" \| "neutral"` |  | Silhouette cues only; every trait it influences stays overridable. Seeded when unset. |
| `age` | `"child" \| "adult" \| "elder"` | `"adult"` | Head-to-body ratio, stature, and (for `elder`) a stooped spine. |
| `body` | `PersonBodySpec` |  | The body: `build`, skin `tone`, and `height`. The flat props below are shorthands for the same fields; when both are set, this object wins. |
| `face` | `PersonFaceSpec` |  | The face, part by part: eye color and size, brow color and weight, nose shape, lip color and fullness, blush. |
| `clothes` | `PersonGarment[]` |  | Clothing layers, inner to outer, each with its own type, color, and options. The order decides the fit: a shirt listed before the jeans is tucked in. Replaces `outfit`; `[]` is the bare base body (a smooth mannequin). |
| `height` | `number` |  | Standing height, in units. Every other measurement derives from it. |
| `build` | `"slim" \| "average" \| "stocky"` |  | Limb thickness and torso depth. Seeded when unset. |
| `skinTone` | `color` |  | Skin color; seeded from a curated set of tones when unset. |
| `skin` | `"sailor" \| "hoodie" \| "festival" \| "chef" \| "harvest" \| "winter" \| "voyage" \| "ceremony" \| "atelier" \| "pirate" \| "bartender" \| "office" \| "casual" \| "preppy" \| PersonSkin` |  | Cosmetic loadout: a preset name from `PERSON_SKINS` (e.g. `"winter"`) or a custom `PersonSkin` bundle. Individual props win over it. Plain JSON either way, so an editor or an in-world UI can swap a figure's whole look by writing this one prop. |
| `hair` | `"short" \| "long" \| "swept" \| "bun" \| "ponytail" \| "braid" \| "cropped" \| "bald" \| PersonHairSpec` |  | A style name, or `{ style, color }`. |
| `hairColor` | `color` |  |  |
| `facialHair` | `"none" \| "stubble" \| "moustache" \| "beard"` |  |  |
| `outfit` | `"tshirt" \| "shirt" \| "sweater" \| "hoodie" \| "blazer" \| "vest" \| "tunic" \| "coat" \| "dress" \| "robe" \| "apron" \| "uniform"` |  | One-word outfit; expands to a `clothes` stack (e.g. `tunic`: trousers, tunic, shoes). |
| `topColor` | `color` |  | Outermost top's color; defaults to a seeded shade of a palette slot. A garment's own `color` wins over it. |
| `bottomColor` | `color` |  | Bottoms' color; defaults to a seeded shade of the palette's `woodDark`, `stone`, or `metal`. |
| `shoeColor` | `color` |  | Footwear color; defaults to the palette's `metal`. |
| `hat` | `"none" \| "cap" \| "straw" \| "brim" \| "bandana" \| "hood" \| "chef"` |  |  |
| `accessories` | `"belt" \| "scarf" \| "cape" \| "bag" \| "glasses" \| "staff"[]` |  |  |
| `pose` | `"stand" \| "sit" \| "lean" \| "work" \| "wave" \| "type" \| "play" \| "drink" \| "lie"` | `"stand"` | What the figure is doing when it isn't walking. `sit` and `type` need a seat under them (`type` is seated at a desk, fingers tapping); `work` leans over a counter; `play` works controls at waist height; `drink` holds a mug and sips from it now and then; `lie` lies on its back centered on `position`, head toward local -Z, so it takes a `Bed`'s position and rotation at mattress height. |
| `patrol` | `[x, y, z][]` |  | Walk these waypoints, relative to `position` and turning with `rotation`, in units. Height follows the ground; a waypoint's y lifts the figure above it. |
| `wander` | `number` |  | Wander a seeded loop of five points within this radius of `position`, in units. `patrol` wins when both are set. |
| `speed` | `number` |  | Walking speed, in units per second. Defaults by age: child 1.0, adult 1.3, elder 0.8. |
| `pause` | `number` | `1.5` | Seconds held at each waypoint. Walking always stands; the authored `pose` plays here. |
| `loop` | `"loop" \| "pingpong"` | `"loop"` | `loop` walks from the last waypoint back to the first; `pingpong` retraces the route. |
| `route` | `[x, y, z][]` |  | A one-way trip through these waypoints, relative to `position` like `patrol`, setting off at `departAt`. Before then the figure waits at the first point facing its `rotation`; after the last it stays there, facing the way it came, in its `pose`. Wins over `patrol` and `wander`. Give a new trip a new `position` (the old one's end) and `departAt`. |
| `departAt` | `number` | `0` | When the `route` trip sets off, in epoch milliseconds (`Date.now()`). Plain data, so every viewer sees the figure at the same point of its trip. Unset, the trip is long over. |
| `onArrive` | `function` (code only) |  | Called once per trip (`route` + `departAt`) when the figure has arrived, on the first frame it has, so a trip that ended while the world was paused or unmounted still reports. |
| `gait` | `number` |  | Walk-cycle speed, in units per second, for a figure something else moves (a cart, a script). Unset, a route drives it, and a `Player`'s body walks at the avatar's speed. |
| `idle` | `boolean` | `true` | Breathing, weight shift, and blinking. |
| `lookAt` | `boolean` | `true` | Turn the head (and eyes) toward the player's avatar (or the camera, when no `Player` is mounted) when it comes within `lookRadius`. |
| `lookRadius` | `number` | `9` | How close the avatar must be for `lookAt` to engage, in units. |
| `label` | `string` |  | Floating name above the head. |
| `bubble` | `string` |  | A short line in a speech bubble over the head (what the figure is saying or doing right now). Long lines wrap and are cut after a few. |
| `emote` | `"sleep" \| "alert" \| "think" \| "happy" \| "coffee"` |  | A small animated sign over the head: `sleep` (rising z's), `alert` (a bouncing !), `think` (pulsing dots), `happy` (a heart), `coffee` (a steaming cup). |
| `actions` | `InteractionAction[]` |  | What the player can do with this figure (`Talk`, `Info`). When the avatar comes within `actionRadius` a prompt shows them over the head, with the key each world `controls` action is bound to; pressing one calls `onAction` with its `id`. Only the nearest figure (or other `Interactable`) in range shows a prompt and takes the key. |
| `actionRadius` | `number` | `2` | How close the avatar must come for `actions`, in units. |
| `onAction` | `function` (code only) |  |  |
| `collider` | `boolean` | `true` | Capsule collider, so the figure is something you bump into. |
| `physics` | `boolean` | `true` | Render as a bare visual with no `RigidBody`: for a parent that owns the physics (e.g. as `Player`'s third-person avatar). When false, `collider` is ignored. |
| `detail` | `"low" \| "high" \| "auto"` | `"auto"` | `auto` builds the full-detail mesh only within ~10 units of the camera; `high` always; `low` never. |
| `position` | `[x, y, z]` |  | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` | `1` | Seed for the deterministic variation: same seed, same result. |

### `PersonBodySpec`

| Prop | Type | Default | Description |
|---|---|---|---|
| `build` | `"slim" \| "average" \| "stocky"` |  | Limb thickness and torso depth. |
| `tone` | `color` |  | Skin color. |
| `height` | `number` |  | Standing height, in units. |

### `PersonFaceSpec`

| Prop | Type | Default | Description |
|---|---|---|---|
| `eyes` | `eyes` |  |  |
| `brows` | `brows` |  | Brow color defaults to the hair color; `weight` thickens them. |
| `nose` | `"button" \| "straight" \| "broad"` |  |  |
| `lips` | `lips` |  |  |
| `blush` | `number` |  | Cheek flush, 0 (none) to 1. |

### `Person.eyes`

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `color` |  |  |
| `size` | `number` |  |  |

### `Person.brows`

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `color` |  |  |
| `weight` | `number` |  |  |

### `Person.lips`

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `color` |  |  |
| `fullness` | `number` |  |  |

### `PersonGarment`

| Prop | Type | Default | Description |
|---|---|---|---|
| `type` | `"tshirt" \| "shirt" \| "sweater" \| "hoodie" \| "blazer" \| "vest" \| "tunic" \| "coat" \| "dress" \| "robe" \| "apron" \| "trousers" \| "jeans" \| "shorts" \| "skirt" \| "shoes" \| "boots" \| "belt" \| "scarf" \| "cape"` | **required** |  |
| `color` | `color` |  |  |
| `sleeves` | `"none" \| "short" \| "long"` |  | Tops only. |
| `neck` | `"crew" \| "v" \| "collar"` |  | Tops only. |
| `length` | `number` |  | 0 to 1: how far it reaches (a top's hem, a leg's length, a skirt or boot's drop). |

### `PersonSkin`

| Prop | Type | Default | Description |
|---|---|---|---|
| `outfit` | `"tshirt" \| "shirt" \| "sweater" \| "hoodie" \| "blazer" \| "vest" \| "tunic" \| "coat" \| "dress" \| "robe" \| "apron" \| "uniform"` |  |  |
| `clothes` | `PersonGarment[]` |  | Full layer stack; wins over `outfit`. |
| `topColor` | `color` |  |  |
| `bottomColor` | `color` |  |  |
| `shoeColor` | `color` |  |  |
| `hat` | `"none" \| "cap" \| "straw" \| "brim" \| "bandana" \| "hood" \| "chef"` |  |  |
| `hair` | `"short" \| "long" \| "swept" \| "bun" \| "ponytail" \| "braid" \| "cropped" \| "bald"` |  |  |
| `hairColor` | `color` |  |  |
| `accessories` | `"belt" \| "scarf" \| "cape" \| "bag" \| "glasses" \| "staff"[]` |  |  |

### `PersonHairSpec`

| Prop | Type | Default | Description |
|---|---|---|---|
| `style` | `"short" \| "long" \| "swept" \| "bun" \| "ponytail" \| "braid" \| "cropped" \| "bald"` |  |  |
| `color` | `color` |  |  |

### `InteractionAction`

| Prop | Type | Default | Description |
|---|---|---|---|
| `id` | `string` | **required** | Passed back to `onAction`. |
| `label` | `string` | **required** | Shown in the prompt, e.g. `Talk`. |
| `control` | `string` | **required** | The world `controls` action that triggers it (declare `talk: ['KeyT']` in the world's `controls`). The prompt shows the key bound to it, so a remap relabels it. |

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
