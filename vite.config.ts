import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// En local sirve /api/horario con el mismo código que la función de Vercel,
// así `npm run dev` y `npm run preview` funcionan sin la CLI de Vercel.
type Handler = (method: string, body: unknown, ip: string) => Promise<{ status: number; body: unknown }>

function apiMiddleware(load: () => Promise<{ handleTimetable: Handler }>) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    let body: unknown = {}
    try {
      body = JSON.parse((await readBody(req)) || '{}')
    } catch {
      /* cuerpo inválido: lo valida el handler */
    }
    const { handleTimetable } = await load()
    const result = await handleTimetable(req.method ?? 'GET', body, req.socket.remoteAddress ?? 'local')
    res.statusCode = result.status
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(result.body))
  }
}

function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/horario', apiMiddleware(() => server.ssrLoadModule('/api/horario.ts') as Promise<{ handleTimetable: Handler }>))
    },
    configurePreviewServer(server) {
      // Node 24 ejecuta TypeScript directamente (solo tipos borrables).
      server.middlewares.use('/api/horario', apiMiddleware(() => import(pathToFileURL(resolve('api/horario.ts')).href)))
    },
  }
}

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

export default defineConfig(({ mode }) => {
  // Variables del .env para la API local (la app del navegador no las ve).
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['ANTHROPIC_API_KEY', 'ACCESS_CODE']) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      devApi(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'FaltApp',
          short_name: 'FaltApp',
          description: 'Controla cuántas veces puedes faltar a cada asignatura.',
          lang: 'es',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#0d0b18',
          theme_color: '#0d0b18',
          categories: ['education', 'productivity'],
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
    ],
  }
})
