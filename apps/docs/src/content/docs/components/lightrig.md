---
title: "LightRig"
summary: "Sun + hemisphere/ground fill with shadow configuration."
category: component
component: lightrig
order: 100
---

## Add it

```bash
npx @runek/cli add lightrig
```

Pulls `@react-three/fiber@^9.6.1`, `@runek/core@^0.10.1`, `three@^0.184.0`.

## Use it

```tsx
import { LightRig } from './runek/LightRig'

<LightRig position={[0, 0, 0]} />
```

## Props

```ts
export interface LightRigProps {
  sunPosition?: Vec3
  sunColor?: string
  sunIntensity?: number
  ambient?: number
  skyColor?: string
  groundColor?: string
  shadows?: boolean
  /** Half-extent of the shadow camera frustum, in units. */
  shadowRange?: number
}
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/lightrig.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/lightrig.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add lightrig</code> fetches.</span>
</a>

See it live with editable props in the **[gallery →](/gallery/lightrig)**.
