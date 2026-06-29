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
# source itself ships via the registry deploy, not npm). A non-empty CHANNEL
# (alpha/beta/rc) publishes under that dist-tag instead of `latest`.
publish-core CHANNEL="":
    @echo "Publishing @runek/core v{{version}} to npm{{ if CHANNEL != "" { " (dist-tag: " + CHANNEL + ")" } else { "" } }}..."
    pnpm --filter @runek/core build
    pnpm --filter @runek/core publish --access public --no-git-checks {{ if CHANNEL != "" { "--tag " + CHANNEL } else { "" } }}

# Publish the @runek/cli CLI to npm (the `runek` bin lives here). A non-empty
# CHANNEL (alpha/beta/rc) publishes under that dist-tag instead of `latest`.
publish-cli CHANNEL="":
    @echo "Publishing @runek/cli v{{version}} to npm{{ if CHANNEL != "" { " (dist-tag: " + CHANNEL + ")" } else { "" } }}..."
    pnpm --filter @runek/cli build
    node packages/cli/dist/index.js --help > /dev/null
    pnpm --filter @runek/cli publish --access public --no-git-checks {{ if CHANNEL != "" { "--tag " + CHANNEL } else { "" } }}

# Tag the release and create a GitHub release with auto-generated notes. The
# release is marked a GitHub pre-release when a CHANNEL (alpha/beta/rc) is set
# OR the version is a patch (X.Y.Z with Z != 0). Patch releases still publish to
# npm `latest`; this only keeps GitHub's "Latest release" badge on minor/major.
gh-release CHANNEL="":
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
    prerelease_flag=""
    if [ -n "{{CHANNEL}}" ]; then
        prerelease_flag="--prerelease"
        echo "→ marking GitHub release as a pre-release ({{CHANNEL}} channel)"
    else
        ver="{{version}}"; ver="${ver%%-*}"; patch="${ver##*.}"
        if [ "$patch" != "0" ]; then
            prerelease_flag="--prerelease"
            echo "→ marking GitHub release as a pre-release (patch release)"
        fi
    fi
    gh release create "v{{version}}" --title "$title" --generate-notes $prerelease_flag
    echo "✓ https://github.com/{{repo}}/releases/tag/v{{version}}"

# Validate the release channel and that it agrees with the package version.
# CHANNEL must be empty (stable) or one of alpha/beta/rc. A prerelease channel
# requires a prerelease version (e.g. 0.11.0-alpha.0), and a prerelease version
# requires a channel — this guards against shipping a prerelease to `latest`.
_validate-channel CHANNEL="":
    #!/usr/bin/env bash
    set -euo pipefail
    case "{{CHANNEL}}" in
        ""|alpha|beta|rc) ;;
        *) echo "✗ invalid channel '{{CHANNEL}}' — use alpha, beta, or rc (or omit for stable)"; exit 1 ;;
    esac
    if [ -n "{{CHANNEL}}" ] && [[ "{{version}}" != *-* ]]; then
        echo "✗ channel '{{CHANNEL}}' but v{{version}} is not a prerelease — run e.g. 'just version X.Y.Z-{{CHANNEL}}.0' first"
        exit 1
    fi
    if [ -z "{{CHANNEL}}" ] && [[ "{{version}}" == *-* ]]; then
        echo "✗ v{{version}} looks like a prerelease — pass a channel: 'just publish alpha' (or beta/rc)"
        exit 1
    fi
    echo "✓ channel: {{ if CHANNEL != "" { CHANNEL } else { "stable (latest)" } }} for v{{version}}"

# Full release: gate → npm (@runek/core + CLI) → git tag + GitHub release.
# Component source goes live by deploying the docs site (serves /r). Pass a
# CHANNEL (alpha/beta/rc) to ship a prerelease: npm publishes under that
# dist-tag and the GitHub release is marked pre-release, e.g. `just publish rc`.
publish CHANNEL="": (_validate-channel CHANNEL) prepare-publish check-npm-login check-gh-login (publish-core CHANNEL) (publish-cli CHANNEL) (gh-release CHANNEL)
    @echo "✓ Released v{{version}}{{ if CHANNEL != "" { " (" + CHANNEL + " prerelease)" } else { "" } }}: @runek/core + @runek/cli on npm, tagged, GitHub release created."
    @echo "  Next: deploy apps/docs to publish the registry at https://runek.nullorder.org/r"

# What `just publish` does, and the version it would cut
publish-help:
    @echo "just publish [CHANNEL] — cut release v{{version}}:"
    @echo "  CHANNEL: empty = stable (latest); alpha/beta/rc = prerelease (npm dist-tag + GitHub pre-release)"
    @echo "  0. _validate-channel verify CHANNEL is valid and agrees with the version"
    @echo "  1. prepare-publish   regenerate registry + full gate (fails on uncommitted changes)"
    @echo "  2. check-*-login     verify npm + GitHub credentials"
    @echo "  3. publish-core      build + npm publish @runek/core (public)"
    @echo "  4. publish-cli       build + npm publish @runek/cli (public)"
    @echo "  5. gh-release        git tag v{{version}} + GitHub release (auto notes); pre-release if CHANNEL set or a patch (X.Y.Z, Z!=0)"
    @echo "  Set the version first with: just version X.Y.Z  (or X.Y.Z-alpha.0 for a prerelease)"

# Remove build output and installed dependencies
clean:
    rm -rf node_modules packages/*/node_modules apps/*/node_modules
    rm -rf apps/docs/dist apps/docs/.astro apps/docs/public/r
