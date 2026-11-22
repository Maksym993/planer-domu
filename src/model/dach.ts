// Dach: albo liczony sam z obrysu ostatniej kondygnacji, albo złożony z części ułożonych ręcznie.

import { Pt, dist, ramka, rot, sub, wWielokacie } from './geom'
import type { Uklad } from './topologia'
import type { CzescDachu, Dach, Projekt, RodzajDachu, Wykonczenie } from './typy'
import { noweId } from './typy'

export type ProstokatDachu = {
  /** Środek prostokąta w układzie modelu. */
  cx: number
  cy: number
  /** Wymiar wzdłuż kalenicy i rozpiętość w poprzek. */
  dl: number
  rozp: number
  /** Kąt osi kalenicy względem osi x modelu (radiany). */
  kat: number
  /** Wysokość kalenicy ponad podstawę dachu. */
  wys: number
  rodzaj: RodzajDachu
  /** Nachylenie połaci w stopniach. */
  katPolaci: number
  okap: number
}

export type ElementDachu = {
  pr: ProstokatDachu
  /** Wysokość podstawy dachu nad terenem. */
  baza: number
  kolankowa: number
  czescId: string | null
  szklaneSzczyty: boolean
  elewacja: string | null
  wykonczenie: Wykonczenie | null
}

type Ust = { rodzaj: RodzajDachu; kat: number; okap: number; kalenicaPoprzecznie: boolean; odwroc?: boolean }
type Prost = { x0: number; x1: number; y0: number; y1: number }

const TOL = 0.03

function siatka(wielokaty: Pt[][], wyklucz: Pt[][]) {
  const wszystkie = [...wielokaty, ...wyklucz].flat()
  for (const p of [...wielokaty, ...wyklucz]) for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length]
    if (Math.abs(a.x - b.x) > TOL && Math.abs(a.y - b.y) > TOL) return null
  }
  const uniq = (v: number[]) => {
    const s = v.slice().sort((a, b) => a - b)
    const o: number[] = []
    for (const x of s) if (!o.length || x - o[o.length - 1] > TOL) o.push(x)
    return o
  }
  const xs = uniq(wszystkie.map((q) => q.x)), ys = uniq(wszystkie.map((q) => q.y))
  const nx = xs.length - 1, ny = ys.length - 1
  if (nx < 1 || ny < 1 || nx > 28 || ny > 28) return null
  const w: boolean[][] = []
  for (let i = 0; i < nx; i++) {
    w.push([])
    for (let j = 0; j < ny; j++) {
      const c = { x: (xs[i] + xs[i + 1]) / 2, y: (ys[j] + ys[j + 1]) / 2 }
      w[i].push(wielokaty.some((p) => wWielokacie(c, p)) && !wyklucz.some((p) => wWielokacie(c, p)))
    }
  }
  return { xs, ys, nx, ny, w }
}

function pelny(w: boolean[][], nx: number, ny: number, i0: number, i1: number, j0: number, j1: number) {
  if (i0 < 0 || j0 < 0 || i1 > nx || j1 > ny) return false
  for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) if (!w[i][j]) return false
  return true
}

/** Prostokąty maksymalne, mogą na siebie zachodzić (dobre dla dachu jednego rodzaju). */
function prostokatyMaksymalne(p: Pt[]): Prost[] | null {
  const s = siatka([p], [])
  if (!s) return null
  const { xs, ys, nx, ny, w } = s
  const out: Prost[] = []
  for (let i0 = 0; i0 < nx; i0++) for (let i1 = i0 + 1; i1 <= nx; i1++) for (let j0 = 0; j0 < ny; j0++) for (let j1 = j0 + 1; j1 <= ny; j1++) {
    if (!pelny(w, nx, ny, i0, i1, j0, j1)) continue
    if (pelny(w, nx, ny, i0 - 1, i0, j0, j1) || pelny(w, nx, ny, i1, i1 + 1, j0, j1) || pelny(w, nx, ny, i0, i1, j0 - 1, j0) || pelny(w, nx, ny, i0, i1, j1, j1 + 1)) continue
    out.push({ x0: xs[i0], x1: xs[i1], y0: ys[j0], y1: ys[j1] })
  }
  return out.length ? out : null
}

