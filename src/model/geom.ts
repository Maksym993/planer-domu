// Geometria płaska w metrach. Układ modelu: x w głąb działki od granicy frontowej, y wzdłuż niej.

export type Pt = { x: number; y: number }

export const EPS = 1e-6
export const r3 = (v: number) => Math.round(v * 1000) / 1000
export const pt = (x: number, y: number): Pt => ({ x, y })
export const rpt = (p: Pt): Pt => ({ x: r3(p.x), y: r3(p.y) })
export const klucz = (p: Pt) => `${r3(p.x).toFixed(3)},${r3(p.y).toFixed(3)}`
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y })
export const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k })
export const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y
export const cross = (a: Pt, b: Pt) => a.x * b.y - a.y * b.x
export const len = (a: Pt) => Math.hypot(a.x, a.y)
export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)
export const norm = (a: Pt): Pt => {
  const l = len(a)
  return l < EPS ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l }
}
export const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
export const perp = (a: Pt): Pt => ({ x: -a.y, y: a.x })
export const rot = (p: Pt, kat: number, o: Pt = { x: 0, y: 0 }): Pt => {
  const c = Math.cos(kat), s = Math.sin(kat)
  const dx = p.x - o.x, dy = p.y - o.y
  return { x: o.x + dx * c - dy * s, y: o.y + dx * s + dy * c }
}

/** Pole ze znakiem: dodatnie dla wielokąta przeciwnie do ruchu wskazówek zegara. */
export function poleZnak(p: Pt[]): number {
  let s = 0
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length]
    s += a.x * b.y - b.x * a.y
  }
  return s / 2
}
export const pole = (p: Pt[]) => Math.abs(poleZnak(p))
export function obwod(p: Pt[]): number {
  let s = 0
  for (let i = 0; i < p.length; i++) s += dist(p[i], p[(i + 1) % p.length])
  return s
}
export function srodekCiezkosci(p: Pt[]): Pt {
  let a = 0, cx = 0, cy = 0
  for (let i = 0; i < p.length; i++) {
    const p0 = p[i], p1 = p[(i + 1) % p.length]
    const f = p0.x * p1.y - p1.x * p0.y
    a += f; cx += (p0.x + p1.x) * f; cy += (p0.y + p1.y) * f
  }
  if (Math.abs(a) < EPS) return p[0] ?? { x: 0, y: 0 }
  return { x: cx / (3 * a), y: cy / (3 * a) }
}

export function wWielokacie(q: Pt, p: Pt[]): boolean {
  let w = false
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const a = p[i], b = p[j]
    if ((a.y > q.y) !== (b.y > q.y) && q.x < ((b.x - a.x) * (q.y - a.y)) / (b.y - a.y) + a.x) w = !w
  }
  return w
}

/** Rzut punktu na odcinek: parametr t (0..1), punkt i odległość. */
export function rzutNaOdcinek(q: Pt, a: Pt, b: Pt) {
  const ab = sub(b, a)
  const l2 = dot(ab, ab)
  let t = l2 < EPS ? 0 : dot(sub(q, a), ab) / l2
  const tSur = t
  t = Math.max(0, Math.min(1, t))
  const p = lerp(a, b, t)
  return { t, tSur, p, d: dist(q, p) }
}

export function odlegloscOdLamanej(q: Pt, lam: Pt[], zamknieta = false): number {
  let m = Infinity
  const n = zamknieta ? lam.length : lam.length - 1
  for (let i = 0; i < n; i++) m = Math.min(m, rzutNaOdcinek(q, lam[i], lam[(i + 1) % lam.length]).d)
  return m
}

export function odlegloscOdcinkow(a: Pt, b: Pt, c: Pt, d: Pt): number {
  if (przeciecie(a, b, c, d)) return 0
  return Math.min(
    rzutNaOdcinek(a, c, d).d, rzutNaOdcinek(b, c, d).d,
    rzutNaOdcinek(c, a, b).d, rzutNaOdcinek(d, a, b).d,
  )
}

/** Przecięcie odcinków w ich wnętrzach albo końcach. Zwraca punkt i parametry. */
export function przeciecie(a: Pt, b: Pt, c: Pt, d: Pt): { p: Pt; t: number; u: number } | null {
  const r = sub(b, a), s = sub(d, c)
  const den = cross(r, s)
  if (Math.abs(den) < EPS) return null
  const t = cross(sub(c, a), s) / den
  const u = cross(sub(c, a), r) / den
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null
  return { p: lerp(a, b, t), t, u }
}

