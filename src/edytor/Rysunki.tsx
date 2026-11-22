// Warstwy rysunku rzutu. Wszystko liczone w pikselach ekranu, tekst zawsze czytelny.

import { memo } from 'react'
import {
  GRANICA, KRAWEDZIE, LINIE_ZABUDOWY, MA_EWIDENCJA, MA_MPZP, MA_ORTO, OBSZAR_ZABUDOWY, OTOCZENIE, PAS_DROGI, PODKLAD, PODKLADY, PODKLAD_ROGI, POW_ZABUDOWY_MAX, TEREN_MN,
} from '../dane/dzialka'
import { Pt, add, dist, fmtM, lerp, mul, norm, perp, ramka, srodekCiezkosci, sub } from '../model/geom'
import { MEBLE, TEREN, WYSPA_RONDA, typPokoju } from '../model/katalog'
import { naroznikiProstokata } from '../model/operacje'
import { Uklad, punktNaScianie } from '../model/topologia'
import type { ProstokatDachu } from '../model/dach'
import type { ElementTerenu, Kondygnacja, Mebel, Otwor, Sciana } from '../model/typy'
import type { Warstwy } from '../model/magazyn'
import { Rzutnia, katTekstu, sciezka } from './rzutnia'

export const KOLOR = {
  akcent: '#2563eb',
  blad: '#dc2626',
  tusz: '#1c2430',
  sciana: { zew: '#262d38', nosna: '#4b5563', dzialowa: '#7b8494', szklana: '#2b6f9c' } as const,
  papier: '#fbfaf6',
  linia: '#0f9d6c',
}

export const Podklady = memo(function Podklady({ r, w }: { r: Rzutnia; w: Warstwy }) {
  if (!PODKLAD) return null
  const lg = r.doE(PODKLAD_ROGI.lg), pg = r.doE(PODKLAD_ROGI.pg), ld = r.doE(PODKLAD_ROGI.ld)
  const n = PODKLAD.rozmiar
  const m = `matrix(${(pg.x - lg.x) / n},${(pg.y - lg.y) / n},${(ld.x - lg.x) / n},${(ld.y - lg.y) / n},${lg.x},${lg.y})`
  return (
    <g style={{ pointerEvents: 'none' }}>
      {w.orto && MA_ORTO && <image href={PODKLADY.orto.plik} width={n} height={n} transform={m} opacity={0.9} preserveAspectRatio="none" />}
      {w.mpzp && MA_MPZP && <image href={PODKLADY.mpzp.plik} width={n} height={n} transform={m} opacity={w.orto && MA_ORTO ? 0.6 : 0.85} preserveAspectRatio="none" />}
      {w.ewidencja && MA_EWIDENCJA && <image href={PODKLADY.ewidencja.plik} width={n} height={n} transform={m} style={{ mixBlendMode: 'screen' }} opacity={0.9} preserveAspectRatio="none" />}
    </g>
  )
})

export function Siatka({ r }: { r: Rzutnia }) {
  const rogi = [r.zE({ x: 0, y: 0 }), r.zE({ x: r.W, y: 0 }), r.zE({ x: r.W, y: r.H }), r.zE({ x: 0, y: r.H })]
  const f = ramka(rogi)
  const drobna = r.skala >= 9
  const krok = drobna ? 1 : 5
  const linie: string[] = [], grube: string[] = []
  const dodaj = (a: Pt, b: Pt, gruba: boolean) => {
    const p = r.doE(a), q = r.doE(b)
    ;(gruba ? grube : linie).push(`M${p.x.toFixed(1)},${p.y.toFixed(1)}L${q.x.toFixed(1)},${q.y.toFixed(1)}`)
  }
  for (let x = Math.floor(f.minx / krok) * krok; x <= f.maxx; x += krok) dodaj({ x, y: f.miny }, { x, y: f.maxy }, x % 5 === 0)
  for (let y = Math.floor(f.miny / krok) * krok; y <= f.maxy; y += krok) dodaj({ x: f.minx, y }, { x: f.maxx, y }, y % 5 === 0)
  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={linie.join('')} stroke="#1c2430" strokeOpacity={0.07} strokeWidth={1} fill="none" />
      <path d={grube.join('')} stroke="#1c2430" strokeOpacity={0.14} strokeWidth={1} fill="none" />
    </g>
  )
}

