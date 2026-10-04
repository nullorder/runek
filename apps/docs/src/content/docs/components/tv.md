---
title: "Tv"
summary: "A flat-screen TV on a stand, a low media console, or a wall. Switched on, it shows a seeded picture (sky, sun, hills) drawn from flat shapes."
category: component
component: tv
order: 100
---

## Add it

```bash
npx @runek/cli add tv
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Tv } from './runek/Tv'

<Tv position={[0, 0, 0]} />
```

## Props

```ts
export interface TvProps extends WorldComponentProps {
  /** Screen width, in units. */
  width?: number
  /** `stand` and `console` are seeded when unset; `wall` must be asked for. On a wall the origin
   *  is the middle of the screen with its back against the wall (local -Z). */
  mount?: TvMount
  /** Showing a seeded picture (a sky, a sun, hills) in this tint, or dark glass when off. */
  on?: boolean
  /** Picture tint. Seeded when unset. */
  screen?: string
  /** Bezel and stand; defaults to the palette's `metal`. */
  color?: string
  /** The console's wood; defaults to the palette's `woodDark`. */
  consoleColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/tv.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/tv.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add tv</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