export function przeciecieProstych(a: Pt, da: Pt, c: Pt, dc: Pt): Pt | null {
  const den = cross(da, dc)
  if (Math.abs(den) < EPS) return null
  const t = cross(sub(c, a), dc) / den
  return add(a, mul(da, t))
}

/** Obcięcie wielokąta wypukłego lub prostego półpłaszczyzną po lewej stronie a->b, odsuniętą o d do środka. */
export function obetnij(poly: Pt[], a: Pt, b: Pt, d = 0): Pt[] {
  const n = norm(perp(sub(b, a)))
  const f = (p: Pt) => dot(sub(p, a), n) - d
  const out: Pt[] = []
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length]
    const fp = f(p), fq = f(q)
    if (fp >= 0) out.push(p)
    if (fp >= 0 !== fq >= 0) out.push(lerp(p, q, fp / (fp - fq)))
  }
  return out
}

/**
 * Odsunięcie krawędzi wielokąta (ccw). d[i] dotyczy krawędzi i -> i+1,
 * wartość dodatnia odsuwa na zewnątrz, ujemna do środka.
 */
export function odsunWielokat(p: Pt[], d: number[] | number): Pt[] {
  const n = p.length
  if (n < 3) return p.slice()
  const dd = (i: number) => (typeof d === 'number' ? d : d[i])
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const pp = p[(i - 1 + n) % n], pc = p[i], pn = p[(i + 1) % n]
    const e0 = norm(sub(pc, pp)), e1 = norm(sub(pn, pc))
    const n0 = { x: e0.y, y: -e0.x }, n1 = { x: e1.y, y: -e1.x }
    const d0 = dd((i - 1 + n) % n), d1 = dd(i)
    const a0 = add(pc, mul(n0, d0)), a1 = add(pc, mul(n1, d1))
    const kr = cross(e0, e1)
    if (Math.abs(kr) < 1e-4) {
      if (dot(e0, e1) < 0) { out.push(a0, a1); continue } // zawrócenie
      if (Math.abs(d0 - d1) < 1e-6) out.push(a0)
      else out.push(a0, a1)
      continue
    }
    const x = przeciecieProstych(a0, e0, a1, e1)
    if (!x || dist(x, pc) > 6 * Math.max(Math.abs(d0), Math.abs(d1), 0.05)) out.push(a0, a1)
    else out.push(x)
  }
  return out
}

/** Usuwa ślepe wypustki (a, b, a) i powtórzone punkty z obiegu ściany. */
export function bezWypustek(p: Pt[]): Pt[] {
  let q = p.slice()
  let zmiana = true
  while (zmiana && q.length > 2) {
    zmiana = false
    for (let i = 0; i < q.length; i++) {
      const a = q[(i - 1 + q.length) % q.length], c = q[(i + 1) % q.length]
      if (dist(a, c) < 1e-4 || dist(q[i], c) < 1e-4) {
        if (dist(a, c) < 1e-4) q.splice(i, 2 > q.length - i ? 1 : 2)
        else q.splice(i, 1)
        zmiana = true
        break
      }
    }
  }
  return q
}

/** Punkt wewnątrz wielokąta najdalszy od krawędzi (z próbkowania), na etykietę. */
export function srodekWizualny(p: Pt[]): Pt {
  const c = srodekCiezkosci(p)
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity
  for (const q of p) { minx = Math.min(minx, q.x); maxx = Math.max(maxx, q.x); miny = Math.min(miny, q.y); maxy = Math.max(maxy, q.y) }
  let best = c, bd = wWielokacie(c, p) ? odlegloscOdLamanej(c, p, true) : -1
  const N = 14
  for (let i = 1; i < N; i++) for (let j = 1; j < N; j++) {
    const q = { x: minx + ((maxx - minx) * i) / N, y: miny + ((maxy - miny) * j) / N }
    if (!wWielokacie(q, p)) continue
    const d = odlegloscOdLamanej(q, p, true)
    if (d > bd * 1.15) { bd = d; best = q }
  }
  return best
}

export function ramka(p: Pt[]) {
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity
  for (const q of p) { minx = Math.min(minx, q.x); maxx = Math.max(maxx, q.x); miny = Math.min(miny, q.y); maxy = Math.max(maxy, q.y) }
  return { minx, maxx, miny, maxy, w: maxx - minx, h: maxy - miny }
}

export const fmtM = (v: number, miejsca = 2) => v.toFixed(miejsca).replace('.', ',')
export const fmtM2 = (v: number, miejsca = 1) => `${v.toFixed(miejsca).replace('.', ',')} m²`
