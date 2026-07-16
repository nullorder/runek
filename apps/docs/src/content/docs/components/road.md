---
title: "Road"
summary: "A paved street: a flat stone deck with low kerbs, draped on the ground like Path; decorative (no collider)."
category: component
component: road
order: 100
---

## Add it

```bash
npx @runek/cli add road
```

Pulls `@runek/core@^0.13.0`.

## Use it

```tsx
import { Road } from './runek/Road'

<Road position={[0, 0, 0]} />
```

## Props

```ts
export interface RoadProps extends WorldComponentProps {
  /** Length along local Z, in units. */
  length?: number
  /** Width along local X, in units. */
  width?: number
  /** Deck color; defaults to the palette's `stone`. */
  color?: string
  /** Kerb color; defaults to the palette's `woodDark`. */
  kerbColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/road.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/road.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add road</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
