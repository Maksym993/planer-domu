import * as THREE from 'three'
import { Budowa } from './budowa'
import {
  DOLEK, FL, LACZNIKI, OKL, PAWILONY, POMIESZCZENIA, SCIANY, SZ, T_DACH, T_ZEW,
  dachGora, sufit, srodekX, type Otwor, type Pawilon, type Pt, type Sciana,
} from './uklad'

const rad = (d: number) => (d * Math.PI) / 180
const V = (x: number, h: number, y: number) => new THREE.Vector3(x, h, -y)
const paw = (id?: string) => PAWILONY.find((p) => p.id === id)

/** Kawałki ściany bez otworów: wielokąty (u, v) w płaszczyźnie ściany. */
function kawalkiSciany(L: number, e0: number, e1: number, dol: number, gora: (u: number) => number, lamanie: number[], otw: { u0: number; u1: number; v0: number; v1: number }[]) {
  const wynik: [number, number][][] = []
  const pasek = (ua: number, ub: number, vd: number, gorna: ((u: number) => number) | number) => {
    if (ub - ua < 1e-4) return
    const g = typeof gorna === 'number' ? () => gorna : gorna
    const pts: [number, number][] = [[ua, vd], [ub, vd], [ub, g(ub)]]
    if (typeof gorna !== 'number') for (const u of lamanie.filter((q) => q > ua + 1e-4 && q < ub - 1e-4).sort((a, b) => b - a)) pts.push([u, g(u)])
    pts.push([ua, g(ua)])
    if (pts.some((p, i) => i > 1 && p[1] <= vd + 1e-4)) return
    wynik.push(pts)
  }
  const o = otw.slice().sort((a, b) => a.u0 - b.u0)
  let u = -e0
  for (const w of o) {
    const a = Math.max(-e0, w.u0), b = Math.min(L + e1, w.u1)
    pasek(u, a, dol, gora)
    if (w.v0 > dol + 1e-3) pasek(a, b, dol, w.v0)
    // nadproże: od góry otworu do profilu ściany
    if (b - a > 1e-4) {
      const pts: [number, number][] = [[a, w.v1], [b, w.v1], [b, gora(b)]]
      for (const q of lamanie.filter((q) => q > a + 1e-4 && q < b - 1e-4).sort((x, y) => y - x)) pts.push([q, gora(q)])
      pts.push([a, gora(a)])
      if (gora(a) > w.v1 + 1e-3 && gora(b) > w.v1 + 1e-3) wynik.push(pts)
    }
    u = Math.max(u, b)
  }
  pasek(u, L + e1, dol, gora)
  return wynik
}

type Geo = { L: number; d: Pt; n: Pt; pt: (u: number, off?: number) => Pt }
function geoSciany(s: { a: Pt; b: Pt }): Geo {
  const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y
  const L = Math.hypot(dx, dy)
  const d = { x: dx / L, y: dy / L }
  const n = { x: -d.y, y: d.x } // lewa normalna
  return { L, d, n, pt: (u, off = 0) => ({ x: s.a.x + d.x * u + n.x * off, y: s.a.y + d.y * u + n.y * off }) }
}

/** Profil górnej krawędzi ściany pod dachem pawilonu: wysokość w funkcji u i punkty załamania (kalenica). */
function profilGory(s: { a: Pt; b: Pt }, p: Pawilon | undefined, h: number | undefined, przes: number, fn: (p: Pawilon, x: number) => number) {
  const g = geoSciany(s)
  if (!p || h != null) return { gora: () => FL + (h ?? 3), lamanie: [] as number[] }
  const xm = srodekX(p)
  const lamanie: number[] = []
  if (Math.abs(g.d.x) > 1e-6) {
    const u = (xm - s.a.x) / g.d.x
    if (u > -1 && u < g.L + 1) lamanie.push(u)
  }
  return { gora: (u: number) => FL + fn(p, g.pt(u, przes).x), lamanie }
}

function otworyWU(s: Sciana) {
  return (s.otwory ?? []).map((o) => ({ o, u0: o.u - o.szer / 2, u1: o.u + o.szer / 2, v0: FL + (o.parapet ?? 0), v1: FL + (o.parapet ?? 0) + o.wys }))
}

export type Ruchome = {
  bramy: { x: number; y: number; szer: number; wys: number }[]
  drzwiWejsciowe: { x: number; y: number; szer: number; wys: number }
}

