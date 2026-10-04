---
title: "Sofa"
summary: "A sofa seating one to four: upholstered frame, seat and back cushions in soft shades of the fabric, square, rolled, or slim arms, pegs or a plinth, and throw pillows. Seeded, each choice pinnable."
category: component
component: sofa
order: 100
---

## Add it

```bash
npx @runek/cli add sofa
```

Pulls `@react-three/drei@^10.7.7`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Sofa } from './runek/Sofa'

<Sofa position={[0, 0, 0]} />
```

## Props

```ts
export interface SofaProps extends WorldComponentProps {
  /** Seats across, 1 to 4. */
  seats?: number
  /** Depth along local Z, in units. Seats face +Z. */
  depth?: number
  /** Top of the seat cushions, in units. */
  seatHeight?: number
  /** Seeded when unset. */
  arms?: SofaArms
  /** Seeded when unset. */
  cushions?: SofaCushions
  /** Seeded when unset. */
  legs?: SofaLegs
  /** Throw pillows, 0 to 2. Seeded when unset. */
  pillows?: number
  /** Upholstery; defaults to the palette's `fabric`. */
  color?: string
  /** Throw pillows; defaults to the palette's `accent`. */
  pillowColor?: string
  /** Legs; defaults to the palette's `woodDark`. */
  legColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/sofa.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/sofa.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add sofa</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
