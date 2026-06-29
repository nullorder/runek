---
title: "Portal"
summary: "A travel gate: a glowing sensor ring that fires onEnter (or navigates to a destination) when the avatar or a vehicle passes through — for world-to-world travel, level transitions, and teleports."
category: component
component: portal
order: 100
---

## Add it

```bash
npx @runek/cli add portal
```

Pulls `sign`, `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`, `three@^0.184.0`.

## Use it

```tsx
import { Portal } from './runek/Portal'

<Portal position={[0, 0, 0]} />
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/portal.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/portal.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add portal</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
