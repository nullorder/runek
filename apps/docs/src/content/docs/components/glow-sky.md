---
title: "GlowSky"
summary: "A night sky that is never black: a dome lit from below by a city, darkest overhead and as bright as the haze at the horizon, with a slow cloud deck catching the district's glow that parts on stars and a moon in its phase. Decorative: no collider."
category: component
component: glow-sky
order: 100
---

## Add it

```bash
npx @runek/cli add glow-sky
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.17.0`, `three@^0.184.0`.

## Use it

```tsx
import { GlowSky } from './runek/GlowSky'

<GlowSky position={[0, 0, 0]} clouds={true} seed={1} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "GlowSky", "props": { "position": [0, 0, 0], "clouds": true, "seed": 1 } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `seed` | `number` | `0` | Accepted for the component contract. Shifts the cloud pattern. |
| `zenith` | `color` | `"#10172e"` | Color of the sky overhead. |
| `horizon` | `color` | `"#1a2238"` | Color at the horizon. Match it to the world's fog so the city fades into the sky. |
| `glow` | `color` | `"#9ab8ff"` | Color of the city glow on the underside of the cloud deck. |
| `clouds` | `boolean` | `true` | Draw the low cloud deck lit from below. |
| `night` | `color` | `"#131a3a"` | Color of the open sky between the clouds. |
| `cloud` | `color` | `"#3a4052"` | Color of the clouds themselves, away from the city's glow. Cooler than the haze, so the glow on their undersides reads as light on something and not as more haze. |
| `moonColor` | `color` | `"#f6f2ea"` | Color of the moon and its light on the clouds. |
| `moon` | `[x, y, z]` | `[0.42, 0.62, -0.66]` | Where the moon hangs: a direction from the viewer, +Y up. |
| `state` | `function` (code only) |  | How the sky is right now. Asked every frame, and eased toward. Unset, the sky stays mostly overcast with a full moon behind it. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/glow-sky.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/glow-sky.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add glow-sky</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
