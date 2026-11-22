import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GRANICA, TEREN_MN } from '../dane/dzialka'
import { policz } from '../model/analiza'
import { Pt, add, cross, dist, dot, fmtM, klucz, lerp, mul, norm, perp, przeciecie, ramka, rot, rpt, rzutNaOdcinek, sub } from '../model/geom'
import { OTWORY, SCIANY } from '../model/katalog'
import { aktywnaKondygnacja, useMagazyn } from '../model/magazyn'
import { dodajCzescDachu, dodajOtwor, dodajProstokat, dodajSciane, dodajTeren, naroznikiProstokata, porzadek, przesunWezel, sprzatnijEtykiety } from '../model/operacje'
import { punktNaScianie, znajdzUklad } from '../model/topologia'
import { elementyDachu } from '../model/dach'
import type { CzescDachu, Projekt, Sciana } from '../model/typy'
import { DachRys, Dzialka, EtykietyPokoi, KOLOR, MebelRys, Napis, OtworRys, Podklady, Pokoje, Sciany, Siatka, TerenRys, Wymiar, sciankaWielokat } from './Rysunki'
import { Rzutnia, rzutnia, sciezka } from './rzutnia'

type Ciag =
  | { typ: 'widok'; cx: number; cy: number; r0: Rzutnia }
  | { typ: 'sciana'; id: string; bazowy: Projekt; a0: Pt; b0: Pt }
  | { typ: 'wezel'; kl: string; bazowy: Projekt }
  | { typ: 'otwor'; id: string }
  | { typ: 'mebel' | 'teren'; id: string; dx: number; dy: number }
  | { typ: 'obrot'; co: 'mebel' | 'teren'; id: string }
  | { typ: 'dach'; id: string; dx: number; dy: number }
  | { typ: 'dach-krawedz'; id: string; k: number; baza: CzescDachu }

type Przyciaganie = { p: Pt; wezel: boolean; prow: { a: Pt; b: Pt }[] }

const klon = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export function dopasujWidok(pkty: Pt[], W: number, H: number, obrot: number, margines = 60) {
  const k = (obrot * Math.PI) / 180
  const f = ramka(pkty.map((p) => rot(p, k)))
  const skala = Math.max(2, Math.min(160, Math.min((W - 2 * margines) / Math.max(f.w, 1), (H - 2 * margines) / Math.max(f.h, 1))))
  const c = rot({ x: (f.minx + f.maxx) / 2, y: (f.miny + f.maxy) / 2 }, -k)
  return { cx: c.x, cy: c.y, skala }
}

