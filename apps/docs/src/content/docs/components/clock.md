---
title: "Clock"
summary: "Procedural analog wall clock; hands track the system clock or a given IANA timezone."
category: component
component: clock
order: 100
---

## Add it

```bash
npx @runek/cli add clock
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Clock } from './runek/Clock'

<Clock position={[0, 0, 0]} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "Clock", "props": { "position": [0, 0, 0] } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |
| `radius` | `number` | `0.55` | Face radius in units. |
| `timezone` | `string` |  | IANA timezone, e.g. "Asia/Kolkata". Omit to inherit the world's `timezone` (`<World timezone>`), then the local system time; if neither resolves, the clock falls back to UTC. |
| `frameColor` | `color` | palette `metal` | Rim/frame color. Defaults to the world palette's `metal` slot. |
| `faceColor` | `color` | `"#0d1117"` | Dial color. |
| `handColor` | `color` | `"#e8eef5"` | Hour/minute hand and tick color. |
| `accentColor` | `color` | palette `accent` | Second hand + hub accent. Defaults to the world palette's `accent` slot. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/clock.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/clock.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add clock</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
