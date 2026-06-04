---
title: CLI reference
summary: "runek init / add / list — pull editable component source into your project."
category: reference
order: 30
---

The `runek` CLI copies component **source** from the registry into your project —
you own and edit the files. Run it with `npx runek <command>`.

## init

```bash
npx runek init [options]
```

Writes `runek.config.json` and creates the install directory. Run it once per
project.

## add

```bash
npx runek add <name...> [options]
```

Pulls one or more components. For each, it:

1. resolves **registry dependencies** recursively (every component pulls `core`;
   `house` also pulls its walls, floor, roof, door, and window),
2. writes the source into your install directory, repointing the `@runek/core`
   import at your copy,
3. installs the npm **dependencies** with your package manager (auto-detected from
   the lockfile).

```bash
npx runek add player terrain bookshelf
```

## list

```bash
npx runek list [options]
```

Prints the catalog, grouped by category.

## Options

| Option | Commands | Description |
|---|---|---|
| `--registry <url\|path>` | all | Registry base. Defaults to the configured one (`https://runek.nullorder.org/r`). A local path works for development. |
| `--dir <path>` | init, add | Install directory (default `src/runek`). |
| `--overwrite` | add | Replace files that already exist (otherwise they're skipped). |
| `--no-install` | add | Print the dependency install command instead of running it. |
| `--force` | init | Overwrite an existing `runek.config.json`. |
| `-h, --help` | — | Show help. |

## runek.config.json

```json
{
  "$schema": "https://runek.nullorder.org/registry/config-schema.json",
  "registry": "https://runek.nullorder.org/r",
  "dir": "src/runek",
  "coreImport": "./core"
}
```

- **registry** — where components are fetched from.
- **dir** — where source is written (components flat, `core` in a subfolder).
- **coreImport** — what `@runek/core` is rewritten to (default `./core`, since
  components and `core/` land side by side).
