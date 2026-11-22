import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore: moduł JS bez typów
import { PLIK_DZIALKI, pobierzDzialke, usunWlasnaDzialke } from './narzedzia/dzialka.mjs'

/**
 * Zapis projektów na dysku, w katalogu zapis/. Dzięki temu ten sam adres pokazuje ten sam projekt
 * w każdej przeglądarce, a nie tylko w tej, w której powstał.
 */
function zapisProjektow(): Plugin {
  const katalog = path.resolve(__dirname, 'zapis')
  return {
    name: 'zapis-projektow',
    configureServer(server) {
      server.middlewares.use('/api/projekt', (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const nazwa = (url.searchParams.get('nazwa') ?? '').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'glowny'
        const plik = path.join(katalog, `${nazwa}.json`)
        if (req.method === 'GET') {
          if (!fs.existsSync(plik)) { res.setHeader('content-type', 'application/json'); res.end('null'); return }
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.setHeader('cache-control', 'no-store')
          res.end(fs.readFileSync(plik))
          return
        }
        if (req.method === 'PUT') {
          let tresc = ''
          req.on('data', (c) => { tresc += c })
          req.on('end', () => {
            try {
              const d = JSON.parse(tresc)
              if (typeof d.zapisano !== 'number' || !d.projekt) throw new Error('zły zapis')
              fs.mkdirSync(katalog, { recursive: true })
              // Zapis przez plik tymczasowy, żeby przerwany zapis nie zostawił uszkodzonego projektu.
              fs.writeFileSync(`${plik}.tmp`, tresc)
              fs.renameSync(`${plik}.tmp`, plik)
              res.end('ok')
            } catch { res.statusCode = 400; res.end() }
          })
          return
        }
        res.statusCode = 405
        res.end()
      })
    },
  }
}

/**
 * Działka użytkownika: pobranie granic z ULDK, zapis opisu granic, powrót do działki przykładowej.
 * Dane lądują w src/dane/dzialka.json, a strona przeładowuje się sama.
 */
function dzialka(): Plugin {
  const odswiez = (server: ViteDevServer) => {
    const m = server.moduleGraph.getModulesByFile(path.resolve(__dirname, 'src/dane/dzialka.ts'))
    m?.forEach((x) => server.moduleGraph.invalidateModule(x))
    server.ws.send({ type: 'full-reload' })
  }
  const odpowiedz = (res: any, kod: number, dane: unknown) => {
    res.statusCode = kod
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(dane))
  }
  return {
    name: 'dzialka',
    configureServer(server) {
      server.middlewares.use('/api/dzialka', (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        if (req.method === 'POST') {
          pobierzDzialke(url.searchParams.get('id') ?? '', { mapy: url.searchParams.get('mapy') !== '0' })
            .then((d: unknown) => { odpowiedz(res, 200, { ok: true, dzialka: d }); setTimeout(() => odswiez(server), 50) })
            .catch((e: any) => odpowiedz(res, 400, { ok: false, blad: e.message, trafienia: e.trafienia ?? [] }))
          return
        }
        if (req.method === 'PUT') {
          let tresc = ''
          req.on('data', (c) => { tresc += c })
          req.on('end', () => {
            try {
              const d = JSON.parse(tresc)
              if (!Array.isArray(d.wierzcholki) || d.wierzcholki.length < 3 || !Array.isArray(d.krawedzie)) throw new Error('zła działka')
              fs.writeFileSync(`${PLIK_DZIALKI}.tmp`, JSON.stringify(d, null, 2) + '\n')
              fs.renameSync(`${PLIK_DZIALKI}.tmp`, PLIK_DZIALKI)
              odpowiedz(res, 200, { ok: true })
              setTimeout(() => odswiez(server), 50)
            } catch (e: any) { odpowiedz(res, 400, { ok: false, blad: e.message }) }
          })
          return
        }
        if (req.method === 'DELETE') {
          usunWlasnaDzialke()
          odpowiedz(res, 200, { ok: true })
          setTimeout(() => odswiez(server), 50)
          return
        }
        res.statusCode = 405
        res.end()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), zapisProjektow(), dzialka()],
  server: { port: 5183, strictPort: true, host: '127.0.0.1' },
})
