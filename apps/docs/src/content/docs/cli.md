---
title: CLI reference
summary: "runek init / add / list / check-world — pull editable component source into your project and check your worlds."
category: reference
order: 30
---

The `runek` CLI copies component **source** from the registry into your project — you own and edit the files. Run it with `npx @runek/cli <command>`.

## init

```bash
npx @runek/cli init [options]
```

Writes `runek.config.json` and creates the install directory. Run it once per project.

## add

```bash
npx @runek/cli add <name...> [options]
```

Pulls one or more components. For each, it:

1. resolves **registry dependencies** recursively (e.g. `house` also pulls its walls, floor, roof, door, and window as source),
2. writes the source into your install directory verbatim (components import `@runek/core` from npm, so there's no import to rewrite),
3. installs the npm **dependencies**, including `@runek/core`, with your package manager (auto-detected from the lockfile).

```bash
npx @runek/cli add player terrain bookshelf
```

## list

```bash
npx @runek/cli list [options]
```

Prints the catalog, grouped by category.

## check-world

```bash
npx @runek/cli check-world <world.json> [options]
```

Finds nodes that are **buried** (below the terrain) or **floating** (above the highest surface), and open water that stands above its shore. It reads the ground from your own component source (the `surfaces/*.ts` modules that ship with `terrain`, `dock`, `floor`, `slab`, `shore`, and `lake`) and the ground math from your installed `@runek/core`, so it checks exactly what your app renders. Only components marked `groundSitting` are checked, and anchored nodes pass by construction.

```bash
npx @runek/cli check-world public/world.json
#   buried Tent [70] at (-28, 0.42, 110) is 1.8 below the ground (2.22); set position[1] to 2.216, or anchor it
```

`--fix` writes each suggested Y into the file; `--strict` exits non-zero when anything is found, so an app can run it in CI. Loading `.ts` surfaces needs Node 22.18 or newer. See [Placing things on uneven ground](/docs/placing-things-on-uneven-ground).

## Options

| Option | Commands | Description |
|---|---|---|
| `--registry <url\|path>` | all | Registry base. Defaults to the configured one (`https://runek.nullorder.org/r`). A local path works for development. |
| `--dir <path>` | init, add, check-world | Install directory (default `src/runek`). |
| `--overwrite` | add | Replace files that already exist (otherwise they're skipped). |
| `--no-install` | add | Print the dependency install command instead of running it. |
| `--force` | init | Overwrite an existing `runek.config.json`. |
| `--strict` | check-world | Exit non-zero when an issue is found. |
| `--fix` | check-world | Write the suggested Y values into the world file. |
| `--tolerance <units>` | check-world | Allowed gap before a node is flagged (default `0.08`). |
| `-h, --help` | — | Show help. |

## runek.config.json

```json
{
  "$schema": "https://runek.nullorder.org/registry/config-schema.json",
  "registry": "https://runek.nullorder.org/r",
  "dir": "src/runek"
}
```

- **registry** — where components are fetched from.
- **dir** — where component source is written. The runtime comes from the `@runek/core` npm package, not copied here.

## Registry index

The default registry is served at [`https://runek.nullorder.org/r`](https://runek.nullorder.org/r). Its index lists every component (name, type, description); each entry resolves to a self-contained manifest under `components/<name>.json`. Point `--registry` at it (the default) or at a local copy for development.

<a class="manifest-card" href="https://runek.nullorder.org/r/registry.json">
<span class="manifest-card__label">registry index</span>
<span class="manifest-card__path">/r/registry.json</span>
<span class="manifest-card__hint">The catalog the CLI reads first: every component name, type, and description.</span>
</a>
