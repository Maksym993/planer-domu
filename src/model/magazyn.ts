import { create } from 'zustand'
import { pustyProjekt, przykladowyProjekt } from './szablony'
import { domTrzyStodoly } from './szablonWilli'
import type { Kondygnacja, Narzedzie, Projekt, RodzajDachu, RodzajOtworu, RodzajSciany, RodzajTerenu, Zaznaczenie } from './typy'

// Adres z ?piaskownica=nazwa trzyma osobny zapis, żeby próby nie ruszały właściwego projektu.
const piaskownica = new URLSearchParams(location.search).get('piaskownica')
const KLUCZ = 'planer-domu:v1' + (piaskownica ? `:${piaskownica}` : '')
// Ten sam projekt leży też na dysku (katalog zapis/), żeby był widoczny w każdej przeglądarce.
const API = `/api/projekt?nazwa=${encodeURIComponent((piaskownica ?? 'glowny').replace(/[^a-z0-9-]/gi, '') || 'glowny')}`
const KLUCZ_CZASU = `${KLUCZ}:czas`

export type Widok = { cx: number; cy: number; skala: number; obrot: number }
export type Warstwy = {
  orto: boolean
  mpzp: boolean
  ewidencja: boolean
  siatka: boolean
  wymiary: boolean
  meble: boolean
  teren: boolean
  linie: boolean
  nizej: boolean
  dach: boolean
}
export type Tryb = '2d' | '3d' | 'oba'

type Stan = {
  projekt: Projekt
  historia: Projekt[]
  przyszlosc: Projekt[]
  aktywna: string
  narzedzie: Narzedzie
  rodzajSciany: RodzajSciany
  rodzajOtworu: RodzajOtworu
  rodzajTerenu: RodzajTerenu
  rodzajDachu: RodzajDachu
  zaznaczenie: Zaznaczenie
  tryb: Tryb
  widok: Widok
  warstwy: Warstwy
  slonce: { miesiac: number; dzien: number; godzina: number }
  w3d: { dach: boolean; przekroj: boolean; meble: boolean; orto: boolean; doKondygnacji: number; spacer: boolean }
  pustyStart: boolean

  /** Zmiana projektu z zapisem do historii. */
  zmien: (f: (p: Projekt, k: Kondygnacja) => void) => void
  /** Zmiana bez zapisu do historii, do przeciągania. Przed serią wywołaj punktHistorii. */
  zmienRoboczo: (f: (p: Projekt, k: Kondygnacja) => void) => void
  punktHistorii: () => void
  cofnij: () => void
  ponow: () => void
  ustaw: (cz: Partial<Stan>) => void
  ustawWidok: (cz: Partial<Widok>) => void
  przelaczWarstwe: (w: keyof Warstwy) => void
  wczytaj: (p: Projekt) => void
}

const klon = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

/** Sprawdza zapis i dopełnia pola, których nie było w starszych wersjach. */
function uzupelnij(p: Projekt | null | undefined): Projekt | null {
  if (!p || p.wersja !== 1 || !Array.isArray(p.kondygnacje) || !p.kondygnacje.length) return null
  const wz = pustyProjekt()
  p.ustawienia = { ...wz.ustawienia, ...p.ustawienia }
  p.dach = { ...wz.dach, ...p.dach }
  return p
}

function zPamieci(): Projekt | null {
  try {
    const s = localStorage.getItem(KLUCZ)
    return s ? uzupelnij(JSON.parse(s) as Projekt) : null
  } catch {
    return null
  }
}

const start = zPamieci()
const poczatkowy = start ?? pustyProjekt()