function Napis({ p, kat = 0, children, rozmiar = 11, kolor = '#1c2430', waga = 500, tlo = true }: { p: Pt; kat?: number; children: React.ReactNode; rozmiar?: number; kolor?: string; waga?: number; tlo?: boolean }) {
  return (
    <text
      x={p.x} y={p.y} transform={kat ? `rotate(${kat.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})` : undefined}
      textAnchor="middle" dominantBaseline="central" fontSize={rozmiar} fontWeight={waga} fill={kolor}
      stroke={tlo ? 'rgba(251,250,246,0.92)' : 'none'} strokeWidth={tlo ? 3.5 : 0} paintOrder="stroke" style={{ pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}
    >{children}</text>
  )
}

/** Linia wymiarowa między punktami modelu, odsunięta o podaną liczbę pikseli. */
export function Wymiar({ r, a, b, odsun = 0, ku, tekst, kolor = '#334155', rozmiar = 11 }: { r: Rzutnia; a: Pt; b: Pt; odsun?: number; ku?: Pt; tekst?: string; kolor?: string; rozmiar?: number }) {
  const ea = r.doE(a), eb = r.doE(b)
  if (dist(ea, eb) < 14) return null
  let n = norm(perp(sub(eb, ea)))
  // „ku” wskazuje w modelu stronę, po której ma stanąć linia wymiarowa.
  if (ku) { const kk = sub(r.doE(ku), lerp(ea, eb, 0.5)); if (n.x * kk.x + n.y * kk.y < 0) n = mul(n, -1) }
  const p = add(ea, mul(n, odsun)), q = add(eb, mul(n, odsun))
  const t = mul(n, 4)
  const sr = lerp(p, q, 0.5)
  return (
    <g style={{ pointerEvents: 'none' }}>
      {odsun !== 0 && <path d={`M${ea.x},${ea.y}L${p.x + t.x},${p.y + t.y}M${eb.x},${eb.y}L${q.x + t.x},${q.y + t.y}`} stroke={kolor} strokeOpacity={0.45} strokeWidth={0.75} />}
      <path d={`M${p.x},${p.y}L${q.x},${q.y}M${p.x - t.x},${p.y - t.y}L${p.x + t.x},${p.y + t.y}M${q.x - t.x},${q.y - t.y}L${q.x + t.x},${q.y + t.y}`} stroke={kolor} strokeWidth={1} fill="none" />
      <Napis p={sr} kat={katTekstu(p, q)} kolor={kolor} rozmiar={rozmiar} waga={600}>{tekst ?? fmtM(dist(a, b))}</Napis>
    </g>
  )
}

export const Dzialka = memo(function Dzialka({ r, w }: { r: Rzutnia; w: Warstwy }) {
  const E = (p: Pt[]) => sciezka(p.map(r.doE))
  const widacTlo = (w.orto && MA_ORTO) || (w.mpzp && MA_MPZP)
  const srodekObszaru = srodekCiezkosci(OBSZAR_ZABUDOWY)
  const m = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',')
  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <pattern id="kreski" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#6b7280" strokeWidth="1.2" strokeOpacity="0.55" />
        </pattern>
      </defs>
      {OTOCZENIE.map((o, i) => <path key={i} d={E(o.pas)} fill={o.typ === 'woda' ? (widacTlo ? 'rgba(125,200,235,0.55)' : '#bfe3f5') : (widacTlo ? 'rgba(232,229,221,0.55)' : '#e4e1d9')} />)}
      <path d={E(TEREN_MN)} fill={widacTlo ? 'rgba(251,250,246,0.62)' : KOLOR.papier} />
      {PAS_DROGI.length > 2 && <>
        <path d={E(PAS_DROGI)} fill={widacTlo ? 'rgba(232,229,221,0.6)' : '#e4e1d9'} />
        <path d={E(PAS_DROGI)} fill="url(#kreski)" />
      </>}
      {w.linie && <path d={E(OBSZAR_ZABUDOWY)} fill="rgba(15,157,108,0.07)" stroke={KOLOR.linia} strokeWidth={1.5} strokeDasharray="7 5" />}
      <path d={E(GRANICA)} fill="none" stroke="#fff" strokeWidth={4.5} strokeOpacity={0.85} />
      <path d={E(GRANICA)} fill="none" stroke={KOLOR.tusz} strokeWidth={2} />
      {GRANICA.map((p, i) => { const e = r.doE(p); return <circle key={i} cx={e.x} cy={e.y} r={3} fill="#fff" stroke={KOLOR.tusz} strokeWidth={1.5} /> })}

      {OTOCZENIE.map((o, i) => (
        <Napis key={`o${i}`} p={r.doE(add(lerp(o.a, o.b, 0.62), mul(o.na, o.szer / 2)))} kat={katTekstu(r.doE(o.a), r.doE(o.b))} kolor={o.typ === 'woda' ? '#1f6f93' : '#57606c'} rozmiar={12} waga={600}>{o.nazwa}</Napis>
      ))}
      {PAS_DROGI.length > 2 && <Napis p={r.doE(srodekCiezkosci(PAS_DROGI))} kolor="#4b5563">pas drogi z planu</Napis>}
      {w.linie && r.skala > 5 && <>
        <Napis p={r.doE(srodekObszaru)} kolor="#0b7a54" waga={600}>obszar w liniach zabudowy · {Math.round(POW_ZABUDOWY_MAX)} m²</Napis>
        {LINIE_ZABUDOWY.map((l, i) => {
          const n = norm(perp(sub(l.b, l.a)))
          return <Napis key={`l${i}`} p={r.doE(add(lerp(l.a, l.b, 0.4), mul(n, l.d / 2)))} kat={katTekstu(r.doE(l.a), r.doE(l.b))} kolor="#0b7a54">linia zabudowy {m(l.d)} m</Napis>
        })}
      </>}
      {w.wymiary && r.skala > 3.5 && KRAWEDZIE.map((k, i) => {
        const a = r.doE(k.a), b = r.doE(k.b)
        if (dist(a, b) < 90) return null
        const n = norm(perp(sub(b, a)))
        const sr = add(lerp(a, b, k.typ === 'droga' ? 0.3 : 0.5), mul(n, 13))
        return <Napis key={i} p={sr} kat={katTekstu(a, b)} kolor="#1c2430" rozmiar={10.5}>{fmtM(dist(k.a, k.b))} m · {k.nazwa}</Napis>
      })}
    </g>
  )
})

