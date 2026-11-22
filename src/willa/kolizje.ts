import { H_TARAS } from './nawierzchnie'
import { BASEN, DOLEK, FL, LACZNIKI, PAWILONY, SCIANY, type Pt } from './uklad'

// Kolizje do spaceru: odcinki ścian (bez przejść, drzwi i szklanych drzwi przesuwnych) i prostokąty mebli.

export type Odcinek = { a: Pt; b: Pt; r: number }
export const ODCINKI: Odcinek[] = []

const PRZECHODNIE = new Set(['drzwi', 'przejscie', 'przesuwne', 'wejscie', 'brama'])
for (const s of SCIANY) {
  const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y
  const L = Math.hypot(dx, dy)
  const d = { x: dx / L, y: dy / L }
  const przerwy = (s.otwory ?? []).filter((o) => PRZECHODNIE.has(o.rodzaj) && (o.parapet ?? 0) < 0.4).map((o) => [o.u - o.szer / 2 + 0.05, o.u + o.szer / 2 - 0.05]).sort((a, b) => a[0] - b[0])
  let u = s.zew ? -s.t / 2 : 0
  const koniec = s.zew ? L + s.t / 2 : L
  const r = s.t / 2 + (s.zew ? 0.06 : 0)
  for (const [p0, p1] of [...przerwy, [koniec, koniec]]) {
    if (p0 > u + 0.02) ODCINKI.push({ a: { x: s.a.x + d.x * u, y: s.a.y + d.y * u }, b: { x: s.a.x + d.x * p0, y: s.a.y + d.y * p0 }, r })
    u = Math.max(u, p1)
  }
}
// Szklane szczyty: ściana z przejściem przez drzwi przesuwne.
for (const p of PAWILONY.filter((q) => q.szklanySzczyt)) {
  const y = p.y0 + 0.24
  const drzwi = p.id === 'C' ? [[9.0, 11.8], [12.84, 14.56]] : [[12.8, 15.4]]
  let x = p.x0
  for (const [a, b] of [...drzwi, [p.x1, p.x1]]) {
    if (a > x) ODCINKI.push({ a: { x, y }, b: { x: a, y }, r: 0.08 })
    x = b
  }
}
// Łączniki: szklane ściany wzdłuż.
for (const l of LACZNIKI) for (const x of [l.x0, l.x1]) ODCINKI.push({ a: { x, y: l.y0 + 0.4 }, b: { x, y: l.y1 - 0.4 }, r: 0.06 })

/** Prostokąty przeszkód: meble, basen, auta. */
const PROST: [number, number, number, number][] = [
  [9.1, 13.7, 56.5, 57.7], // wyspa
  [8.5, 14.96, 58.9, 59.6], // zabudowa
  [8.7, 12.1, 51.75, 52.85], // stół
  [5.82, 6.45, 54.9, 59.5], // winiarnia
  [BASEN.x0, BASEN.x1, BASEN.y0, BASEN.y1],
  [13.2, 15.0, 29.5, 32.8], // łóżko rodziców
  [8.8, 12.0, 102.2, 105.8], // auto w garażu
  [9.3, 13.9, 110.9, 113.5], // Ferrari
  [8.4, 10.2, 97.4, 99.5], // fortepian
]

/** Odpycha punkt od ścian i przeszkód. */
export function rozwiaz(p: Pt, r = 0.28): Pt {
  let q = { ...p }
  for (let it = 0; it < 3; it++) {
    for (const o of ODCINKI) {
      const vx = o.b.x - o.a.x, vy = o.b.y - o.a.y
      const L2 = vx * vx + vy * vy
      const t = Math.max(0, Math.min(1, ((q.x - o.a.x) * vx + (q.y - o.a.y) * vy) / L2))
      const cx = o.a.x + vx * t, cy = o.a.y + vy * t
      const dx = q.x - cx, dy = q.y - cy
      const d = Math.hypot(dx, dy), min = o.r + r
      if (d < min && d > 1e-6) { q = { x: cx + (dx / d) * min, y: cy + (dy / d) * min } }
    }
    for (const [x0, x1, y0, y1] of PROST) {
      const cx = Math.max(x0, Math.min(x1, q.x)), cy = Math.max(y0, Math.min(y1, q.y))
      const dx = q.x - cx, dy = q.y - cy, d = Math.hypot(dx, dy)
      if (d < r) {
        if (d > 1e-6) q = { x: cx + (dx / d) * r, y: cy + (dy / d) * r }
        else q = { x: q.x, y: y1 + r }
      }
    }
  }
  return q
}

const wDomu = (x: number, y: number) =>
  PAWILONY.some((p) => x > p.x0 + 0.3 && x < p.x1 - 0.3 && y > p.y0 + 0.2 && y < p.y1 - 0.2) ||
  LACZNIKI.some((l) => x > l.x0 && x < l.x1 && y > l.y0 - 0.5 && y < l.y1 + 0.5)

/** Wysokość podłogi pod stopami. */
export function podlogaPod(x: number, y: number): number {
  if (x > DOLEK.x0 + 0.95 && x < DOLEK.x1 - 0.95 && y > DOLEK.y0 + 0.2 && y < DOLEK.y1 - 0.95) return FL - DOLEK.gl
  if (wDomu(x, y)) return FL
  // taras basenowy i podesty
  if ((x > 3.3 && x < 11.4 && y > 20.6 && y < 44.2) || (x > 3.3 && x < 5.4 && y > 44 && y < 50.6) || (x > 11.4 && x < 15.4 && y > 41.6 && y < 44.2)) return H_TARAS
  if (x > 11.4 && x < 16.8 && y > 22.7 && y < 26.4) return H_TARAS
  if (x > 3.2 && x < 5.4 && y > 89.7 && y < 92.7) return FL - 0.03
  return 0.02
}