/** Podział na prostokąty, które na siebie nie zachodzą: od największego. */
function prostokatyRozlaczne(wielokaty: Pt[][], wyklucz: Pt[][]): Prost[] | null {
  const s = siatka(wielokaty, wyklucz)
  if (!s) return null
  const { xs, ys, nx, ny, w } = s
  const out: Prost[] = []
  for (let bezp = 0; bezp < 40; bezp++) {
    let naj: { i0: number; i1: number; j0: number; j1: number; a: number } | null = null
    for (let i0 = 0; i0 < nx; i0++) for (let i1 = i0 + 1; i1 <= nx; i1++) for (let j0 = 0; j0 < ny; j0++) for (let j1 = j0 + 1; j1 <= ny; j1++) {
      const a = (xs[i1] - xs[i0]) * (ys[j1] - ys[j0])
      if (naj && a <= naj.a) continue
      if (pelny(w, nx, ny, i0, i1, j0, j1)) naj = { i0, i1, j0, j1, a }
    }
    if (!naj || naj.a < 0.5) break
    out.push({ x0: xs[naj.i0], x1: xs[naj.i1], y0: ys[naj.j0], y1: ys[naj.j1] })
    for (let i = naj.i0; i < naj.i1; i++) for (let j = naj.j0; j < naj.j1; j++) w[i][j] = false
  }
  return out
}

/** Kierunek najdłuższej krawędzi obrysu: oś budynku. */
function osBudynku(obrys: Pt[]): number {
  let naj = 0, fi = 0
  for (let i = 0; i < obrys.length; i++) {
    const a = obrys[i], b = obrys[(i + 1) % obrys.length]
    const d = dist(a, b)
    if (d > naj) { naj = d; const v = sub(b, a); fi = Math.atan2(v.y, v.x) }
  }
  // Kąt sprowadzony do przedziału (-45°, 45°], żeby boki części zgadzały się z osiami rzutu.
  while (fi > Math.PI / 4) fi -= Math.PI / 2
  while (fi <= -Math.PI / 4) fi += Math.PI / 2
  return fi
}

export function wysokoscPolaci(rodzaj: RodzajDachu, rozp: number, kat: number): number {
  const tg = Math.tan((kat * Math.PI) / 180)
  // Dach płaski: płyta 20 cm i attyka 35 cm z obróbką.
  return rodzaj === 'plaski' ? 0.57 : rodzaj === 'jednospadowy' ? rozp * tg : (rozp / 2) * tg
}

function zProstokata(cx: number, cy: number, w: number, h: number, fi: number, u: Ust, wolnoObrocic: boolean): ProstokatDachu {
  let wzdluzX = w >= h
  if (u.kalenicaPoprzecznie && wolnoObrocic) wzdluzX = !wzdluzX
  const dl = wzdluzX ? w : h, rozp = wzdluzX ? h : w
  return {
    cx, cy, dl, rozp, kat: fi + (wzdluzX ? 0 : Math.PI / 2) + (u.odwroc ? Math.PI : 0),
    wys: wysokoscPolaci(u.rodzaj, rozp, u.kat), rodzaj: u.rodzaj, katPolaci: u.kat, okap: u.okap,
  }
}

/** Dach liczony sam: jeden rodzaj na całym obrysie. */
export function prostokatyDachu(obrys: Pt[], dach: Dach): ProstokatDachu[] {
  if (obrys.length < 3) return []
  const fi = osBudynku(obrys)
  const lok = obrys.map((q) => rot(q, -fi))
  const r = prostokatyMaksymalne(lok) ?? [(() => { const f = ramka(lok); return { x0: f.minx, x1: f.maxx, y0: f.miny, y1: f.maxy } })()]
  return r.map((q) => {
    const c = rot({ x: (q.x0 + q.x1) / 2, y: (q.y0 + q.y1) / 2 }, fi)
    return zProstokata(c.x, c.y, q.x1 - q.x0, q.y1 - q.y0, fi, dach, r.length === 1)
  })
}

export function prostokatCzesci(c: CzescDachu): ProstokatDachu {
  return zProstokata(c.x, c.y, c.szer, c.gl, (c.obrot * Math.PI) / 180, c, true)
}

