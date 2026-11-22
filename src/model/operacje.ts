// Operacje na kondygnacji. Każda funkcja zmienia przekazany obiekt (kopię roboczą z magazynu).

import { Pt, add, dist, klucz, rot, rpt, rzutNaOdcinek, sub, srodekCiezkosci } from './geom'
import { OTWORY, SCIANY, TEREN, wzorMebla } from './katalog'
import { punktNaScianie, uporzadkuj, znajdzUklad } from './topologia'
import { CzescDachu, ElementTerenu, Kondygnacja, Mebel, Otwor, Projekt, RodzajDachu, RodzajOtworu, RodzajSciany, RodzajTerenu, Sciana, noweId } from './typy'

export function porzadek(k: Kondygnacja) {
  const w = uporzadkuj(k.sciany, k.otwory)
  k.sciany = w.sciany
  k.otwory = w.otwory
}

export function dodajSciane(k: Kondygnacja, a: Pt, b: Pt, rodzaj: RodzajSciany): string | null {
  if (dist(a, b) < 0.05) return null
  const id = noweId('s')
  k.sciany.push({ id, a: rpt(a), b: rpt(b), rodzaj, grubosc: SCIANY[rodzaj].grubosc })
  porzadek(k)
  return id
}

export function dodajProstokat(k: Kondygnacja, p: Pt, q: Pt, rodzaj: RodzajSciany) {
  const x0 = Math.min(p.x, q.x), x1 = Math.max(p.x, q.x), y0 = Math.min(p.y, q.y), y1 = Math.max(p.y, q.y)
  if (x1 - x0 < 0.3 || y1 - y0 < 0.3) return
  const r = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }]
  const g = SCIANY[rodzaj].grubosc
  for (let i = 0; i < 4; i++) k.sciany.push({ id: noweId('s'), a: rpt(r[i]), b: rpt(r[(i + 1) % 4]), rodzaj, grubosc: g })
  porzadek(k)
}

/** Przesuwa wszystkie końce ścian leżące w węźle. Bez porządkowania, do użycia w trakcie przeciągania. */
export function przesunWezel(k: Kondygnacja, kl: string, nowy: Pt) {
  const n = rpt(nowy)
  const ruszane = k.sciany.filter((s) => klucz(s.a) === kl || klucz(s.b) === kl)
  // Otwory zostają w swoim miejscu na działce, a nie jadą razem z końcem ściany.
  const miejsca = new Map<string, Pt>()
  for (const o of k.otwory) {
    const s = ruszane.find((x) => x.id === o.scianaId)
    if (s) miejsca.set(o.id, punktNaScianie(s, o.poz))
  }
  for (const s of ruszane) {
    if (klucz(s.a) === kl) s.a = { ...n }
    if (klucz(s.b) === kl) s.b = { ...n }
  }
  for (const o of k.otwory) {
    const m = miejsca.get(o.id)
    const s = m && ruszane.find((x) => x.id === o.scianaId)
    if (!m || !s) continue
    const L = dist(s.a, s.b)
    o.poz = Math.max(o.szer / 2 + 0.02, Math.min(L - o.szer / 2 - 0.02, rzutNaOdcinek(m, s.a, s.b).t * L))
  }
}

export function usunSciane(k: Kondygnacja, id: string) {
  k.sciany = k.sciany.filter((s) => s.id !== id)
  k.otwory = k.otwory.filter((o) => o.scianaId !== id)
  porzadek(k)
}

export function dodajOtwor(k: Kondygnacja, s: Sciana, poz: number, rodzaj: RodzajOtworu, strona: 1 | -1 = 1): string {
  const w = OTWORY[rodzaj]
  const L = dist(s.a, s.b)
  const szer = Math.min(w.szer, Math.max(0.5, L - 0.2))
  const o: Otwor = {
    id: noweId('o'), scianaId: s.id, rodzaj, szer, wys: w.wys, parapet: w.parapet, zawias: 1, strona,
    poz: Math.max(szer / 2 + 0.05, Math.min(L - szer / 2 - 0.05, poz)),
  }
  k.otwory.push(o)
  return o.id
}

export function dodajMebel(k: Kondygnacja, wzor: string, p: Pt, obrot = 0): string | null {
  const w = wzorMebla(wzor)
  if (!w) return null
  const m: Mebel = { id: noweId('m'), wzor, x: p.x, y: p.y, szer: w.szer, gl: w.gl, wys: w.wys, obrot }
  k.meble.push(m)
  return m.id
}

export function dodajTeren(p: Projekt, rodzaj: RodzajTerenu, pkt: Pt): string {
  const w = TEREN[rodzaj]
  const e: ElementTerenu = { id: noweId('t'), rodzaj, x: pkt.x, y: pkt.y, szer: w.szer, gl: w.gl, obrot: 0 }
  p.teren.push(e)
  return e.id
}

