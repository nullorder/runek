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

Pulls `sign`, `@react-three/rapier@^2.2.0`, `@runek/core@^0.10.4`.

## Use it

```tsx
import { Signpost } from './runek/Signpost'

<Signpost position={[0, 0, 0]} />
```

## Registry manifest

<a class="manifest-card" href="https://runek.nullorder.org/r/components/signpost.json">
<span class="manifest-card__label">registry manifest</span>
<span class="manifest-card__path">/r/components/signpost.json</span>
<span class="manifest-card__hint">Self-contained JSON: inlined source plus resolved dependencies, exactly what <code>runek add signpost</code> fetches.</span>
</a>

Browse the whole catalog in the **[gallery →](/gallery)**.