export function sciankaWielokat(s: Sciana, przedluzA: boolean, przedluzB: boolean): Pt[] {
  const d = norm(sub(s.b, s.a))
  const n = mul(perp(d), s.grubosc / 2)
  const a = przedluzA ? sub(s.a, mul(d, s.grubosc / 2)) : s.a
  const b = przedluzB ? add(s.b, mul(d, s.grubosc / 2)) : s.b
  return [add(a, n), add(b, n), sub(b, n), sub(a, n)]
}

export function Pokoje({ r, u, zazn, najechany }: { r: Rzutnia; u: Uklad; zazn: string | null; najechany?: string | null }) {
  return (
    <g>
      {u.pokoje.map((p) => {
        const typ = typPokoju(p.etykieta?.typ ?? 'inne')
        const wybrany = zazn === p.klucz
        return (
          <path key={p.klucz} data-typ="pokoj" data-klucz={p.klucz} d={sciezka(p.wnetrze.map(r.doE))}
            fill={typ.kolor} fillOpacity={wybrany ? 1 : 0.86} stroke={wybrany ? KOLOR.akcent : 'none'} strokeWidth={2} />
        )
      })}
    </g>
  )
}

export function EtykietyPokoi({ r, u }: { r: Rzutnia; u: Uklad }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {u.pokoje.map((p) => {
        const bok = Math.sqrt(p.pow) * r.skala
        if (bok < 30) return null
        const typ = typPokoju(p.etykieta?.typ ?? 'inne')
        const nazwa = p.etykieta?.nazwa || typ.nazwa
        const e = r.doE(p.srodek)
        const f = ramka(p.wnetrze)
        const prostokat = Math.abs(f.w * f.h - p.pow) < 0.02 * p.pow
        const duzy = bok > 62
        return (
          <g key={p.klucz}>
            {duzy && <text x={e.x} y={e.y - 9} textAnchor="middle" fontSize={12} fontWeight={650} fill="#1c2430">{nazwa}</text>}
            <text x={e.x} y={duzy ? e.y + 6 : e.y + 4} textAnchor="middle" fontSize={11} fontWeight={500} fill="#334155" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtM(p.pow, 1)} m²</text>
            {duzy && prostokat && bok > 84 && <text x={e.x} y={e.y + 20} textAnchor="middle" fontSize={10} fill="#64748b" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtM(f.w)} × {fmtM(f.h)}</text>}
          </g>
        )
      })}
    </g>
  )
}

