---
title: "CoffeeMachine"
summary: "A countertop coffee machine, espresso or drip, with a cup or carafe and a few puffs of steam. Sits on a Counter."
category: component
component: coffeemachine
order: 100
---

## Add it

```bash
npx @runek/cli add coffeemachine
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.13.0`, `three@^0.184.0`.

## Use it

```tsx
import { CoffeeMachine } from './runek/CoffeeMachine'

<CoffeeMachine position={[0, 0, 0]} />
```

## Props

```ts
export interface CoffeeMachineProps extends WorldComponentProps {
  /** Seeded when unset. */
  kind?: CoffeeMachineKind
  /** Body color. Seeded from a few appliance finishes when unset. */
  color?: string
  /** A few puffs of steam rising from the cup or carafe. */
  steam?: boolean
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/coffeemachine.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/coffeemachine.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add coffeemachine</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
