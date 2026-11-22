// Graf ścian: porządkowanie (łączenie węzłów, cięcie w skrzyżowaniach) i wykrywanie pomieszczeń.

import { Pt, cross, dist, dot, klucz, lerp, norm, odsunWielokat, pole, poleZnak, przeciecie, rpt, rzutNaOdcinek, srodekWizualny, sub, wWielokacie } from './geom'
import { Etykieta, Kondygnacja, Otwor, Sciana, noweId } from './typy'

const MIN_DL = 0.03

export function uporzadkuj(scianyWe: Sciana[], otworyWe: Otwor[]): { sciany: Sciana[]; otwory: Otwor[] } {
  let sciany = scianyWe.map((s) => ({ ...s, a: rpt(s.a), b: rpt(s.b) })).filter((s) => dist(s.a, s.b) >= MIN_DL)
  let otwory = otworyWe.map((o) => ({ ...o }))

  // 1. Sklejenie węzłów leżących bliżej niż 2 cm.
  const wezly: Pt[] = []
  const przyciagnij = (p: Pt): Pt => {
    for (const w of wezly) if (dist(w, p) < 0.02) return w
    wezly.push(p)
    return p
  }
  for (const s of sciany) { s.a = przyciagnij(s.a); s.b = przyciagnij(s.b) }
  sciany = sciany.filter((s) => dist(s.a, s.b) >= MIN_DL)

  // 2. Punkty przecięć wnętrz ścian stają się węzłami.
  for (let i = 0; i < sciany.length; i++) for (let j = i + 1; j < sciany.length; j++) {
    const x = przeciecie(sciany[i].a, sciany[i].b, sciany[j].a, sciany[j].b)
    if (!x) continue
    const li = dist(sciany[i].a, sciany[i].b), lj = dist(sciany[j].a, sciany[j].b)
    const wi = x.t * li > 0.01 && (1 - x.t) * li > 0.01
    const wj = x.u * lj > 0.01 && (1 - x.u) * lj > 0.01
    if (wi || wj) przyciagnij(rpt(x.p))
  }

  // 3. Cięcie ścian w węzłach leżących na ich wnętrzu.
  const pociete: Sciana[] = []
  for (const s of sciany) {
    const L = dist(s.a, s.b)
    const ciecia: { t: number; p: Pt }[] = []
    for (const w of wezly) {
      const r = rzutNaOdcinek(w, s.a, s.b)
      if (r.d < 0.012 && r.t * L > 0.015 && (1 - r.t) * L > 0.015) ciecia.push({ t: r.t, p: w })
    }
    if (!ciecia.length) { pociete.push(s); continue }
    ciecia.sort((x, y) => x.t - y.t)
    const pkty = [s.a, ...ciecia.map((c) => c.p), s.b]
    const moje = otwory.filter((o) => o.scianaId === s.id)
    let start = 0
    for (let i = 0; i < pkty.length - 1; i++) {
      const dl = dist(pkty[i], pkty[i + 1])
      const id = i === 0 ? s.id : noweId('s')
      pociete.push({ ...s, id, a: pkty[i], b: pkty[i + 1] })
      const ostatni = i === pkty.length - 2
      for (const o of moje) {
        if (o.poz >= start - 1e-6 && (o.poz < start + dl || ostatni)) {
          if (!(o as any)._ok) { o.scianaId = id; o.poz = o.poz - start; (o as any)._ok = true }
        }
      }
      start += dl
    }
    for (const o of moje) delete (o as any)._ok
  }
  sciany = pociete

  // 4. Usunięcie powtórzonych ścian (ta sama para węzłów).
  const pary = new Map<string, Sciana>()
  const wynik: Sciana[] = []
  for (const s of sciany) {
    const ka = klucz(s.a), kb = klucz(s.b)
    const k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
    const jest = pary.get(k)
    if (!jest) { pary.set(k, s); wynik.push(s); continue }
    const odwrotnie = klucz(jest.a) !== ka
    const L = dist(s.a, s.b)
    for (const o of otwory) if (o.scianaId === s.id) {
      o.scianaId = jest.id
      if (odwrotnie) { o.poz = L - o.poz; o.zawias = -o.zawias as 1 | -1; o.strona = -o.strona as 1 | -1 }
    }
    if (s.grubosc > jest.grubosc) { jest.grubosc = s.grubosc; jest.rodzaj = s.rodzaj }
  }
  sciany = wynik

  // 5. Scalenie współliniowych ścian w węzłach, w których spotykają się tylko dwie.
  let zmiana = true
  while (zmiana) {
    zmiana = false
    const wWezle = new Map<string, Sciana[]>()
    for (const s of sciany) for (const p of [s.a, s.b]) {
      const k = klucz(p)
      if (!wWezle.has(k)) wWezle.set(k, [])
      wWezle.get(k)!.push(s)
    }
    for (const [k, lista] of wWezle) {
      if (lista.length !== 2) continue
      const [s1, s2] = lista
      if (s1.rodzaj !== s2.rodzaj || Math.abs(s1.grubosc - s2.grubosc) > 1e-6) continue
      const d1 = norm(sub(s1.b, s1.a)), d2 = norm(sub(s2.b, s2.a))
      if (Math.abs(cross(d1, d2)) > 2e-3) continue
      const l1 = dist(s1.a, s1.b), l2 = dist(s2.a, s2.b)
      const s1konczy = klucz(s1.b) === k
      const s2zaczyna = klucz(s2.a) === k
      const dalszy = s2zaczyna ? s2.b : s2.a
      const o1 = otwory.filter((o) => o.scianaId === s1.id)
      const o2 = otwory.filter((o) => o.scianaId === s2.id)
      if (s1konczy) {
        s1.b = dalszy
        for (const o of o2) {
          o.scianaId = s1.id
          if (s2zaczyna) o.poz = l1 + o.poz
          else { o.poz = l1 + (l2 - o.poz); o.zawias = -o.zawias as 1 | -1; o.strona = -o.strona as 1 | -1 }
        }
      } else {
        s1.a = dalszy
        for (const o of o1) o.poz = l2 + o.poz
        for (const o of o2) {
          o.scianaId = s1.id
          if (s2zaczyna) { o.poz = l2 - o.poz; o.zawias = -o.zawias as 1 | -1; o.strona = -o.strona as 1 | -1 }
        }
      }
      sciany = sciany.filter((s) => s !== s2)
      zmiana = true
      break
    }
  }

  // 6. Otwory: tylko na istniejących ścianach, w ich długości.
  const poId = new Map(sciany.map((s) => [s.id, s]))
  otwory = otwory.filter((o) => poId.has(o.scianaId))
  for (const o of otwory) {
    const s = poId.get(o.scianaId)!
    const L = dist(s.a, s.b)
    o.szer = Math.min(o.szer, Math.max(0.4, L - 0.1))
    o.poz = Math.max(o.szer / 2 + 0.02, Math.min(L - o.szer / 2 - 0.02, o.poz))
  }
  return { sciany: sciany.map((s) => ({ ...s, a: { ...s.a }, b: { ...s.b } })), otwory }
}

