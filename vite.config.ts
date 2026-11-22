import { svelte } from '@sveltejs/vite-plugin-svelte'
import { createHash } from 'node:crypto'
import { defineConfig, type Plugin } from 'vite'

const PUBLIC_FILES = [
  'favicon.svg',
  'manifest.webmanifest',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
]

function serviceWorkerSource(cache: string, precached: string[]): string {
  return `const CACHE = ${JSON.stringify(cache)}

const PRECACHED = ${JSON.stringify(precached, null, 2)}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHED.map((path) => new URL(path, self.location))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return
  }
  event.respondWith(handle(request))
})

async function handle(request) {
  const base = new URL('./', self.location).pathname
  const path = new URL(request.url).pathname.slice(base.length)
  if (request.mode === 'navigate') {
    try {
      return await fetch(request)
    } catch (error) {
      const cached = await caches.match('./index.html', { ignoreVary: true })
      if (!cached) {
        throw error
      }
      return cached
    }
  }
  if (path.startsWith('assets/')) {
    const cached = await caches.match(request, { ignoreVary: true })
    if (cached) {
      return cached
    }
    const response = await fetch(request)
    const cache = await caches.open(CACHE)
    cache.put(request, response.clone())
    return response
  }
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const cached = await caches.match(request, { ignoreVary: true })
    if (!cached) {
      throw error
    }
    return cached
  }
}
`
}

function serviceWorkerPlugin(): Plugin {
  return {
    name: 'footnotes-service-worker',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const keys = Object.keys(bundle).sort()
      const hash = createHash('sha256').update(keys.join('\n')).digest('hex').slice(0, 8)
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: serviceWorkerSource(`footnotes-${hash}`, [...keys, ...PUBLIC_FILES]),
      })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [svelte(), serviceWorkerPlugin()],
  server: {
    host: true,
    allowedHosts: ['oa-bdubois', 'oa-bdubois.local'],
    port: 8080,
    strictPort: true,
  },
})