/** Buduje całą bryłę domu: ściany, okna, dachy, sufity, podłogi, łączniki. */
export function budujDom(b: Budowa, sz: Budowa) {
  for (const p of PAWILONY) pawilon(b, sz, p)
  for (const s of SCIANY) sciana(b, sz, s)
  for (const l of LACZNIKI) lacznik(b, sz, l)
  podlogi(b)
}

// ---------------- Pawilon: cokół, okładzina, dach, sufit z lamel, szklany szczyt ----------------
function pawilon(b: Budowa, sz: Budowa, p: Pawilon) {
  const xm = srodekX(p)
  const phi = rad(p.kat)
  const xa = p.x0 + OKL, xb = p.x1 - OKL
  const ya = p.wysY0 > 0 ? p.y0 - p.wysY0 : p.y0 + OKL
  const yb = p.wysY1 > 0 ? p.y1 + p.wysY1 : p.y1 - OKL
  const g = (x: number) => FL + dachGora(p, x)
  const s = (x: number) => FL + sufit(p, x)

  // Konstrukcja podłogi i cokół: ciemny pas w cieniu pod lamelami.
  // Płyta konstrukcyjna z otworem na dołek rozmów (22.11.2026: cała płyta zalewała dołek betonem prawie do poziomu podłogi,
  // więc z salonu widać było same oparcia sofy i szary blok zamiast siedzisk).
  {
    const X0 = p.x0 + OKL, X1 = p.x1 - OKL, Y0 = p.y0 + OKL, Y1 = p.y1 - OKL, D = DOLEK
    const wDolku = D.x0 >= X0 && D.x1 <= X1 && D.y0 >= Y0 && D.y1 <= Y1
    if (!wDolku) b.pudlo('beton_gar', X0, X1, Y0, Y1, FL - 0.32, FL - 0.02)
    else {
      b.pudlo('beton_gar', X0, D.x0 - 0.02, Y0, Y1, FL - 0.32, FL - 0.02)
      b.pudlo('beton_gar', D.x1 + 0.02, X1, Y0, Y1, FL - 0.32, FL - 0.02)
      b.pudlo('beton_gar', D.x0 - 0.02, D.x1 + 0.02, Y0, D.y0 - 0.02, FL - 0.32, FL - 0.02)
      b.pudlo('beton_gar', D.x0 - 0.02, D.x1 + 0.02, D.y1 + 0.02, Y1, FL - 0.32, FL - 0.02)
    }
  }
  const c = 0.035
  b.pudlo('lakier_grafit', p.x0 + c, p.x1 - c, p.y0 + c, p.y0 + T_ZEW, -0.2, FL + 0.04)
  b.pudlo('lakier_grafit', p.x0 + c, p.x1 - c, p.y1 - T_ZEW, p.y1 - c, -0.2, FL + 0.04)
  b.pudlo('lakier_grafit', p.x0 + c, p.x0 + T_ZEW, p.y0 + c, p.y1 - c, -0.2, FL + 0.04)
  b.pudlo('lakier_grafit', p.x1 - T_ZEW, p.x1 - c, p.y0 + c, p.y1 - c, -0.2, FL + 0.04)

  // Dach: przekrój połaci wyciągnięty wzdłuż kalenicy.
  b.profil(p.sufit === 'lamele' ? 'filc' : 'tynk_sufit', { x: 0, y: yb }, { x: 1, y: yb }, [
    [xa, g(xa)], [xm, g(xm)], [xb, g(xb)], [xb, s(xb)], [xm, s(xm)], [xa, s(xa)],
  ], yb - ya, 0)

  // Blacha na rąbek: dwie połacie, rąbki co 48 cm, gąsior na kalenicy.
  const e = 0.03, tb = 0.012
  const yS = p.wysY0 > 0 ? ya - 0.02 : p.y0 - e, yN = p.wysY1 > 0 ? yb + 0.02 : p.y1 + e
  const hK = g(xm) + tb
  for (const strona of [-1, 1]) {
    const xe = strona < 0 ? p.x0 - e : p.x1 + e
    const he = g(strona < 0 ? xa : xb) - (OKL + e) * Math.tan(phi)
    b.bryla8('blacha', [V(xe, he, yS), V(xm, hK - tb, yS), V(xm, hK - tb, yN), V(xe, he, yN)], [V(xe, he + tb, yS), V(xm, hK, yS), V(xm, hK, yN), V(xe, he + tb, yN)])
    for (let y = yS + 0.24; y < yN - 0.1; y += 0.48) {
      const w = 0.011, hr = 0.028
      b.bryla8('blacha', [V(xe, he + tb, y - w), V(xm, hK, y - w), V(xm, hK, y + w), V(xe, he + tb, y + w)], [V(xe, he + tb + hr, y - w), V(xm, hK + hr, y - w), V(xm, hK + hr, y + w), V(xe, he + tb + hr, y + w)])
    }
    // Okapnik wzdłuż ściany bocznej.
    b.pudlo('blacha', strona < 0 ? xe - 0.012 : xe, strona < 0 ? xe : xe + 0.012, yS, yN, he - 0.07, he + tb)
  }
  b.pudlo('blacha', xm - 0.11, xm + 0.11, yS, yN, hK - 0.02, hK + 0.035)

  // Obróbki szczytów: listwa wzdłuż skosu, a przy wysunięciu dachu czoło i boki płyty.
  const obrobkaSkosu = (y: number, kierunek: number) => {
    for (const strona of [-1, 1]) {
      const xe = strona < 0 ? p.x0 - e : p.x1 + e
      const he = g(strona < 0 ? xa : xb) - (OKL + e) * Math.tan(phi)
      const y0 = y, y1 = y + kierunek * 0.035
      const d = 0.09
      b.bryla8('blacha', [V(xe, he - d, y0), V(xm, hK - d, y0), V(xm, hK - d, y1), V(xe, he - d, y1)], [V(xe, he + tb + 0.01, y0), V(xm, hK + 0.01, y0), V(xm, hK + 0.01, y1), V(xe, he + tb + 0.01, y1)])
    }
  }
  if (p.wysY0 > 0) {
    // czoło płyty dachu nad tarasem
    b.profil('blacha', { x: 0, y: ya }, { x: 1, y: ya }, [
      [xa - OKL - e, g(xa) - (OKL + e) * Math.tan(phi)], [xm, hK], [xb + OKL + e, g(xb) - (OKL + e) * Math.tan(phi)], [xb + OKL + e, s(xb) - (OKL + e) * Math.tan(phi) - 0.02], [xm, s(xm) - 0.02], [xa - OKL - e, s(xa) - (OKL + e) * Math.tan(phi) - 0.02],
    ], 0.025, 0)
    // boki wysunięcia
    b.pudlo('blacha', p.x0 - e, xa, ya, p.y0, s(xa) - 0.06, g(xa))
    b.pudlo('blacha', xb, p.x1 + e, ya, p.y0, s(xb) - 0.06, g(xb))
  } else obrobkaSkosu(p.y0 - e, 1)
  if (p.wysY1 <= 0) obrobkaSkosu(p.y1 + e, -1)

  // Sufit z lamel dębowych na czarnym filcu, przechodzący nad taras.
  if (p.sufit === 'lamele') {
    const xi0 = p.x0 + T_ZEW, xi1 = p.x1 - T_ZEW
    const ly0 = p.wysY0 > 0 ? ya + 0.03 : p.y0 + T_ZEW, ly1 = p.y1 - T_ZEW
    const krok = 0.068, w = 0.042, gl = 0.05, odst = 0.025
    for (const strona of [-1, 1]) {
      const od = strona < 0 ? xi0 : xm + 0.09
      const doX = strona < 0 ? xm - 0.09 : xi1
      for (let x = od + krok / 2; x < doX - w / 2; x += krok) {
        const xl = x - w / 2, xr = x + w / 2
        const hl = s(xl) - odst, hr = s(xr) - odst
        b.bryla8('lamela', [V(xl, hl - gl, ly0), V(xr, hr - gl, ly0), V(xr, hr - gl, ly1), V(xl, hl - gl, ly1)], [V(xl, hl, ly0), V(xr, hr, ly0), V(xr, hr, ly1), V(xl, hl, ly1)])
      }
    }
    // Belka kalenicowa z drewna klejonego.
    b.pudlo('lamela', xm - 0.09, xm + 0.09, ly0, ly1, s(xm) - 0.42, s(xm) - 0.02)
    // Lamele wzdłuż boków wysunięcia (podbitka między ścianą a krawędzią).
    if (p.wysY0 > 0) {
      b.pudlo('lamela', p.x0 - e + 0.005, xi0, ya + 0.03, p.y0, s(xa) - 0.06 - 0.02, s(xa) - 0.06)
      b.pudlo('lamela', xi1, p.x1 + e - 0.005, ya + 0.03, p.y0, s(xb) - 0.06 - 0.02, s(xb) - 0.06)
    }
  }

  // Szklany szczyt: słupki co ok. 1,5 m, rygiel na wysokości drzwi, szkło do spodu dachu.
  if (p.szklanySzczyt) {
    const y = p.szklanySzczyt === 'y0' ? p.y0 + OKL + SZ / 2 : p.y1 - OKL - SZ / 2
    const x0 = p.x0 + OKL, x1 = p.x1 - OKL
    szklanyTrojkat(b, sz, p, y, x0, x1, FL, 6, 3.05)
  }
  if (p.trojkatSzkla) {
    const y = p.trojkatSzkla === 'y1' ? p.y1 - OKL - SZ / 2 : p.y0 + OKL + SZ / 2
    szklanyTrojkat(b, sz, p, y, p.x0 + OKL, p.x1 - OKL, FL + 3.3, 6, null)
  }

  okladzina(b, p)
}

