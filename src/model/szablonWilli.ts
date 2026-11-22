// Dom „Trzy stodoły” z wizualizacji (?willa), przeniesiony do modelu planera.
// Źródłem jest src/willa/uklad.ts, więc rzut i wizualizacja korzystają z tych samych danych.

import { BASEN, DRZEWA, LACZNIKI, PAWILONY, POMIESZCZENIA, SCIANY, T_ZEW, type Otwor as OtworW } from '../willa/uklad'
import { rzutNaOdcinek, wWielokacie, type Pt } from './geom'
import { dodajMebel, dodajOtwor, dodajProstokat, nazwijPokoj, porzadek } from './operacje'
import { pustyProjekt } from './szablony'
import { znajdzUklad } from './topologia'
import type { Kondygnacja, Projekt, RodzajOtworu, RodzajSciany, Sciana } from './typy'
import { noweId } from './typy'
import { SCIANY as GRUB } from './katalog'

const CIEMNA = '#2e2b28'
const P = (x: number, y: number): Pt => ({ x, y })
/** Oś ściany zewnętrznej planera (0,45 m) leży pół grubości od obrysu. */
const OS = 0.225

const RODZAJ: Record<OtworW['rodzaj'], RodzajOtworu> = {
  okno: 'okno', stale: 'okno-taras', przesuwne: 'okno-taras', brama: 'brama', przejscie: 'przejscie', wejscie: 'drzwi-wej', drzwi: 'drzwi',
}

const TYP: Record<string, string> = {
  garaz: 'garaz', studio: 'pokoj', korytarzA: 'hol', hol: 'wiatrolap', biuro1: 'gabinet', biuro2: 'gabinet', L1: 'hol', L2: 'hol', L3: 'hol',
  galeria: 'hol', dz1: 'pokoj', dz2: 'pokoj', dz3: 'pokoj', wcB: 'wc', schowek: 'spizarnia', pralnia: 'pralnia', technika: 'kotlownia',
  salon: 'salon', garderoba: 'garderoba', lazD: 'lazienka', przejD: 'hol', sypialnia: 'sypialnia', laz1: 'lazienka', laz2: 'lazienka', laz3: 'lazienka',
}

function dodaj(k: Kondygnacja, a: Pt, b: Pt, rodzaj: RodzajSciany, grubosc?: number, dod: Partial<Sciana> = {}) {
  k.sciany.push({ id: noweId('s'), a, b, rodzaj, grubosc: grubosc ?? GRUB[rodzaj].grubosc, ...dod })
}

/** Przyciąga koniec ściany do najbliższej osi innej ściany, gdy leży przy jej licu: planer łączy ściany tylko w osiach. */
function przyciagnij(k: Kondygnacja) {
  for (const s of k.sciany) {
    for (const kon of ['a', 'b'] as const) {
      const p = s[kon]
      let naj: { q: Pt; d: number } | null = null
      for (const o of k.sciany) {
        if (o === s) continue
        const r = rzutNaOdcinek(p, o.a, o.b)
        const L = Math.hypot(o.b.x - o.a.x, o.b.y - o.a.y)
        if (r.t < -0.02 / L || r.t > 1 + 0.02 / L) continue
        const t = Math.max(0, Math.min(1, r.t))
        const q = P(o.a.x + (o.b.x - o.a.x) * t, o.a.y + (o.b.y - o.a.y) * t)
        if (r.d < o.grubosc / 2 + 0.12 && r.d > 0.001 && (!naj || r.d < naj.d)) naj = { q, d: r.d }
      }
      if (naj) s[kon] = naj.q
    }
  }
}

function otwor(k: Kondygnacja, x: number, y: number, o: OtworW) {
  let naj: { s: Sciana; t: number; d: number } | null = null
  for (const s of k.sciany) {
    const r = rzutNaOdcinek(P(x, y), s.a, s.b)
    if (r.t < 0 || r.t > 1) continue
    if (!naj || r.d < naj.d) naj = { s, t: r.t, d: r.d }
  }
  if (!naj || naj.d > 0.35) return
  const L = Math.hypot(naj.s.b.x - naj.s.a.x, naj.s.b.y - naj.s.a.y)
  const id = dodajOtwor(k, naj.s, naj.t * L, RODZAJ[o.rodzaj])
  const w = k.otwory.find((q) => q.id === id)!
  w.szer = Math.min(o.szer, L - 0.1)
  w.wys = o.wys
  w.parapet = o.parapet ?? 0
  w.poz = Math.max(w.szer / 2 + 0.05, Math.min(L - w.szer / 2 - 0.05, naj.t * L))
  if (o.zawias) w.zawias = o.zawias
}

