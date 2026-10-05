import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import { defineConfig } from 'astro/config'

// Static docs site. The flat Markdown pages are pre-rendered (SEO/a11y); the 3D
// library world is a client-only React island. Served at runek.nullorder.org (root), which
// also hosts the registry under /r for `npx @runek/cli add`.
export default defineConfig({
  site: 'https://runek.nullorder.org',
  integrations: [react(), mdx()],
  markdown: {
    shikiConfig: { theme: 'night-owl' },
  },
  vite: {
    // Pre-bundle what the workshop loads lazily, so the dev server never re-optimizes
    // mid-session (which strands an already-open sandbox iframe on a stale hash).
    optimizeDeps: {
      include: [
        'sucrase',
        'zustand',
        'three/examples/jsm/helpers/VertexNormalsHelper.js',
        '@codemirror/autocomplete',
        '@codemirror/commands',
        '@codemirror/lang-javascript',
        '@codemirror/lang-json',
        '@codemirror/language',
        '@codemirror/lint',
        '@codemirror/search',
        '@codemirror/state',
        '@codemirror/view',
        '@lezer/highlight',
      ],
    },
    server: {
      // The workshop's sandbox iframe has an opaque origin, so its module requests arrive
      // with `Origin: null` (GitHub Pages answers those with a wildcard already).
      cors: {
        origin: [/^https?:\/\/(?:(?:[^:]+\.)?localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/, 'null'],
      },
    },
  },
})