/** Szklana ściana pod skosem dachu: od wysokości dol do spodu dachu, z podziałem na pola. */
function szklanyTrojkat(b: Budowa, sz: Budowa, p: Pawilon, y: number, x0: number, x1: number, dol: number, pola: number, rygiel: number | null) {
  const xm = srodekX(p)
  const s = (x: number) => FL + sufit(p, x) - 0.03
  const pts: [number, number][] = [[x0, dol], [x1, dol], [x1, s(x1)], [xm, s(xm)], [x0, s(x0)]]
  sz.profil('szklo', { x: 0, y: y + 0.01 }, { x: 1, y: y + 0.01 }, pts, 0.02, 0)
  const w = 0.055, gl = 0.14
  for (let i = 0; i <= pola; i++) {
    const x = x0 + ((x1 - x0) * i) / pola
    const xl = Math.max(x0, x - w / 2), xr = Math.min(x1, x + w / 2)
    b.bryla8('rama', [V(xl, dol, y + gl / 2), V(xr, dol, y + gl / 2), V(xr, dol, y - gl / 2), V(xl, dol, y - gl / 2)], [V(xl, s(xl), y + gl / 2), V(xr, s(xr), y + gl / 2), V(xr, s(xr), y - gl / 2), V(xl, s(xl), y - gl / 2)])
  }
  // dolny próg i skośne ramy górne
  b.pudlo('rama', x0, x1, y - gl / 2, y + gl / 2, dol - 0.01, dol + 0.05)
  for (const [xa, xb2] of [[x0, xm], [xm, x1]] as const) {
    b.bryla8('rama', [V(xa, s(xa) - 0.06, y + gl / 2), V(xb2, s(xb2) - 0.06, y + gl / 2), V(xb2, s(xb2) - 0.06, y - gl / 2), V(xa, s(xa) - 0.06, y - gl / 2)], [V(xa, s(xa) + 0.01, y + gl / 2), V(xb2, s(xb2) + 0.01, y + gl / 2), V(xb2, s(xb2) + 0.01, y - gl / 2), V(xa, s(xa) + 0.01, y - gl / 2)])
  }
  if (rygiel) b.pudlo('rama', x0, x1, y - gl / 2, y + gl / 2, FL + rygiel - 0.03, FL + rygiel + 0.03)
}

