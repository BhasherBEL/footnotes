import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  plugins: [svelte()],
  server: {
    host: true,
    allowedHosts: ['oa-bdubois', 'oa-bdubois.local'],
    port: 8080,
    strictPort: true,
  },
})
