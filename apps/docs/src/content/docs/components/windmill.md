---
title: "Windmill"
summary: "A tapered tower with a conical cap and four sails that turn each frame; tower collider, seeded blade phase."
category: component
component: windmill
order: 100
---

## Add it

```bash
npx @runek/cli add windmill
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`, `three@^0.184.0`.

## Use it

```tsx
import { Windmill } from './runek/Windmill'

<Windmill position={[0, 0, 0]} />
```

## Props

```ts
export interface WindmillProps extends WorldComponentProps {
  /** Tower height, in units. */
  height?: number
  /** Tower base radius, in units. */
  radius?: number
  /** Sail (blade) length, in units. */
  sailLength?: number
  /** Sail rotation speed, in radians per second. */
  sailSpeed?: number
  /** Tower color (defaults to the world palette's `wall`). */
  color?: string
  /** Cap, door, and sail-frame color (defaults to the world palette's `wood`). */
  trimColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/windmill.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/windmill.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add windmill</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