// ---------------- Okładzina z pionowych lameli z opalanego drewna ----------------
function okladzina(b: Budowa, p: Pawilon) {
  const krok = 0.072, w = 0.046, gl = 0.03
  const dol = FL + 0.07
  const g = (x: number) => FL + dachGora(p, x)
  const xm = srodekX(p)
  const scianyP = SCIANY.filter((s) => s.pawilon === p.id && s.zew)
  // Otwory przeliczone na współrzędną wzdłuż obrysu (od narożnika).
  const o = OKL + SZ / 2
  const otwory = (id: string, wszystkie = false) => {
    const s = scianyP.find((q) => q.id === `${p.id}-${id}`)
    return (s?.otwory ?? []).filter((q) => wszystkie || !q.lamele).map((q) => ({ u0: q.u + o - q.szer / 2 - 0.01, u1: q.u + o + q.szer / 2 + 0.01, v0: FL + (q.parapet ?? 0) - 0.01, v1: FL + (q.parapet ?? 0) + q.wys + 0.01 }))
  }
  const trojkat = p.trojkatSzkla
  const boki: { id: 'W' | 'E' | 'S' | 'N'; a: Pt; b: Pt; L: number }[] = [
    { id: 'W', a: { x: p.x0, y: p.y1 }, b: { x: p.x0, y: p.y0 }, L: p.y1 - p.y0 },
    { id: 'E', a: { x: p.x1, y: p.y0 }, b: { x: p.x1, y: p.y1 }, L: p.y1 - p.y0 },
    { id: 'S', a: { x: p.x0, y: p.y0 }, b: { x: p.x1, y: p.y0 }, L: p.x1 - p.x0 },
    { id: 'N', a: { x: p.x1, y: p.y1 }, b: { x: p.x0, y: p.y1 }, L: p.x1 - p.x0 },
  ]
  for (const bok of boki) {
    if ((bok.id === 'S' && p.szklanySzczyt === 'y0') || (bok.id === 'N' && p.szklanySzczyt === 'y1')) continue
    const ot = otwory(bok.id)
    const d = { x: (bok.b.x - bok.a.x) / bok.L, y: (bok.b.y - bok.a.y) / bok.L }
    const n = { x: -d.y, y: d.x } // do środka
    const szczyt = bok.id === 'S' || bok.id === 'N'
    const maxGora = (bok.id === 'N' && trojkat === 'y1') || (bok.id === 'S' && trojkat === 'y0') ? FL + 3.3 : Infinity
    // Czarne tło za lamelami (membrana) na całej ścianie poza otworami.
    const tlo = kawalkiSciany(bok.L, 0, 0, dol - 0.02, (u) => Math.min(maxGora, g(bok.a.x + d.x * u) - 0.02), szczyt ? [Math.abs(xm - bok.a.x)] : [], otwory(bok.id, true))
    for (const pts of tlo) b.profil('filc', { x: bok.a.x + n.x * (gl + 0.012), y: bok.a.y + n.y * (gl + 0.012) }, { x: bok.b.x + n.x * (gl + 0.012), y: bok.b.y + n.y * (gl + 0.012) }, pts, 0.012, 0)
    // Lamele
    const ile = Math.floor(bok.L / krok)
    const start = (bok.L - ile * krok) / 2 + krok / 2
    for (let i = 0; i < ile; i++) {
      const u = start + i * krok
      const ul = u - w / 2, ur = u + w / 2
      const xl = bok.a.x + d.x * ul, xr = bok.a.x + d.x * ur
      const yl = bok.a.y + d.y * ul, yr = bok.a.y + d.y * ur
      const gl0 = Math.min(maxGora, g(xl) - 0.015), gr0 = Math.min(maxGora, g(xr) - 0.015)
      // odcinki pionowe lameli poza otworami
      const przerwy = ot.filter((q) => ur > q.u0 && ul < q.u1).sort((a2, b2) => a2.v0 - b2.v0)
      let v = dol
      const kawal = (v0: number, v1l: number, v1r: number) => {
        if (Math.min(v1l, v1r) - v0 < 0.02) return
        const pl = { x: xl, y: yl }, pr = { x: xr, y: yr }
        const ol = { x: pl.x + n.x * gl, y: pl.y + n.y * gl }, or = { x: pr.x + n.x * gl, y: pr.y + n.y * gl }
        b.bryla8('spalone', [V(pl.x, v0, pl.y), V(pr.x, v0, pr.y), V(or.x, v0, or.y), V(ol.x, v0, ol.y)], [V(pl.x, v1l, pl.y), V(pr.x, v1r, pr.y), V(or.x, v1r, or.y), V(ol.x, v1l, ol.y)])
      }
      for (const q of przerwy) { kawal(v, q.v0, q.v0); v = Math.max(v, q.v1) }
      if (szczyt) kawal(v, gl0, gr0)
      else kawal(v, gl0, gl0)
    }
  }
}

