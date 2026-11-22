import { CircleCheck, Copy, FlipHorizontal2, FlipVertical2, Info, RotateCw, Trash2, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { PAS_DROGI, POW_MN } from '../dane/dzialka'
import { DzialkaKarta } from './DzialkaKarta'
import { policz } from '../model/analiza'
import { dist, fmtM, klucz, mul, norm, obwod, sub, add } from '../model/geom'
import { MEBLE, OTWORY, POKOJE, SCIANY, TEREN, typPokoju, wzorMebla } from '../model/katalog'
import { aktywnaKondygnacja, useMagazyn } from '../model/magazyn'
import { dodajMebel, nazwijPokoj, obrocDom, podzielCzesc, porzadek, przesunDom, przesunWezel, sprzatnijEtykiety, usunSciane } from '../model/operacje'
import { elementyDachu } from '../model/dach'
import { znajdzUklad } from '../model/topologia'
import type { Pokrycie, RodzajDachu, RodzajOtworu, RodzajSciany, RodzajTerenu, Wykonczenie } from '../model/typy'
import { noweId } from '../model/typy'
import { NAZWY_DACHU } from '../edytor/Rysunki'
import { Liczba, Przelacznik, Segmenty, Sekcja, Wiersz } from './Pola'

type Karta = 'wlasciwosci' | 'wskazniki' | 'pokoje' | 'meble' | 'dzialka'

export function usunZaznaczone() {
  const s = useMagazyn.getState()
  const z = s.zaznaczenie
  if (!z) return
  s.zmien((p, k) => {
    if (z.typ === 'sciana') { usunSciane(k, z.id); sprzatnijEtykiety(k) }
    else if (z.typ === 'otwor') k.otwory = k.otwory.filter((o) => o.id !== z.id)
    else if (z.typ === 'mebel') k.meble = k.meble.filter((m) => m.id !== z.id)
    else if (z.typ === 'teren') p.teren = p.teren.filter((t) => t.id !== z.id)
    else if (z.typ === 'pokoj') k.etykiety = k.etykiety.filter((e) => e.id !== z.klucz)
    else if (z.typ === 'dach') p.dach.czesci = p.dach.czesci.filter((c) => c.id !== z.id)
  })
  s.ustaw({ zaznaczenie: null })
}

export function powielZaznaczone() {
  const s = useMagazyn.getState()
  const z = s.zaznaczenie
  if (!z || (z.typ !== 'mebel' && z.typ !== 'teren' && z.typ !== 'dach')) return
  const id = noweId(z.typ === 'mebel' ? 'm' : z.typ === 'teren' ? 't' : 'd')
  s.zmien((p, k) => {
    if (z.typ === 'mebel') { const m = k.meble.find((x) => x.id === z.id); if (m) k.meble.push({ ...m, id, x: m.x + 0.5, y: m.y - 0.5 }) }
    else if (z.typ === 'teren') { const t = p.teren.find((x) => x.id === z.id); if (t) p.teren.push({ ...t, id, x: t.x + 1, y: t.y - 1 }) }
    else { const c = p.dach.czesci.find((x) => x.id === z.id); if (c) p.dach.czesci.push({ ...c, id, x: c.x + 1, y: c.y - 1 }) }
  })
  s.ustaw({ zaznaczenie: { typ: z.typ, id } as any })
}

const WYKONCZENIA: { id: Wykonczenie; nazwa: string }[] = [{ id: 'tynk', nazwa: 'Tynk' }, { id: 'deska', nazwa: 'Deska' }, { id: 'cegla', nazwa: 'Cegła' }]

/** Zestawienie pomieszczeń wszystkich kondygnacji z sumami i zapisem do pliku CSV. */
function Pokoje() {
  const s = useMagazyn()
  const wiersze = useMemo(() => s.projekt.kondygnacje.flatMap((k) => znajdzUklad(k).pokoje.map((p) => {
    const t = typPokoju(p.etykieta?.typ ?? 'inne')
    return { kond: k, klucz: p.klucz, nazwa: p.etykieta?.nazwa || t.nazwa, typ: t, pow: p.pow }
  })), [s.projekt.kondygnacje])
  const suma = (f: (w: (typeof wiersze)[number]) => boolean) => wiersze.filter(f).reduce((a, w) => a + w.pow, 0)
  const mieszkalne = suma((w) => w.typ.mieszkalny), garaz = suma((w) => w.typ.id === 'garaz'), razem = suma(() => true)
  const csv = () => {
    const linie = ['Kondygnacja;Pomieszczenie;Rodzaj;Powierzchnia m2', ...wiersze.map((w) => `${w.kond.nazwa};${w.nazwa};${w.typ.nazwa};${w.pow.toFixed(2).replace('.', ',')}`), `;;Razem;${razem.toFixed(2).replace('.', ',')}`]
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['\ufeff' + linie.join('\n')], { type: 'text/csv;charset=utf-8' }))
    a.download = 'zestawienie-pomieszczen.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }
  if (!wiersze.length) return <p className="pusto gora">Zestawienie pojawi się, gdy ściany zamkną pierwsze pomieszczenie.</p>
  return (
    <>
      <Sekcja tytul="Powierzchnie w świetle ścian">
        <dl className="dane">
          <dt>Pokoje, salon, kuchnia</dt><dd>{fmtM(mieszkalne, 1)} m²</dd>
          <dt>Łazienki, komunikacja, pomocnicze</dt><dd>{fmtM(razem - mieszkalne - garaz, 1)} m²</dd>
          {garaz > 0 && <><dt>Garaż</dt><dd>{fmtM(garaz, 1)} m²</dd></>}
          <dt>Razem</dt><dd>{fmtM(razem, 1)} m²</dd>
          {garaz > 0 && <><dt>Razem bez garażu</dt><dd>{fmtM(razem - garaz, 1)} m²</dd></>}
        </dl>
        <button className="btn" onClick={csv}>Pobierz zestawienie (CSV)</button>
      </Sekcja>
      {s.projekt.kondygnacje.map((k) => {
        const moje = wiersze.filter((w) => w.kond.id === k.id).sort((a, b) => b.pow - a.pow)
        if (!moje.length) return null
        return (
          <Sekcja key={k.id} tytul={`${k.nazwa}: ${moje.length} pomieszczeń`}>
            <div className="czesci">
              {moje.map((w) => (
                <button key={w.klucz} onClick={() => s.ustaw({ aktywna: k.id, zaznaczenie: { typ: 'pokoj', klucz: w.klucz }, tryb: s.tryb === '3d' ? 'oba' : s.tryb })}>
                  <b style={{ background: w.typ.kolor }} /><span>{w.nazwa}</span><em>{fmtM(w.pow, 1)} m²</em>
                </button>
              ))}
            </div>
          </Sekcja>
        )
      })}
    </>
  )
}

