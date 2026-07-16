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

Pulls `@react-three/drei@^10.7.7`, `@react-three/fiber@^9.6.1`, `@runek/core@^0.13.0`, `ecctrl@^1.0.97`, `three@^0.184.0`.

## Use it

```tsx
import { Player } from './runek/Player'

<Player position={[0, 0, 0]} />
```

## Props

```ts
export interface PlayerProps {
  position?: Vec3
  /** Camera view. Unset defers to the world default (`<World avatar>`); falls back
   *  to first-person. An explicit value here always wins. */
  view?: PlayerView
  /** Initial camera yaw in radians (0 faces +z). */
  yaw?: number
  /** Custom avatar visual, replacing the default capsule. Size it to the capsule
   *  envelope (~1.3 units tall, centered at the character origin); it is hidden in
   *  first-person view. In world JSON, nest it as a child node of the Player. */
  children?: ReactNode
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/player.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/player.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add player</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
