// Pobiera granice działki z usługi ULDK (GUGiK) i podkłady z geoportalu, zapisuje je do planera.
//
// Z terminala:   npm run dzialka -- "<identyfikator działki>"   (np. 123456_7.0001.123/4, z geoportalu)
//                npm run dzialka -- "<obręb> <numer>"           (nazwa obrębu i numer działki)
//                npm run dzialka -- "<identyfikator>" --bez-map  (same granice, bez podkładów)
//                npm run dzialka -- --przyklad                  (powrót do działki przykładowej)
// Z aplikacji:   zakładka Działka, pole „Twoja działka” (serwer deweloperski woła tę samą funkcję).
//
// Wynik: src/dane/dzialka.json (granice w układzie PL-1992) i public/mapy/*.png, *.jpg.
// Oba miejsca są w .gitignore.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ULDK = 'https://uldk.gugik.gov.pl/'
const WMS = {
  orto: { url: 'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMS/StandardResolution', warstwy: 'Raster', format: 'image/jpeg', plik: 'orto.jpg' },
  ewidencja: { url: 'https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow', warstwy: 'dzialki,numery_dzialek,budynki', format: 'image/png', plik: 'ewidencja.png' },
  mpzp: { url: 'https://mapy.geoportal.gov.pl/wss/ext/KrajowaIntegracjaMiejscowychPlanowZagospodarowaniaPrzestrzennego', warstwy: 'raster,wektor-str,wektor-lzb,wektor-pow,wektor-lin,wektor-pkt,granice', format: 'image/png', plik: 'mpzp.png' },
}

const KORZEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const PLIK_DZIALKI = path.join(KORZEN, 'src', 'dane', 'dzialka.json')
export const KATALOG_MAP = path.join(KORZEN, 'public', 'mapy')

async function uldk(zapytanie) {
  const url = `${ULDK}?${new URLSearchParams(zapytanie)}`
  const r = await fetch(url, { headers: { 'user-agent': 'planer-domu' } })
  if (!r.ok) throw new Error(`ULDK odpowiada kodem ${r.status}`)
  const wiersze = (await r.text()).trim().split('\n').map((w) => w.trim()).filter(Boolean)
  const stan = wiersze.shift() ?? ''
  if (stan.startsWith('-1')) throw new Error(`ULDK: ${stan.replace(/^-1\s*/, '') || 'nie znaleziono działki'}`)
  return wiersze.map((w) => w.split('|'))
}

/** Szuka działki po pełnym identyfikatorze albo po „obręb numer”. Zwraca listę trafień. */
export async function szukaj(tekst) {
  const id = String(tekst ?? '').trim()
  if (!id) throw new Error('Wpisz identyfikator działki z geoportalu (np. 123456_7.0001.123/4) albo nazwę obrębu i numer działki.')
  const pola = ['id', 'voivodeship', 'county', 'commune', 'region', 'parcel']
  const wyniki = await uldk({ request: 'GetParcelByIdOrNr', id, result: pola.join(','), srid: '2180' })
  return wyniki.map((w) => Object.fromEntries(pola.map((p, i) => [p, (w[i] ?? '').trim()])))
}

function pierscien(wkt) {
  const m = /\(\(([^()]+)\)/.exec(wkt)
  if (!m) throw new Error('ULDK zwróciło geometrię w nieznanym formacie')
  const pkt = m[1].split(',').map((p) => p.trim().split(/\s+/).map(Number))
  const [a, z] = [pkt[0], pkt[pkt.length - 1]]
  if (a[0] === z[0] && a[1] === z[1]) pkt.pop()
  return pkt
}
const poleZnak = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1] }, 0) / 2
const dl = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1])

