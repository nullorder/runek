---
title: "MicStand"
summary: "A vocal mic on a tripod stand, straight up at a singer's mouth or on a boom arm reaching toward +Z over a seated player. Decorative."
category: component
component: mic-stand
order: 100
---

## Add it

```bash
npx @runek/cli add mic-stand
```

Pulls `@runek/core@^0.16.0`, `three@^0.184.0`.

## Use it

```tsx
import { MicStand } from './runek/MicStand'

<MicStand position={[0, 0, 0]} boom={true} />
```

Or as a node in a world file ([worlds as data](/docs/worlds-as-data)):

```json
{ "type": "MicStand", "props": { "position": [0, 0, 0], "boom": true } }
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `height` | `number` |  | To the middle of the mic's grille, in units. Defaults to 1.6, a standing singer's mouth, or 1.25 on a boom, a seated player's. |
| `boom` | `boolean` | `false` | Hold the mic on a boom arm reaching toward local +Z, instead of straight up. |
| `position` | `[x, y, z]` | `[0, 0, 0]` | Position [x, y, z] in units (1 unit = 1 m, Y-up). |
| `rotation` | `[x, y, z]` | `[0, 0, 0]` | Euler rotation [x, y, z] in radians. |
| `seed` | `number` |  | Accepted for the component contract; this component has no seeded variation yet. |

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/mic-stand.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/mic-stand.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add mic-stand</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
