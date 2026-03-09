import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const port = Number(process.env.PORT || 10000)
const distDir = path.resolve('dist')

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0]
  const cleanPath = urlPath === '/' ? '/index.html' : urlPath
  const targetPath = path.join(distDir, cleanPath)

  try {
    const fileStat = await stat(targetPath)
    if (fileStat.isFile()) {
      const ext = path.extname(targetPath)
      const content = await readFile(targetPath)
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
      res.end(content)
      return
    }
  } catch {
    // SPA fallback
  }

  try {
    const indexFile = await readFile(path.join(distDir, 'index.html'))
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(indexFile)
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Build não encontrado. Execute npm run build antes do start.')
  }
})

server.listen(port, () => {
  console.log(`FFP Web Service rodando na porta ${port}`)
})
