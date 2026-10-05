---
title: "OfficeChair"
summary: "A swivel office chair: five-star base on casters, gas column, padded seat, low or high back, optional arms. Seats a Person in sit or type pose."
category: component
component: officechair
order: 100
---

## Add it

```bash
npx @runek/cli add officechair
```

Pulls `@react-three/drei@^10.7.7`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { OfficeChair } from './runek/OfficeChair'

<OfficeChair position={[0, 0, 0]} />
```

## Props

```ts
export interface OfficeChairProps extends WorldComponentProps {
  /** Top of the seat cushion, in units. */
  seatHeight?: number
  /** Seeded when unset. */
  back?: OfficeChairBack
  /** Armrests. Seeded when unset. */
  arms?: boolean
  /** Seat and back; defaults to the palette's `fabric`. */
  color?: string
  /** Base, column, and arms; defaults to the palette's `metal`. */
  frameColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/officechair.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/officechair.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add officechair</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