/** Upraszcza granicę: usuwa wierzchołki leżące prawie na prostej (ULDK bywa gęste na łukach). */
function uprosc(p, tol = 0.05) {
  let zm = true
  while (zm && p.length > 3) {
    zm = false
    for (let i = 0; i < p.length; i++) {
      const a = p[(i - 1 + p.length) % p.length], b = p[i], c = p[(i + 1) % p.length]
      const odl = Math.abs((c[0] - a[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (c[1] - a[1])) / (dl(a, c) || 1)
      if (odl < tol) { p.splice(i, 1); zm = true; break }
    }
  }
  return p
}

async function obraz(nazwa, bbox, rozmiar, cel) {
  const w = WMS[nazwa]
  const q = new URLSearchParams({
    SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.1.1', LAYERS: w.warstwy, STYLES: '', FORMAT: w.format,
    TRANSPARENT: w.format === 'image/png' ? 'TRUE' : 'FALSE', SRS: 'EPSG:2180', BBOX: bbox.join(','), WIDTH: String(rozmiar), HEIGHT: String(rozmiar),
  })
  const r = await fetch(`${w.url}?${q}`, { headers: { 'user-agent': 'planer-domu' }, redirect: 'follow' })
  const typ = r.headers.get('content-type') ?? ''
  if (!r.ok || !typ.startsWith('image/')) throw new Error(`${nazwa}: ${r.status} ${typ}`)
  fs.writeFileSync(path.join(cel, w.plik), Buffer.from(await r.arrayBuffer()))
}

/**
 * Pobiera działkę i zapisuje src/dane/dzialka.json (oraz podkłady, gdy mapy = true).
 * front: numer krawędzi (od 0), która ma być granicą frontową (oś y modelu). Domyślnie najdłuższa.
 */
export async function pobierzDzialke(tekst, { mapy = true, front = null, log = () => {} } = {}) {
  const trafienia = await szukaj(tekst)
  if (!trafienia.length) throw new Error('ULDK nie znalazło takiej działki. Sprawdź identyfikator w geoportalu (geoportal.gov.pl, kliknij działkę).')
  if (trafienia.length > 1) {
    const e = new Error(`Pasuje ${trafienia.length} działek. Wpisz pełny identyfikator jednej z nich.`)
    e.trafienia = trafienia
    throw e
  }
  const t = trafienia[0]
  log(`Działka ${t.id}: pobieram granice z ULDK`)
  const [[wkt]] = await uldk({ request: 'GetParcelById', id: t.id, result: 'geom_wkt', srid: '2180' })
  const [[wkt84]] = await uldk({ request: 'GetParcelById', id: t.id, result: 'geom_wkt', srid: '4326' })
  let p = uprosc(pierscien(wkt))
  if (poleZnak(p) < 0) p.reverse()
  // Granica frontowa to krawędź od ostatniego wierzchołka do pierwszego.
  const n = p.length
  const k = front != null ? ((front % n) + n) % n : p.map((a, i) => dl(a, p[(i + 1) % n])).reduce((m, d, i, all) => (d > all[m] ? i : m), 0)
  p = [...p.slice(k + 1), ...p.slice(0, k + 1)]
  const g84 = pierscien(wkt84)
  const lon = g84.reduce((s, q) => s + q[0], 0) / g84.length, lat = g84.reduce((s, q) => s + q[1], 0) / g84.length

  const obreb = t.region.replace(/^\s*\d+\s*-?\s*/, '').trim()
  const numer = t.parcel || t.id.split('.').pop()
  const dane = {
    przyklad: false,
    nazwa: `Działka ${numer}${obreb ? `, obręb ${obreb}` : ''}`,
    identyfikator: t.id,
    numer,
    obreb,
    gmina: t.commune,
    powiat: t.county,
    wojewodztwo: t.voivodeship,
    powEwidencyjna: null,
    teren: '',
    szerokoscGeo: Math.round(lat * 1e4) / 1e4,
    dlugoscGeo: Math.round(lon * 1e4) / 1e4,
    uklad: 'PL-1992',
    wierzcholki: p.map(([e, nn]) => [Math.round(e * 1000) / 1000, Math.round(nn * 1000) / 1000]),
    krawedzie: p.map((a, i) => ({ nazwa: `granica ${i + 1}`, typ: 'sasiad', liniaZabudowy: null })),
    pasDrogi: null,
    minBezOtworow: 3,
    podklad: null,
    plan: {
      maxZabudowy: null, minBioCzynna: null, minIntensywnosc: null, maxIntensywnosc: null, maxWysokosc: null, maxKatDachu: null, maxKondygnacji: null, dachSpadzisty: false,
      opis: ['Wpisz tu ustalenia ze swojego planu miejscowego albo z decyzji o warunkach zabudowy (pole plan.opis w src/dane/dzialka.json).'],
      zrodlo: 'Granice: ULDK (GUGiK), dane ewidencyjne. Do projektu budowlanego potrzebna jest mapa do celów projektowych od geodety.',
    },
  }
  // Zachowaj to, co użytkownik wpisał wcześniej dla tej samej działki (opisy granic, linie zabudowy, plan).
  if (fs.existsSync(PLIK_DZIALKI)) {
    try {
      const stare = JSON.parse(fs.readFileSync(PLIK_DZIALKI, 'utf8'))
      if (stare.identyfikator === dane.identyfikator && stare.wierzcholki?.length === dane.wierzcholki.length && front == null) {
        Object.assign(dane, { krawedzie: stare.krawedzie, wierzcholki: stare.wierzcholki, plan: stare.plan, teren: stare.teren, powEwidencyjna: stare.powEwidencyjna, pasDrogi: stare.pasDrogi, minBezOtworow: stare.minBezOtworow })
      }
    } catch { /* uszkodzony plik: zapisujemy od nowa */ }
  }

  if (mapy) {
    const es = dane.wierzcholki.map((q) => q[0]), ns = dane.wierzcholki.map((q) => q[1])
    const cx = (Math.min(...es) + Math.max(...es)) / 2, cy = (Math.min(...ns) + Math.max(...ns)) / 2
    const bok = Math.ceil(Math.max(Math.max(...es) - Math.min(...es), Math.max(...ns) - Math.min(...ns)) + 160)
    const pxNaM = Math.min(10, Math.floor((3000 / bok) * 10) / 10)
    const rozmiar = Math.round(bok * pxNaM)
    const e0 = Math.round(cx - bok / 2), n1 = Math.round(cy + bok / 2)
    const bbox = [e0, n1 - rozmiar / pxNaM, e0 + rozmiar / pxNaM, n1]
    fs.mkdirSync(KATALOG_MAP, { recursive: true })
    const jest = {}
    for (const nazwa of ['orto', 'ewidencja', 'mpzp']) {
      log(`Pobieram podkład: ${nazwa}`)
      try { await obraz(nazwa, bbox, rozmiar, KATALOG_MAP); jest[nazwa] = true } catch (e) { jest[nazwa] = false; log(`  bez podkładu ${nazwa}: ${e.message}`) }
    }
    dane.podklad = { e0, n1, pxNaM, rozmiar, orto: !!jest.orto, mpzp: !!jest.mpzp, ewidencja: !!jest.ewidencja }
  }

  fs.mkdirSync(path.dirname(PLIK_DZIALKI), { recursive: true })
  fs.writeFileSync(`${PLIK_DZIALKI}.tmp`, JSON.stringify(dane, null, 2) + '\n')
  fs.renameSync(`${PLIK_DZIALKI}.tmp`, PLIK_DZIALKI)
  log(`Zapisano ${path.relative(KORZEN, PLIK_DZIALKI)}: ${dane.wierzcholki.length} wierzchołków, ${Math.round(Math.abs(poleZnak(dane.wierzcholki)))} m²`)
  return dane
}

/** Wraca do działki przykładowej: usuwa src/dane/dzialka.json i pobrane podkłady. */
export function usunWlasnaDzialke() {
  fs.rmSync(PLIK_DZIALKI, { force: true })
  for (const n of Object.values(WMS)) fs.rmSync(path.join(KATALOG_MAP, n.plik), { force: true })
}

// Uruchomienie z terminala.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv.slice(2)
  const tekst = arg.filter((a) => !a.startsWith('--')).join(' ')
  const frontArg = arg.find((a) => a.startsWith('--front='))
  if (arg.includes('--przyklad')) {
    usunWlasnaDzialke()
    console.log('Usunięto src/dane/dzialka.json, planer pokazuje działkę przykładową.')
  } else {
    pobierzDzialke(tekst, { mapy: !arg.includes('--bez-map'), front: frontArg ? Number(frontArg.split('=')[1]) - 1 : null, log: (t) => console.log(t) })
      .then(() => console.log('Gotowe. Uruchom albo odśwież planer: npm run dev'))
      .catch((e) => {
        console.error(e.message)
        if (e.trafienia) for (const t of e.trafienia) console.error(`  ${t.id}  ${t.region}, ${t.commune}`)
        process.exit(1)
      })
  }
}
