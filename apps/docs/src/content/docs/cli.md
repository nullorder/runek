---
title: CLI reference
summary: "runek init / add / list — pull editable component source into your project."
category: reference
order: 30
---

The `runek` CLI copies component **source** from the registry into your project —
you own and edit the files. Run it with `npx @runek/cli <command>`.

## init

```bash
npx @runek/cli init [options]
```

Writes `runek.config.json` and creates the install directory. Run it once per
project.

## add

```bash
npx @runek/cli add <name...> [options]
```

Pulls one or more components. For each, it:

1. resolves **registry dependencies** recursively (e.g. `house` also pulls its
   walls, floor, roof, door, and window as source),
2. writes the source into your install directory verbatim (components import
   `@runek/core` from npm, so there's no import to rewrite),
3. installs the npm **dependencies**, including `@runek/core`, with your package
   manager (auto-detected from the lockfile).

```bash
npx @runek/cli add player terrain bookshelf
```

## list

```bash
npx @runek/cli list [options]
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

## Registry index

The default registry is served at [`https://runek.nullorder.org/r`](https://runek.nullorder.org/r). Its index lists every component (name, type, description); each entry resolves to a self-contained manifest under `components/<name>.json`. Point `--registry` at it (the default) or at a local copy for development.

<a class="manifest-card" href="https://runek.nullorder.org/r/registry.json">
<span class="manifest-card__label">registry index</span>
<span class="manifest-card__path">/r/registry.json</span>
<span class="manifest-card__hint">The catalog the CLI reads first: every component name, type, and description.</span>
</a>
