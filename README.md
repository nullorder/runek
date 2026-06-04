# Runek

**Procedural 3D components for the web. Compose walkable worlds from code.**

> *Worlds, one rune at a time.*

Runek is a source registry of procedural 3D components for [React Three Fiber](https://r3f.docs.pmnd.rs/) — pull a component's source into your project and own it (shadcn-style). Every component — a bookshelf, a lake, a whole house — generates its own geometry from props and a `seed`. No binary assets, no model files, no CDN. A whole world is just data: diffable, forkable, version-controlled like any repo.

Think **"shadcn for 3D worlds."**

> **Status:** `v0.0.x` — scaffolding. The API below is the target shape; components land in `v0.1.0`.

## Compose your first world

```tsx
import { World } from '@runek/core'
import { Bookshelf, Player, Terrain } from '@runek/components'

export function Helicon() {
  return (
    <World>
      <Terrain size={[40, 40]} />
      <Bookshelf position={[0, 1, 0]} seed={42} fill={0.8} />
      <Player />
    </World>
  )
}
```

Same `seed` → same world, every time.

## Repository layout

```
packages/
  core/         @runek/core        — <World>, useWorld, seeded rng, contract types
  components/   @runek/components   — the procedural components
apps/
  helicon/      the showcase world (Vite app; extracts to its own repo at GA)
```

## Development

```sh
pnpm install
pnpm dev          # run the Helicon showcase app
pnpm build        # typecheck + build the app
pnpm lint         # Biome lint + format check
pnpm typecheck    # tsc across the workspace
```

Requires Node ≥ 20 and pnpm. Built on React 19, React Three Fiber 9, Rapier, ecctrl, and drei.

[![made with Pixelspace](https://pixelspace.anirudha.dev/badge.svg)](https://pixelspace.anirudha.dev)

## License

[MIT](LICENSE) © nullorder
