---
title: "Sailboat"
summary: "A small procedural sailboat: a station-built low-poly hull, mast, boom, and mainsail, floating at the waterline with a gentle moored bob."
category: component
component: sailboat
order: 100
---

## Add it

```bash
npx @runek/cli add sailboat
```

Pulls `@react-three/fiber@^9.6.1`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.1`, `three@^0.184.0`.

## Use it

```tsx
import { Sailboat } from './runek/Sailboat'

<Sailboat position={[0, 0, 0]} />
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/sailboat.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/sailboat.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add sailboat</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/sailboat)**.