// ---------------- Ściany ----------------
function sciana(b: Budowa, sz: Budowa, s: Sciana) {
  const p = paw(s.pawilon)
  const g = geoSciany(s)
  const otw = otworyWU(s)
  if (s.szklo) {
    // Szklana przegroda (studio / garaż): tafla w ramie.
    const h = FL + (s.h ?? 3)
    sz.profil('szklo', s.a, s.b, [[0, FL], [g.L, FL], [g.L, h], [0, h]], 0.02, -0.01)
    b.profil('rama', s.a, s.b, [[0, FL - 0.01], [g.L, FL - 0.01], [g.L, FL + 0.05], [0, FL + 0.05]], 0.08, -0.04)
    b.profil('rama', s.a, s.b, [[0, h - 0.05], [g.L, h - 0.05], [g.L, h + 0.01], [0, h + 0.01]], 0.08, -0.04)
    if (p) {
      const prof = profilGory(s, p, undefined, 0, sufit)
      const pts: [number, number][] = [[0, h], [g.L, h], [g.L, prof.gora(g.L)]]
      for (const u of prof.lamanie.filter((q) => q > 0 && q < g.L)) pts.push([u, prof.gora(u)])
      pts.push([0, prof.gora(0)])
      b.profil('tynk', s.a, s.b, pts, 0.14, -0.07)
    }
    for (let u = 2.5; u < g.L - 0.5; u += 2.5) b.profil('rama', s.a, s.b, [[u - 0.02, FL], [u + 0.02, FL], [u + 0.02, h], [u - 0.02, h]], 0.06, -0.03)
    return
  }
  if (s.zew && p) {
    // Warstwa konstrukcyjna z tynkiem od środka, wydłużona o pół grubości na narożnikach.
    const e = s.t / 2
    const wewX = (u: number) => g.pt(u, s.t / 2).x
    const prof = profilGory(s, p, undefined, s.t / 2, sufit)
    const pionowa = Math.abs(g.d.x) < 1e-6
    const gora = pionowa ? () => FL + sufit(p, wewX(0)) + 0.005 : (u: number) => prof.gora(u) + 0.005
    const trojkatTu = (p.trojkatSzkla === 'y1' && s.id === `${p.id}-N`) || (p.trojkatSzkla === 'y0' && s.id === `${p.id}-S`)
    const gora2 = trojkatTu ? (u: number) => Math.min(FL + 3.3, gora(u)) : gora
    for (const pts of kawalkiSciany(g.L, e, e, -0.05, gora2, prof.lamanie, otw)) b.profil('tynk', s.a, s.b, pts, s.t, -s.t / 2)
    // Okna i drzwi w ścianie zewnętrznej.
    for (const w of otw) otworZewnetrzny(b, sz, s, g, w)
    return
  }
  // Ściana wewnętrzna: do spodu dachu albo do zadanej wysokości.
  const prof = profilGory(s, p, s.h, 0, sufit)
  for (const pts of kawalkiSciany(g.L, 0, 0, FL - 0.02, prof.gora, prof.lamanie, otw)) b.profil('tynk', s.a, s.b, pts, s.t, -s.t / 2)
  for (const w of otw) otworWewnetrzny(b, s, g, w)
}