function Wlasciwosci() {
  const s = useMagazyn()
  const k = aktywnaKondygnacja(s)
  const z = s.zaznaczenie
  const uklad = useMemo(() => znajdzUklad(k), [k])
  const usun = <button className="btn niebezp" onClick={usunZaznaczone}><Trash2 size={15} />Usuń</button>

  if (z?.typ === 'sciana') {
    const w = k.sciany.find((x) => x.id === z.id)
    if (!w) return null
    const L = dist(w.a, w.b)
    return (
      <Sekcja tytul="Ściana" akcja={usun}>
        <Wiersz etykieta="Rodzaj">
          <select value={w.rodzaj} onChange={(e) => s.zmien((_, kk) => { const q = kk.sciany.find((x) => x.id === z.id)!; q.rodzaj = e.target.value as RodzajSciany; q.grubosc = SCIANY[q.rodzaj].grubosc })}>
            {Object.entries(SCIANY).map(([id, v]) => <option key={id} value={id}>{v.nazwa}</option>)}
          </select>
        </Wiersz>
        <Wiersz etykieta="Grubość"><Liczba wartosc={w.grubosc * 100} jedn="cm" krok={1} min={5} max={80} miejsca={0} zmiana={(v) => v && s.zmien((_, kk) => { kk.sciany.find((x) => x.id === z.id)!.grubosc = v / 100 })} /></Wiersz>
        <Wiersz etykieta="Długość" opis="po osi ściany">
          <Liczba wartosc={L} jedn="m" min={0.1} max={80} zmiana={(v) => v && s.zmien((_, kk) => {
            const q = kk.sciany.find((x) => x.id === z.id)!
            przesunWezel(kk, klucz(q.b), add(q.a, mul(norm(sub(q.b, q.a)), v)))
            porzadek(kk); sprzatnijEtykiety(kk)
          })} />
        </Wiersz>
        {w.rodzaj === 'zew' && <Wiersz etykieta="Wykończenie" opis="tylko ta ściana">
          <select value={w.wykonczenie ?? ''} onChange={(e) => s.zmien((_, kk) => { const q = kk.sciany.find((x) => x.id === z.id); if (q) { if (e.target.value) q.wykonczenie = e.target.value as Wykonczenie; else delete q.wykonczenie } })}>
            <option value="">Jak cały dom</option>
            {WYKONCZENIA.map((x) => <option key={x.id} value={x.id}>{x.nazwa}</option>)}
          </select>
        </Wiersz>}
        {w.rodzaj === 'zew' && <Wiersz etykieta="Kolor elewacji" opis="tylko ta ściana"><input type="color" value={w.kolor ?? s.projekt.ustawienia.kolorElewacji} onChange={(e) => s.zmienRoboczo((_, kk) => { const q = kk.sciany.find((x) => x.id === z.id); if (q) q.kolor = e.target.value })} /></Wiersz>}
        <p className="uwaga-mala">Przeciągnij ścianę, żeby ją przesunąć równolegle. Kółka na końcach przesuwają narożnik razem z sąsiednimi ścianami.</p>
      </Sekcja>
    )
  }
  if (z?.typ === 'otwor') {
    const o = k.otwory.find((x) => x.id === z.id)
    const w = o && k.sciany.find((x) => x.id === o.scianaId)
    if (!o || !w) return null
    const L = dist(w.a, w.b)
    const zm = (f: (q: NonNullable<typeof o>) => void) => s.zmien((_, kk) => { const q = kk.otwory.find((x) => x.id === z.id); if (q) f(q) })
    const drzwi = o.rodzaj === 'drzwi' || o.rodzaj === 'drzwi-wej'
    return (
      <Sekcja tytul={OTWORY[o.rodzaj].nazwa} akcja={usun}>
        <Wiersz etykieta="Rodzaj">
          <select value={o.rodzaj} onChange={(e) => zm((q) => { const r = e.target.value as RodzajOtworu; const d = OTWORY[r]; q.rodzaj = r; q.wys = d.wys; q.parapet = d.parapet })}>
            {Object.entries(OTWORY).map(([id, v]) => <option key={id} value={id}>{v.nazwa}</option>)}
          </select>
        </Wiersz>
        <Wiersz etykieta="Szerokość"><Liczba wartosc={o.szer} jedn="m" min={0.4} max={Math.max(0.5, L - 0.1)} zmiana={(v) => v && zm((q) => { q.szer = v; q.poz = Math.max(v / 2 + 0.02, Math.min(L - v / 2 - 0.02, q.poz)) })} /></Wiersz>
        <Wiersz etykieta="Wysokość"><Liczba wartosc={o.wys} jedn="m" min={0.3} max={3.5} zmiana={(v) => v && zm((q) => { q.wys = v })} /></Wiersz>
        {OTWORY[o.rodzaj].okno && <Wiersz etykieta="Parapet" opis="nad podłogą"><Liczba wartosc={o.parapet} jedn="m" min={0} max={2.5} zmiana={(v) => v != null && zm((q) => { q.parapet = v })} /></Wiersz>}
        <Wiersz etykieta="Od narożnika" opis="do krawędzi otworu"><Liczba wartosc={o.poz - o.szer / 2} jedn="m" min={0.02} max={L - o.szer - 0.02} zmiana={(v) => v != null && zm((q) => { q.poz = v + q.szer / 2 })} /></Wiersz>
        {drzwi && <div className="rzad">
          <button className="btn" onClick={() => zm((q) => { q.zawias = -q.zawias as 1 | -1 })}><FlipHorizontal2 size={15} />Zawiasy</button>
          <button className="btn" onClick={() => zm((q) => { q.strona = -q.strona as 1 | -1 })}><FlipVertical2 size={15} />Strona</button>
        </div>}
      </Sekcja>
    )
  }
  if (z?.typ === 'pokoj') {
    const p = uklad.pokoje.find((x) => x.klucz === z.klucz)
    if (!p) return <p className="pusto">Pomieszczenie zniknęło po zmianie ścian.</p>
    const typ = typPokoju(p.etykieta?.typ ?? 'inne')
    const zm = (c: { nazwa?: string; typ?: string }) => {
      let id: string | null = null
      s.zmien((_, kk) => { id = nazwijPokoj(kk, z.klucz, c) })
      if (id) s.ustaw({ zaznaczenie: { typ: 'pokoj', klucz: id } })
    }
    return (
      <Sekcja tytul="Pomieszczenie">
        <Wiersz etykieta="Nazwa"><input type="text" value={p.etykieta?.nazwa ?? ''} placeholder={typ.nazwa} onChange={(e) => zm({ nazwa: e.target.value })} /></Wiersz>
        <div className="typy">
          {POKOJE.map((t) => (
            <button key={t.id} className={t.id === typ.id ? 'akt' : ''} onClick={() => zm({ typ: t.id, nazwa: p.etykieta?.nazwa && p.etykieta.nazwa !== typ.nazwa ? p.etykieta.nazwa : t.nazwa })}>
              <i style={{ background: t.kolor }} />{t.nazwa}
            </button>
          ))}
        </div>
        <dl className="dane">
          <dt>Powierzchnia w świetle ścian</dt><dd>{fmtM(p.pow)} m²</dd>
          <dt>Obwód</dt><dd>{fmtM(obwod(p.wnetrze))} m</dd>
        </dl>
      </Sekcja>
    )
  }
  if (z?.typ === 'mebel') {
    const m = k.meble.find((x) => x.id === z.id)
    if (!m) return null
    const zm = (f: (q: NonNullable<typeof m>) => void) => s.zmien((_, kk) => { const q = kk.meble.find((x) => x.id === z.id); if (q) f(q) })
    return (
      <Sekcja tytul={wzorMebla(m.wzor)?.nazwa ?? 'Mebel'} akcja={usun}>
        <Wiersz etykieta="Szerokość"><Liczba wartosc={m.szer} jedn="m" min={0.2} max={12} zmiana={(v) => v && zm((q) => { q.szer = v })} /></Wiersz>
        <Wiersz etykieta="Głębokość"><Liczba wartosc={m.gl} jedn="m" min={0.2} max={12} zmiana={(v) => v && zm((q) => { q.gl = v })} /></Wiersz>
        <Wiersz etykieta="Wysokość"><Liczba wartosc={m.wys} jedn="m" min={0.1} max={4} zmiana={(v) => v && zm((q) => { q.wys = v })} /></Wiersz>
        <Wiersz etykieta="Obrót"><Liczba wartosc={m.obrot} jedn="°" krok={15} miejsca={0} zmiana={(v) => v != null && zm((q) => { q.obrot = ((v % 360) + 360) % 360 })} /></Wiersz>
        <div className="rzad">
          <button className="btn" onClick={() => zm((q) => { q.obrot = (q.obrot + 90) % 360 })}><RotateCw size={15} />Obróć o 90°</button>
          <button className="btn" onClick={() => { const id = noweId('m'); s.zmien((_, kk) => { kk.meble.push({ ...m, id, x: m.x + 0.5, y: m.y - 0.5 }) }); s.ustaw({ zaznaczenie: { typ: 'mebel', id } }) }}><Copy size={15} />Powiel</button>
        </div>
      </Sekcja>
    )
  }
  if (z?.typ === 'teren') {
    const t = s.projekt.teren.find((x) => x.id === z.id)
    if (!t) return null
    const zm = (f: (q: NonNullable<typeof t>) => void) => s.zmien((p) => { const q = p.teren.find((x) => x.id === z.id); if (q) f(q) })
    const w = TEREN[t.rodzaj]
    return (
      <Sekcja tytul={w.nazwa} akcja={usun}>
        <Wiersz etykieta="Rodzaj">
          <select value={t.rodzaj} onChange={(e) => zm((q) => { q.rodzaj = e.target.value as RodzajTerenu })}>
            {Object.entries(TEREN).map(([id, v]) => <option key={id} value={id}>{v.nazwa}</option>)}
          </select>
        </Wiersz>
        <Wiersz etykieta={t.rodzaj === 'drzewo' ? 'Średnica korony' : 'W głąb działki'}><Liczba wartosc={t.szer} jedn="m" min={0.3} max={60} zmiana={(v) => v && zm((q) => { q.szer = v; if (q.rodzaj === 'drzewo') q.gl = v })} /></Wiersz>
        {t.rodzaj !== 'drzewo' && <>
          <Wiersz etykieta="Wzdłuż drogi"><Liczba wartosc={t.gl} jedn="m" min={0.3} max={120} zmiana={(v) => v && zm((q) => { q.gl = v })} /></Wiersz>
          <Wiersz etykieta="Obrót"><Liczba wartosc={t.obrot} jedn="°" krok={15} miejsca={0} zmiana={(v) => v != null && zm((q) => { q.obrot = ((v % 360) + 360) % 360 })} /></Wiersz>
        </>}
        <dl className="dane">
          <dt>Powierzchnia</dt><dd>{fmtM(t.rodzaj === 'drzewo' ? Math.PI * (t.szer / 2) ** 2 : t.szer * t.gl, 1)} m²</dd>
          <dt>We wskaźnikach</dt><dd>{w.zabudowa ? 'powierzchnia zabudowy' : w.bio ? 'biologicznie czynna' : 'utwardzona'}</dd>
        </dl>
      </Sekcja>
    )
  }

  if (z?.typ === 'dach') {
    const c = s.projekt.dach.czesci.find((x) => x.id === z.id)
    if (!c) return null
    const zm = (f: (q: NonNullable<typeof c>) => void) => s.zmien((p) => { const q = p.dach.czesci.find((x) => x.id === z.id); if (q) f(q) })
    const el = elementyDachu(s.projekt, s.projekt.kondygnacje.map((x) => znajdzUklad(x))).find((x) => x.czescId === c.id)
    const prosto = Math.abs(c.obrot % 180) < 0.5
    const podziel = (os: 'szer' | 'gl') => { let id: string | null = null; s.zmien((p) => { id = podzielCzesc(p, c.id, os) }); if (id) s.ustaw({ zaznaczenie: { typ: 'dach', id } }) }
    return (
      <Sekcja tytul="Część dachu" akcja={usun}>
        <Segmenty<RodzajDachu> wartosc={c.rodzaj} zmiana={(v) => zm((q) => { q.rodzaj = v })}
          opcje={[{ id: 'dwuspadowy', nazwa: 'Dwuspadowy' }, { id: 'czterospadowy', nazwa: 'Kopertowy' }, { id: 'jednospadowy', nazwa: 'Jednospadowy' }, { id: 'plaski', nazwa: 'Płaski' }]} />
        {c.rodzaj !== 'plaski' && <>
          <Wiersz etykieta="Nachylenie połaci" opis="plan: do 45°"><Liczba wartosc={c.kat} jedn="°" krok={1} min={3} max={60} miejsca={0} zmiana={(v) => v && zm((q) => { q.kat = v })} /></Wiersz>
          <Wiersz etykieta="Okap"><Liczba wartosc={c.okap} jedn="m" min={0} max={1.5} zmiana={(v) => v != null && zm((q) => { q.okap = v })} /></Wiersz>
          <Przelacznik wartosc={c.kalenicaPoprzecznie} zmiana={(v) => zm((q) => { q.kalenicaPoprzecznie = v })}>{c.rodzaj === 'jednospadowy' ? 'Spadek wzdłuż dłuższego boku' : 'Kalenica w poprzek dłuższego boku'}</Przelacznik>
          {c.rodzaj === 'dwuspadowy' && <Przelacznik wartosc={!!c.szklaneSzczyty} zmiana={(v) => zm((q) => { q.szklaneSzczyty = v })}>Szczyty ze szkła</Przelacznik>}
          {c.rodzaj === 'jednospadowy' && <Przelacznik wartosc={c.odwroc} zmiana={(v) => zm((q) => { q.odwroc = v })}>Spadek w drugą stronę</Przelacznik>}
        </>}
        <Wiersz etykieta="Podniesienie nad strop" opis="ścianka kolankowa, attyka"><Liczba wartosc={c.kolankowa} jedn="m" min={0} max={3} zmiana={(v) => v != null && zm((q) => { q.kolankowa = v })} /></Wiersz>
        <Wiersz etykieta="Wykończenie ścian pod dachem">
          <select value={c.wykonczenie ?? ''} onChange={(e) => zm((q) => { if (e.target.value) q.wykonczenie = e.target.value as Wykonczenie; else delete q.wykonczenie })}>
            <option value="">Jak cały dom</option>
            {WYKONCZENIA.map((x) => <option key={x.id} value={x.id}>{x.nazwa}</option>)}
          </select>
        </Wiersz>
        <Wiersz etykieta="Kolor ścian pod dachem" opis="szczyty, ścianka, attyka"><input type="color" value={c.elewacja ?? s.projekt.ustawienia.kolorElewacji} onChange={(e) => s.zmienRoboczo((p) => { const q = p.dach.czesci.find((x) => x.id === z.id); if (q) q.elewacja = e.target.value })} /></Wiersz>
        <Wiersz etykieta={prosto ? 'W głąb działki' : 'Szerokość'}><Liczba wartosc={c.szer} jedn="m" min={0.5} max={60} zmiana={(v) => v && zm((q) => { q.szer = v })} /></Wiersz>
        <Wiersz etykieta={prosto ? 'Wzdłuż drogi' : 'Długość'}><Liczba wartosc={c.gl} jedn="m" min={0.5} max={60} zmiana={(v) => v && zm((q) => { q.gl = v })} /></Wiersz>
        <Wiersz etykieta="Obrót"><Liczba wartosc={c.obrot} jedn="°" krok={15} miejsca={1} zmiana={(v) => v != null && zm((q) => { q.obrot = ((v % 360) + 360) % 360 })} /></Wiersz>
        <div className="rzad">
          <button className="btn" onClick={() => podziel('szer')}>Podziel w głąb</button>
          <button className="btn" onClick={() => podziel('gl')}>Podziel wzdłuż</button>
        </div>
        {el && <dl className="dane">
          <dt>Podstawa dachu nad terenem</dt><dd>{fmtM(el.baza)} m</dd>
          <dt>Najwyższy punkt</dt><dd>{fmtM(el.baza + el.pr.wys)} m</dd>
        </dl>}
        <p className="uwaga-mala">Przeciągnij część, żeby ją przesunąć. Kwadraty na krawędziach zmieniają jej wymiar. Podział tnie ją na dwie równe części, każdej ustawisz inny rodzaj.</p>
      </Sekcja>
    )
  }

  // Nic nie jest zaznaczone: ustawienia kondygnacji, dachu i całego domu.
  const d = s.projekt.dach
  const u = s.projekt.ustawienia
  const n = s.projekt.kondygnacje.length
  const reczny = d.czesci.length > 0
  return (
    <>
      <Sekcja tytul={`Kondygnacja: ${k.nazwa}`}>
        <Wiersz etykieta="Nazwa"><input type="text" value={k.nazwa} onChange={(e) => s.zmien((_, kk) => { kk.nazwa = e.target.value })} /></Wiersz>
        <Wiersz etykieta="Wysokość pomieszczeń" opis="min. 2,5 m w pokojach"><Liczba wartosc={k.wysokosc} jedn="m" min={2} max={4.5} zmiana={(v) => v && s.zmien((_, kk) => { kk.wysokosc = v })} /></Wiersz>
        <Wiersz etykieta="Strop nad kondygnacją"><Liczba wartosc={k.strop} jedn="m" min={0.1} max={0.8} zmiana={(v) => v && s.zmien((_, kk) => { kk.strop = v })} /></Wiersz>
        <dl className="dane">
          <dt>Pomieszczenia</dt><dd>{uklad.pokoje.length}</dd>
          <dt>Powierzchnia w świetle ścian</dt><dd>{fmtM(uklad.pokoje.reduce((a, p) => a + p.pow, 0), 1)} m²</dd>
        </dl>
      </Sekcja>
      <Sekcja tytul="Dach">
        {reczny ? <>
          <p className="uwaga-mala">Dach jest ułożony z części. Każda ma własny rodzaj i nachylenie.</p>
          <div className="czesci">
            {d.czesci.map((c, i) => (
              <button key={c.id} onClick={() => s.ustaw({ zaznaczenie: { typ: 'dach', id: c.id } })}>
                <b>{i + 1}</b><span>{NAZWY_DACHU[c.rodzaj]}{c.rodzaj !== 'plaski' ? ` ${c.kat}°` : ''}</span><em>{fmtM(c.szer, 1)} × {fmtM(c.gl, 1)} m</em>
              </button>
            ))}
          </div>
          <div className="rzad">
            <button className="btn glowny" onClick={() => s.ustaw({ narzedzie: 'dach' })}>Układaj części</button>
            <button className="btn" onClick={() => { s.zmien((p) => { p.dach.czesci = [] }); s.ustaw({ zaznaczenie: null }) }}>Dach sam z obrysu</button>
          </div>
        </> : <>
          <Segmenty<RodzajDachu> wartosc={d.rodzaj} zmiana={(v) => s.zmien((p) => { p.dach.rodzaj = v; if (v === 'plaski') p.dach.poddasze = false })}
            opcje={[{ id: 'dwuspadowy', nazwa: 'Dwuspadowy' }, { id: 'czterospadowy', nazwa: 'Kopertowy' }, { id: 'jednospadowy', nazwa: 'Jednospadowy' }, { id: 'plaski', nazwa: 'Płaski' }]} />
          {d.rodzaj !== 'plaski' && <>
            <Wiersz etykieta="Nachylenie połaci" opis="plan: do 45°"><Liczba wartosc={d.kat} jedn="°" krok={1} min={5} max={60} miejsca={0} zmiana={(v) => v && s.zmien((p) => { p.dach.kat = v })} /></Wiersz>
            <Wiersz etykieta="Okap"><Liczba wartosc={d.okap} jedn="m" min={0} max={1.5} zmiana={(v) => v != null && s.zmien((p) => { p.dach.okap = v })} /></Wiersz>
          </>}
          <Wiersz etykieta="Ścianka kolankowa"><Liczba wartosc={d.kolankowa} jedn="m" min={0} max={2.2} zmiana={(v) => v != null && s.zmien((p) => { p.dach.kolankowa = v })} /></Wiersz>
          {d.rodzaj !== 'plaski' && <Przelacznik wartosc={d.kalenicaPoprzecznie} zmiana={(v) => s.zmien((p) => { p.dach.kalenicaPoprzecznie = v })}>Kalenica w poprzek dłuższego boku</Przelacznik>}
          <button className="btn glowny" disabled={!uklad.obrysy.length && s.projekt.kondygnacje.every((x) => !x.sciany.length)} onClick={() => s.ustaw({ narzedzie: 'dach' })}>Podziel dach na części i układaj</button>
          <p className="uwaga-mala">Teraz dach liczy się sam z całego obrysu. Po podziale każda część może mieć inny rodzaj, na przykład przód dwuspadowy, a tył płaski.</p>
        </>}
        {n > 1 && d.czesci.length <= 1 && <Przelacznik wartosc={d.poddasze} zmiana={(v) => s.zmien((p) => { p.dach.poddasze = v; if (v && !p.dach.czesci.length && p.dach.kolankowa < 0.6) p.dach.kolankowa = 1 })}>Ostatnia kondygnacja to poddasze użytkowe</Przelacznik>}
        <Wiersz etykieta="Pokrycie połaci" opis="dach płaski ma żwir i attykę">
          <select value={d.pokrycie ?? 'rabek'} onChange={(e) => s.zmien((p) => { p.dach.pokrycie = e.target.value as Pokrycie })}>
            <option value="rabek">Blacha na rąbek</option>
            <option value="dachowka">Dachówka</option>
          </select>
        </Wiersz>
        <Wiersz etykieta="Kolor pokrycia"><input type="color" value={d.kolor} onChange={(e) => s.zmienRoboczo((p) => { p.dach.kolor = e.target.value })} /></Wiersz>
      </Sekcja>
      <Sekcja tytul="Cały dom">
        <Wiersz etykieta="Wykończenie elewacji">
          <select value={u.wykonczenie ?? 'tynk'} onChange={(e) => s.zmien((p) => { p.ustawienia.wykonczenie = e.target.value as Wykonczenie })}>
            {WYKONCZENIA.map((x) => <option key={x.id} value={x.id}>{x.nazwa}</option>)}
          </select>
        </Wiersz>
        <Wiersz etykieta="Poziom parteru" opis="nad terenem"><Liczba wartosc={u.poziomParteru} jedn="m" min={0} max={1.5} zmiana={(v) => v != null && s.zmien((p) => { p.ustawienia.poziomParteru = v })} /></Wiersz>
        <Wiersz etykieta="Kolor elewacji"><input type="color" value={u.kolorElewacji} onChange={(e) => s.zmienRoboczo((p) => { p.ustawienia.kolorElewacji = e.target.value })} /></Wiersz>
        <div className="przesun">
          <span>Przesuń dom o 10 cm</span>
          <div>
            <button className="btn ikona" title="W stronę granicy frontowej" onClick={() => s.zmien((p) => przesunDom(p, { x: -0.1, y: 0 }))}>◀ droga</button>
            <button className="btn ikona" title="W głąb działki" onClick={() => s.zmien((p) => przesunDom(p, { x: 0.1, y: 0 }))}>sąsiad ▶</button>
            <button className="btn ikona" title="Na północ, wzdłuż drogi" onClick={() => s.zmien((p) => przesunDom(p, { x: 0, y: 0.1 }))}>▲ północ</button>
            <button className="btn ikona" title="Na południe, wzdłuż drogi" onClick={() => s.zmien((p) => przesunDom(p, { x: 0, y: -0.1 }))}>▼ południe</button>
          </div>
        </div>
        <button className="btn" onClick={() => s.zmien((p) => obrocDom(p, 90))}><RotateCw size={15} />Obróć dom o 90°</button>
      </Sekcja>
    </>
  )
}

