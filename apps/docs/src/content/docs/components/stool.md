---
title: "Stool"
summary: "A round bar stool: a disc seat on three splayed legs; a thin cylinder collider."
category: component
component: stool
order: 100
---

## Add it

```bash
npx @runek/cli add stool
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.12.0`.

## Use it

```tsx
import { Stool } from './runek/Stool'

<Stool position={[0, 0, 0]} />
```

## Props

```ts
export interface StoolProps extends WorldComponentProps {
  /** Seat height above the ground, in units. */
  height?: number
  /** Seat radius, in units. */
  radius?: number
  /** Color; defaults to the palette's `wood`. */
  color?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/stool.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/stool.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add stool</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