function nazwij(k: Kondygnacja, x: number, y: number, nazwa: string, typ: string) {
  const u = znajdzUklad(k)
  const p = u.pokoje.find((r) => wWielokacie(P(x, y), r.obieg))
  if (p) nazwijPokoj(k, p.klucz, { nazwa, typ })
}

export function domTrzyStodoly(): Projekt {
  const p = pustyProjekt()
  p.nazwa = 'Willa „Trzy stodoły”'
  p.ustawienia.kolorElewacji = CIEMNA
  p.ustawienia.wykonczenie = 'deska'
  p.dach.kolor = '#2a2c2f'
  p.dach.pokrycie = 'rabek'
  const k = p.kondygnacje[0]
  k.wysokosc = 3.0
  k.strop = 0.3

  // Ściany zewnętrzne stodół: prostokąt po osi, szklany szczyt od ogrodu w salonie i apartamencie.
  for (const q of PAWILONY) {
    const x0 = q.x0 + OS, x1 = q.x1 - OS, y0 = q.y0 + OS, y1 = q.y1 - OS
    dodaj(k, P(x0, y0), P(x1, y0), q.szklanySzczyt === 'y0' ? 'szklana' : 'zew')
    dodaj(k, P(x1, y0), P(x1, y1), 'zew')
    dodaj(k, P(x1, y1), P(x0, y1), 'zew')
    dodaj(k, P(x0, y1), P(x0, y0), 'zew')
  }
  // Szklane łączniki: ściany od osi jednej stodoły do osi drugiej.
  const osY = (y: number) => {
    for (const q of PAWILONY) {
      if (Math.abs(y - q.y0) < 0.05) return q.y0 + OS
      if (Math.abs(y - q.y1) < 0.05) return q.y1 - OS
    }
    return y
  }
  for (const l of LACZNIKI) for (const x of [l.x0, l.x1]) dodaj(k, P(x, osY(l.y0)), P(x, osY(l.y1)), 'szklana')
  // Ściany wewnętrzne z wizualizacji.
  for (const s of SCIANY.filter((q) => !q.zew)) {
    const rodzaj: RodzajSciany = s.szklo ? 'szklana' : s.t >= 0.16 ? 'nosna' : 'dzialowa'
    dodaj(k, { ...s.a }, { ...s.b }, rodzaj, s.szklo ? 0.12 : s.t)
  }
  przyciagnij(k)
  porzadek(k)

  // Okna, drzwi i przejścia: środek otworu liczony z ściany wizualizacji.
  for (const s of SCIANY) {
    const L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y)
    const d = { x: (s.b.x - s.a.x) / L, y: (s.b.y - s.a.y) / L }
    for (const o of s.otwory ?? []) otwor(k, s.a.x + d.x * o.u, s.a.y + d.y * o.u, o)
  }
  // Drzwi przesuwne w szklanych szczytach i wejście z łącznika do apartamentu.
  const C = PAWILONY.find((q) => q.id === 'C')!, D = PAWILONY.find((q) => q.id === 'D')!
  otwor(k, 10.4, C.y0 + OS, { u: 0, szer: 2.8, wys: 3.0, rodzaj: 'przesuwne' })
  otwor(k, 14.1, D.y0 + OS, { u: 0, szer: 2.6, wys: 2.6, rodzaj: 'przesuwne' })
  otwor(k, 13.7, C.y0 + OS, { u: 0, szer: 1.5, wys: 2.6, rodzaj: 'przejscie' })

  // Elewacja z opalanego drewna na całym domu.
  for (const s of k.sciany) if (s.rodzaj === 'zew') { s.kolor = CIEMNA; s.wykonczenie = 'deska' }

  // Nazwy pomieszczeń.
  for (const r of POMIESZCZENIA) nazwij(k, (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, r.nazwa, TYP[r.id] ?? 'inne')
  nazwij(k, 8.8, 94.6, 'WC dla klientów', 'wc')

  // Meble z katalogu planera w miejscach mebli z wizualizacji.
  const m = (wzor: string, x: number, y: number, obr = 0) => dodajMebel(k, wzor, P(x, y), obr)
  m('auto', 10.4, 104.2, 0); m('auto', 13.4, 104.2, 0)
  m('pianino', 9.3, 98.4, 90); m('bieznia', 13.9, 97.3, 90); m('lawka', 12.3, 99.6, 0)
  for (const yc of [93.8, 90.15]) { m('biurko', 12.9, yc, 90); m('regal', 12.3, yc + 1.4, 0) }
  m('blat', 11.73, 59.26, 0); m('slupek', 9.0, 59.26, 0); m('lodowka', 14.6, 59.26, 0)
  m('wyspa', 11.4, 57.1, 0)
  m('stolkonf', 10.4, 52.3, 0)
  for (const x of [9.2, 10.0, 10.8, 11.6]) { m('krzeslo', x, 51.42, 180); m('krzeslo', x, 53.18, 0) }
  m('naroznik', 10.4, 48.5, 180); m('kominek', 10.4, 46.5, 0); m('fotel', 6.75, 45.6, 0); m('fotel', 14.1, 45.6, 0)
  m('lozko160', 14.1, 31.3, 0); m('wanna', 12.75, 35.25, 90); m('umywalka', 13.9, 37.6, 0); m('prysznic', 14.3, 33.75, 0); m('wc', 14.85, 36.3, 270)
  m('szafa', 12.13, 39.49, 90); m('szafa', 16.07, 39.85, 270)
  for (const y0 of [68.6, 73.3, 78.0]) {
    m('lozko90', 13.4, y0 + 1.15, 180); m('biurko', 12.4, y0 + 4.16, 0); m('szafa', 9.35, y0 + 4.23, 180)
    m('umywalka', 9.6, y0 + 2.05, 0); m('wc', 8.45, y0 + 1.5, 90); m('prysznic', 9.3, y0 + 0.55, 0)
  }
  m('wc', 8.45, 65.35, 90); m('pralka', 8.6, 68.1, 0); m('pralka', 9.3, 68.1, 0); m('piec', 13.6, 65.4, 0)
  m('roslina', 6.3, 50.0); m('roslina', 14.55, 44.75); m('roslina', 16.0, 27.3)

  // Zagospodarowanie działki.
  const t = (rodzaj: Projekt['teren'][number]['rodzaj'], x0: number, x1: number, y0: number, y1: number) =>
    p.teren.push({ id: noweId('t'), rodzaj, x: (x0 + x1) / 2, y: (y0 + y1) / 2, szer: x1 - x0, gl: y1 - y0, obrot: 0 })
  t('podjazd', 4.8, 16.2, 108.15, 114.6)
  t('podjazd', 6.0, 12.2, 114.6, 121.4)
  t('sciezka', 2.1, 4.9, 89.2, 108.15)
  t('taras', 3.3, 11.4, 20.6, 41.6)
  t('taras', 5.4, 15.4, 41.6, 44.0)
  t('taras', 3.3, 5.4, 44.0, 50.6)
  t('taras', 11.4, 16.8, 22.7, 26.4)
  t('woda', BASEN.x0, BASEN.x1, BASEN.y0, BASEN.y1)
  t('trawnik', 8.2, 15.4, 83.0, 88.0)
  t('woda', 8.5, 15.1, 60.3, 63.7)
  for (const d of DRZEWA.filter((q) => q.h > 0)) {
    const r = d.gat === 'klon' || d.gat === 'klon_zielony' ? 3 : d.gat === 'jesion' ? 9 : d.gat === 'sosna' ? 5 : 4
    t('drzewo', d.x - r / 2, d.x + r / 2, d.y - r / 2, d.y + r / 2)
  }
  t('zywoplot', 0.3, 1.2, 3.0, 112.0)
  t('zywoplot', 18.4, 19.2, 27.0, 108.0)
  p.teren.push({ id: noweId('t'), rodzaj: 'ogrodzenie', x: 9.7, y: 121.6, szer: 0.12, gl: 19.4, obrot: -96.88 })

  // Dachy: stodoły dwuspadowe bez okapów, salon i apartament z dachem wysuniętym nad taras, łączniki płaskie.
  const KOL: Record<string, number> = { A: 0.2, B: 0, C: 0.4, D: 0 }
  for (const q of PAWILONY) {
    const y0 = q.y0 - q.wysY0, y1 = q.y1 + q.wysY1
    p.dach.czesci.push({
      id: noweId('d'), x: (q.x0 + q.x1) / 2, y: (y0 + y1) / 2, szer: q.x1 - q.x0, gl: y1 - y0, obrot: 0,
      rodzaj: 'dwuspadowy', kat: q.kat, okap: 0.03, kalenicaPoprzecznie: false, odwroc: false, kolankowa: KOL[q.id] ?? 0,
      szklaneSzczyty: !!q.szklanySzczyt, elewacja: CIEMNA, wykonczenie: 'deska',
    })
  }
  for (const l of LACZNIKI) {
    p.dach.czesci.push({
      id: noweId('d'), x: (l.x0 + l.x1) / 2, y: (l.y0 + l.y1) / 2, szer: l.x1 - l.x0 + 0.3, gl: l.y1 - l.y0, obrot: 0,
      rodzaj: 'plaski', kat: 0, okap: 0.15, kalenicaPoprzecznie: false, odwroc: false, kolankowa: 0,
    })
  }
  void T_ZEW
  return p
}
