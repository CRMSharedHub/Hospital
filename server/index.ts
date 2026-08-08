import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createServer as createViteServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'

/** In-memory ring buffers for local / staging observability stubs */
const errorLog: unknown[] = []
const vitalsLog: unknown[] = []
const MAX_LOG = 200

function pushRing(buf: unknown[], item: unknown) {
  buf.push(item)
  if (buf.length > MAX_LOG) buf.shift()
}

async function createServer() {
  const app = express()
  app.use(express.json({ limit: '256kb' }))

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'hospital',
      mode: isProd ? 'production' : 'development',
      timestamp: new Date().toISOString(),
    })
  })

  // Local observability sinks (use when VITE_ERROR_ENDPOINT=/api/errors etc.)
  app.post('/api/errors', (req, res) => {
    const entry = { ...req.body, receivedAt: new Date().toISOString() }
    pushRing(errorLog, entry)
    if (!isProd) console.error('[api/errors]', entry.message ?? entry)
    res.status(204).end()
  })

  app.post('/api/vitals', (req, res) => {
    const entry = { ...req.body, receivedAt: new Date().toISOString() }
    pushRing(vitalsLog, entry)
    if (!isProd) console.debug('[api/vitals]', entry.name, entry.value, entry.rating)
    res.status(204).end()
  })

  app.get('/api/errors/recent', (_req, res) => {
    if (isProd) {
      res.status(404).end()
      return
    }
    res.json({ count: errorLog.length, items: errorLog.slice(-50) })
  })

  app.get('/api/vitals/recent', (_req, res) => {
    if (isProd) {
      res.status(404).end()
      return
    }
    res.json({ count: vitalsLog.length, items: vitalsLog.slice(-50) })
  })

  let vite
  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    })
    app.use(vite.middlewares)
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist/client')))
  }

  app.use('*', async (req, res) => {
    try {
      const url = req.originalUrl

      let template
      let render

      if (!isProd) {
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')
        template = await vite.transformIndexHtml(url, template)
        render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render
      } else {
        template = fs.readFileSync(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8')
        render = (await import('./dist/server/entry-server.js')).render
      }

      const { html: appHtml } = render(url)

      const html = template.replace('<!--ssr-outlet-->', appHtml)
      res.status(200).type('text/html').send(html)
    } catch (e) {
      if (!isProd) {
        vite.ssrFixStacktrace(e as Error)
      }
      console.error(e)
      res.status(500).send('Server error')
    }
  })

  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`SSR server running at http://localhost:${port}`)
  })
}

createServer()
