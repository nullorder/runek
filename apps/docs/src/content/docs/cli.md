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

1. resolves **registry dependencies** recursively (e.g. `house` also pulls its
   walls, floor, roof, door, and window as source),
2. writes the source into your install directory verbatim (components import
   `@runek/core` from npm, so there's no import to rewrite),
3. installs the npm **dependencies**, including `@runek/core`, with your package
   manager (auto-detected from the lockfile).

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
  "dir": "src/runek"
}
```

- **registry** — where components are fetched from.
- **dir** — where component source is written. The runtime comes from the
  `@runek/core` npm package, not copied here.
