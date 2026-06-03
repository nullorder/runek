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

# Publish — gated on the distribution decision (see plan/open-questions.md)
publish:
    @echo "Publishing isn't wired yet: the distribution model is still open."
    @echo "Once decided — scoped npm: 'pnpm -r publish --access public'; source registry: build & deploy registry.json."
    @exit 1

# Remove build output and installed dependencies
clean:
    rm -rf node_modules packages/*/node_modules apps/*/node_modules
    rm -rf apps/helicon/dist apps/helicon/.vite
