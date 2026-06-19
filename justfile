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

# Build the publishable @runek/core (tsup → dist, production)
build-core:
    NODE_ENV=production pnpm --filter @runek/core build

# Build the publishable @runek/cli (tsc → dist, production)
build-cli:
    NODE_ENV=production pnpm --filter @runek/cli build

# Production build of the docs site (Astro static)
build-docs:
    NODE_ENV=production pnpm --filter @runek/docs build

# Build every package for release, one by one: core lib → CLI → docs site.
# @runek/components ships as source (copy-first), so there is nothing to compile.
build: build-core build-cli build-docs
    @echo "✓ release build complete: @runek/core + @runek/cli + @runek/docs"

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

# Full verification gate: lint, typecheck, test, build (core lib + docs), clean tree
check: lint typecheck test build-core build-docs verify-clean

# Fail if the working tree has uncommitted changes (e.g. regenerated registry
# manifests left over after a version bump). Respects .gitignore.
verify-clean:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -n "$(git status --porcelain)" ]; then
        echo "✗ uncommitted changes — commit them before releasing:"
        git status --short
        exit 1
    fi
    echo "✓ working tree clean"

# Run the test suite (vitest, across packages)
test:
    pnpm -r --if-present test

# Set the version across all workspace packages, e.g. `just version 0.3.0`
version VERSION:
    @node scripts/set-version.mjs {{VERSION}}

# Pre-flight: regenerate the served registry, then run the full gate. The gate's
# verify-clean step fails if the rebuild left uncommitted manifest changes (the
# usual case right after `just version`) — commit them, then re-run.
prepare-publish: registry check
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

# Publish the @runek/cli CLI to npm (the `runek` bin lives here)
publish-cli:
    @echo "Publishing @runek/cli v{{version}} to npm..."
    pnpm --filter @runek/cli build
    node packages/cli/dist/index.js --help > /dev/null
    pnpm --filter @runek/cli publish --access public --no-git-checks

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
    read -r -p "Release title [v{{version}}]: " title </dev/tty || true
    title="${title:-v{{version}}}"
    gh release create "v{{version}}" --title "$title" --generate-notes
    echo "✓ https://github.com/{{repo}}/releases/tag/v{{version}}"

# Full release: gate → npm (@runek/core + CLI) → git tag + GitHub release.
# Component source goes live by deploying the docs site (serves /r).
publish: prepare-publish check-npm-login check-gh-login publish-core publish-cli gh-release
    @echo "✓ Released v{{version}}: @runek/core + @runek/cli on npm, tagged, GitHub release created."
    @echo "  Next: deploy apps/docs to publish the registry at https://runek.nullorder.org/r"

# What `just publish` does, and the version it would cut
publish-help:
    @echo "just publish — cut release v{{version}}:"
    @echo "  1. prepare-publish   regenerate registry + full gate (fails on uncommitted changes)"
    @echo "  2. check-*-login     verify npm + GitHub credentials"
    @echo "  3. publish-core      build + npm publish @runek/core (public)"
    @echo "  4. publish-cli       build + npm publish @runek/cli (public)"
    @echo "  5. gh-release        git tag v{{version}} + GitHub release (auto notes)"
    @echo "  Set the version first with: just version X.Y.Z"

# Remove build output and installed dependencies
clean:
    rm -rf node_modules packages/*/node_modules apps/*/node_modules
    rm -rf apps/docs/dist apps/docs/.astro apps/docs/public/r