function Pasek({ wartosc, limit, odwrotnie = false }: { wartosc: number; limit: number | null; odwrotnie?: boolean }) {
  if (limit == null) return null
  const zle = odwrotnie ? wartosc < limit : wartosc > limit
  const skala = odwrotnie ? 100 : Math.max(limit * 1.4, wartosc * 1.1)
  return (
    <div className={`pasek ${zle ? 'zle' : ''}`}>
      <i style={{ width: `${Math.min(100, (wartosc / skala) * 100)}%` }} />
      <b style={{ left: `${Math.min(100, (limit / skala) * 100)}%` }} />
    </div>
  )
}

function Wskazniki() {
  const s = useMagazyn()
  const w = useMemo(() => policz(s.projekt), [s.projekt])
  const u = s.projekt.ustawienia
  const f1 = (v: number) => fmtM(v, 1)
  const limit = (pole: keyof typeof u, v: number | null) => s.zmien((p) => { (p.ustawienia as any)[pole] = v })
  const bledy = w.uwagi.filter((x) => x.poziom === 'blad'), ostrz = w.uwagi.filter((x) => x.poziom !== 'blad')
  const jestDom = w.powZabudowy > 0
  return (
    <>
      <Sekcja tytul="Bilans działki">
        <div className="kafle">
          <div className="kafel"><span>Powierzchnia zabudowy</span><strong>{f1(w.powZabudowy)} m²</strong><em>{f1(w.procZabudowy)}% {u.maxZabudowy != null ? `z ${u.maxZabudowy}%` : 'działki'}</em><Pasek wartosc={w.procZabudowy} limit={u.maxZabudowy} /></div>
          <div className="kafel"><span>Biologicznie czynna</span><strong>{f1(w.procBio)}%</strong><em>{Math.round(w.powBio)} m², min. {u.minBioCzynna ?? 'brak'}%</em><Pasek wartosc={w.procBio} limit={u.minBioCzynna} odwrotnie /></div>
          <div className="kafel"><span>Intensywność zabudowy</span><strong>{fmtM(w.intensywnosc)}</strong><em>{u.minIntensywnosc != null ? `${fmtM(u.minIntensywnosc)} do ` : 'do '}{u.maxIntensywnosc != null ? fmtM(u.maxIntensywnosc) : 'brak'}</em><Pasek wartosc={w.intensywnosc} limit={u.maxIntensywnosc} /></div>
          <div className="kafel"><span>Wysokość budynku</span><strong>{jestDom ? `${f1(w.wysokosc)} m` : 'brak'}</strong><em>do {u.maxWysokosc ?? 'brak'} m</em><Pasek wartosc={w.wysokosc} limit={u.maxWysokosc} /></div>
        </div>
        <dl className="dane">
          <dt>Powierzchnia odniesienia</dt><dd>{Math.round(w.powOdniesienia)} m²</dd>
          <dt>Powierzchnia całkowita kondygnacji</dt><dd>{f1(w.powCalkowita)} m²</dd>
          <dt>Powierzchnia w świetle ścian</dt><dd>{f1(w.powUzytkowa)} m²</dd>
          <dt>Nawierzchnie utwardzone</dt><dd>{f1(w.powUtwardzona)} m²</dd>
        </dl>
        {PAS_DROGI.length > 2 && <Przelacznik wartosc={u.wskaznikiOdTerenuMN} zmiana={(v) => s.zmien((p) => { p.ustawienia.wskaznikiOdTerenuMN = v })}>Licz od części poza pasem drogi ({Math.round(POW_MN)} m²)</Przelacznik>}
      </Sekcja>

      <Sekcja tytul="Kontrola">
        {!jestDom && <p className="pusto">Narysuj obrys domu, a sprawdzę linie zabudowy, odległości od sąsiada i limity z planu.</p>}
        {jestDom && !w.uwagi.length && <div className="komunikat ok"><CircleCheck size={16} /><span>Dom mieści się w liniach zabudowy, w odległościach od sąsiada i w limitach planu.</span></div>}
        {bledy.map((x, i) => (
          <button key={i} className="komunikat blad" onClick={() => x.scianaId && x.kondygnacja && s.ustaw({ aktywna: x.kondygnacja, zaznaczenie: { typ: 'sciana', id: x.scianaId } })}>
            <TriangleAlert size={16} /><span>{x.tekst}</span>
          </button>
        ))}
        {ostrz.map((x, i) => <div key={i} className="komunikat ostrz"><Info size={16} /><span>{x.tekst}</span></div>)}
      </Sekcja>

      <Sekcja tytul="Limity z planu">
        <Wiersz etykieta="Maks. zabudowa"><Liczba wartosc={u.maxZabudowy} jedn="%" puste miejsca={0} krok={1} min={1} max={100} zmiana={(v) => limit('maxZabudowy', v)} /></Wiersz>
        <Wiersz etykieta="Min. biologicznie czynna"><Liczba wartosc={u.minBioCzynna} jedn="%" puste miejsca={0} krok={1} min={0} max={100} zmiana={(v) => limit('minBioCzynna', v)} /></Wiersz>
        <Wiersz etykieta="Intensywność od"><Liczba wartosc={u.minIntensywnosc} puste min={0} max={5} zmiana={(v) => limit('minIntensywnosc', v)} /></Wiersz>
        <Wiersz etykieta="Intensywność do"><Liczba wartosc={u.maxIntensywnosc} puste min={0} max={5} zmiana={(v) => limit('maxIntensywnosc', v)} /></Wiersz>
        <Wiersz etykieta="Maks. wysokość"><Liczba wartosc={u.maxWysokosc} jedn="m" puste miejsca={1} krok={0.5} min={3} max={40} zmiana={(v) => limit('maxWysokosc', v)} /></Wiersz>
        <Wiersz etykieta="Maks. nachylenie dachu"><Liczba wartosc={u.maxKatDachu} jedn="°" puste miejsca={0} krok={1} min={0} max={70} zmiana={(v) => limit('maxKatDachu', v)} /></Wiersz>
        <p className="uwaga-mala">Domyślne limity pochodzą z pliku działki (src/dane/dzialka.json). Wpisz tu ustalenia ze swojego planu miejscowego albo z decyzji o warunkach zabudowy, a kontrola wyżej przeliczy się od razu.</p>
      </Sekcja>
    </>
  )
}

