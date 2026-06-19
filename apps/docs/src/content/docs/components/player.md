---
title: "Player"
summary: "First/third-person character controller (ecctrl wrapper)."
category: component
component: player
order: 100
---

## Add it

```bash
npx @runek/cli add player
```

Pulls `@runek/core@^0.6.0`, `ecctrl@^1.0.97`.

## Use it

```tsx
import { Player } from './runek/Player'

<Player position={[0, 0, 0]} />
```

## Props

```ts
export interface PlayerProps {
  position?: Vec3
  view?: PlayerView
  /** Initial camera yaw in radians (0 faces +z). */
  yaw?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/player.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/player.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add player</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/player)**.