export function Sciany({ r, k, zazn, bledne, duch = false }: { r: Rzutnia; k: Kondygnacja; zazn?: string | null; bledne?: Set<string>; duch?: boolean }) {
  const stopien = new Map<string, number>()
  const kl = (p: Pt) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`
  for (const s of k.sciany) for (const p of [s.a, s.b]) stopien.set(kl(p), (stopien.get(kl(p)) ?? 0) + 1)
  const kolejnosc = k.sciany.slice().sort((a, b) => a.grubosc - b.grubosc)
  return (
    <g style={duch ? { pointerEvents: 'none' } : undefined}>
      {kolejnosc.map((s) => {
        const w = sciankaWielokat(s, (stopien.get(kl(s.a)) ?? 0) > 1, (stopien.get(kl(s.b)) ?? 0) > 1)
        const kolor = duch ? '#9aa3af' : bledne?.has(s.id) ? KOLOR.blad : zazn === s.id ? KOLOR.akcent : KOLOR.sciana[s.rodzaj]
        const szklo = s.rodzaj === 'szklana' && !duch
        return <path key={s.id} data-typ={duch ? undefined : 'sciana'} data-id={s.id} d={sciezka(w.map(r.doE))} fill={szklo ? (kolor === KOLOR.sciana.szklana ? '#cfe8f7' : kolor) : kolor} fillOpacity={duch ? 0.28 : 1} stroke={kolor} strokeOpacity={duch ? 0 : 1} strokeWidth={szklo ? 1.6 : 0.6} style={duch ? undefined : { cursor: 'pointer' }} />
      })}
    </g>
  )
}

export function OtworRys({ r, s, o, wybrany, podglad = false }: { r: Rzutnia; s: Sciana; o: Pick<Otwor, 'poz' | 'szer' | 'rodzaj' | 'zawias' | 'strona' | 'id'>; wybrany?: boolean; podglad?: boolean }) {
  const d = norm(sub(s.b, s.a))
  const n = perp(d)
  const c = punktNaScianie(s, o.poz)
  const p0 = sub(c, mul(d, o.szer / 2)), p1 = add(c, mul(d, o.szer / 2))
  const g = s.grubosc / 2 + 0.01
  const przerwa = [add(p0, mul(n, g)), add(p1, mul(n, g)), sub(p1, mul(n, g)), sub(p0, mul(n, g))].map(r.doE)
  const kol = wybrany ? KOLOR.akcent : podglad ? KOLOR.akcent : KOLOR.tusz
  const E = r.doE
  const okno = o.rodzaj === 'okno' || o.rodzaj === 'okno-taras'
  let symbol: React.ReactNode = null
  if (okno) {
    const a1 = E(add(p0, mul(n, g))), b1 = E(add(p1, mul(n, g))), a2 = E(sub(p0, mul(n, g))), b2 = E(sub(p1, mul(n, g)))
    const a0 = E(p0), b0 = E(p1)
    symbol = <>
      <path d={`M${a1.x},${a1.y}L${b1.x},${b1.y}M${a2.x},${a2.y}L${b2.x},${b2.y}`} stroke={kol} strokeWidth={1} />
      <path d={`M${a0.x},${a0.y}L${b0.x},${b0.y}`} stroke={wybrany || podglad ? kol : '#3b82c4'} strokeWidth={o.rodzaj === 'okno-taras' ? 2.4 : 1.8} />
    </>
  } else if (o.rodzaj === 'drzwi' || o.rodzaj === 'drzwi-wej') {
    const zaw = o.zawias === 1 ? p0 : p1
    const drugi = o.zawias === 1 ? p1 : p0
    const baza = add(zaw, mul(n, o.strona * g))
    const koniec = add(baza, mul(n, o.strona * o.szer))
    const lukDo = add(drugi, mul(n, o.strona * g))
    const eb = E(baza), ek = E(koniec), el = E(lukDo)
    const rr = o.szer * r.skala
    // Kierunek łuku na ekranie zależy od strony i zawiasu.
    const wek = (a: Pt, b: Pt) => (a.x - eb.x) * (b.y - eb.y) - (a.y - eb.y) * (b.x - eb.x)
    const sweep = wek(ek, el) > 0 ? 1 : 0
    symbol = <>
      <path d={`M${eb.x},${eb.y}L${ek.x},${ek.y}`} stroke={kol} strokeWidth={o.rodzaj === 'drzwi-wej' ? 2.4 : 1.6} />
      <path d={`M${ek.x},${ek.y}A${rr},${rr} 0 0 ${sweep} ${el.x},${el.y}`} stroke={kol} strokeWidth={0.9} fill="none" strokeDasharray="3 2.5" />
    </>
  } else if (o.rodzaj === 'brama') {
    const a = E(add(p0, mul(n, o.strona * g))), b = E(add(p1, mul(n, o.strona * g)))
    symbol = <path d={`M${a.x},${a.y}L${b.x},${b.y}`} stroke={kol} strokeWidth={2.4} strokeDasharray="8 3" />
  } else {
    const a1 = E(add(p0, mul(n, g))), a2 = E(sub(p0, mul(n, g))), b1 = E(add(p1, mul(n, g))), b2 = E(sub(p1, mul(n, g)))
    symbol = <path d={`M${a1.x},${a1.y}L${b1.x},${b1.y}M${a2.x},${a2.y}L${b2.x},${b2.y}`} stroke={kol} strokeWidth={0.9} strokeDasharray="4 3" />
  }
  return (
    <g data-typ={podglad ? undefined : 'otwor'} data-id={o.id} style={podglad ? { pointerEvents: 'none' } : { cursor: 'pointer' }} opacity={podglad ? 0.85 : 1}>
      <path d={sciezka(przerwa)} fill={okno ? '#eaf4fb' : KOLOR.papier} stroke={wybrany ? KOLOR.akcent : 'none'} strokeWidth={1.5} />
      {symbol}
    </g>
  )
}

export function MebelRys({ r, m, wybrany }: { r: Rzutnia; m: Mebel; wybrany: boolean }) {
  const wz = MEBLE.find((x) => x.id === m.wzor)
  const rogi = naroznikiProstokata(m.x, m.y, m.szer, m.gl, m.obrot)
  const e = rogi.map(r.doE)
  // Pasek od strony „tyłu” mebla (oparcie, wezgłowie, ściana).
  const t0 = lerp(rogi[3], rogi[0], 0.16), t1 = lerp(rogi[2], rogi[1], 0.16)
  const c = r.doE({ x: m.x, y: m.y })
  const bok = Math.min(m.szer, m.gl) * r.skala
  let dodatek: React.ReactNode = null
  if (m.wzor === 'schody') {
    const n = 14
    dodatek = <path d={Array.from({ length: n - 1 }, (_, i) => { const a = r.doE(lerp(rogi[0], rogi[3], (i + 1) / n)), b = r.doE(lerp(rogi[1], rogi[2], (i + 1) / n)); return `M${a.x},${a.y}L${b.x},${b.y}` }).join('')} stroke="#6b5a45" strokeWidth={0.8} />
  } else if (m.wzor !== 'auto' && m.wzor !== 'stolik' && !m.wzor.startsWith('stol')) {
    const a = r.doE(t0), b = r.doE(t1)
    dodatek = <path d={`M${a.x},${a.y}L${b.x},${b.y}`} stroke="#475569" strokeOpacity={0.55} strokeWidth={1} />
  }
  return (
    <g data-typ="mebel" data-id={m.id} style={{ cursor: 'move' }}>
      <path d={sciezka(e)} fill={wz?.kolor ?? '#cbd5e1'} fillOpacity={0.92} stroke={wybrany ? KOLOR.akcent : '#475569'} strokeWidth={wybrany ? 2 : 0.9} strokeLinejoin="round" />
      {dodatek}
      {bok > 34 && <text x={c.x} y={c.y + 3} textAnchor="middle" fontSize={9.5} fill="#1f2937" style={{ pointerEvents: 'none' }}>{wz?.nazwa.split(' ')[0]}</text>}
    </g>
  )
}

export function TerenRys({ r, e, wybrany }: { r: Rzutnia; e: ElementTerenu; wybrany: boolean }) {
  const w = TEREN[e.rodzaj]
  const c = r.doE({ x: e.x, y: e.y })
  const obw = wybrany ? KOLOR.akcent : 'rgba(28,36,48,0.45)'
  if (e.rodzaj === 'drzewo') {
    const rr = (e.szer / 2) * r.skala
    return (
      <g data-typ="teren" data-id={e.id} style={{ cursor: 'move' }}>
        <circle cx={c.x} cy={c.y} r={rr} fill="#4f8a3f" fillOpacity={0.5} stroke={wybrany ? KOLOR.akcent : '#2f6426'} strokeWidth={wybrany ? 2 : 1} />
        <circle cx={c.x} cy={c.y} r={Math.max(2, 0.18 * r.skala)} fill="#5b4632" />
      </g>
    )
  }
  if (e.rodzaj === 'rondo') {
    const rr = (e.szer / 2) * r.skala
    return (
      <g data-typ="teren" data-id={e.id} style={{ cursor: 'move' }}>
        <circle cx={c.x} cy={c.y} r={rr} fill={w.kolor} fillOpacity={0.85} stroke={obw} strokeWidth={wybrany ? 2 : 1} />
        <circle cx={c.x} cy={c.y} r={rr * 0.65} fill="none" stroke="#fff" strokeOpacity={0.7} strokeWidth={1} strokeDasharray="6 6" />
        <circle cx={c.x} cy={c.y} r={rr * WYSPA_RONDA} fill="#8fb97a" stroke="#4d7a3c" strokeWidth={1} />
      </g>
    )
  }
  if (e.rodzaj === 'pergola') {
    // Pergola: sam obrys i listwy, żeby było widać, co jest pod nią.
    const rg = naroznikiProstokata(e.x, e.y, e.szer, e.gl, e.obrot)
    const n = Math.max(2, Math.round(e.gl / 0.6))
    const listwy = Array.from({ length: n - 1 }, (_, i) => { const a = r.doE(lerp(rg[0], rg[3], (i + 1) / n)), b = r.doE(lerp(rg[1], rg[2], (i + 1) / n)); return `M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}` }).join('')
    return (
      <g data-typ="teren" data-id={e.id} style={{ cursor: 'move' }}>
        <path d={sciezka(rg.map(r.doE))} fill={w.kolor} fillOpacity={0.12} stroke={wybrany ? KOLOR.akcent : '#7a5c36'} strokeWidth={wybrany ? 2 : 1.4} />
        <path d={listwy} stroke="#7a5c36" strokeOpacity={0.55} strokeWidth={1} />
      </g>
    )
  }
  const rogi = naroznikiProstokata(e.x, e.y, e.szer, e.gl, e.obrot).map(r.doE)
  const bok = Math.min(e.szer, e.gl) * r.skala
  return (
    <g data-typ="teren" data-id={e.id} style={{ cursor: 'move' }}>
      <path d={sciezka(rogi)} fill={w.kolor} fillOpacity={w.zabudowa ? 0.95 : 0.8} stroke={obw} strokeWidth={wybrany ? 2 : 1} strokeDasharray={e.rodzaj === 'wiata' ? '6 4' : undefined} />
      {bok > 26 && <text x={c.x} y={c.y + 3.5} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="#1f2937" style={{ pointerEvents: 'none' }}>{w.nazwa.split(',')[0]}</text>}
    </g>
  )
}

export const NAZWY_DACHU = { dwuspadowy: 'Dwuspadowy', czterospadowy: 'Kopertowy', jednospadowy: 'Jednospadowy', plaski: 'Płaski' } as const

/** Narożniki części dachu w modelu: wzdłuż kalenicy (u) i w poprzek (v). */
export function rogiDachu(pr: ProstokatDachu) {
  const u = { x: Math.cos(pr.kat), y: Math.sin(pr.kat) }, v = { x: -Math.sin(pr.kat), y: Math.cos(pr.kat) }
  const c = { x: pr.cx, y: pr.cy }
  const p = (a: number, b: number) => add(add(c, mul(u, (a * pr.dl) / 2)), mul(v, (b * pr.rozp) / 2))
  return { u, v, c, rogi: [p(-1, -1), p(1, -1), p(1, 1), p(-1, 1)], p }
}

export function DachRys({ r, pr, id, wybrany, kolor }: { r: Rzutnia; pr: ProstokatDachu; id: string | null; wybrany: boolean; kolor: string }) {
  const { rogi, p, c } = rogiDachu(pr)
  const E = r.doE
  const e = rogi.map(E)
  const linia = (a: Pt, b: Pt) => { const x = E(a), y = E(b); return `M${x.x.toFixed(1)},${x.y.toFixed(1)}L${y.x.toFixed(1)},${y.y.toFixed(1)}` }
  let rys = ''
  if (pr.rodzaj === 'dwuspadowy') rys = linia(p(-1, 0), p(1, 0))
  else if (pr.rodzaj === 'czterospadowy') {
    const kal = pr.dl > 0 ? Math.max(0, (pr.dl - pr.rozp) / pr.dl) : 0
    rys = linia(p(-kal, 0), p(kal, 0)) + linia(p(-kal, 0), rogi[0]) + linia(p(-kal, 0), rogi[3]) + linia(p(kal, 0), rogi[1]) + linia(p(kal, 0), rogi[2])
  } else if (pr.rodzaj === 'jednospadowy') {
    // Strzałka pokazuje kierunek spadku: od wyższej krawędzi do niższej.
    rys = linia(p(0, 0.6), p(0, -0.6)) + linia(p(0, -0.6), p(-0.12, -0.36)) + linia(p(0, -0.6), p(0.12, -0.36))
  }
  const bok = Math.min(pr.dl, pr.rozp) * r.skala
  const sr = E(c)
  const obw = wybrany ? KOLOR.akcent : '#1c2430'
  return (
    <g data-typ={id ? 'dach' : undefined} data-id={id ?? undefined} style={id ? { cursor: 'move' } : { pointerEvents: 'none' }}>
      <path d={sciezka(e)} fill={kolor} fillOpacity={id ? 0.42 : 0.22} stroke={obw} strokeWidth={wybrany ? 2.2 : 1.2} strokeDasharray={id ? undefined : '6 4'} />
      {rys && <path d={rys} stroke={obw} strokeWidth={wybrany ? 2 : 1.4} fill="none" strokeLinecap="round" />}
      {bok > 46 && <Napis p={{ x: sr.x, y: sr.y + (pr.rodzaj === 'dwuspadowy' || pr.rodzaj === 'czterospadowy' ? 13 : 0) }} rozmiar={11} waga={650}>{NAZWY_DACHU[pr.rodzaj]}{pr.rodzaj !== 'plaski' ? ` ${pr.katPolaci}°` : ''}</Napis>}
    </g>
  )
}

export { Napis }
