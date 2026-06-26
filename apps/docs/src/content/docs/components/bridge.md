---
title: "Bridge"
summary: "Plank deck spanning a gap, optionally arched, with railings and slab colliders that follow the deck."
category: component
component: bridge
order: 100
---

## Add it

```bash
npx @runek/cli add bridge
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.1`.

## Use it

```tsx
import { Bridge } from './runek/Bridge'

<Bridge position={[0, 0, 0]} seed={1} />
```

## Props

```ts
export interface BridgeProps {
  position?: Vec3
  rotation?: Vec3
  /** Span along local X, in units. */
  length?: number
  /** Walkway width along local Z, in units. */
  width?: number
  /** Arch rise at the center, in units (0 = flat). */
  arch?: number
  /** Side railings. */
  rails?: boolean
  /** Deck color; defaults to the world palette's `wood` slot. */
  color?: string
  seed?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/bridge.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/bridge.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add bridge</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/bridge)**.
