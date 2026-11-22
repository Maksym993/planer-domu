import {
  AppWindow, Box, Columns2, DoorOpen, Download, FilePlus2, Home, Layers, Map as MapIcon, Maximize, Minus, MousePointer2, PenLine, Plus, Redo2, Camera, Footprints, Keyboard, Printer, Ruler, Square, Sun, Trash2, Trees, Triangle, Undo2, Upload,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DZIALKA_META, GRANICA, LINIA_ZAB_DROGA, MA_EWIDENCJA, MA_MPZP, MA_ORTO, OBSZAR_ZABUDOWY, PODPIS_DZIALKI, POLNOC, POW_GEOM } from './dane/dzialka'
import { Rzut, dopasujWidok } from './edytor/Rzut'
import { fmtM, ramka, rot } from './model/geom'
import { OTWORY, SCIANY, TEREN } from './model/katalog'
import { Warstwy, aktywnaKondygnacja, domTrzyStodoly, przykladowyProjekt, pustyProjekt, useMagazyn } from './model/magazyn'
import { dodajProstokat, nowaKondygnacja } from './model/operacje'
import { dzienRoku, fmtGodz, polozenieSlonca, wschodZachod } from './model/slonce'
import { podzielDach } from './model/dach'
import { znajdzUklad } from './model/topologia'
import type { Narzedzie, Projekt, RodzajDachu, RodzajOtworu, RodzajSciany, RodzajTerenu } from './model/typy'
import { Liczba, Przelacznik } from './ui/Pola'
import { PanelPrawy, powielZaznaczone, usunZaznaczone } from './ui/PanelPrawy'
import { Kamera3D, Widok3D, ustawKamere } from './widok3d/Widok3D'

const NARZEDZIA: { id: Narzedzie; nazwa: string; klawisz: string; ikona: React.ReactNode }[] = [
  { id: 'zaznacz', nazwa: 'Zaznacz i przesuwaj', klawisz: 'Z', ikona: <MousePointer2 size={19} /> },
  { id: 'sciana', nazwa: 'Ściana', klawisz: 'S', ikona: <PenLine size={19} /> },
  { id: 'pokoj', nazwa: 'Pokój albo obrys z prostokąta', klawisz: 'P', ikona: <Square size={19} /> },
  { id: 'drzwi', nazwa: 'Drzwi, brama, przejście', klawisz: 'D', ikona: <DoorOpen size={19} /> },
  { id: 'okno', nazwa: 'Okno', klawisz: 'O', ikona: <AppWindow size={19} /> },
  { id: 'dach', nazwa: 'Dach: układanie części', klawisz: 'K', ikona: <Triangle size={19} /> },
  { id: 'teren', nazwa: 'Zagospodarowanie działki', klawisz: 'T', ikona: <Trees size={19} /> },
  { id: 'miara', nazwa: 'Miara', klawisz: 'M', ikona: <Ruler size={19} /> },
]

const SKROTY: [string, string][] = [
  ['Z', 'zaznaczanie i przesuwanie'], ['S', 'ściana'], ['P', 'pokój z prostokąta'], ['D', 'drzwi, brama, przejście'], ['O', 'okno'],
  ['K', 'dach: układanie części'], ['T', 'elementy działki'], ['M', 'miara'], ['R', 'obrót zaznaczonego o 90°'],
  ['Strzałki', 'przesuwają zaznaczone o 5 cm, z Shiftem o 50 cm'], ['Cmd+D', 'powiela zaznaczone'], ['Delete', 'usuwa zaznaczone'],
  ['Cmd+Z', 'cofa, z Shiftem ponawia'], ['Esc', 'kończy rysowanie albo odznacza'], ['Alt', 'wyłącza przyciąganie'], ['Enter', 'zatwierdza wpisaną długość ściany'],
]

const MIESIACE = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień']

function rozmiarRzutu() {
  const el = document.querySelector('.rzut') as HTMLElement | null
  return { W: el?.clientWidth ?? 900, H: el?.clientHeight ?? 600 }
}

