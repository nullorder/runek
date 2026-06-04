import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import { defineConfig } from 'astro/config'

// Static docs site. The flat Markdown pages are pre-rendered (SEO/a11y); the 3D
// library world is a client-only React island. Served at runek.nullorder.org (root), which
// also hosts the registry under /r for `npx runek add`.
export default defineConfig({
  site: 'https://runek.nullorder.org',
  integrations: [react(), mdx()],
  markdown: {
    shikiConfig: { theme: 'night-owl' },
  },
})