export function poziomyKondygnacji(p: Projekt): number[] {
  const out: number[] = []
  let z = p.ustawienia.poziomParteru
  for (const k of p.kondygnacje) { out.push(z); z += k.wysokosc + k.strop }
  return out
}

/** Najwyższa kondygnacja, której obrys przykrywa punkt. */
function kondygnacjaNad(q: Pt, uklady: Uklad[]): number {
  for (let i = uklady.length - 1; i >= 0; i--) if (uklady[i].obrysy.some((o) => wWielokacie(q, o.zewn))) return i
  return -1
}

/** Poddasze użytkowe działa, gdy nad ostatnią kondygnacją jest jeden dach, a nie kilka części. */
export const poddaszeCzynne = (p: Projekt) => p.dach.poddasze && p.kondygnacje.length > 1 && p.dach.czesci.length <= 1

export function elementyDachu(p: Projekt, uklady: Uklad[]): ElementDachu[] {
  const n = p.kondygnacje.length
  const ost = n - 1
  const poziomy = poziomyKondygnacji(p)
  const gora = (i: number) => poziomy[i] + p.kondygnacje[i].wysokosc + p.kondygnacje[i].strop
  const poddasze = poddaszeCzynne(p)
  if (p.dach.czesci.length) {
    return p.dach.czesci.map((c) => {
      let i = kondygnacjaNad({ x: c.x, y: c.y }, uklady)
      if (i < 0) i = ost
      const baza = (poddasze && i === ost ? poziomy[ost] : gora(i)) + c.kolankowa
      return { pr: prostokatCzesci(c), baza, kolankowa: c.kolankowa, czescId: c.id, szklaneSzczyty: !!c.szklaneSzczyty, elewacja: c.elewacja ?? null, wykonczenie: c.wykonczenie ?? null }
    })
  }
  const baza = (poddasze ? poziomy[ost] : gora(ost)) + p.dach.kolankowa
  return (uklady[ost]?.obrysy ?? []).flatMap((o) => prostokatyDachu(o.zewn, p.dach).map((pr) => ({ pr, baza, kolankowa: p.dach.kolankowa, czescId: null, szklaneSzczyty: false, elewacja: null, wykonczenie: null })))
}

/** Zamienia dach liczony sam na części: osobno ostatnia kondygnacja i odkryte fragmenty niższych. */
export function podzielDach(p: Projekt, uklady: Uklad[]): CzescDachu[] {
  const out: CzescDachu[] = []
  const d = p.dach
  const r3 = (v: number) => Math.round(v * 1000) / 1000
  for (let i = uklady.length - 1; i >= 0; i--) {
    const obrysy = uklady[i].obrysy.map((o) => o.zewn)
    if (!obrysy.length) continue
    const wyzej = uklady.slice(i + 1).flatMap((u) => u.obrysy.map((o) => o.zewn))
    const fi = osBudynku(obrysy[0])
    const lok = (w: Pt[][]) => w.map((q) => q.map((r) => rot(r, -fi)))
    let pr = prostokatyRozlaczne(lok(obrysy), lok(wyzej))
    if (!pr) {
      if (wyzej.length) continue
      pr = lok(obrysy).map((q) => { const f = ramka(q); return { x0: f.minx, x1: f.maxx, y0: f.miny, y1: f.maxy } })
    }
    for (const q of pr) {
      const c = rot({ x: (q.x0 + q.x1) / 2, y: (q.y0 + q.y1) / 2 }, fi)
      out.push({
        id: noweId('d'), x: r3(c.x), y: r3(c.y), szer: r3(q.x1 - q.x0), gl: r3(q.y1 - q.y0), obrot: r3((fi * 180) / Math.PI),
        rodzaj: d.rodzaj, kat: d.kat, okap: d.okap, kalenicaPoprzecznie: pr.length === 1 ? d.kalenicaPoprzecznie : false, odwroc: false,
        kolankowa: i === uklady.length - 1 ? d.kolankowa : 0,
      })
    }
  }
  return out
}

export const wysokoscDachu = (pr: ProstokatDachu[]) => pr.reduce((m, p) => Math.max(m, p.wys), 0)