function pokazCel(co: 'dzialka' | 'dom' | 'obszar') {
  const s = useMagazyn.getState()
  const { W, H } = rozmiarRzutu()
  const sciany = s.projekt.kondygnacje.flatMap((k) => k.sciany.flatMap((q) => [q.a, q.b]))
  const pk = co === 'dzialka' ? GRANICA : co === 'dom' && sciany.length ? sciany : OBSZAR_ZABUDOWY
  s.ustawWidok(dopasujWidok(pk, W, H, s.widok.obrot, co === 'dom' ? Math.min(150, Math.min(W, H) * 0.2) : 50))
}

function Gora() {
  const s = useMagazyn()
  const plik = useRef<HTMLInputElement>(null)
  const [menu, setMenu] = useState(false)
  const [pomoc, setPomoc] = useState(false)
  const zapisz = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(s.projekt, null, 1)], { type: 'application/json' }))
    a.download = `${s.projekt.nazwa.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase() || 'dom'}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMenu(false)
  }
  const wczytaj = async (f: File | undefined) => {
    if (!f) return
    try {
      const p = JSON.parse(await f.text()) as Projekt
      if (p.wersja !== 1 || !Array.isArray(p.kondygnacje)) throw new Error('zły format')
      const wz = pustyProjekt()
      s.wczytaj({ ...p, ustawienia: { ...wz.ustawienia, ...p.ustawienia }, dach: { ...wz.dach, ...p.dach } })
    } catch { alert('Ten plik nie jest projektem z planera domu.') }
    setMenu(false)
  }
  return (
    <header className="gora">
      <div className="marka"><span className="znak"><Home size={16} /></span><input value={s.projekt.nazwa} onChange={(e) => s.zmienRoboczo((p) => { p.nazwa = e.target.value })} aria-label="Nazwa projektu" /></div>
      <div className="dzialka-info"><MapIcon size={14} />{PODPIS_DZIALKI} · {Math.round(DZIALKA_META.powEwidencyjna ?? POW_GEOM)} m²{DZIALKA_META.teren ? ` · teren ${DZIALKA_META.teren}` : ''}</div>
      <div className="tryby">
        {([['2d', 'Rzut', <Layers size={15} key="a" />], ['oba', 'Rzut i 3D', <Columns2 size={15} key="b" />], ['3d', 'Widok 3D', <Box size={15} key="c" />]] as const).map(([id, nazwa, ik]) => (
          <button key={id} className={s.tryb === id ? 'akt' : ''} onClick={() => s.ustaw({ tryb: id })}>{ik}{nazwa}</button>
        ))}
        {/* Wizualizacja willi „Trzy stodoły”: osobna scena z wnętrzami, ogrodem i spacerem. */}
        <a className="przycisk-willa" href="/?willa" target="_blank" rel="noreferrer"><Home size={15} />Willa 3D</a>
      </div>
      <div className="gora-prawa">
        <div className="menu-kot">
          <button className="btn ikona" title="Skróty klawiszowe" onClick={() => setPomoc(!pomoc)}><Keyboard size={17} /></button>
          {pomoc && <div className="menu skroty" onMouseLeave={() => setPomoc(false)}>
            {SKROTY.map(([kl, opis]) => <div key={kl}><kbd>{kl}</kbd><span>{opis}</span></div>)}
          </div>}
        </div>
        <button className="btn ikona" title="Cofnij (Cmd+Z)" disabled={!s.historia.length} onClick={s.cofnij}><Undo2 size={17} /></button>
        <button className="btn ikona" title="Ponów (Shift+Cmd+Z)" disabled={!s.przyszlosc.length} onClick={s.ponow}><Redo2 size={17} /></button>
        <div className="menu-kot">
          <button className="btn" onClick={() => setMenu(!menu)}>Projekt</button>
          {menu && <div className="menu" onMouseLeave={() => setMenu(false)}>
            <button onClick={() => { s.wczytaj(pustyProjekt()); setMenu(false) }}><FilePlus2 size={15} />Nowy, pusta działka</button>
            <button onClick={() => { s.wczytaj(domTrzyStodoly()); setMenu(false); setTimeout(() => pokazCel('dom'), 30) }}><Home size={15} />Willa „Trzy stodoły” (z wizualizacji)</button>
            <button onClick={() => { s.wczytaj(przykladowyProjekt()); setMenu(false); setTimeout(() => pokazCel('dom'), 30) }}><Home size={15} />Wczytaj mały dom przykładowy</button>
            <hr />
            <button onClick={zapisz}><Download size={15} />Zapisz do pliku</button>
            <button onClick={() => plik.current?.click()}><Upload size={15} />Otwórz z pliku</button>
            <button onClick={() => { setMenu(false); s.ustaw({ tryb: '2d', zaznaczenie: null }); setTimeout(() => window.print(), 250) }}><Printer size={15} />Drukuj rzut albo zapisz PDF</button>
            <p>Projekt zapisuje się też sam w tej przeglądarce.</p>
          </div>}
          <input ref={plik} type="file" accept="application/json,.json" hidden onChange={(e) => { wczytaj(e.target.files?.[0]); e.target.value = '' }} />
        </div>
      </div>
    </header>
  )
}

function Narzedzia() {
  const s = useMagazyn()
  return (
    <nav className="narzedzia">
      {NARZEDZIA.map((n) => (
        <button key={n.id} className={s.narzedzie === n.id ? 'akt' : ''} title={`${n.nazwa} (${n.klawisz})`} onClick={() => s.ustaw({ narzedzie: n.id })}>
          {n.ikona}<kbd>{n.klawisz}</kbd>
        </button>
      ))}
      <span className="odstep" />
      <button title="Usuń zaznaczone (Delete)" disabled={!s.zaznaczenie} onClick={usunZaznaczone}><Trash2 size={18} /></button>
    </nav>
  )
}

function Opcje() {
  const s = useMagazyn()
  const n = s.narzedzie
  if (n === 'sciana' || n === 'pokoj') return (
    <div className="opcje">
      <span>Rodzaj ściany</span>
      {(Object.keys(SCIANY) as RodzajSciany[]).map((id) => (
        <button key={id} className={s.rodzajSciany === id ? 'akt' : ''} onClick={() => s.ustaw({ rodzajSciany: id })}>{SCIANY[id].nazwa}<em>{Math.round(SCIANY[id].grubosc * 100)} cm</em></button>
      ))}
    </div>
  )
  if (n === 'drzwi' || n === 'okno') {
    const lista = (Object.keys(OTWORY) as RodzajOtworu[]).filter((id) => OTWORY[id].okno === (n === 'okno'))
    return (
      <div className="opcje">
        <span>{n === 'okno' ? 'Okno' : 'Otwór'}</span>
        {lista.map((id) => <button key={id} className={s.rodzajOtworu === id ? 'akt' : ''} onClick={() => s.ustaw({ rodzajOtworu: id })}>{OTWORY[id].nazwa}<em>{fmtM(OTWORY[id].szer)} m</em></button>)}
      </div>
    )
  }
  if (n === 'dach') {
    const nazwy: [RodzajDachu, string][] = [['dwuspadowy', 'Dwuspadowy'], ['czterospadowy', 'Kopertowy'], ['jednospadowy', 'Jednospadowy'], ['plaski', 'Płaski']]
    return (
      <div className="opcje">
        <span>Nowa część</span>
        {nazwy.map(([id, nazwa]) => <button key={id} className={s.rodzajDachu === id ? 'akt' : ''} onClick={() => s.ustaw({ rodzajDachu: id })}>{nazwa}</button>)}
      </div>
    )
  }
  if (n === 'teren') return (
    <div className="opcje">
      <span>Wstaw</span>
      {(Object.keys(TEREN) as RodzajTerenu[]).map((id) => <button key={id} className={s.rodzajTerenu === id ? 'akt' : ''} onClick={() => s.ustaw({ rodzajTerenu: id })}><i style={{ background: TEREN[id].kolor }} />{TEREN[id].nazwa}</button>)}
    </div>
  )
  return null
}

const WARSTWY: [keyof Warstwy, string][] = ([] as [keyof Warstwy, string][]).concat([
  ['orto', 'Ortofotomapa'], ['mpzp', 'Rysunek planu miejscowego'], ['ewidencja', 'Działki i budynki z ewidencji'], ['linie', 'Linie zabudowy'],
  ['dach', 'Dach'], ['siatka', 'Siatka 1 m'], ['wymiary', 'Wymiary i odległości'], ['teren', 'Zagospodarowanie'], ['meble', 'Meble'], ['nizej', 'Zarys kondygnacji niżej'],
]).filter(([k]) => (k !== 'orto' || MA_ORTO) && (k !== 'mpzp' || MA_MPZP) && (k !== 'ewidencja' || MA_EWIDENCJA))

function NakladkiRzutu() {
  const s = useMagazyn()
  const [otw, setOtw] = useState(false)
  const k = (s.widok.obrot * Math.PI) / 180
  const pn = rot(POLNOC, k)
  const katPn = (Math.atan2(pn.x, pn.y) * 180) / Math.PI
  const obrot = (o: number) => {
    const { W, H } = rozmiarRzutu()
    const sciany = s.projekt.kondygnacje.flatMap((x) => x.sciany.flatMap((q) => [q.a, q.b]))
    const pk = sciany.length ? [...sciany, { x: 0, y: ramka(sciany).miny - 6 }, { x: 20, y: ramka(sciany).maxy + 6 }] : GRANICA
    s.ustawWidok({ obrot: o, ...dopasujWidok(pk, W, H, o) })
  }
  const metry = [1, 2, 5, 10, 20, 50].find((m) => m * s.widok.skala >= 70) ?? 100
  return (
    <>
      <div className="nakl lg">
        <Opcje />
      </div>
      <div className="nakl pg">
        <div className="menu-kot">
          <button className="btn bialy" onClick={() => setOtw(!otw)}><Layers size={15} />Warstwy</button>
          {otw && <div className="menu warstwy" onMouseLeave={() => setOtw(false)}>
            {WARSTWY.map(([id, nazwa]) => <Przelacznik key={id} wartosc={s.warstwy[id]} zmiana={() => s.przelaczWarstwe(id)}>{nazwa}</Przelacznik>)}
          </div>}
        </div>
      </div>
      <div className="nakl ld">
        <div className="polnoc" title="Kierunek północy"><svg viewBox="-20 -20 40 40" style={{ transform: `rotate(${katPn}deg)` }}><path d="M0,-15 L6,7 L0,3 L-6,7 Z" fill="#1c2430" /></svg><b>N</b></div>
        <div className="podzialka"><i style={{ width: metry * s.widok.skala }} /><span>{metry} m</span></div>
      </div>
      <div className="nakl pd">
        <div className="grupa">
          <button title="Granica frontowa na dole" className={s.widok.obrot === 90 ? 'akt' : ''} onClick={() => obrot(90)}>Front na dole</button>
          <button title="Północ u góry" className={Math.abs(s.widok.obrot - Math.atan2(POLNOC.x, POLNOC.y) * 180 / Math.PI) < 0.01 ? 'akt' : ''} onClick={() => obrot(Math.atan2(POLNOC.x, POLNOC.y) * 180 / Math.PI)}>Północ u góry</button>
          <button title="Działka pionowo" className={s.widok.obrot === 0 ? 'akt' : ''} onClick={() => obrot(0)}>Pionowo</button>
        </div>
        <div className="grupa">
          <button onClick={() => pokazCel('dzialka')}><Maximize size={14} />Działka</button>
          <button onClick={() => pokazCel('dom')}><Home size={14} />Dom</button>
          <button title="Pomniejsz" onClick={() => s.ustawWidok({ skala: Math.max(1.5, s.widok.skala / 1.3) })}><Minus size={14} /></button>
          <span className="skala">1 m = {Math.round(s.widok.skala)} px</span>
          <button title="Powiększ" onClick={() => s.ustawWidok({ skala: Math.min(220, s.widok.skala * 1.3) })}><Plus size={14} /></button>
        </div>
      </div>
    </>
  )
}

function Kondygnacje() {
  const s = useMagazyn()
  const dodaj = () => {
    const ost = s.projekt.kondygnacje[s.projekt.kondygnacje.length - 1]
    const nowa = nowaKondygnacja(s.projekt.kondygnacje.length === 1 ? 'Piętro' : `Piętro ${s.projekt.kondygnacje.length}`, ost)
    s.zmien((p) => { p.kondygnacje.push(nowa) })
    s.ustaw({ aktywna: nowa.id, zaznaczenie: null })
  }
  const usun = (id: string) => {
    if (!confirm('Usunąć tę kondygnację razem ze ścianami i meblami?')) return
    s.zmien((p) => { p.kondygnacje = p.kondygnacje.filter((k) => k.id !== id) })
    s.ustaw({ aktywna: s.projekt.kondygnacje[0].id, zaznaczenie: null })
  }
  return (
    <div className="kondygnacje">
      <span>Kondygnacje</span>
      {s.projekt.kondygnacje.map((k, i) => (
        <button key={k.id} className={s.aktywna === k.id ? 'akt' : ''} onClick={() => s.ustaw({ aktywna: k.id, zaznaczenie: null })}>
          {k.nazwa}
          {i > 0 && s.aktywna === k.id && <i role="button" title="Usuń kondygnację" onClick={(e) => { e.stopPropagation(); usun(k.id) }}>×</i>}
        </button>
      ))}
      <button className="dodaj" onClick={dodaj} title="Nowa kondygnacja z obrysem tej poniżej"><Plus size={14} />Dodaj</button>
    </div>
  )
}

function zapiszObraz3D() {
  const plotno = document.querySelector('.plotno.trzy canvas') as HTMLCanvasElement | null
  if (!plotno) return
  const a = document.createElement('a')
  a.href = plotno.toDataURL('image/png')
  a.download = `dom-3d-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.png`
  a.click()
}

function Sterowanie3D() {
  const s = useMagazyn()
  const sl = s.slonce
  const n = dzienRoku(sl.miesiac, sl.dzien)
  const pol = polozenieSlonca(DZIALKA_META.szerokoscGeo, DZIALKA_META.dlugoscGeo, n, sl.godzina)
  const wz = useMemo(() => wschodZachod(DZIALKA_META.szerokoscGeo, DZIALKA_META.dlugoscGeo, n), [n])
  const kam: [Kamera3D, string][] = [['ogrod', 'Od ogrodu'], ['droga', 'Od frontu'], ['wejscie', 'Od północy'], ['gora', 'Z góry']]
  const ile = s.projekt.kondygnacje.length
  // Animacja dnia: słońce idzie od wschodu do zachodu w kilkanaście sekund.
  const [gra, setGra] = useState(false)
  useEffect(() => {
    if (!gra) return
    const t = setInterval(() => {
      const st = useMagazyn.getState()
      const g = st.slonce.godzina + 0.1
      if (g > wz.zach + 0.3) { setGra(false); return }
      st.ustaw({ slonce: { ...st.slonce, godzina: Math.round(g * 100) / 100 } })
    }, 70)
    return () => clearInterval(t)
  }, [gra, wz.zach])
  return (
    <>
      <div className="nakl lg kol">
        <div className="grupa">
          {!s.w3d.spacer && kam.map(([id, nazwa]) => <button key={id} onClick={() => ustawKamere(id)}>{nazwa}</button>)}
          <button className={s.w3d.spacer ? 'akt' : ''} title="Chodzenie po domu z poziomu oczu" onClick={() => s.ustaw({ w3d: { ...s.w3d, spacer: !s.w3d.spacer, przekroj: false } })}><Footprints size={14} />{s.w3d.spacer ? 'Zakończ spacer' : 'Spacer po domu'}</button>
        </div>
        {s.w3d.spacer && <div className="wskazowka">Przeciągnij myszą, żeby się rozejrzeć. W, A, S, D albo strzałki: chodzenie. Kółko: krok w przód. Shift: szybciej.</div>}
        <div className="grupa">
          <button className={s.w3d.dach ? 'akt' : ''} onClick={() => s.ustaw({ w3d: { ...s.w3d, dach: !s.w3d.dach } })}>Dach</button>
          <button className={s.w3d.przekroj ? 'akt' : ''} title="Ucina budynek 1,25 m nad podłogą" onClick={() => s.ustaw({ w3d: { ...s.w3d, przekroj: !s.w3d.przekroj } })}>Przekrój</button>
          <button className={s.w3d.meble ? 'akt' : ''} onClick={() => s.ustaw({ w3d: { ...s.w3d, meble: !s.w3d.meble } })}>Meble</button>
          {MA_ORTO && <button className={s.w3d.orto ? 'akt' : ''} onClick={() => s.ustaw({ w3d: { ...s.w3d, orto: !s.w3d.orto } })}>Ortofoto</button>}
          <button title="Zapisuje bieżący widok jako obraz PNG" onClick={zapiszObraz3D}><Camera size={14} />Zapisz obraz</button>
        </div>
        {ile > 1 && <div className="grupa">
          {s.projekt.kondygnacje.map((k, i) => <button key={k.id} className={Math.min(s.w3d.doKondygnacji, ile - 1) === i ? 'akt' : ''} onClick={() => s.ustaw({ w3d: { ...s.w3d, doKondygnacji: i === ile - 1 ? 99 : i } })}>do: {k.nazwa}</button>)}
        </div>}
      </div>
      <div className="nakl pd slonce">
        <header><Sun size={15} /><b>Słońce</b><span>{sl.dzien} {MIESIACE[sl.miesiac - 1].slice(0, 3)}., {fmtGodz(sl.godzina)}</span></header>
        <label><span>Miesiąc</span><input type="range" min={1} max={12} step={1} value={sl.miesiac} onChange={(e) => s.ustaw({ slonce: { ...sl, miesiac: +e.target.value } })} /><em>{MIESIACE[sl.miesiac - 1]}</em></label>
        <label><span>Godzina</span><input type="range" min={4} max={22} step={0.25} value={sl.godzina} onChange={(e) => s.ustaw({ slonce: { ...sl, godzina: +e.target.value } })} /><em>{fmtGodz(sl.godzina)}</em></label>
        <p>{pol.wys > 0 ? `Słońce ${Math.round(pol.wys)}° nad horyzontem, azymut ${Math.round(pol.az)}°.` : 'Słońce pod horyzontem.'} Wschód {fmtGodz(wz.wsch)}, zachód {fmtGodz(wz.zach)}.</p>
        <div className="grupa">
          <button className={gra ? 'akt' : ''} title="Pokazuje, jak słońce i cienie przechodzą przez cały dzień" onClick={() => { if (!gra) s.ustaw({ slonce: { ...sl, godzina: Math.max(4, Math.floor(wz.wsch * 4) / 4) } }); setGra(!gra) }}>{gra ? 'Stop' : 'Odtwórz dzień'}</button>
          {([[6, 21, 'Lato'], [3, 21, 'Równonoc'], [12, 21, 'Zima']] as const).map(([m, d, nazwa]) => <button key={nazwa} className={sl.miesiac === m ? 'akt' : ''} onClick={() => s.ustaw({ slonce: { ...sl, miesiac: m, dzien: d } })}>{nazwa}</button>)}
        </div>
      </div>
    </>
  )
}

function Start() {
  const s = useMagazyn()
  const [szer, setSzer] = useState(10)
  const [dl, setDl] = useState(12)
  const k = aktywnaKondygnacja(s)
  if (!s.pustyStart || k.sciany.length) return null
  const obrys = () => {
    // Lico ściany od frontu staje na linii zabudowy, dom w środku obszaru zabudowy.
    const g = SCIANY.zew.grubosc
    const f = ramka(OBSZAR_ZABUDOWY)
    const x0 = Math.max(LINIA_ZAB_DROGA, f.minx) + g / 2, y1 = Math.min(f.maxy, (f.miny + f.maxy) / 2 + dl / 2)
    s.zmien((_, kk) => dodajProstokat(kk, { x: x0, y: y1 - dl + g }, { x: x0 + szer - g, y: y1 }, 'zew'))
    s.ustaw({ pustyStart: false })
    setTimeout(() => pokazCel('dom'), 30)
  }
  return (
    <div className="start">
      <h2>Od czego zaczynamy?</h2>
      <p>{DZIALKA_META.przyklad ? 'Wczytana jest działka przykładowa. Swoją wczytasz w zakładce Działka po prawej, wpisując identyfikator z geoportalu.' : `${DZIALKA_META.nazwa}: granice z ewidencji (ULDK).`} Zielona przerywana linia pokazuje, gdzie wolno stawiać budynek.</p>
      <div className="start-opcje">
        <div className="start-karta wyrozniona">
          <h3>Willa „Trzy stodoły”</h3>
          <p>Stodoły połączone szklanymi łącznikami: garaż ze studiem i biurami, pokoje dzieci, salon z kuchnią i apartament przy basenie. Ten sam dom pokazuje wizualizacja Willa 3D.</p>
          <div className="rzad"><button className="btn glowny" onClick={() => { s.wczytaj(domTrzyStodoly()); setTimeout(() => pokazCel('dom'), 30) }}>Wczytaj trzy stodoły</button></div>
        </div>
        <div className="start-karta">
          <h3>Obrys domu</h3>
          <p>Wstawię prostokąt ścian zewnętrznych przy linii zabudowy. Pokoje dorysujesz w środku.</p>
          <div className="rzad">
            <label>W głąb działki<Liczba wartosc={szer} jedn="m" min={4} max={11.5} krok={0.5} zmiana={(v) => v && setSzer(v)} /></label>
            <label>Wzdłuż drogi<Liczba wartosc={dl} jedn="m" min={4} max={40} krok={0.5} zmiana={(v) => v && setDl(v)} /></label>
          </div>
          <button className="btn" onClick={obrys}>Wstaw obrys {fmtM(szer, 1)} × {fmtM(dl, 1)} m</button>
        </div>
        <div className="start-karta">
          <h3>Mały dom przykładowy</h3>
          <p>Parterowy dom 137 m² z pokojami, oknami, meblami i tarasem.</p>
          <button className="btn" onClick={() => { s.wczytaj(przykladowyProjekt()); setTimeout(() => pokazCel('dom'), 30) }}>Wczytaj przykład</button>
        </div>
        <div className="start-karta">
          <h3>Pusta działka</h3>
          <p>Rysujesz od zera narzędziem Ściana (S) albo Pokój (P).</p>
          <button className="btn" onClick={() => s.ustaw({ pustyStart: false, narzedzie: 'pokoj' })}>Zacznij rysować</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const tryb = useMagazyn((s) => s.tryb)

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      const s = useMagazyn.getState()
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) s.ponow(); else s.cofnij(); return }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); s.ponow(); return }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); powielZaznaczone(); return }
      if (mod || e.altKey) return
      if (e.key === 'Delete' || e.key === 'Backspace') { if (s.zaznaczenie) { e.preventDefault(); usunZaznaczone() } return }
      // Strzałki przesuwają zaznaczony mebel, element działki albo część dachu: 5 cm, z Shiftem 50 cm.
      if (e.key.startsWith('Arrow') && s.zaznaczenie && ['mebel', 'teren', 'dach'].includes(s.zaznaczenie.typ)) {
        e.preventDefault()
        const krok = e.shiftKey ? 0.5 : 0.05
        const ekran = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key as 'ArrowLeft'] ?? [0, 0]
        const v = rot({ x: ekran[0] * krok, y: ekran[1] * krok }, (-s.widok.obrot * Math.PI) / 180)
        const z = s.zaznaczenie
        s.zmien((p, k) => {
          const ob = z.typ === 'mebel' ? k.meble.find((x) => x.id === z.id) : z.typ === 'teren' ? p.teren.find((x) => x.id === z.id) : z.typ === 'dach' ? p.dach.czesci.find((x) => x.id === z.id) : null
          if (ob) { ob.x = Math.round((ob.x + v.x) * 1000) / 1000; ob.y = Math.round((ob.y + v.y) * 1000) / 1000 }
        })
        return
      }
      const kl = e.key.toLowerCase()
      if (kl === 'r' && s.zaznaczenie && (s.zaznaczenie.typ === 'mebel' || s.zaznaczenie.typ === 'teren')) {
        const z = s.zaznaczenie
        s.zmien((p, k) => { const ob = z.typ === 'mebel' ? k.meble.find((x) => x.id === z.id) : p.teren.find((x) => x.id === z.id); if (ob) ob.obrot = (ob.obrot + 90) % 360 })
        return
      }
      const mapa: Record<string, Narzedzie> = { z: 'zaznacz', v: 'zaznacz', s: 'sciana', p: 'pokoj', d: 'drzwi', o: 'okno', t: 'teren', m: 'miara', k: 'dach' }
      if (mapa[kl]) {
        const n = mapa[kl]
        const zm: any = { narzedzie: n }
        if (n === 'drzwi' && OTWORY[s.rodzajOtworu].okno) zm.rodzajOtworu = 'drzwi'
        if (n === 'okno' && !OTWORY[s.rodzajOtworu].okno) zm.rodzajOtworu = 'okno'
        s.ustaw(zm)
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])

  // Po zmianie układu ekranu rzut wraca do domu albo do obszaru zabudowy.
  useEffect(() => {
    if (tryb === '3d') return
    const t = setTimeout(() => pokazCel(useMagazyn.getState().projekt.kondygnacje.some((k) => k.sciany.length) ? 'dom' : 'obszar'), 60)
    return () => clearTimeout(t)
  }, [tryb])

  useEffect(() => {
    const f = () => setTimeout(() => pokazCel('dom'), 60)
    window.addEventListener('planer:wczytano-z-dysku', f)
    return () => window.removeEventListener('planer:wczytano-z-dysku', f)
  }, [])

  // Zmiana narzędzia myszą też dobiera pasujący rodzaj otworu.
  useEffect(() => useMagazyn.subscribe((s, p) => {
    if (s.narzedzie === p.narzedzie) return
    if (s.narzedzie === 'drzwi' && OTWORY[s.rodzajOtworu].okno) s.ustaw({ rodzajOtworu: 'drzwi' })
    if (s.narzedzie === 'okno' && !OTWORY[s.rodzajOtworu].okno) s.ustaw({ rodzajOtworu: 'okno' })
    // Pierwsze wejście w narzędzie Dach: dach liczony sam zamienia się na części do układania.
    if (s.narzedzie === 'dach' && !s.projekt.dach.czesci.length) {
      const uklady = s.projekt.kondygnacje.map((k) => znajdzUklad(k))
      const czesci = podzielDach(s.projekt, uklady)
      if (czesci.length) s.zmien((pr) => { pr.dach.czesci = czesci })
    }
  }), [])

  return (
    <div className="app">
      <Gora />
      <div className="srodek">
        {tryb !== '3d' && <Narzedzia />}
        <main className={`plotna ${tryb}`}>
          {tryb !== '3d' && <div className="plotno"><Rzut /><NakladkiRzutu /><Start /><Kondygnacje /></div>}
          {tryb !== '2d' && <div className="plotno trzy"><Widok3D /><Sterowanie3D /></div>}
        </main>
        <PanelPrawy />
      </div>
    </div>
  )
}