export type Pokoj = {
  klucz: string
  /** Obieg po osiach ścian (ccw). */
  obieg: Pt[]
  /** Obrys po licach wewnętrznych. */
  wnetrze: Pt[]
  pow: number
  scianyIds: string[]
  etykieta: Etykieta | null
  srodek: Pt
}
export type Obrys = { os: Pt[]; zewn: Pt[]; scianyIds: string[]; pow: number }
export type Uklad = { pokoje: Pokoj[]; obrysy: Obrys[]; zewnetrzne: Set<string> }

type Pol = { od: Pt; doP: Pt; sciana: Sciana }

function bezSlepych(e: Pol[]): Pol[] {
  let q = e.slice()
  let zmiana = true
  while (zmiana && q.length > 2) {
    zmiana = false
    for (let i = 0; i < q.length; i++) {
      const j = (i + 1) % q.length
      if (q[i].sciana === q[j].sciana) {
        if (j > i) q.splice(i, 2)
        else { q.splice(i, 1); q.splice(0, 1) }
        zmiana = true
        break
      }
    }
  }
  return q
}

export function znajdzUklad(k: Pick<Kondygnacja, 'sciany' | 'etykiety'>): Uklad {
  const wyj = new Map<string, { do: string; s: Sciana; kat: number; p: Pt; q: Pt }[]>()
  const dodaj = (p: Pt, q: Pt, s: Sciana) => {
    const kp = klucz(p)
    if (!wyj.has(kp)) wyj.set(kp, [])
    wyj.get(kp)!.push({ do: klucz(q), s, kat: Math.atan2(q.y - p.y, q.x - p.x), p, q })
  }
  for (const s of k.sciany) { dodaj(s.a, s.b, s); dodaj(s.b, s.a, s) }
  for (const l of wyj.values()) l.sort((a, b) => a.kat - b.kat)

  const odwiedzone = new Set<string>()
  const pokoje: Pokoj[] = []
  const obrysy: Obrys[] = []
  const zewnetrzne = new Set<string>()
  const uzyteEtykiety = new Set<string>()

  for (const [kp, lista] of wyj) for (const start of lista) {
    const idStart = `${start.s.id}>${start.do}`
    if (odwiedzone.has(idStart)) continue
    const obieg: Pol[] = []
    let akt = start, skad = kp, bezp = 0
    while (bezp++ < 5000) {
      const id = `${akt.s.id}>${akt.do}`
      if (odwiedzone.has(id)) break
      odwiedzone.add(id)
      obieg.push({ od: akt.p, doP: akt.q, sciana: akt.s })
      const l = wyj.get(akt.do)!
      const iBliz = l.findIndex((x) => x.s === akt.s && x.do === skad)
      const nast = l[(iBliz - 1 + l.length) % l.length]
      skad = akt.do
      akt = nast
    }
    const czysty = bezSlepych(obieg)
    if (czysty.length < 3) continue
    const pkty = czysty.map((e) => e.od)
    const a = poleZnak(pkty)
    if (a > 0.05) {
      let wnetrze = odsunWielokat(pkty, czysty.map((e) => -e.sciana.grubosc / 2))
      if (poleZnak(wnetrze) <= 0.01) wnetrze = pkty
      const et = k.etykiety.find((e) => !uzyteEtykiety.has(e.id) && wWielokacie({ x: e.x, y: e.y }, pkty)) ?? null
      if (et) uzyteEtykiety.add(et.id)
      const srodek = srodekWizualny(wnetrze)
      pokoje.push({
        klucz: et ? et.id : `p${srodek.x.toFixed(1)},${srodek.y.toFixed(1)}`,
        obieg: pkty, wnetrze, pow: pole(wnetrze), scianyIds: czysty.map((e) => e.sciana.id), etykieta: et, srodek,
      })
    } else if (a < -0.5) {
      const n = czysty.length
      const os = pkty.slice().reverse()
      const kraw = os.map((_, i) => czysty[(n - 2 - i + n) % n].sciana)
      const zewn = odsunWielokat(os, kraw.map((s) => s.grubosc / 2))
      for (const s of kraw) zewnetrzne.add(s.id)
      obrysy.push({ os, zewn, scianyIds: kraw.map((s) => s.id), pow: pole(zewn) })
    }
  }
  return { pokoje, obrysy, zewnetrzne }
}

/** Punkt na ścianie w odległości poz od końca a. */
export function punktNaScianie(s: Sciana, poz: number): Pt {
  const L = dist(s.a, s.b)
  return lerp(s.a, s.b, L < 1e-6 ? 0 : poz / L)
}

/** Normalna ściany skierowana na zewnątrz budynku (dla ścian zewnętrznych). */
export function normalnaZewn(s: Sciana, obrysy: Obrys[]): Pt {
  const d = norm(sub(s.b, s.a))
  const n = { x: d.y, y: -d.x }
  const sr = lerp(s.a, s.b, 0.5)
  const test = { x: sr.x + n.x * (s.grubosc / 2 + 0.08), y: sr.y + n.y * (s.grubosc / 2 + 0.08) }
  for (const o of obrysy) if (o.scianyIds.includes(s.id)) return wWielokacie(test, o.zewn) ? { x: -n.x, y: -n.y } : n
  return n
}

export const dlugosc = (s: Sciana) => dist(s.a, s.b)
export const kierunek = (s: Sciana) => norm(sub(s.b, s.a))
export { dot }
