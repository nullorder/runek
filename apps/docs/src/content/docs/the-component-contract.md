---
title: The component contract
summary: Every Runek component is a pure, deterministic function of its props — here are the rules.
category: guide
order: 14
---

Runek components all follow the same small contract. Honor it and a component is composable, serializable, and swappable with any other.

## The rules

1. **Accept `position`, `rotation`, `seed`.** These are the shared base props (`WorldComponentProps`). Geometry is generated from them — nothing else.
2. **Generate geometry in `useMemo`, keyed on every geometry-affecting prop** (including `seed`). Same inputs → same mesh, no rebuild on unrelated renders.
3. **Register your own colliders** — a Rapier `RigidBody`. Keep collider count proportional to gameplay surface, not visual detail (one cuboid for a bookshelf, not one per book).
4. **Respect `unit`** from `useWorld()` so the component scales with the world.
5. **No assets.** Geometry and color come from code; no `.glb`, no textures.
6. **Default colors from the palette.** Read `palette` from `useWorld()` and use its slots (`wood`, `wall`, `foliage`, …) as your color defaults; an explicit color prop always wins. One palette swap then re-themes the whole world.
7. **Instance repeated geometry.** Books, branches, blades — render them as one `InstancedMesh`, not one mesh per piece, so worlds stay cheap at scale.
8. **Share static materials.** Get a part's material from `useMaterial({ color, roughness, … })` (or `useMaterials` for several) instead of an inline `<meshStandardMaterial>`. Every part in the world with the same look then draws with one material. Keep a material of your own only when something changes it after mount (a flicker, a texture you draw into).
9. **Lend, don't light.** If your component gives off light, register it with `useLight({ color, intensity, distance })` and put the returned emitter's `ref` where the light sits. Don't mount a `<pointLight>` yourself: the world keeps a small fixed pool of real lights and lends them to the lamps that matter most to the view.
10. **Mark what moves.** The world merges static parts that share a material into a few big meshes. Wrap the parts you move, scale, hide or reshape after mount in `<Dynamic>` (from `@runek/core`) so they stay separate.
11. **Publish your surface.** If people can stand on your component, attach `Component.surface` (its walkable top, as a pure function in a `surfaces/<name>.ts` module). If it stands on the ground, set `Component.groundSitting = true`. That's what lets worlds anchor to it and `runek check-world` catch buried or floating props.

## A minimal compliant component

```tsx
import { RigidBody } from '@react-three/rapier'
import { rng, useMaterial, useWorld, type Vec3 } from '@runek/core'
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
  const wood = useMaterial({ color: `hsl(30, 40%, ${40 + hue * 100}%)` })

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
      <mesh material={wood} castShadow receiveShadow>
        <boxGeometry args={[s, s, s]} />
      </mesh>
    </RigidBody>
  )
}
```

Because the contract is uniform, a world is just a list of `{ type, props }` — see [worlds as data](/docs/worlds-as-data).

Contributing a component? The normative spec (with a conformance checklist) is [`CONTRACT.md`](https://github.com/nullorder/runek/blob/main/CONTRACT.md), and the step-by-step workflow is [`CONTRIBUTING.md`](https://github.com/nullorder/runek/blob/main/CONTRIBUTING.md).
