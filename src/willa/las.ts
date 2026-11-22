// Las wokół działki: kępy sosen i drzew liściastych rozstawione z szumu, poza działką i poza drogami.
// Wynik: [x, y, rodzaj] w układzie modelu, rodzaj 1 to sosna, 0 to drzewo liściaste.

import { GRANICA, KRAWEDZIE } from '../dane/dzialka'
import { odlegloscOdLamanej, rzutNaOdcinek, wWielokacie } from '../model/geom'
import { losowa } from './drzewa'

/** Gładki szum wartości na siatce co `krok` metrów, deterministyczny. */
function szum(ziarno: number, krok: number) {
  const h = (i: number, j: number) => {
    let x = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(ziarno, 2147483647)
    x = Math.imul(x ^ (x >>> 13), 1274126177)
    return ((x ^ (x >>> 16)) >>> 0) / 4294967295
  }
  const g = (t: number) => t * t * (3 - 2 * t)
  return (x: number, y: number) => {
    const fx = x / krok, fy = y / krok
    const i = Math.floor(fx), j = Math.floor(fy)
    const u = g(fx - i), v = g(fy - j)
    const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
}

export function lasWokolDzialki(): [number, number, number][] {
  const rnd = losowa(4242)
  const kepy = szum(7, 38), rodzaj = szum(11, 55)
  const xs = GRANICA.map((p) => p.x), ys = GRANICA.map((p) => p.y)
  const x0 = Math.min(...xs) - 115, x1 = Math.max(...xs) + 115, y0 = Math.min(...ys) - 115, y1 = Math.max(...ys) + 115
  const drogi = KRAWEDZIE.filter((k) => k.typ === 'droga')
  const out: [number, number, number][] = []
  const krok = 5.2
  for (let y = y0; y < y1; y += krok) {
    for (let x = x0; x < x1; x += krok) {
      const q = { x: x + (rnd() - 0.5) * krok * 0.8, y: y + (rnd() - 0.5) * krok * 0.8 }
      if (wWielokacie(q, GRANICA)) continue
      const d = odlegloscOdLamanej(q, GRANICA, true)
      if (d < 16 || d > 110) continue
      // Wzdłuż dróg zostaje wolny pas (droga i pobocze), także na przedłużeniu drogi.
      if (drogi.some((k) => {
        const kier = { x: k.b.x - k.a.x, y: k.b.y - k.a.y }, l = Math.hypot(kier.x, kier.y)
        const a = { x: k.a.x - (kier.x / l) * 120, y: k.a.y - (kier.y / l) * 120 }, b = { x: k.b.x + (kier.x / l) * 120, y: k.b.y + (kier.y / l) * 120 }
        return rzutNaOdcinek(q, a, b).d < (k.szerokosc ?? 10) + 12
      })) continue
      if (kepy(q.x, q.y) < 0.52) continue
      out.push([Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10, rodzaj(q.x, q.y) > 0.45 ? 1 : 0])
    }
  }
  return out
}
