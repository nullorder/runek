---
title: "Fridge"
summary: "A kitchen fridge with a top or bottom freezer or one tall door, bar handles, and a seeded enamel or steel finish."
category: component
component: fridge
order: 100
---

## Add it

```bash
npx @runek/cli add fridge
```

Pulls `@react-three/drei@^10.7.7`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`.

## Use it

```tsx
import { Fridge } from './runek/Fridge'

<Fridge position={[0, 0, 0]} />
```

## Props

```ts
export interface FridgeProps extends WorldComponentProps {
  width?: number
  height?: number
  depth?: number
  /** Seeded when unset. */
  layout?: FridgeLayout
  /** Body color. Seeded between an enamel white and brushed steel when unset. */
  color?: string
  /** Handles; defaults to the palette's `metal`. */
  handleColor?: string
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/fridge.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/fridge.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add fridge</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
