---
title: The component contract
summary: Every Runek component is a pure, deterministic function of its props — here are the rules.
category: guide
order: 14
---

Runek components all follow the same small contract. Honor it and a component is
composable, serializable, and swappable with any other.

## The rules

1. **Accept `position`, `rotation`, `seed`.** These are the shared base props
   (`WorldComponentProps`). Geometry is generated from them — nothing else.
2. **Generate geometry in `useMemo`, keyed on every geometry-affecting prop**
   (including `seed`). Same inputs → same mesh, no rebuild on unrelated renders.
3. **Register your own colliders** — a Rapier `RigidBody`. Keep collider count
   proportional to gameplay surface, not visual detail (one cuboid for a
   bookshelf, not one per book).
4. **Respect `unit`** from `useWorld()` so the component scales with the world.
5. **No assets.** Geometry and color come from code; no `.glb`, no textures.

## A minimal compliant component

```tsx
import { RigidBody } from '@react-three/rapier'
import { rng, useWorld, type Vec3 } from './runek/core'
import { useMemo } from 'react'

export interface CrateProps {
  position?: Vec3
  rotation?: Vec3
  size?: number
  seed?: number
}

export function Crate({ position = [0, 0, 0], rotation = [0, 0, 0], size = 1, seed = 1 }: CrateProps) {
  const { unit } = useWorld()
  const s = size * unit

  const hue = useMemo(() => rng(seed)() * 0.1 + 0.05, [seed])

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[s, s, s]} />
        <meshStandardMaterial color={`hsl(30, 40%, ${40 + hue * 100}%)`} />
      </mesh>
    </RigidBody>
  )
}
```

Because the contract is uniform, a world is just a list of
`{ type, props }` — see [worlds as data](/docs/worlds-as-data).

Contributing a component? The normative spec (with a conformance checklist) is
[`CONTRACT.md`](https://github.com/nullorder/runek/blob/main/CONTRACT.md), and the
step-by-step workflow is
[`CONTRIBUTING.md`](https://github.com/nullorder/runek/blob/main/CONTRIBUTING.md).