export const useMagazyn = create<Stan>((set, get) => ({
  projekt: poczatkowy,
  historia: [],
  przyszlosc: [],
  aktywna: poczatkowy.kondygnacje[0].id,
  narzedzie: 'zaznacz',
  rodzajSciany: 'zew',
  rodzajOtworu: 'drzwi',
  rodzajTerenu: 'podjazd',
  rodzajDachu: 'dwuspadowy',
  zaznaczenie: null,
  tryb: '2d',
  widok: { cx: 10, cy: 96, skala: 14, obrot: 90 },
  warstwy: { orto: true, mpzp: false, ewidencja: false, siatka: true, wymiary: true, meble: true, teren: true, linie: true, nizej: true, dach: false },
  slonce: { miesiac: 6, dzien: 21, godzina: 14 },
  w3d: { dach: true, przekroj: false, meble: true, orto: true, doKondygnacji: 99, spacer: false },
  pustyStart: !start,

  zmien: (f) => {
    const s = get()
    const p = klon(s.projekt)
    const k = p.kondygnacje.find((x) => x.id === s.aktywna) ?? p.kondygnacje[0]
    f(p, k)
    set({ projekt: p, historia: [...s.historia.slice(-80), s.projekt], przyszlosc: [] })
  },
  zmienRoboczo: (f) => {
    const s = get()
    const p = klon(s.projekt)
    const k = p.kondygnacje.find((x) => x.id === s.aktywna) ?? p.kondygnacje[0]
    f(p, k)
    set({ projekt: p })
  },
  punktHistorii: () => {
    const s = get()
    set({ historia: [...s.historia.slice(-80), s.projekt], przyszlosc: [] })
  },
  cofnij: () => {
    const s = get()
    if (!s.historia.length) return
    const p = s.historia[s.historia.length - 1]
    set({
      projekt: p, historia: s.historia.slice(0, -1), przyszlosc: [s.projekt, ...s.przyszlosc], zaznaczenie: null,
      aktywna: p.kondygnacje.some((k) => k.id === s.aktywna) ? s.aktywna : p.kondygnacje[0].id,
    })
  },
  ponow: () => {
    const s = get()
    if (!s.przyszlosc.length) return
    const p = s.przyszlosc[0]
    set({
      projekt: p, przyszlosc: s.przyszlosc.slice(1), historia: [...s.historia, s.projekt], zaznaczenie: null,
      aktywna: p.kondygnacje.some((k) => k.id === s.aktywna) ? s.aktywna : p.kondygnacje[0].id,
    })
  },
  ustaw: (cz) => set(cz as any),
  ustawWidok: (cz) => set((s) => ({ widok: { ...s.widok, ...cz } })),
  przelaczWarstwe: (w) => set((s) => ({ warstwy: { ...s.warstwy, [w]: !s.warstwy[w] } })),
  wczytaj: (p) => {
    const s = get()
    set({ projekt: p, historia: [...s.historia.slice(-80), s.projekt], przyszlosc: [], aktywna: p.kondygnacje[0].id, zaznaczenie: null, pustyStart: false })
  },
}))

// Czas ostatniego zapisu, który zna ta przeglądarka. Zero oznacza zapis sprzed wprowadzenia zapisu na dysk.
let czasZapisu = Number(localStorage.getItem(KLUCZ_CZASU) ?? 0) || 0
let pominZapis = false

function wyslij(projekt: Projekt) {
  czasZapisu = Date.now()
  try { localStorage.setItem(KLUCZ_CZASU, String(czasZapisu)) } catch { /* bez pamięci przeglądarki zostaje zapis na dysku */ }
  fetch(API, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ zapisano: czasZapisu, projekt }) }).catch(() => { /* serwer wyłączony: zostaje pamięć przeglądarki */ })
}

/** Porównuje zapis z dysku z tym w przeglądarce i bierze nowszy. */
async function zgrajZDyskiem() {
  try {
    const r = await fetch(API, { cache: 'no-store' })
    if (!r.ok) return
    const d = (await r.json()) as { zapisano: number; projekt: Projekt } | null
    if (!d) {
      // Na dysku nie ma jeszcze tego projektu: wysyłamy zapis z przeglądarki, jeśli jest.
      if (localStorage.getItem(KLUCZ)) wyslij(useMagazyn.getState().projekt)
      return
    }
    const p = uzupelnij(d.projekt)
    if (!p) return
    if (d.zapisano > czasZapisu) {
      const s = useMagazyn.getState()
      czasZapisu = d.zapisano
      pominZapis = true
      try { localStorage.setItem(KLUCZ, JSON.stringify(p)); localStorage.setItem(KLUCZ_CZASU, String(czasZapisu)) } catch { /* pamięć przeglądarki pełna albo wyłączona */ }
      useMagazyn.setState({
        projekt: p, pustyStart: false, zaznaczenie: null, przyszlosc: [],
        historia: s.pustyStart ? s.historia : [...s.historia.slice(-80), s.projekt],
        aktywna: p.kondygnacje.some((k) => k.id === s.aktywna) ? s.aktywna : p.kondygnacje[0].id,
      })
      // Przy pierwszym wczytaniu z dysku rzut ustawia się na domu.
      if (s.pustyStart) window.dispatchEvent(new Event('planer:wczytano-z-dysku'))
    } else if (d.zapisano < czasZapisu) wyslij(useMagazyn.getState().projekt)
  } catch { /* serwer wyłączony albo brak sieci: zostaje pamięć przeglądarki */ }
}

let czasomierz: ReturnType<typeof setTimeout> | null = null
useMagazyn.subscribe((s, poprz) => {
  if (s.projekt === poprz.projekt) return
  if (pominZapis) { pominZapis = false; return }
  if (czasomierz) clearTimeout(czasomierz)
  czasomierz = setTimeout(() => {
    try { localStorage.setItem(KLUCZ, JSON.stringify(s.projekt)) } catch { /* pamięć przeglądarki pełna albo wyłączona */ }
    wyslij(s.projekt)
  }, 400)
})

zgrajZDyskiem()
// Powrót do okna: jeśli projekt zmienił się w innej przeglądarce, tu pojawia się nowsza wersja.
window.addEventListener('focus', zgrajZDyskiem)
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') zgrajZDyskiem() })

export const aktywnaKondygnacja = (s: Pick<Stan, 'projekt' | 'aktywna'>) => s.projekt.kondygnacje.find((k) => k.id === s.aktywna) ?? s.projekt.kondygnacje[0]
export { domTrzyStodoly, przykladowyProjekt, pustyProjekt }
