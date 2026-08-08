import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import checker from 'vite-plugin-checker'

/** Dev-only sinks so /api/errors and /api/vitals work with `npm run dev`. */
function localObservabilityPlugin(): Plugin {
  return {
    name: 'hospital-local-observability',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === 'POST' && (req.url === '/api/errors' || req.url === '/api/vitals')) {
          const chunks: Buffer[] = []
          req.on('data', (c) => chunks.push(Buffer.from(c)))
          req.on('end', () => {
            try {
              const raw = Buffer.concat(chunks).toString('utf8')
              const body = raw ? JSON.parse(raw) : {}
              if (req.url === '/api/errors') {
                console.error('[api/errors]', body.message ?? body)
              } else {
                console.debug('[api/vitals]', body.name, body.value, body.rating)
              }
            } catch {
              /* ignore bad payloads */
            }
            res.statusCode = 204
            res.end()
          })
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    localObservabilityPlugin(),
    checker({
      typescript: true,
      eslint: {
        useFlatConfig: true,
        lintCommand: 'eslint "src/**/*.{ts,tsx}"',
      },
      // Overlay steals pointer events and blocks login / manual UAT on `npm run dev` (UX-01).
      // Terminal diagnostics stay on. Opt in: VITE_CHECKER_OVERLAY=true
      overlay: process.env.VITE_CHECKER_OVERLAY === 'true',
    }),
  ],
  ssr: {
    noExternal: ['@tanstack/react-query', 'react-router-dom'],
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          calendar: [
            '@fullcalendar/react',
            '@fullcalendar/daygrid',
            '@fullcalendar/timegrid',
            '@fullcalendar/interaction',
          ],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
          state: ['zustand'],
          ui: ['sonner', 'clsx', 'tailwind-merge'],
          offline: ['dexie'],
        },
      },
    },
  },
})
