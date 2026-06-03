# Runek — task runner. Run `just` (or `just --list`) to see all recipes.

# List available recipes
default:
    @just --list

# Install workspace dependencies
install:
    pnpm install

# Run the Helicon showcase app (dev server)
dev:
    pnpm --filter helicon dev

# Production build of the showcase app
build:
    pnpm --filter helicon build

# Preview the production build
preview:
    pnpm --filter helicon preview

# Rebuild the served registry (registry/components/*.json) from the index + source
registry:
    @node scripts/build-registry.mjs

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

# Full verification gate: lint, typecheck, test, build
check: lint typecheck test build

# Run the test suite (vitest, across packages)
test:
    pnpm -r --if-present test

# Set the version across all workspace packages, e.g. `just version 0.3.0`
version VERSION:
    @node scripts/set-version.mjs {{VERSION}}

# Publish — distribution model is the source registry (Path A); GA hosting is still pending
publish:
    @echo "Distribution model: source registry (Path A — npx runek add)."
    @echo "GA steps (not yet automated — needs npm auth + runek.dev hosting):"
    @echo "  1. just registry                                    # regenerate registry/components/*.json"
    @echo "  2. deploy registry/ to https://runek.dev/r          # static host"
    @echo "  3. pnpm --filter @runek/cli build && pnpm --filter @runek/cli publish --access public"
    @exit 1

# Remove build output and installed dependencies
clean:
    rm -rf node_modules packages/*/node_modules apps/*/node_modules
    rm -rf apps/helicon/dist apps/helicon/.vite
