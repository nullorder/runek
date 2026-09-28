---
title: "Palm"
summary: "A coconut palm: leaning bowed trunk and a crown of drooping instanced fronds, deterministic from seed."
category: component
component: palm
order: 100
---

## Add it

```bash
npx @runek/cli add palm
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { Palm } from './runek/Palm'

<Palm position={[0, 0, 0]} />
```

## Props

```ts
export interface PalmProps extends WorldComponentProps {
  /** Trunk height, in units. */
  height?: number
  /** Sideways lean of the crown, as a fraction of height. */
  lean?: number
  /** Frond count. */
  fronds?: number
  /** Frond length, in units. */
  frondLength?: number
  /** Defaults to the world palette's `bark` slot. */
  trunkColor?: string
  /** Defaults to the world palette's `foliage` slot. */
  frondColor?: string
  /** Grow a coconut cluster under the crown. */
  coconuts?: boolean
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/palm.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/palm.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add palm</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
