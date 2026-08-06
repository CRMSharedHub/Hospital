import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createServer as createViteServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProd = process.env.NODE_ENV === 'production'

async function createServer() {
  const app = express()

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'hospital',
      mode: isProd ? 'production' : 'development',
      timestamp: new Date().toISOString(),
    })
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