function otworZewnetrzny(b: Budowa, sz: Budowa, s: Sciana, g: Geo, w: { o: Otwor; u0: number; u1: number; v0: number; v1: number }) {
  const t = s.t
  // Ościeże z blachy w kolorze ram: od lica lameli do lica wewnętrznego.
  const zew = -(t / 2 + OKL), wew = t / 2
  const gr = 0.018
  const ramka = (u0: number, u1: number, v0: number, v1: number, o0: number, o1: number, mat: string) =>
    b.profil(mat, g.pt(0, 0), g.pt(1, 0), [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], o1 - o0, o0)
  // profil() wyciąga w prawo od osi (na zewnątrz dla ścian zewnętrznych), więc grubość liczę od strony wewnętrznej.
  const blok = (u0: number, u1: number, v0: number, v1: number, mat: string) => ramka(u0, u1, v0, v1, -wew, -zew, mat)
  if (w.o.rodzaj !== 'przejscie') {
    blok(w.u0, w.u1, w.v1, w.v1 + gr, 'rama')
    blok(w.u0 - gr, w.u0, w.v0, w.v1 + gr, 'rama')
    blok(w.u1, w.u1 + gr, w.v0, w.v1 + gr, 'rama')
    if (w.v0 > FL + 0.01) blok(w.u0, w.u1, w.v0 - gr, w.v0, 'rama')
    // parapet wewnętrzny z kamienia
    if (w.v0 > FL + 0.2) ramka(w.u0 - 0.03, w.u1 + 0.03, w.v0 - 0.03, w.v0, -wew - 0.03, -0.02, 'kamien')
  } else {
    // przejście do łącznika: ościeże w tynku i próg
    ramka(w.u0, w.u1, FL - 0.02, FL, -wew, -zew + OKL, 'kamien')
    return
  }
  const r = 0.05, glG = 0.07
  const plaszczyzna = 0.12 // szkło 12 cm od lica konstrukcji do środka
  const oG = -(t / 2) + plaszczyzna
  const ramaPion = (u: number) => ramka(u - r / 2, u + r / 2, w.v0, w.v1, -oG - glG / 2, -oG + glG / 2, 'rama')
  const ramaPoz = (v: number) => ramka(w.u0, w.u1, v - r / 2, v + r / 2, -oG - glG / 2, -oG + glG / 2, 'rama')
  if (w.o.rodzaj === 'brama') {
    // Brama segmentowa schowana za lamelami: od środka grafitowe panele.
    for (let i = 0; i < 5; i++) {
      const h0 = w.v0 + (i * (w.v1 - w.v0)) / 5
      ramka(w.u0, w.u1, h0 + 0.006, h0 + (w.v1 - w.v0) / 5 - 0.006, -(t / 2) - 0.02, -(t / 2) + 0.02, 'lakier_grafit')
    }
    return
  }
  if (w.o.rodzaj === 'wejscie') {
    // Drzwi obrotowe z dębu na pełną wysokość, oś obrotu w 3/4 szerokości, uchylone o 62 stopnie.
    const szer = w.u1 - w.u0 - 0.02, h0 = w.v0 + 0.01, h1 = w.v1 - 0.01
    const os = g.pt(w.u0 + szer * 0.72, 0)
    const kat = rad(62)
    const kier = { x: g.d.x * Math.cos(kat) - g.d.y * Math.sin(kat), y: g.d.x * Math.sin(kat) + g.d.y * Math.cos(kat) }
    const a = { x: os.x - kier.x * szer * 0.72, y: os.y - kier.y * szer * 0.72 }
    const c = { x: a.x + kier.x * szer / 2, y: a.y + kier.y * szer / 2 }
    const obr = (Math.atan2(kier.y, kier.x) * 180) / Math.PI
    b.pudloO('lamela_zew', c.x, c.y, szer, 0.075, h0, h1, obr)
    // ryflowanie skrzydła i mosiężny uchwyt na całą wysokość
    for (let s2 = -szer / 2 + 0.06; s2 < szer / 2 - 0.04; s2 += 0.08) {
      for (const strona of [-1, 1]) {
        const p2 = { x: c.x + kier.x * s2 - kier.y * strona * 0.04, y: c.y + kier.y * s2 + kier.x * strona * 0.04 }
        b.pudloO('lamela_zew', p2.x, p2.y, 0.03, 0.012, h0 + 0.04, h1 - 0.04, obr)
      }
    }
    for (const strona of [-1, 1]) {
      const hx = a.x + kier.x * 0.18 - kier.y * strona * 0.09, hy = a.y + kier.y * 0.18 + kier.x * strona * 0.09
      b.walec('mosiadz', hx, hy, FL + 0.5, FL + 2.3, 0.017, 0.017, 16)
    }
    return
  }
  ramaPoz(w.v0 + r / 2); ramaPoz(w.v1 - r / 2)
  ramaPion(w.u0 + r / 2); ramaPion(w.u1 - r / 2)
  const pola = w.o.rodzaj === 'przesuwne' ? Math.max(2, Math.round((w.u1 - w.u0) / 1.6)) : w.o.rodzaj === 'okno' && w.u1 - w.u0 > 2 ? 2 : 1
  for (let i = 1; i < pola; i++) ramaPion(w.u0 + ((w.u1 - w.u0) * i) / pola)
  sz.profil('szklo', g.pt(0, 0), g.pt(1, 0), [[w.u0 + 0.02, w.v0 + 0.02], [w.u1 - 0.02, w.v0 + 0.02], [w.u1 - 0.02, w.v1 - 0.02], [w.u0 + 0.02, w.v1 - 0.02]], 0.02, -oG - 0.01)
}

