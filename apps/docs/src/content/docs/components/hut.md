---
title: "Hut"
summary: "A round hut: a post-ribbed wall on a stone base, a framed doorway and window, under a shaggy thatch cone; one cylinder collider."
category: component
component: hut
order: 100
---

## Add it

```bash
npx @runek/cli add hut
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`, `three@^0.184.0`.

## Use it

```tsx
import { Hut } from './runek/Hut'

<Hut position={[0, 0, 0]} />
```

## Props

```ts
export interface HutProps extends WorldComponentProps {
  /** Wall radius, in units. */
  radius?: number
  /** Wall height at the eaves, in units. */
  wallHeight?: number
  /** Conical roof height above the eaves, in units. */
  roofHeight?: number
  /** Doorway width at the front (local +Z), in units. */
  doorWidth?: number
  /** Wall color; defaults to the palette's `wall`. */
  wallColor?: string
  /** Roof color; defaults to the palette's `roof`. */
  roofColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/hut.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/hut.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add hut</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
