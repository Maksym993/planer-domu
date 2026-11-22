// Zakładka Działka: dane działki, pobranie własnej działki z ULDK, opis granic i ustalenia planu.

import { CircleCheck, Download, Info, RotateCcw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { DANE, DZIALKA_META, KRAWEDZIE, POW_GEOM, POW_MN, POW_ZABUDOWY_MAX, PAS_DROGI, type DaneDzialki, type TypKrawedzi } from '../dane/dzialka'
import { dist, fmtM } from '../model/geom'
import { Sekcja } from './Pola'

const TYPY: [TypKrawedzi, string][] = [['droga', 'droga'], ['sasiad', 'sąsiad'], ['woda', 'rów, woda'], ['inne', 'inne']]

type Stan = { tryb: 'nic' | 'praca' | 'ok' | 'blad'; tekst?: string; trafienia?: { id: string; region: string; commune: string }[] }

async function zapiszDane(d: DaneDzialki) {
  const r = await fetch('/api/dzialka', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(d) })
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).blad ?? `kod ${r.status}`)
}

function Pobieranie() {
  const [id, setId] = useState('')
  const [mapy, setMapy] = useState(true)
  const [stan, setStan] = useState<Stan>({ tryb: 'nic' })
  const pobierz = async (tekst = id) => {
    setStan({ tryb: 'praca', tekst: mapy ? 'Pobieram granice z ULDK i podkłady z geoportalu, to trwa do minuty.' : 'Pobieram granice z ULDK.' })
    try {
      const r = await fetch(`/api/dzialka?id=${encodeURIComponent(tekst.trim())}&mapy=${mapy ? 1 : 0}`, { method: 'POST' })
      const d = await r.json()
      if (!d.ok) { setStan({ tryb: 'blad', tekst: d.blad, trafienia: d.trafienia }); return }
      setStan({ tryb: 'ok', tekst: 'Gotowe, wczytuję działkę.' })
      setTimeout(() => location.reload(), 600)
    } catch {
      setStan({ tryb: 'blad', tekst: 'Brak połączenia z serwerem planera. Pobieranie działa tylko po uruchomieniu przez npm run dev.' })
    }
  }
  const wroc = async () => {
    await fetch('/api/dzialka', { method: 'DELETE' })
    setTimeout(() => location.reload(), 300)
  }
  return (
    <Sekcja tytul="Twoja działka">
      <p className="uwaga-mala">Wpisz identyfikator działki z geoportalu (geoportal.gov.pl, kliknij działkę na mapie, pole „Identyfikator działki”) albo nazwę obrębu i numer działki. Planer pobierze granice z usługi ULDK, a jeśli zaznaczysz podkłady, także ortofotomapę, mapę ewidencyjną i rysunek planu miejscowego.</p>
      <div className="dzialka-pole">
        <input type="text" value={id} placeholder="np. 123456_7.0001.123/4" onChange={(e) => setId(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && id.trim()) pobierz() }} aria-label="Identyfikator działki" />
        <button className="btn glowny" disabled={!id.trim() || stan.tryb === 'praca'} onClick={() => pobierz()}><Download size={15} />Pobierz</button>
      </div>
      <label className="dzialka-mapy"><input type="checkbox" checked={mapy} onChange={(e) => setMapy(e.target.checked)} />Pobierz też podkłady z geoportalu</label>
      {stan.tryb === 'praca' && <div className="komunikat ostrz"><Info size={16} /><span>{stan.tekst}</span></div>}
      {stan.tryb === 'ok' && <div className="komunikat ok"><CircleCheck size={16} /><span>{stan.tekst}</span></div>}
      {stan.tryb === 'blad' && <div className="komunikat blad"><TriangleAlert size={16} /><span>{stan.tekst}</span></div>}
      {stan.tryb === 'blad' && !!stan.trafienia?.length && (
        <div className="dzialka-trafienia">
          {stan.trafienia.map((t) => <button key={t.id} className="btn" onClick={() => { setId(t.id); pobierz(t.id) }}>{t.id} · {t.region}, {t.commune}</button>)}
        </div>
      )}
      {!DZIALKA_META.przyklad && <button className="btn" onClick={wroc}><RotateCcw size={14} />Wróć do działki przykładowej</button>}
    </Sekcja>
  )
}

