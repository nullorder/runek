---
title: "Counter"
summary: "A service / bar counter: a solid body under a worktop that overhangs the front; one cuboid collider."
category: component
component: counter
order: 100
---

## Add it

```bash
npx @runek/cli add counter
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Counter } from './runek/Counter'

<Counter position={[0, 0, 0]} />
```

## Props

```ts
export interface CounterProps extends WorldComponentProps {
  /** Length along local X, in units. */
  length?: number
  /** Counter height, in units. */
  height?: number
  /** Depth along local Z, in units. */
  depth?: number
  /** Body color; defaults to the palette's `wood`. */
  color?: string
  /** Worktop color; defaults to the palette's `woodDark`. */
  topColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/counter.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/counter.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add counter</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