function Meble() {
  const s = useMagazyn()
  const grupy = useMemo(() => [...new Set(MEBLE.map((m) => m.grupa))], [])
  const wstaw = (wzor: string) => {
    let id: string | null = null
    s.zmien((_, k) => { id = dodajMebel(k, wzor, { x: Math.round(s.widok.cx * 10) / 10, y: Math.round(s.widok.cy * 10) / 10 }) })
    if (id) s.ustaw({ zaznaczenie: { typ: 'mebel', id }, narzedzie: 'zaznacz' })
  }
  return (
    <>
      <p className="uwaga-mala gora">Kliknij, żeby wstawić mebel na środku widoku. Potem przeciągnij go na miejsce, kółkiem nad nim obrócisz.</p>
      {grupy.map((g) => (
        <Sekcja key={g} tytul={g}>
          <div className="meble">
            {MEBLE.filter((m) => m.grupa === g).map((m) => (
              <button key={m.id} onClick={() => wstaw(m.id)}>
                <svg viewBox="0 0 44 32"><rect x={22 - Math.min(20, m.szer * 7)} y={16 - Math.min(14, m.gl * 7)} width={Math.min(40, m.szer * 14)} height={Math.min(28, m.gl * 14)} rx="2" fill={m.kolor} stroke="#475569" strokeWidth="1" /></svg>
                <span>{m.nazwa}</span><em>{fmtM(m.szer)} × {fmtM(m.gl)}</em>
              </button>
            ))}
          </div>
        </Sekcja>
      ))}
    </>
  )
}