function Granice() {
  const [d, setD] = useState<DaneDzialki>(() => JSON.parse(JSON.stringify(DANE)))
  const [stan, setStan] = useState<Stan>({ tryb: 'nic' })
  const zmien = (i: number, cz: Partial<DaneDzialki['krawedzie'][number]>) => setD((s) => ({ ...s, krawedzie: s.krawedzie.map((k, j) => (j === i ? { ...k, ...cz } : k)) }))
  // Front działki to krawędź od ostatniego wierzchołka do pierwszego: obracamy listy tak, żeby wybrana nią została.
  const naFront = (i: number) => setD((s) => {
    const n = s.wierzcholki.length, od = (i + 1) % n
    return { ...s, wierzcholki: [...s.wierzcholki.slice(od), ...s.wierzcholki.slice(0, od)], krawedzie: [...s.krawedzie.slice(od), ...s.krawedzie.slice(0, od)] }
  })
  const zmienione = JSON.stringify(d) !== JSON.stringify(DANE)
  const zapisz = async () => {
    setStan({ tryb: 'praca' })
    try { await zapiszDane({ ...d, przyklad: d.przyklad }); setTimeout(() => location.reload(), 300) } catch (e: any) { setStan({ tryb: 'blad', tekst: `Nie udało się zapisać: ${e.message}. Zapis działa tylko po uruchomieniu przez npm run dev.` }) }
  }
  const n = d.wierzcholki.length
  return (
    <Sekcja tytul="Granice">
      <p className="uwaga-mala">Opisz każdą granicę: droga, sąsiad albo rów. Przy drodze wpisz linię zabudowy z planu (zwykle 4 do 8 m). Front to granica, od której liczy się układ rzutu, najczęściej ta przy wjeździe.</p>
      <div className="granice">
        {d.krawedzie.slice(0, n).map((k, i) => {
          const kr = KRAWEDZIE[i]
          return (
            <div key={i} className="granica">
              <div className="granica-g">
                <input type="text" value={k.nazwa} onChange={(e) => zmien(i, { nazwa: e.target.value })} aria-label={`Nazwa granicy ${i + 1}`} />
                <span>{kr && !zmienione ? `${fmtM(dist(kr.a, kr.b))} m` : ''}</span>
              </div>
              <div className="granica-d">
                <select value={k.typ} onChange={(e) => zmien(i, { typ: e.target.value as TypKrawedzi })}>{TYPY.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
                <label>linia zab.<input type="number" min={0} max={30} step={0.5} value={k.liniaZabudowy ?? ''} placeholder="brak" onChange={(e) => zmien(i, { liniaZabudowy: e.target.value === '' ? null : Number(e.target.value) })} /> m</label>
                {i === n - 1 ? <em>front</em> : <button className="btn maly" onClick={() => naFront(i)}>na front</button>}
              </div>
            </div>
          )
        })}
      </div>
      {zmienione && <button className="btn glowny" disabled={stan.tryb === 'praca'} onClick={zapisz}>Zapisz granice i przelicz</button>}
      {stan.tryb === 'blad' && <div className="komunikat blad"><TriangleAlert size={16} /><span>{stan.tekst}</span></div>}
    </Sekcja>
  )
}

export function DzialkaKarta() {
  const m = DZIALKA_META
  return (
    <>
      <Sekcja tytul={m.nazwa}>
        <dl className="dane">
          {!m.przyklad && <><dt>Identyfikator</dt><dd>{m.id}</dd></>}
          {!m.przyklad && m.obreb && <><dt>Obręb</dt><dd>{m.obreb}</dd></>}
          {!m.przyklad && m.gmina && <><dt>Gmina, powiat</dt><dd>{m.gmina}, {m.powiat}</dd></>}
          {m.powEwidencyjna != null && <><dt>Powierzchnia z ewidencji</dt><dd>{m.powEwidencyjna} m²</dd></>}
          <dt>Powierzchnia z granic</dt><dd>{fmtM(POW_GEOM, 1)} m²</dd>
          {PAS_DROGI.length > 2 && <><dt>Poza pasem drogi</dt><dd>{fmtM(POW_MN, 1)} m²</dd></>}
          <dt>W liniach zabudowy</dt><dd>{fmtM(POW_ZABUDOWY_MAX, 1)} m²</dd>
        </dl>
        {m.przyklad && <p className="uwaga-mala">To działka przykładowa, zmyślona. Poniżej wczytasz swoją.</p>}
      </Sekcja>
      <Pobieranie />
      <Granice />
      <Sekcja tytul={`Plan miejscowy${m.teren ? `, teren ${m.teren}` : ''}`}>
        <ul className="lista">{DANE.plan.opis.map((t, i) => <li key={i}>{t}</li>)}</ul>
        <p className="uwaga-mala">{DANE.plan.zrodlo}</p>
        <p className="uwaga-mala">Limity liczbowe (zabudowa, biologicznie czynna, intensywność, wysokość, dach) wpisujesz w zakładce Wskaźniki, w sekcji „Limity z planu”. Domyślne wartości dla nowych projektów są w pliku src/dane/dzialka.json, w polu plan.</p>
      </Sekcja>
      <Sekcja tytul="Odległości od sąsiada">
        <p className="uwaga-mala">Warunki techniczne, § 12: ściana z oknami lub drzwiami co najmniej 4 m od granicy działki budowlanej, ściana bez otworów co najmniej 3 m. Okap, balkon i schody zewnętrzne co najmniej 1,5 m. Kontrola w zakładce Wskaźniki sprawdza ściany zwrócone do granic oznaczonych jako „sąsiad”.</p>
      </Sekcja>
    </>
  )
}
