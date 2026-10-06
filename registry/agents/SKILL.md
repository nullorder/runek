---
name: runek
description: Build procedural 3D worlds for React Three Fiber with Runek. Use whenever a project has runek.config.json, a src/runek/ folder, @runek/core in package.json, or a *.world.json file, or when the user asks to add Runek components, compose or edit a Runek world, place 3D props, terrain, buildings, people or water in a walkable R3F scene, or fix a world that renders wrong (missing, buried, floating, or misnamed components).
---

# Runek

Runek is a source registry of procedural 3D components for React Three Fiber. The CLI copies a component's TypeScript source into the project (default `src/runek/`); the source imports the small runtime `@runek/core` from npm. Every component builds its geometry from props plus a `seed`, so a whole world is plain JSON.

Docs index: https://runek.nullorder.org/llms.txt (every page is also Markdown: add `.md` to its URL).

## Workflow

1. **Discover.** `npx @runek/cli list --json` for the catalog, `npx @runek/cli info <name>` for one component's props, types, defaults and an example. Never guess prop names: use only what `info` or https://runek.nullorder.org/r/props.json lists.
2. **Install.** `npx @runek/cli init` once, then `npx @runek/cli add <name...>`. It pulls dependent components as source and installs npm packages (`--no-install` prints the command instead).
3. **Compose.** Write the world as JSON (below), or as JSX inside `<World>` from `@runek/core`. Render JSON with `<WorldRenderer data={parseWorld(text)} registry={{ Bench, Sky, ... }} />`, where the registry keys are the node `type`s.
4. **Check.** `npx @runek/cli validate world.json` (unknown types and props, wrong value types, with suggestions), then `npx @runek/cli check-world world.json --fix` (snaps buried or floating nodes to the ground). Both accept `--json` and `--strict`. Fix every reported issue before moving on.
5. **Preview.** `npx @runek/cli preview world.json` prints a workshop link with the world loaded, for a person to walk and tune.

## World format

```json
{
  "$schema": "https://runek.nullorder.org/r/world.schema.json",
  "version": 1,
  "nodes": [
    { "type": "Sky" },
    { "type": "LightRig" },
    { "type": "Terrain", "props": { "size": [80, 80], "seed": 3 } },
    { "type": "Bench", "anchor": "ground", "props": { "position": [2, 0, -4], "rotation": [0, 1.5708, 0] } },
    { "type": "Player", "props": { "position": [0, 2, 6] } }
  ]
}
```

- `type` is the PascalCase title (`Bookshelf`); `add` takes the lowercase name (`bookshelf`). `Group` is a built-in container for `children`.
- Node keys are only `type`, `id`, `anchor`, `props`, `children`. Every component prop goes under `props`.
- World-level keys: `version` (always 1), `meta`, `unit`, `gravity`, `ground`, `time` ("HH:MM"), `timezone`, `avatar` ("first" | "third" | "overhead"), `controls`, `palette`, `fonts`, `fog`, `nodes`.

## Conventions

- 1 unit = 1 meter, Y up, rotations in radians (`[x, y, z]`).
- `seed` is an integer: same seed, same geometry. Change it to vary, keep it to lock. Components marked `"seeded": false` in props.json look the same for every seed.
- `"anchor": "ground"` makes `position[1]` a height above the terrain at that spot; `"surface"` stands on the highest thing there (dock, floor). Prefer anchoring over guessing heights on uneven terrain.
- Leave colors unset to follow the world `palette`; set a CSS color string to override.
- Callbacks and React children are code only; they cannot appear in JSON.
- Components are owned source: edit them in `src/runek/` when a prop is not enough. Keep them deterministic (geometry from props and `seed` only, no `Math.random`, no binary assets).

## Reference

- Agents guide: https://runek.nullorder.org/docs/for-agents.md
- Prop schema: https://runek.nullorder.org/r/props.json
- World JSON Schema: https://runek.nullorder.org/r/world.schema.json
- Catalog: https://runek.nullorder.org/r/registry.json
- Component source: https://runek.nullorder.org/r/components/<name>.json