function otworWewnetrzny(b: Budowa, s: Sciana, g: Geo, w: { o: Otwor; u0: number; u1: number; v0: number; v1: number }) {
  // próg w podłodze
  b.profil('dab', s.a, s.b, [[w.u0, FL - 0.03], [w.u1, FL - 0.03], [w.u1, FL], [w.u0, FL]], s.t + 0.01, -s.t / 2 - 0.005)
  if (w.o.rodzaj !== 'drzwi') return
  // Drzwi bezprzylgowe na pełną wysokość otworu, uchylone o 70 stopni.
  const zaw = w.o.zawias ?? 1
  const szer = w.u1 - w.u0 - 0.01
  const uz = zaw > 0 ? w.u0 + 0.005 : w.u1 - 0.005
  const p0 = g.pt(uz, s.t / 2 - 0.02)
  const kat = rad(70) * zaw
  const kier = { x: g.d.x * Math.cos(kat) - g.d.y * Math.sin(kat) * 1, y: g.d.x * Math.sin(kat) * 1 + g.d.y * Math.cos(kat) }
  const kz = { x: kier.x * zaw, y: kier.y * zaw }
  const cx = p0.x + kz.x * (szer / 2), cy = p0.y + kz.y * (szer / 2)
  const obr = (Math.atan2(kz.y, kz.x) * 180) / Math.PI
  b.pudloO('lakier_bialy', cx, cy, szer, 0.042, w.v0 + 0.005, w.v1 - 0.005, obr)
  // klamka
  const kx = p0.x + kz.x * (szer - 0.07), ky = p0.y + kz.y * (szer - 0.07)
  b.pudloO('stal_czarna', kx, ky, 0.022, 0.14, FL + 1.0, FL + 1.04, obr)
}