export function Rzut() {
  const pojemnik = useRef<HTMLDivElement>(null)
  const [roz, setRoz] = useState({ W: 900, H: 600 })
  const s = useMagazyn()
  const k = aktywnaKondygnacja(s)
  const indeks = s.projekt.kondygnacje.findIndex((x) => x.id === k.id)
  const nizej = indeks > 0 ? s.projekt.kondygnacje[indeks - 1] : null
  const r = useMemo(() => rzutnia(s.widok, roz.W, roz.H), [s.widok, roz])
  const uklad = useMemo(() => znajdzUklad(k), [k])
  const wsk = useMemo(() => policz(s.projekt), [s.projekt])
  const dachy = useMemo(() => elementyDachu(s.projekt, wsk.uklady), [s.projekt, wsk])
  // Narożniki obrysów i części dachu: do nich przyciąga się rysowana część.
  const rogiDoDachu = useMemo(() => [
    ...wsk.uklady.flatMap((u) => u.obrysy.flatMap((o) => o.zewn)),
    ...s.projekt.dach.czesci.flatMap((c) => naroznikiProstokata(c.x, c.y, c.szer, c.gl, c.obrot)),
  ], [wsk, s.projekt.dach.czesci])
  const bledne = useMemo(() => new Set(wsk.uwagi.filter((u) => u.scianaId && u.kondygnacja === k.id).map((u) => u.scianaId!)), [wsk, k.id])

  const [kursor, setKursor] = useState<Przyciaganie | null>(null)
  const [lancuch, setLancuch] = useState<Pt | null>(null)
  const [rog, setRog] = useState<Pt | null>(null)
  const [wpis, setWpis] = useState('')
  const [miara, setMiara] = useState<{ a: Pt; b: Pt | null } | null>(null)
  const [podglad, setPodglad] = useState<{ s: Sciana; poz: number; strona: 1 | -1 } | null>(null)
  const ciag = useRef<{ c: Ciag; start: Pt; ruszyl: boolean } | null>(null)
  const wcisniecie = useRef<Pt | null>(null)
  const dopasowano = useRef(false)

  useEffect(() => {
    const el = pojemnik.current
    if (!el) return
    const ob = new ResizeObserver(() => setRoz({ W: el.clientWidth, H: el.clientHeight }))
    ob.observe(el)
    setRoz({ W: el.clientWidth, H: el.clientHeight })
    return () => ob.disconnect()
  }, [])

  // Pierwsze ustawienie widoku: dom, a gdy go nie ma, północna część działki.
  useEffect(() => {
    if (dopasowano.current || roz.W < 100) return
    dopasowano.current = true
    const pk = s.projekt.kondygnacje.flatMap((x) => x.sciany.flatMap((q) => [q.a, q.b]))
    const cel = pk.length ? [...pk, { x: 0, y: ramka(pk).miny - 8 }, { x: 20, y: ramka(pk).maxy + 8 }] : [{ x: -4, y: 70 }, { x: 22, y: 124 }]
    s.ustawWidok(dopasujWidok(cel, roz.W, roz.H, s.widok.obrot))
  }, [roz]) // eslint-disable-line

  useEffect(() => { setLancuch(null); setRog(null); setWpis(''); setPodglad(null); if (s.narzedzie !== 'miara') setMiara(null) }, [s.narzedzie, s.aktywna])

  const zdarzenieDoModelu = (e: { clientX: number; clientY: number }) => {
    const b = pojemnik.current!.getBoundingClientRect()
    const ekr = { x: e.clientX - b.left, y: e.clientY - b.top }
    return { ekr, m: r.zE(ekr) }
  }

  const przyciagnij = useCallback((surowy: Pt, od: Pt | null, alt: boolean, grubosc = 0, pominWezel?: string, dodatkowe?: Pt[]): Przyciaganie => {
    if (alt) return { p: rpt(surowy), wezel: false, prow: [] }
    const tol = 10 / r.skala
    const krok = r.skala >= 45 ? 0.05 : 0.1
    const wezly: Pt[] = []
    const byly = new Set<string>()
    for (const sc of k.sciany) for (const q of [sc.a, sc.b]) { const kl = klucz(q); if (!byly.has(kl) && kl !== pominWezel) { byly.add(kl); wezly.push(q) } }
    if (dodatkowe) for (const q of dodatkowe) { const kl = klucz(q); if (!byly.has(kl)) { byly.add(kl); wezly.push(q) } }
    let naj: Pt | null = null, dn = tol
    for (const w of wezly) { const d = dist(w, surowy); if (d < dn) { dn = d; naj = w } }
    if (naj) return { p: { ...naj }, wezel: true, prow: [] }

    if (od) {
      // Start na ukośnej ścianie: kierunek łapie się równolegle albo prostopadle do niej.
      const v = sub(surowy, od), dlV = Math.hypot(v.x, v.y)
      if (dlV > 0.15) for (const sc of k.sciany) {
        if (dist(sc.a, od) > 0.02 && dist(sc.b, od) > 0.02 && rzutNaOdcinek(od, sc.a, sc.b).d > 0.02) continue
        const kier = norm(sub(sc.b, sc.a))
        if (Math.abs(kier.x) < 0.02 || Math.abs(kier.y) < 0.02) continue
        for (const c of [kier, perp(kier)]) {
          if (Math.abs(cross(v, c)) / dlV > 0.12) continue
          const L = Math.round(dot(v, c) / krok) * krok
          if (Math.abs(L) < 0.05) continue
          const p = rpt(add(od, mul(c, L)))
          return { p, wezel: false, prow: [{ a: od, b: p }] }
        }
      }
    }
    const prow: { a: Pt; b: Pt }[] = []
    const os = (wsp: 'x' | 'y'): number => {
      const v = surowy[wsp]
      const kand: { v: number; zr: Pt | null }[] = []
      if (od) kand.push({ v: od[wsp], zr: od })
      for (const w of wezly) kand.push({ v: w[wsp], zr: w })
      if (wsp === 'x' && grubosc > 0) kand.push({ v: 5 + grubosc / 2, zr: null })
      let best: { v: number; zr: Pt | null } | null = null, db = tol * 0.75
      for (const c of kand) { const d = Math.abs(c.v - v) - (c.zr === od && od ? tol * 0.2 : 0); if (d < db) { db = d; best = c } }
      if (best) {
        if (best.zr) prow.push({ a: best.zr, b: wsp === 'x' ? { x: best.v, y: surowy.y } : { x: surowy.x, y: best.v } })
        return best.v
      }
      return Math.round(v / krok) * krok
    }
    let p = { x: os('x'), y: os('y') }
    // Dociągnięcie do osi ściany, gdy kursor jest tuż przy niej.
    let ds = tol * 0.8
    for (const sc of k.sciany) {
      if (pominWezel && (klucz(sc.a) === pominWezel || klucz(sc.b) === pominWezel)) continue
      const rz = rzutNaOdcinek(surowy, sc.a, sc.b)
      if (rz.d >= ds) continue
      ds = rz.d
      if (Math.abs(sc.a.x - sc.b.x) < 1e-4) p = { x: sc.a.x, y: p.y }
      else if (Math.abs(sc.a.y - sc.b.y) < 1e-4) p = { x: p.x, y: sc.a.y }
      else p = rzutNaOdcinek(p, sc.a, sc.b).p
    }
    return { p: rpt(p), wezel: false, prow }
  }, [k, r.skala])

  const najblizszaSciana = (m: Pt, tolPx = 22) => {
    let best: { s: Sciana; poz: number; d: number; strona: 1 | -1 } | null = null
    for (const sc of k.sciany) {
      const rz = rzutNaOdcinek(m, sc.a, sc.b)
      if (rz.d * r.skala > tolPx || (best && rz.d >= best.d)) continue
      const L = dist(sc.a, sc.b)
      const n = perp(norm(sub(sc.b, sc.a)))
      best = { s: sc, poz: Math.round((rz.t * L) / 0.05) * 0.05, d: rz.d, strona: dot(sub(m, rz.p), n) >= 0 ? 1 : -1 }
    }
    return best
  }

  // --- Mysz ---
  const naDol = (e: React.PointerEvent) => {
    if (e.button === 2) return
    const { ekr, m } = zdarzenieDoModelu(e)
    wcisniecie.current = ekr
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    const przesuwanie = e.button === 1
    if (przesuwanie) { ciag.current = { c: { typ: 'widok', cx: s.widok.cx, cy: s.widok.cy, r0: r }, start: ekr, ruszyl: false }; return }

    const cel = (e.target as Element).closest('[data-typ]') as HTMLElement | null
    const typ = cel?.dataset.typ
    const id = cel?.dataset.id ?? ''
    if (typ === 'dach-krawedz' && (s.narzedzie === 'zaznacz' || s.narzedzie === 'dach')) {
      const cz = s.projekt.dach.czesci.find((x) => x.id === id)
      if (cz) ciag.current = { c: { typ: 'dach-krawedz', id, k: +cel!.dataset.k!, baza: { ...cz } }, start: ekr, ruszyl: false }
      return
    }
    if (typ === 'dach' && (s.narzedzie === 'zaznacz' || s.narzedzie === 'dach') && !rog) {
      const cz = s.projekt.dach.czesci.find((x) => x.id === id)
      if (cz) {
        s.ustaw({ zaznaczenie: { typ: 'dach', id } })
        ciag.current = { c: { typ: 'dach', id, dx: cz.x - m.x, dy: cz.y - m.y }, start: ekr, ruszyl: false }
      }
      return
    }
    if (s.narzedzie === 'zaznacz') {
      if (typ === 'wezel') ciag.current = { c: { typ: 'wezel', kl: cel!.dataset.klucz!, bazowy: s.projekt }, start: ekr, ruszyl: false }
      else if (typ === 'obrot') ciag.current = { c: { typ: 'obrot', co: cel!.dataset.co as 'mebel' | 'teren', id }, start: ekr, ruszyl: false }
      else if (typ === 'sciana') {
        const sc = k.sciany.find((x) => x.id === id)!
        s.ustaw({ zaznaczenie: { typ: 'sciana', id } })
        ciag.current = { c: { typ: 'sciana', id, bazowy: s.projekt, a0: sc.a, b0: sc.b }, start: ekr, ruszyl: false }
      } else if (typ === 'otwor') {
        s.ustaw({ zaznaczenie: { typ: 'otwor', id } })
        ciag.current = { c: { typ: 'otwor', id }, start: ekr, ruszyl: false }
      } else if (typ === 'mebel') {
        const mb = k.meble.find((x) => x.id === id)!
        s.ustaw({ zaznaczenie: { typ: 'mebel', id } })
        ciag.current = { c: { typ: 'mebel', id, dx: mb.x - m.x, dy: mb.y - m.y }, start: ekr, ruszyl: false }
      } else if (typ === 'teren') {
        const t = s.projekt.teren.find((x) => x.id === id)!
        s.ustaw({ zaznaczenie: { typ: 'teren', id } })
        ciag.current = { c: { typ: 'teren', id, dx: t.x - m.x, dy: t.y - m.y }, start: ekr, ruszyl: false }
      } else {
        s.ustaw({ zaznaczenie: typ === 'pokoj' ? { typ: 'pokoj', klucz: cel!.dataset.klucz! } : null })
        ciag.current = { c: { typ: 'widok', cx: s.widok.cx, cy: s.widok.cy, r0: r }, start: ekr, ruszyl: false }
      }
      return
    }

    if (s.narzedzie === 'sciana') {
      const sn = przyciagnij(m, lancuch, e.altKey, SCIANY[s.rodzajSciany].grubosc)
      if (!lancuch) { setLancuch(sn.p); return }
      if (dist(lancuch, sn.p) < 0.05) return
      const od = lancuch
      s.zmien((_, kk) => { dodajSciane(kk, od, sn.p, s.rodzajSciany) })
      setWpis('')
      setLancuch(sn.wezel ? null : sn.p)
      return
    }
    if (s.narzedzie === 'pokoj') {
      const sn = przyciagnij(m, rog, e.altKey, SCIANY[s.rodzajSciany].grubosc)
      if (!rog) { setRog(sn.p); return }
      const a = rog
      s.zmien((_, kk) => dodajProstokat(kk, a, sn.p, s.rodzajSciany))
      setRog(null)
      return
    }
    if (s.narzedzie === 'drzwi' || s.narzedzie === 'okno') {
      const n = najblizszaSciana(m)
      if (!n) return
      let noweId = ''
      s.zmien((_, kk) => {
        const sc = kk.sciany.find((x) => x.id === n.s.id)
        if (sc) noweId = dodajOtwor(kk, sc, n.poz, s.rodzajOtworu, n.strona)
      })
      if (noweId) s.ustaw({ zaznaczenie: { typ: 'otwor', id: noweId } })
      return
    }
    if (s.narzedzie === 'miara') {
      const sn = przyciagnij(m, null, e.altKey)
      setMiara(!miara || miara.b ? { a: sn.p, b: null } : { a: miara.a, b: sn.p })
      return
    }
    if (s.narzedzie === 'dach') {
      const sn = przyciagnij(m, rog, e.altKey, 0, undefined, rogiDoDachu)
      if (!rog) { setRog(sn.p); s.ustaw({ zaznaczenie: null }); return }
      const a = rog
      let nowe: string | null = null
      s.zmien((pr) => { nowe = dodajCzescDachu(pr, a, sn.p, s.rodzajDachu) })
      if (nowe) s.ustaw({ zaznaczenie: { typ: 'dach', id: nowe } })
      setRog(null)
      return
    }
    if (s.narzedzie === 'teren') {
      const p = e.altKey ? m : { x: Math.round(m.x / 0.1) * 0.1, y: Math.round(m.y / 0.1) * 0.1 }
      let id = ''
      s.zmien((pr) => { id = dodajTeren(pr, s.rodzajTerenu, p) })
      s.ustaw({ zaznaczenie: { typ: 'teren', id }, narzedzie: 'zaznacz' })
    }
  }

  const naRuch = (e: React.PointerEvent) => {
    const { ekr, m } = zdarzenieDoModelu(e)
    const c = ciag.current
    if (c) {
      if (!c.ruszyl && dist(ekr, c.start) < 4) return
      const pierwszy = !c.ruszyl
      c.ruszyl = true
      const krok = e.altKey ? 0.001 : r.skala >= 45 ? 0.05 : 0.1
      const zaokr = (v: number) => Math.round(v / krok) * krok
      const d = c.c
      if (d.typ === 'widok') {
        const m0 = d.r0.zE(c.start), m1 = d.r0.zE(ekr)
        s.ustawWidok({ cx: d.cx - (m1.x - m0.x), cy: d.cy - (m1.y - m0.y) })
        return
      }
      if (pierwszy) s.punktHistorii()
      if (d.typ === 'sciana') {
        const n = perp(norm(sub(d.b0, d.a0)))
        const przes = zaokr(dot(sub(m, r.zE(c.start)), n))
        const pr = klon(d.bazowy)
        const kk = pr.kondygnacje.find((x) => x.id === k.id)!
        const ka = klucz(d.a0), kb = klucz(d.b0)
        przesunWezel(kk, ka, add(d.a0, mul(n, przes)))
        przesunWezel(kk, kb, add(d.b0, mul(n, przes)))
        useMagazyn.setState({ projekt: pr })
      } else if (d.typ === 'wezel') {
        const sn = przyciagnij(m, null, e.altKey, 0, d.kl)
        const pr = klon(d.bazowy)
        przesunWezel(pr.kondygnacje.find((x) => x.id === k.id)!, d.kl, sn.p)
        useMagazyn.setState({ projekt: pr })
        setKursor(sn)
      } else if (d.typ === 'otwor') {
        s.zmienRoboczo((_, kk) => {
          const o = kk.otwory.find((x) => x.id === d.id), sc = o && kk.sciany.find((x) => x.id === o.scianaId)
          if (!o || !sc) return
          const L = dist(sc.a, sc.b)
          const rz = rzutNaOdcinek(m, sc.a, sc.b)
          o.poz = Math.max(o.szer / 2 + 0.02, Math.min(L - o.szer / 2 - 0.02, zaokr(rz.t * L)))
        })
      } else if (d.typ === 'mebel') {
        s.zmienRoboczo((_, kk) => { const mb = kk.meble.find((x) => x.id === d.id); if (mb) { mb.x = zaokr(m.x + d.dx); mb.y = zaokr(m.y + d.dy) } })
      } else if (d.typ === 'teren') {
        s.zmienRoboczo((pr) => { const t = pr.teren.find((x) => x.id === d.id); if (t) { t.x = zaokr(m.x + d.dx); t.y = zaokr(m.y + d.dy) } })
      } else if (d.typ === 'dach') {
        s.zmienRoboczo((pr) => { const c = pr.dach.czesci.find((x) => x.id === d.id); if (c) { c.x = zaokr(m.x + d.dx); c.y = zaokr(m.y + d.dy) } })
      } else if (d.typ === 'dach-krawedz') {
        // Krawędzie: 0 prawa, 1 górna, 2 lewa, 3 dolna (w układzie części). Druga strona zostaje w miejscu.
        const b = d.baza
        const kt = (b.obrot * Math.PI) / 180
        const pozioma = d.k % 2 === 0
        const os = pozioma ? { x: Math.cos(kt), y: Math.sin(kt) } : { x: -Math.sin(kt), y: Math.cos(kt) }
        const zn = d.k < 2 ? 1 : -1
        const pol = (pozioma ? b.szer : b.gl) / 2
        const c0 = dot({ x: b.x, y: b.y }, os)
        let t = zaokr(dot(m, os))
        if (!e.altKey) for (const q of rogiDoDachu) { const v = dot(q, os); if (Math.abs(v - dot(m, os)) < 9 / r.skala) { t = v; break } }
        const staly = c0 - zn * pol
        const wymiar = Math.max(0.5, zn * (t - staly))
        const srodek = staly + (zn * wymiar) / 2
        s.zmienRoboczo((pr) => {
          const c = pr.dach.czesci.find((x) => x.id === d.id)
          if (!c) return
          if (pozioma) c.szer = Math.round(wymiar * 1000) / 1000; else c.gl = Math.round(wymiar * 1000) / 1000
          c.x = b.x + os.x * (srodek - c0)
          c.y = b.y + os.y * (srodek - c0)
        })
      } else if (d.typ === 'obrot') {
        s.zmienRoboczo((pr, kk) => {
          const ob = d.co === 'mebel' ? kk.meble.find((x) => x.id === d.id) : pr.teren.find((x) => x.id === d.id)
          if (!ob) return
          let kat = (Math.atan2(m.y - ob.y, m.x - ob.x) * 180) / Math.PI - 90
          if (!e.altKey) kat = Math.round(kat / 15) * 15
          ob.obrot = ((kat % 360) + 360) % 360
        })
      }
      return
    }

    if (s.narzedzie === 'sciana') setKursor(przyciagnij(m, lancuch, e.altKey, SCIANY[s.rodzajSciany].grubosc))
    else if (s.narzedzie === 'pokoj') setKursor(przyciagnij(m, rog, e.altKey, SCIANY[s.rodzajSciany].grubosc))
    else if (s.narzedzie === 'dach') setKursor(przyciagnij(m, rog, e.altKey, 0, undefined, rogiDoDachu))
    else if (s.narzedzie === 'miara') setKursor(przyciagnij(m, null, e.altKey))
    else if (s.narzedzie === 'drzwi' || s.narzedzie === 'okno') {
      const n = najblizszaSciana(m)
      setPodglad(n ? { s: n.s, poz: n.poz, strona: n.strona } : null)
      setKursor({ p: m, wezel: false, prow: [] })
    } else setKursor({ p: m, wezel: false, prow: [] })
  }

  const naGore = (e: React.PointerEvent) => {
    const c = ciag.current
    ciag.current = null
    const { ekr, m } = zdarzenieDoModelu(e)
    if (c?.ruszyl && (c.c.typ === 'sciana' || c.c.typ === 'wezel')) {
      s.zmienRoboczo((_, kk) => { porzadek(kk); sprzatnijEtykiety(kk) })
      if (c.c.typ === 'wezel') s.ustaw({ zaznaczenie: null })
      setKursor(null)
    }
    if (s.narzedzie === 'dach' && rog && wcisniecie.current && dist(ekr, wcisniecie.current) > 10) {
      const sn = przyciagnij(m, rog, e.altKey, 0, undefined, rogiDoDachu)
      const a = rog
      let nowe: string | null = null
      s.zmien((pr) => { nowe = dodajCzescDachu(pr, a, sn.p, s.rodzajDachu) })
      if (nowe) s.ustaw({ zaznaczenie: { typ: 'dach', id: nowe } })
      setRog(null)
    }
    // Pokój można też narysować jednym przeciągnięciem.
    if (s.narzedzie === 'pokoj' && rog && wcisniecie.current && dist(ekr, wcisniecie.current) > 10) {
      const sn = przyciagnij(m, rog, e.altKey, SCIANY[s.rodzajSciany].grubosc)
      const a = rog
      s.zmien((_, kk) => dodajProstokat(kk, a, sn.p, s.rodzajSciany))
      setRog(null)
    }
  }

  const naKolko = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const st = useMagazyn.getState()
    const b = pojemnik.current!.getBoundingClientRect()
    const ekr = { x: e.clientX - b.left, y: e.clientY - b.top }
    const rr = rzutnia(st.widok, b.width, b.height)
    const przed = rr.zE(ekr)
    const skala = Math.max(1.5, Math.min(220, st.widok.skala * Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0016))))
    const po = rzutnia({ ...st.widok, skala }, b.width, b.height).zE(ekr)
    st.ustawWidok({ skala, cx: st.widok.cx + przed.x - po.x, cy: st.widok.cy + przed.y - po.y })
  }, [])
  useEffect(() => {
    const el = pojemnik.current
    if (!el) return
    el.addEventListener('wheel', naKolko, { passive: false })
    return () => el.removeEventListener('wheel', naKolko)
  }, [naKolko])

  // --- Klawiatura w trakcie rysowania ---
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      if (e.key === 'Escape') {
        if (lancuch || rog || miara || wpis) { setLancuch(null); setRog(null); setMiara(null); setWpis('') }
        else if (s.narzedzie !== 'zaznacz') s.ustaw({ narzedzie: 'zaznacz' })
        else s.ustaw({ zaznaczenie: null })
        return
      }
      if (s.narzedzie === 'sciana' && lancuch) {
        if (/^[0-9]$/.test(e.key) || e.key === ',' || e.key === '.') { setWpis((w) => (w + (e.key === '.' ? ',' : e.key)).slice(0, 7)); e.preventDefault(); return }
        if (e.key === 'Backspace' && wpis) { setWpis((w) => w.slice(0, -1)); e.preventDefault(); e.stopImmediatePropagation(); return }
        if (e.key === 'Enter') {
          const dl = parseFloat(wpis.replace(',', '.'))
          if (wpis && isFinite(dl) && dl > 0.05 && kursor) {
            const kier = norm(sub(kursor.p, lancuch))
            if (kier.x || kier.y) {
              const kon = rpt(add(lancuch, mul(kier, dl)))
              const od = lancuch
              s.zmien((_, kk) => { dodajSciane(kk, od, kon, s.rodzajSciany) })
              setLancuch(kon)
            }
          } else setLancuch(null)
          setWpis('')
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', f, true)
    return () => window.removeEventListener('keydown', f, true)
  }, [lancuch, rog, miara, wpis, kursor, s.narzedzie]) // eslint-disable-line

  // --- Rysunki pomocnicze ---
  const zazn = s.zaznaczenie
  const wybranaSciana = zazn?.typ === 'sciana' ? k.sciany.find((x) => x.id === zazn.id) : null
  const wybranyMebel = zazn?.typ === 'mebel' ? k.meble.find((x) => x.id === zazn.id) : null
  const wybranaCzesc = zazn?.typ === 'dach' ? s.projekt.dach.czesci.find((x) => x.id === zazn.id) : null
  const widacDach = s.warstwy.dach || s.narzedzie === 'dach' || zazn?.typ === 'dach'
  const wybranyTeren = zazn?.typ === 'teren' ? s.projekt.teren.find((x) => x.id === zazn.id) : null

  const uchwytObrotu = (ob: { x: number; y: number; szer: number; gl: number; obrot: number }, co: 'mebel' | 'teren', id: string) => {
    const kat = (ob.obrot * Math.PI) / 180
    const gora = rot({ x: ob.x, y: ob.y + ob.gl / 2 }, kat, ob)
    const uch = rot({ x: ob.x, y: ob.y + ob.gl / 2 + 22 / r.skala }, kat, ob)
    const a = r.doE(gora), b = r.doE(uch)
    return (
      <g>
        <path d={sciezka(naroznikiProstokata(ob.x, ob.y, ob.szer, ob.gl, ob.obrot).map(r.doE))} fill="none" stroke={KOLOR.akcent} strokeWidth={1.5} strokeDasharray="4 3" style={{ pointerEvents: 'none' }} />
        <path d={`M${a.x},${a.y}L${b.x},${b.y}`} stroke={KOLOR.akcent} strokeWidth={1.2} />
        <circle data-typ="obrot" data-co={co} data-id={id} cx={b.x} cy={b.y} r={6.5} fill="#fff" stroke={KOLOR.akcent} strokeWidth={2} style={{ cursor: 'grab' }} />
      </g>
    )
  }

  const wymiaryBudynku = useMemo(() => {
    if (!uklad.obrysy.length) return null
    const f = ramka(uklad.obrysy.flatMap((o) => o.zewn))
    const ym = (f.miny + f.maxy) / 2, xm = (f.minx + f.maxx) / 2
    // Najbliższa granica na prawo od domu i najbliższa za nim, wzdłuż osi rzutu.
    const obieg = [...GRANICA, GRANICA[0]]
    let xE: number | null = null
    for (let i = 0; i < obieg.length - 1; i++) { const x = przeciecie({ x: f.maxx, y: ym }, { x: f.maxx + 300, y: ym }, obieg[i], obieg[i + 1]); if (x && (xE == null || x.p.x < xE)) xE = x.p.x }
    const poln = [...TEREN_MN, TEREN_MN[0]]
    let yN: number | null = null
    for (let i = 0; i < poln.length - 1; i++) { const x = przeciecie({ x: xm, y: f.maxy }, { x: xm, y: f.maxy + 300 }, poln[i], poln[i + 1]); if (x && (yN == null || x.p.y < yN)) yN = x.p.y }
    return { f, ym, xm, xE, yN }
  }, [uklad])

  const kursorCss = s.narzedzie === 'zaznacz' ? (ciag.current?.c.typ === 'widok' ? 'grabbing' : 'default') : 'crosshair'
  const podpowiedz = PODPOWIEDZI[s.narzedzie] ?? ''

  return (
    <div ref={pojemnik} className="rzut" style={{ cursor: kursorCss }}>
      <svg width={roz.W} height={roz.H} onPointerDown={naDol} onPointerMove={naRuch} onPointerUp={naGore} onPointerLeave={() => { if (!ciag.current) { setKursor(null); setPodglad(null) } }}
        onDoubleClick={() => { if (s.narzedzie === 'sciana') setLancuch(null) }} onContextMenu={(e) => e.preventDefault()}>
        <rect width={roz.W} height={roz.H} fill="#e9e6de" />
        <Podklady r={r} w={s.warstwy} />
        <Dzialka r={r} w={s.warstwy} />
        {s.warstwy.siatka && r.skala > 3 && <Siatka r={r} />}
        {s.warstwy.teren && s.projekt.teren.map((t) => <TerenRys key={t.id} r={r} e={t} wybrany={zazn?.typ === 'teren' && zazn.id === t.id} />)}
        {s.warstwy.nizej && nizej && <Sciany r={r} k={nizej} duch />}
        <Pokoje r={r} u={uklad} zazn={zazn?.typ === 'pokoj' ? zazn.klucz : null} />
        {s.warstwy.meble && k.meble.map((m) => <MebelRys key={m.id} r={r} m={m} wybrany={zazn?.typ === 'mebel' && zazn.id === m.id} />)}
        <Sciany r={r} k={k} zazn={zazn?.typ === 'sciana' ? zazn.id : null} bledne={bledne} />
        {k.otwory.map((o) => { const sc = k.sciany.find((x) => x.id === o.scianaId); return sc ? <OtworRys key={o.id} r={r} s={sc} o={o} wybrany={zazn?.typ === 'otwor' && zazn.id === o.id} /> : null })}
        <EtykietyPokoi r={r} u={uklad} />
        {widacDach && dachy.map((d, i) => <DachRys key={d.czescId ?? i} r={r} pr={d.pr} id={d.czescId} wybrany={!!d.czescId && zazn?.typ === 'dach' && zazn.id === d.czescId} kolor={s.projekt.dach.kolor} />)}
        {wybranaCzesc && (() => {
          const c = wybranaCzesc
          const kt = (c.obrot * Math.PI) / 180
          const u = { x: Math.cos(kt), y: Math.sin(kt) }, v = { x: -Math.sin(kt), y: Math.cos(kt) }
          const sr = { x: c.x, y: c.y }
          const uchw = [add(sr, mul(u, c.szer / 2)), add(sr, mul(v, c.gl / 2)), add(sr, mul(u, -c.szer / 2)), add(sr, mul(v, -c.gl / 2))]
          const rg = naroznikiProstokata(c.x, c.y, c.szer, c.gl, c.obrot)
          return <g>
            <Wymiar r={r} a={rg[0]} b={rg[1]} odsun={20} ku={add(sr, mul(v, -c.gl))} kolor={KOLOR.akcent} />
            <Wymiar r={r} a={rg[1]} b={rg[2]} odsun={20} ku={add(sr, mul(u, c.szer))} kolor={KOLOR.akcent} />
            {uchw.map((q, i) => { const e = r.doE(q); return <rect key={i} data-typ="dach-krawedz" data-id={c.id} data-k={i} x={e.x - 7} y={e.y - 7} width={14} height={14} rx={3} fill="#fff" stroke={KOLOR.akcent} strokeWidth={2} style={{ cursor: 'grab' }} /> })}
          </g>
        })()}

        {s.warstwy.wymiary && wymiaryBudynku && r.skala > 11 && (() => {
          const { f, ym, xm, xE, yN } = wymiaryBudynku
          const odl = '#0e7490'
          return <g>
            <Wymiar r={r} a={{ x: f.minx, y: f.miny }} b={{ x: f.maxx, y: f.miny }} odsun={30} ku={{ x: xm, y: f.miny - 5 }} />
            <Wymiar r={r} a={{ x: f.maxx, y: f.miny }} b={{ x: f.maxx, y: f.maxy }} odsun={30} ku={{ x: f.maxx + 5, y: ym }} />
            <Wymiar r={r} a={{ x: 0, y: ym }} b={{ x: f.minx, y: ym }} kolor={odl} tekst={`${fmtM(f.minx)} do drogi`} />
            {xE != null && <Wymiar r={r} a={{ x: f.maxx, y: ym + 2.2 }} b={{ x: xE, y: ym + 2.2 }} kolor={odl} tekst={`${fmtM(xE - f.maxx)} do sąsiada`} />}
            {yN != null && <Wymiar r={r} a={{ x: xm, y: f.maxy }} b={{ x: xm, y: yN }} kolor={odl} tekst={`${fmtM(yN - f.maxy)} do pasa drogi`} />}
          </g>
        })()}

        {wybranaSciana && (() => {
          const w = wybranaSciana
          return <g>
            <Wymiar r={r} a={w.a} b={w.b} odsun={-(w.grubosc / 2) * r.skala - 16} kolor={KOLOR.akcent} tekst={`${fmtM(dist(w.a, w.b))} m`} />
            {[w.a, w.b].map((q, i) => { const e = r.doE(q); return <circle key={i} data-typ="wezel" data-klucz={klucz(q)} cx={e.x} cy={e.y} r={6} fill="#fff" stroke={KOLOR.akcent} strokeWidth={2} style={{ cursor: 'move' }} /> })}
          </g>
        })()}
        {wybranyMebel && uchwytObrotu(wybranyMebel, 'mebel', wybranyMebel.id)}
        {wybranyTeren && wybranyTeren.rodzaj !== 'drzewo' && uchwytObrotu(wybranyTeren, 'teren', wybranyTeren.id)}

        {/* Podgląd rysowanej ściany */}
        {s.narzedzie === 'sciana' && lancuch && kursor && (() => {
          let kon = kursor.p
          const dlWpis = parseFloat(wpis.replace(',', '.'))
          if (wpis && isFinite(dlWpis)) { const kier = norm(sub(kursor.p, lancuch)); kon = add(lancuch, mul(kier, dlWpis)) }
          if (dist(lancuch, kon) < 0.02) return null
          const tymcz: Sciana = { id: 'x', a: lancuch, b: kon, grubosc: SCIANY[s.rodzajSciany].grubosc, rodzaj: s.rodzajSciany }
          return <g style={{ pointerEvents: 'none' }}>
            <path d={sciezka(sciankaWielokat(tymcz, false, false).map(r.doE))} fill={KOLOR.akcent} fillOpacity={0.35} stroke={KOLOR.akcent} strokeWidth={1} />
            <Wymiar r={r} a={lancuch} b={kon} odsun={-(tymcz.grubosc / 2) * r.skala - 16} kolor={KOLOR.akcent} tekst={wpis ? `${wpis} m ⏎` : `${fmtM(dist(lancuch, kon))} m`} rozmiar={12} />
          </g>
        })()}
        {s.narzedzie === 'pokoj' && rog && kursor && (() => {
          const a = rog, b = kursor.p
          const rogi = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }]
          const g = SCIANY[s.rodzajSciany].grubosc
          return <g style={{ pointerEvents: 'none' }}>
            <path d={sciezka(rogi.map(r.doE))} fill={KOLOR.akcent} fillOpacity={0.1} stroke={KOLOR.akcent} strokeWidth={Math.max(1.5, g * r.skala)} strokeOpacity={0.4} strokeLinejoin="miter" />
            <Wymiar r={r} a={a} b={{ x: b.x, y: a.y }} odsun={24} ku={{ x: (a.x + b.x) / 2, y: a.y - (b.y - a.y) }} kolor={KOLOR.akcent} rozmiar={12} />
            <Wymiar r={r} a={{ x: b.x, y: a.y }} b={b} odsun={24} ku={{ x: b.x + (b.x - a.x), y: (a.y + b.y) / 2 }} kolor={KOLOR.akcent} rozmiar={12} />
            <Napis p={r.doE(lerp(a, b, 0.5))} kolor={KOLOR.akcent} rozmiar={12} waga={650}>{fmtM(Math.max(0, Math.abs(b.x - a.x) - g) * Math.max(0, Math.abs(b.y - a.y) - g), 1)} m² w świetle</Napis>
          </g>
        })()}
        {s.narzedzie === 'dach' && rog && kursor && (() => {
          const a = rog, b = kursor.p
          const rogi = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }]
          return <g style={{ pointerEvents: 'none' }}>
            <path d={sciezka(rogi.map(r.doE))} fill={s.projekt.dach.kolor} fillOpacity={0.3} stroke={KOLOR.akcent} strokeWidth={2} />
            <Wymiar r={r} a={a} b={{ x: b.x, y: a.y }} odsun={22} ku={{ x: (a.x + b.x) / 2, y: a.y - (b.y - a.y) }} kolor={KOLOR.akcent} rozmiar={12} />
            <Wymiar r={r} a={{ x: b.x, y: a.y }} b={b} odsun={22} ku={{ x: b.x + (b.x - a.x), y: (a.y + b.y) / 2 }} kolor={KOLOR.akcent} rozmiar={12} />
          </g>
        })()}
        {podglad && (s.narzedzie === 'drzwi' || s.narzedzie === 'okno') && (() => {
          const w = OTWORY[s.rodzajOtworu]
          const L = dist(podglad.s.a, podglad.s.b)
          const szer = Math.min(w.szer, Math.max(0.5, L - 0.2))
          const poz = Math.max(szer / 2 + 0.05, Math.min(L - szer / 2 - 0.05, podglad.poz))
          const c = punktNaScianie(podglad.s, poz)
          const d = norm(sub(podglad.s.b, podglad.s.a))
          return <g>
            <OtworRys r={r} s={podglad.s} o={{ id: 'podglad', poz, szer, rodzaj: s.rodzajOtworu, zawias: 1, strona: podglad.strona }} podglad />
            <Wymiar r={r} a={podglad.s.a} b={sub(c, mul(d, szer / 2))} odsun={(podglad.s.grubosc / 2) * r.skala + 14} kolor={KOLOR.akcent} />
            <Wymiar r={r} a={add(c, mul(d, szer / 2))} b={podglad.s.b} odsun={(podglad.s.grubosc / 2) * r.skala + 14} kolor={KOLOR.akcent} />
          </g>
        })()}
        {miara && (() => {
          const b = miara.b ?? kursor?.p
          if (!b) return null
          return <Wymiar r={r} a={miara.a} b={b} kolor="#b45309" tekst={`${fmtM(dist(miara.a, b))} m`} rozmiar={13} />
        })()}
        {kursor && s.narzedzie !== 'zaznacz' && s.narzedzie !== 'drzwi' && s.narzedzie !== 'okno' && s.narzedzie !== 'teren' && (() => {
          const e = r.doE(kursor.p)
          return <g style={{ pointerEvents: 'none' }}>
            {kursor.prow.map((g, i) => { const a = r.doE(g.a), b = r.doE(g.b); return <path key={i} d={`M${a.x},${a.y}L${b.x},${b.y}`} stroke="#d946ef" strokeWidth={1} strokeDasharray="4 4" /> })}
            {kursor.wezel ? <rect x={e.x - 6} y={e.y - 6} width={12} height={12} fill="none" stroke="#d946ef" strokeWidth={2} /> : <circle cx={e.x} cy={e.y} r={3.5} fill={KOLOR.akcent} />}
          </g>
        })()}
      </svg>
      {podpowiedz && <div className="podpowiedz">{s.narzedzie === 'sciana' && lancuch ? 'Kliknij kolejny narożnik. Wpisz długość w metrach i naciśnij Enter. Esc albo dwuklik kończy.' : s.narzedzie === 'pokoj' && rog ? 'Kliknij przeciwległy narożnik pokoju. Wymiary idą po osiach ścian.' : s.narzedzie === 'dach' && rog ? 'Kliknij przeciwległy narożnik części dachu.' : podpowiedz}</div>}
    </div>
  )
}

const PODPOWIEDZI: Record<string, string> = {
  zaznacz: '',
  sciana: 'Kliknij, gdzie ma się zacząć ściana. Alt wyłącza przyciąganie.',
  pokoj: 'Kliknij pierwszy narożnik pokoju albo przeciągnij prostokąt.',
  drzwi: 'Najedź na ścianę i kliknij, żeby wstawić. Strona kursora wyznacza kierunek otwierania.',
  okno: 'Najedź na ścianę i kliknij, żeby wstawić.',
  miara: 'Kliknij dwa punkty, żeby zmierzyć odległość.',
  teren: 'Kliknij na działce, żeby wstawić element.',
  dach: 'Kliknij część dachu, żeby zmienić jej rodzaj. Kwadraty na krawędziach ją rozciągają. Przeciągnij prostokąt, żeby dodać nową część.',
}

export { GRANICA }
