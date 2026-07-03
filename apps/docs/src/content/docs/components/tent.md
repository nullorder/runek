---
title: "Tent"
summary: "An A-frame ridge tent: striped wind-rippled fabric, entrance flaps pinned open, guy ropes and stakes; solid sides and back, open front."
category: component
component: tent
order: 100
---

## Add it

```bash
npx @runek/cli add tent
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`, `three@^0.184.0`.

## Use it

```tsx
import { Tent } from './runek/Tent'

<Tent position={[0, 0, 0]} />
```

## Props

```ts
export interface TentProps extends WorldComponentProps {
  /** Width across the tent (local X), in units. */
  width?: number
  /** Depth front-to-back (local Z); the entrance faces +Z. */
  depth?: number
  /** Ridge height, in units. */
  height?: number
  /** Fabric color; defaults to the palette's `fabric`. */
  color?: string
  /** Alternate stripe color; defaults to the palette's `wall`. */
  stripeColor?: string
  /** Pole color; defaults to the palette's `woodDark`. */
  poleColor?: string
  /** Billow depth as a fraction of the width. */
  wind?: number
  /** Wind ripple speed. */
  windSpeed?: number
  /** Static inward drape of the fabric between ridge and ground, as a fraction of the width. */
  sag?: number
  /** Solid walls (the two sides + the back) you can't walk through; the front stays open. */
  collider?: boolean
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/tent.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/tent.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add tent</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
