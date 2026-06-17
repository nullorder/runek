import { defineConfig } from 'tsup'

// Builds the published artifact only. In the monorepo, consumers (docs,
// components) read `src` directly via the workspace; `publishConfig` repoints
// npm consumers at this `dist`. Peer deps (react, three, @react-three/*, leva)
// are external by default.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  target: 'es2022',
})
