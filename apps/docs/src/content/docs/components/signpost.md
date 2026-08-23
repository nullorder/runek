---
title: "Signpost"
summary: "A wooden post-and-plank signboard carrying a name in the world's display font; the post sits behind the board so the text reads clean."
category: component
component: signpost
order: 100
---

## Add it

```bash
npx @runek/cli add signpost
```

Pulls `sign`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.12.0`.

## Use it

```tsx
import { Signpost } from './runek/Signpost'

<Signpost position={[0, 0, 0]} />
```

## Props

```ts
export interface SignpostProps extends WorldComponentProps {
  /**
   * The name shown on the board. A plain string, **not** `children`: a world renderer overrides a
   * node's `children` prop with its nested nodes, so text authored in JSON must be a named prop to
   * survive. Empty by default — `<Signpost />` is a blank board.
   */
  name?: string
  /** Post height, in units. */
  height?: number
  /** Board width, in units. */
  width?: number
  /** Post + board wood color; defaults to the palette's `wood`. */
  color?: string
  /** Name color; defaults to the palette's `sand` (legible on the wood). */
  textColor?: string
  /** Name cap height, in units. */
  size?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/signpost.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/signpost.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add signpost</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
