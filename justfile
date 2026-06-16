# Runek — task runner. Run `just` (or `just --list`) to see all recipes.

# Lockstep package version (set with `just version X.Y.Z`) and the GitHub repo.
version := `node -p "require('./package.json').version"`
repo := "nullorder/runek"

# List available recipes
default:
    @just --list

# Install workspace dependencies
install:
    pnpm install

# Run the docs site (Astro dev server) — the in-repo dev harness
docs:
    pnpm --filter @runek/docs dev

# Build the publishable @runek/core (tsup → dist)
build-core:
    pnpm --filter @runek/core build

# Production build of the docs site (Astro static)
build-docs:
    pnpm --filter @runek/docs build

# Preview the docs production build
preview:
    pnpm --filter @runek/docs preview

# Rebuild the served registry (registry/components/*.json) from the index + source
registry:
    @node scripts/build-registry.mjs

# Regenerate per-component docs (apps/docs) from the registry
gen-docs:
    @node apps/docs/scripts/gen-component-docs.mjs

# Run the Runek CLI from source, e.g. `just cli add bookshelf --registry ./registry`
cli *ARGS:
    @node packages/cli/src/index.ts {{ARGS}}

# Lint + format check (no writes)
lint:
    pnpm exec biome check .

# Auto-format and apply safe fixes
fmt:
    pnpm exec biome check --write .

# Type-check every package
typecheck:
    pnpm -r --if-present typecheck

# Full verification gate: lint, typecheck, test, build (core lib + docs)
check: lint typecheck test build-core build-docs

# Run the test suite (vitest, across packages)
test:
    pnpm -r --if-present test

# Set the version across all workspace packages, e.g. `just version 0.3.0`
version VERSION:
    @node scripts/set-version.mjs {{VERSION}}

# Pre-flight: full gate must be green before any release
prepare-publish: check
    @echo "✓ gate green — ready to release v{{version}}"

# Verify npm credentials
check-npm-login:
    @npm whoami >/dev/null 2>&1 && echo "✓ npm: $(npm whoami)" || { echo "✗ not logged in to npm — run 'npm login'"; exit 1; }

# Verify GitHub credentials
check-gh-login:
    @gh auth status >/dev/null 2>&1 && echo "✓ gh authenticated" || { echo "✗ not logged in to GitHub — run 'gh auth login'"; exit 1; }

# Publish @runek/core to npm (imported by copied components; the component
# source itself ships via the registry deploy, not npm)
publish-core:
    @echo "Publishing @runek/core v{{version}} to npm..."
    pnpm --filter @runek/core build
    pnpm --filter @runek/core publish --access public --no-git-checks

# Publish the `runek` CLI to npm
publish-cli:
    @echo "Publishing runek v{{version}} to npm..."
    pnpm --filter runek build
    node packages/cli/dist/index.js --help > /dev/null
    pnpm --filter runek publish --access public --no-git-checks

# Tag the release and create a GitHub release with auto-generated notes
gh-release:
    #!/usr/bin/env bash
    set -euo pipefail
    if ! git rev-parse "v{{version}}" >/dev/null 2>&1; then
        git tag -a "v{{version}}" -m "Release v{{version}}"
        echo "✓ created tag v{{version}}"
    else
        echo "✓ tag v{{version}} already exists"
    fi
    git push origin "v{{version}}"
    gh release create "v{{version}}" --title "v{{version}}" --generate-notes
    echo "✓ https://github.com/{{repo}}/releases/tag/v{{version}}"

# Full release: gate → npm (@runek/core + CLI) → git tag + GitHub release.
# Component source goes live by deploying the docs site (serves /r).
publish: prepare-publish check-npm-login check-gh-login registry publish-core publish-cli gh-release
    @echo "✓ Released v{{version}}: @runek/core + runek on npm, tagged, GitHub release created."
    @echo "  Next: deploy apps/docs to publish the registry at https://runek.nullorder.org/r"

# What `just publish` does, and the version it would cut
publish-help:
    @echo "just publish — cut release v{{version}}:"
    @echo "  1. prepare-publish   full gate (lint, typecheck, test, build)"
    @echo "  2. check-*-login     verify npm + GitHub credentials"
    @echo "  3. registry          regenerate served manifests"
    @echo "  4. publish-core      build + npm publish @runek/core (public)"
    @echo "  5. publish-cli       build + npm publish runek (public)"
    @echo "  6. gh-release        git tag v{{version}} + GitHub release (auto notes)"
    @echo "  Set the version first with: just version X.Y.Z"

# Remove build output and installed dependencies
clean:
    rm -rf node_modules packages/*/node_modules apps/*/node_modules
    rm -rf apps/docs/dist apps/docs/.astro apps/docs/public/r