// ---------------- Łączniki ----------------
function lacznik(b: Budowa, sz: Budowa, l: (typeof LACZNIKI)[number]) {
  const h = FL + l.wys
  const wzdluzY = l.y1 - l.y0 >= l.x1 - l.x0 || true
  b.pudlo('beton_gar', l.x0, l.x1, l.y0, l.y1, FL - 0.32, FL - 0.02)
  // dach: płyta, blacha, czoła
  b.pudlo('tynk_sufit', l.x0 - 0.12, l.x1 + 0.12, l.y0, l.y1, h, h + 0.3)
  b.pudlo('blacha', l.x0 - 0.15, l.x1 + 0.15, l.y0, l.y1, h + 0.3, h + 0.33)
  b.pudlo('blacha', l.x0 - 0.15, l.x0 - 0.12, l.y0, l.y1, h - 0.02, h + 0.33)
  b.pudlo('blacha', l.x1 + 0.12, l.x1 + 0.15, l.y0, l.y1, h - 0.02, h + 0.33)
  if (wzdluzY) {
    for (const x of [l.x0, l.x1]) {
      sz.pudlo('szklo', x - 0.012, x + 0.012, l.y0 + 0.02, l.y1 - 0.02, FL + 0.02, h - 0.02)
      b.pudlo('rama', x - 0.04, x + 0.04, l.y0, l.y1, FL - 0.02, FL + 0.04)
      b.pudlo('rama', x - 0.04, x + 0.04, l.y0, l.y1, h - 0.05, h)
    }
  }
  b.pudlo('lakier_grafit', l.x0 - 0.05, l.x1 + 0.05, l.y0, l.y1, -0.2, FL - 0.02)
}

// ---------------- Podłogi ----------------
function podlogi(b: Budowa) {
  const MAT: Record<string, string> = { dab: 'dab', kamien: 'kamien', beton_gar: 'beton_gar' }
  for (const r of POMIESZCZENIA) {
    const poly: Pt[] = [{ x: r.x0, y: r.y0 }, { x: r.x1, y: r.y0 }, { x: r.x1, y: r.y1 }, { x: r.x0, y: r.y1 }]
    const otwory = r.id === 'salon' ? [[{ x: DOLEK.x0, y: DOLEK.y0 }, { x: DOLEK.x1, y: DOLEK.y0 }, { x: DOLEK.x1, y: DOLEK.y1 }, { x: DOLEK.x0, y: DOLEK.y1 }]] : []
    b.plyta(MAT[r.podloga] ?? 'dab', poly, FL - 0.025, FL, otwory)
  }
  // Dołek rozmów: dno i boki z dębu, dwa stopnie od strony jadalni.
  const d = DOLEK, h0 = FL - d.gl
  b.pudlo('dab', d.x0, d.x1, d.y0, d.y1, h0 - 0.03, h0)
  b.pudlo('dab', d.x0 - 0.02, d.x0, d.y0, d.y1, h0, FL)
  b.pudlo('dab', d.x1, d.x1 + 0.02, d.y0, d.y1, h0, FL)
  b.pudlo('dab', d.x0, d.x1, d.y1, d.y1 + 0.02, h0, FL)
  b.pudlo('dab', d.x0, d.x1, d.y0 - 0.02, d.y0, h0, FL)
  b.pudlo('dab', d.x1 - 1.3, d.x1, d.y1 - 0.35, d.y1, h0, h0 + d.gl / 2)
}