function Dzialka() {
  return <DzialkaKarta />
}

export function PanelPrawy() {
  const [karta, setKarta] = useState<Karta>('wlasciwosci')
  const zazn = useMagazyn((s) => s.zaznaczenie)
  const projekt = useMagazyn((s) => s.projekt)
  const ileBledow = useMemo(() => policz(projekt).uwagi.filter((u) => u.poziom === 'blad').length, [projekt])
  const widoczna = zazn && karta !== 'wlasciwosci' && karta !== 'wskazniki' && karta !== 'pokoje' ? 'wlasciwosci' : karta
  return (
    <aside className="panel">
      <nav className="karty">
        {([['wlasciwosci', zazn ? 'Zaznaczone' : 'Dom'], ['wskazniki', 'Wskaźniki'], ['pokoje', 'Pokoje'], ['meble', 'Meble'], ['dzialka', 'Działka']] as [Karta, string][]).map(([id, nazwa]) => (
          <button key={id} className={widoczna === id ? 'akt' : ''} onClick={() => { setKarta(id); if (id === 'meble' || id === 'dzialka') useMagazyn.getState().ustaw({ zaznaczenie: null }) }}>
            {nazwa}{id === 'wskazniki' && ileBledow > 0 && <b>{ileBledow}</b>}
          </button>
        ))}
      </nav>
      <div className="panel-tresc">
        {widoczna === 'wlasciwosci' && <Wlasciwosci />}
        {widoczna === 'wskazniki' && <Wskazniki />}
        {widoczna === 'pokoje' && <Pokoje />}
        {widoczna === 'meble' && <Meble />}
        {widoczna === 'dzialka' && <Dzialka />}
      </div>
    </aside>
  )
}
