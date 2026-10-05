---
title: "ArcadeCabinet"
summary: "An upright arcade cabinet cut to the classic profile, with a lit marquee, joystick and buttons, and a screen running a seeded pixel game."
category: component
component: arcadecabinet
order: 100
---

## Add it

```bash
npx @runek/cli add arcadecabinet
```

Pulls `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { ArcadeCabinet } from './runek/ArcadeCabinet'

<ArcadeCabinet position={[0, 0, 0]} />
```

## Props

```ts
export interface ArcadeCabinetProps extends WorldComponentProps {
  /** Cabinet width, in units. */
  width?: number
  /** Body color. Seeded when unset. */
  color?: string
  /** Side-art stripe and marquee glow. Seeded when unset. */
  accent?: string
  /** Lit screen showing a seeded game; off, dark glass. */
  on?: boolean
  /** Control sets on the panel (one or two players). Seeded when unset. */
  players?: 1 | 2
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/arcadecabinet.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/arcadecabinet.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add arcadecabinet</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
