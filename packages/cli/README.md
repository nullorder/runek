# runek

**Procedural 3D components for React Three Fiber — pull the source, own the world.**

[Runek](https://runek.nullorder.org) is a source registry of procedural, seeded R3F components ("shadcn for 3D worlds"). Every component — a bookshelf, a lake, a whole house — generates its geometry from props and a `seed`. No models, no textures, no CDN. This CLI copies editable component **source** into your project; you own the files.

## Usage

```sh
npx @runek/cli init                          # write runek.config.json + the install dir
npx @runek/cli add player terrain bookshelf  # pull source + deps into your project
npx @runek/cli list                          # browse the catalog
```

`add` resolves registry dependencies recursively (every component pulls `core`), rewrites the `@runek/core` import to your local copy, and installs the npm packages the components need via your detected package manager.

Then compose a world:

```tsx
import { World } from './runek/core'
import { Bookshelf } from './runek/Bookshelf'
import { Player } from './runek/Player'
import { Terrain } from './runek/Terrain'

export function FirstWorld() {
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

## Options

```
--registry <url|path>   Registry base (default: https://runek.nullorder.org/r)
--dir <path>            Install directory (default: src/runek)
--overwrite             Overwrite files that already exist
--no-install            Print the dependency install command instead of running it
```

## Links

[Docs](https://runek.nullorder.org/docs) · [Component gallery](https://runek.nullorder.org/gallery) · [Walk the library](https://runek.nullorder.org/library) · [GitHub](https://github.com/nullorder/runek)

MIT © nullorder