export function dodajCzescDachu(p: Projekt, a: Pt, b: Pt, rodzaj: RodzajDachu): string | null {
  const szer = Math.abs(b.x - a.x), gl = Math.abs(b.y - a.y)
  if (szer < 0.5 || gl < 0.5) return null
  const c: CzescDachu = {
    id: noweId('d'), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, szer, gl, obrot: 0, rodzaj,
    kat: p.dach.kat, okap: p.dach.okap, kalenicaPoprzecznie: false, odwroc: false, kolankowa: 0,
  }
  p.dach.czesci.push(c)
  return c.id
}

/** Dzieli część dachu na dwie równe: w poprzek szerokości albo głębokości. */
export function podzielCzesc(p: Projekt, id: string, os: 'szer' | 'gl'): string | null {
  const c = p.dach.czesci.find((x) => x.id === id)
  if (!c) return null
  const k = (c.obrot * Math.PI) / 180
  const kier = os === 'szer' ? { x: Math.cos(k), y: Math.sin(k) } : { x: -Math.sin(k), y: Math.cos(k) }
  const pol = c[os] / 2
  const druga: CzescDachu = { ...c, id: noweId('d'), [os]: pol, x: c.x + (kier.x * pol) / 2, y: c.y + (kier.y * pol) / 2 }
  c.x -= (kier.x * pol) / 2
  c.y -= (kier.y * pol) / 2
  c[os] = pol
  p.dach.czesci.push(druga)
  return druga.id
}

export function nazwijPokoj(k: Kondygnacja, kl: string, zmiana: { nazwa?: string; typ?: string }) {
  const u = znajdzUklad(k)
  const pok = u.pokoje.find((x) => x.klucz === kl)
  if (!pok) return null
  if (pok.etykieta) {
    const e = k.etykiety.find((x) => x.id === pok.etykieta!.id)!
    Object.assign(e, zmiana)
    return e.id
  }
  const e = { id: noweId('e'), x: pok.srodek.x, y: pok.srodek.y, nazwa: zmiana.nazwa ?? '', typ: zmiana.typ ?? 'inne' }
  k.etykiety.push(e)
  return e.id
}

/** Usuwa etykiety, które nie leżą już w żadnym pomieszczeniu. */
export function sprzatnijEtykiety(k: Kondygnacja) {
  const u = znajdzUklad(k)
  const zywe = new Set(u.pokoje.map((p) => p.etykieta?.id).filter(Boolean))
  k.etykiety = k.etykiety.filter((e) => zywe.has(e.id))
}

export function nowaKondygnacja(nazwa: string, wzor?: Kondygnacja): Kondygnacja {
  const k: Kondygnacja = { id: noweId('k'), nazwa, wysokosc: 2.7, strop: 0.3, sciany: [], otwory: [], etykiety: [], meble: [] }
  if (wzor) {
    const u = znajdzUklad(wzor)
    k.sciany = wzor.sciany.filter((s) => u.zewnetrzne.has(s.id)).map((s) => ({ ...s, id: noweId('s'), a: { ...s.a }, b: { ...s.b } }))
    porzadek(k)
  }
  return k
}

/** Przesunięcie albo obrót całego domu (wszystkie kondygnacje). */
export function przeksztalcDom(p: Projekt, f: (q: Pt) => Pt, obrotStopnie = 0) {
  for (const k of p.kondygnacje) {
    for (const s of k.sciany) { s.a = rpt(f(s.a)); s.b = rpt(f(s.b)) }
    for (const e of k.etykiety) { const q = f({ x: e.x, y: e.y }); e.x = q.x; e.y = q.y }
    for (const m of k.meble) { const q = f({ x: m.x, y: m.y }); m.x = q.x; m.y = q.y; m.obrot = (m.obrot + obrotStopnie + 360) % 360 }
    porzadek(k)
  }
  for (const c of p.dach.czesci) { const q = f({ x: c.x, y: c.y }); c.x = q.x; c.y = q.y; c.obrot = (c.obrot + obrotStopnie + 360) % 360 }
}

export function srodekDomu(p: Projekt): Pt | null {
  const pk = p.kondygnacje.flatMap((k) => k.sciany.flatMap((s) => [s.a, s.b]))
  if (!pk.length) return null
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity
  for (const q of pk) { minx = Math.min(minx, q.x); maxx = Math.max(maxx, q.x); miny = Math.min(miny, q.y); maxy = Math.max(maxy, q.y) }
  return { x: (minx + maxx) / 2, y: (miny + maxy) / 2 }
}

export const przesunDom = (p: Projekt, d: Pt) => przeksztalcDom(p, (q) => add(q, d))
export const obrocDom = (p: Projekt, stopnie: number) => {
  const c = srodekDomu(p)
  if (!c) return
  przeksztalcDom(p, (q) => rot(q, (stopnie * Math.PI) / 180, c), stopnie)
}

export function naroznikiProstokata(x: number, y: number, szer: number, gl: number, obrot: number): Pt[] {
  const c = { x, y }
  const k = (obrot * Math.PI) / 180
  return [{ x: -szer / 2, y: -gl / 2 }, { x: szer / 2, y: -gl / 2 }, { x: szer / 2, y: gl / 2 }, { x: -szer / 2, y: gl / 2 }].map((q) => rot(add(c, q), k, c))
}
export { srodekCiezkosci, sub }
