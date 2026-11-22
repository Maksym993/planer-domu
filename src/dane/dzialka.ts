// Działka, na której stoi projekt: granice, drogi, linie zabudowy i limity z planu.
//
// Dane czyta z pliku src/dane/dzialka.json, a gdy go nie ma, z działki przykładowej
// (src/dane/dzialka-przyklad.json). Plik dzialka.json zapisuje aplikacja po pobraniu granic
// z usługi ULDK (zakładka Działka) albo komenda `npm run dzialka -- "<identyfikator>"`.
// Ten plik jest w .gitignore, więc dane Twojej działki nie trafią do repozytorium przez przypadek.
//
// Układ modelu: początek w pierwszym wierzchołku, oś y wzdłuż granicy frontowej (od pierwszego
// wierzchołka do ostatniego), oś x prostopadle w głąb działki. Metry.

import przyklad from './dzialka-przyklad.json'
import { Pt, add, dot, mul, norm, obetnij, pole, poleZnak, sub } from '../model/geom'

export type TypKrawedzi = 'droga' | 'sasiad' | 'woda' | 'inne'

export type KrawedzDzialki = {
  /** Opis granicy, np. „droga gminna”, „sąsiad od wschodu”. */
  nazwa: string
  typ: TypKrawedzi
  /** Nieprzekraczalna linia zabudowy od tej granicy, w metrach. Brak: null. */
  liniaZabudowy?: number | null
  /** Szerokość drogi albo rowu za granicą, tylko do rysunku. */
  szerokosc?: number | null
}

export type PlanMiejscowy = {
  maxZabudowy: number | null
  minBioCzynna: number | null
  minIntensywnosc: number | null
  maxIntensywnosc: number | null
  maxWysokosc: number | null
  maxKatDachu: number | null
  maxKondygnacji: number | null
  /** Czy plan wymaga dachu dwu- albo wielospadowego (ostrzeżenie przy dachu płaskim). */
  dachSpadzisty?: boolean
  /** Ustalenia planu do pokazania w zakładce Działka, po jednym w wierszu. */
  opis: string[]
  /** Skąd są ustalenia: numer uchwały albo decyzji, link. */
  zrodlo: string
}

export type DaneDzialki = {
  /** true dla działki przykładowej. */
  przyklad: boolean
  nazwa: string
  identyfikator: string
  numer: string
  obreb: string
  gmina: string
  powiat: string
  wojewodztwo: string
  powEwidencyjna: number | null
  /** Przeznaczenie terenu z planu, np. MN. */
  teren: string
  szerokoscGeo: number
  dlugoscGeo: number
  /** „lokalny”: współrzędne w metrach w dowolnym układzie, „PL-1992”: EPSG:2180 z ULDK (E, N). */
  uklad: 'lokalny' | 'PL-1992'
  /** Wierzchołki przeciwnie do ruchu wskazówek zegara. Granica od ostatniego do pierwszego to front. */
  wierzcholki: [number, number][]
  /** Krawędź i biegnie od wierzchołka i do wierzchołka i + 1 (ostatnia wraca do pierwszego). */
  krawedzie: KrawedzDzialki[]
  /** Kierunek północy w układzie lokalnym (wektor). Dla PL-1992 pomijany. */
  polnoc?: [number, number]
  /** Część działki w pasie drogi z planu, jeśli taka jest (te same współrzędne co wierzchołki). */
  pasDrogi?: [number, number][] | null
  /** Odległość ściany bez okien i drzwi od granicy z sąsiadem (warunki techniczne: 3 m, plan może dopuścić mniej). */
  minBezOtworow?: number
  /** Podkłady pobrane z geoportalu: lewy górny róg (E, N), rozdzielczość i rozmiar obrazu. */
  podklad?: { e0: number; n1: number; pxNaM: number; rozmiar: number; orto: boolean; mpzp: boolean; ewidencja: boolean } | null
  plan: PlanMiejscowy
}

const wlasna = import.meta.glob('./dzialka.json', { eager: true, import: 'default' }) as Record<string, DaneDzialki>
export const DANE: DaneDzialki = wlasna['./dzialka.json'] ?? (przyklad as DaneDzialki)

type EN = { e: number; n: number }
const W: EN[] = DANE.wierzcholki.map(([e, n]) => ({ e, n }))
if (W.length < 3) throw new Error('Działka musi mieć co najmniej 3 wierzchołki (src/dane/dzialka.json)')
const A = W[0], F = W[W.length - 1]

const ey = norm({ x: F.e - A.e, y: F.n - A.n })
const ex = { x: ey.y, y: -ey.x }

export function zEN(e: number, n: number): Pt {
  const d = { x: e - A.e, y: n - A.n }
  return { x: dot(d, ex), y: dot(d, ey) }
}
export function doEN(p: Pt): EN {
  return { e: A.e + p.x * ex.x + p.y * ey.x, n: A.n + p.x * ex.y + p.y * ey.y }
}

const polnocSur = DANE.uklad === 'PL-1992' || !DANE.polnoc ? { x: 0, y: 1 } : norm({ x: DANE.polnoc[0], y: DANE.polnoc[1] })
/** Kierunek północy w układzie modelu (wektor jednostkowy). */
export const POLNOC: Pt = { x: dot(polnocSur, ex), y: dot(polnocSur, ey) }
/** Kierunek wschodu w układzie modelu. */
export const WSCHOD: Pt = { x: POLNOC.y, y: -POLNOC.x }
/** Kąt, o jaki oś y modelu jest odchylona od północy (stopnie). */
export const ODCHYLENIE_OD_POLNOCY = (Math.atan2(POLNOC.x, POLNOC.y) * 180) / Math.PI

/** Granica działki (przeciwnie do ruchu wskazówek zegara). */
export const GRANICA: Pt[] = (() => {
  const g = W.map((w) => zEN(w.e, w.n))
  if (poleZnak(g) < 0) throw new Error('Wierzchołki działki muszą iść przeciwnie do ruchu wskazówek zegara (src/dane/dzialka.json)')
  return g
})()

/** Krawędzie granicy z opisem, do etykiet i kontroli odległości. */
export const KRAWEDZIE = GRANICA.map((a, i) => {
  const k: KrawedzDzialki = DANE.krawedzie[i] ?? { nazwa: `granica ${i + 1}`, typ: 'sasiad' }
  return { a, b: GRANICA[(i + 1) % GRANICA.length], nazwa: k.nazwa, typ: k.typ, linia: k.liniaZabudowy ?? null, szerokosc: k.szerokosc ?? null }
})

/** Północny pas działki w liniach rozgraniczających drogi z planu (może być pusty). */
export const PAS_DROGI: Pt[] = (DANE.pasDrogi ?? []).map(([e, n]) => zEN(e, n))

/** Część działki poza pasem drogi: od niej liczą się wskaźniki, gdy włączona jest opcja w zakładce Wskaźniki. */
export const TEREN_MN: Pt[] = (() => {
  if (PAS_DROGI.length < 3) return GRANICA
  // Pas drogi przylega do granicy: odcinamy go prostą przez jego wewnętrzną krawędź.
  const wewn = PAS_DROGI.filter((p) => !GRANICA.some((g) => Math.hypot(g.x - p.x, g.y - p.y) < 0.05))
  if (wewn.length < 2) return GRANICA
  const [a, b] = wewn
  const t = obetnij(GRANICA, a, b, 0)
  return pole(t) > pole(GRANICA) / 2 ? t : obetnij(GRANICA, b, a, 0)
})()

/** Linie zabudowy: granice z odległością z planu. */
export const LINIE_ZABUDOWY = KRAWEDZIE.filter((k) => k.linia != null && k.linia > 0).map((k) => ({ a: k.a, b: k.b, d: k.linia as number, nazwa: k.nazwa }))
export const LINIA_ZAB_DROGA = LINIE_ZABUDOWY.find((l) => KRAWEDZIE.find((k) => k.a === l.a)?.typ === 'droga')?.d ?? 0

/** Obszar wyznaczony nieprzekraczalnymi liniami zabudowy. */
export const OBSZAR_ZABUDOWY: Pt[] = LINIE_ZABUDOWY.reduce((q, l) => obetnij(q, l.a, l.b, l.d), TEREN_MN.slice())

/** Odcinki granicy z działkami sąsiednimi: tu obowiązują odległości z warunków technicznych. */
export const ODCINKI_SASIAD: [Pt, Pt][] = KRAWEDZIE.filter((k) => k.typ === 'sasiad').map((k) => [k.a, k.b])
/** Najmniejsza odległość ściany bez okien i drzwi od granicy z sąsiadem. */
export const MIN_BEZ_OTWOROW = DANE.minBezOtworow ?? 3

/** Drogi i rowy za granicą, rysowane wektorowo pasem wzdłuż krawędzi. */
export const OTOCZENIE = KRAWEDZIE.filter((k) => k.typ === 'droga' || k.typ === 'woda').map((k) => {
  const szer = k.szerokosc ?? (k.typ === 'droga' ? 10 : 3.5)
  const kier = norm(sub(k.b, k.a))
  const na = { x: kier.y, y: -kier.x } // na zewnątrz działki
  const a = add(k.a, mul(kier, -30)), b = add(k.b, mul(kier, 30))
  return { typ: k.typ, nazwa: k.nazwa, szer, pas: [a, b, add(b, mul(na, szer)), add(a, mul(na, szer))] as Pt[], a: k.a, b: k.b, na }
})

export const POW_GEOM = pole(GRANICA)
export const POW_MN = pole(TEREN_MN)
export const POW_ZABUDOWY_MAX = pole(OBSZAR_ZABUDOWY)

/** Opis działki do paneli. */
export const DZIALKA_META = {
  przyklad: DANE.przyklad,
  nazwa: DANE.nazwa,
  id: DANE.identyfikator,
  numer: DANE.numer,
  obreb: DANE.obreb,
  gmina: DANE.gmina,
  powiat: DANE.powiat,
  wojewodztwo: DANE.wojewodztwo,
  powEwidencyjna: DANE.powEwidencyjna,
  teren: DANE.teren,
  szerokoscGeo: DANE.szerokoscGeo,
  dlugoscGeo: DANE.dlugoscGeo,
}
/** Krótki podpis działki: numer i obręb albo „działka przykładowa”. */
export const PODPIS_DZIALKI = DANE.przyklad ? 'działka przykładowa' : `dz. ${DANE.numer}${DANE.obreb ? ` ${DANE.obreb}` : ''}`

/** Podkłady rastrowe z geoportalu (pobierane razem z granicami). */
export const PODKLAD = DANE.podklad ?? null
export const MA_ORTO = !!PODKLAD?.orto
export const MA_MPZP = !!PODKLAD?.mpzp
export const MA_EWIDENCJA = !!PODKLAD?.ewidencja
export const PODKLADY = {
  orto: { plik: '/mapy/orto.jpg', nazwa: 'Ortofotomapa', zrodlo: 'geoportal.gov.pl (GUGiK)' },
  mpzp: { plik: '/mapy/mpzp.png', nazwa: 'Rysunek planu (MPZP)', zrodlo: 'Krajowa Integracja MPZP' },
  ewidencja: { plik: '/mapy/ewidencja.png', nazwa: 'Działki i budynki', zrodlo: 'KIEG (GUGiK)' },
}
/** Narożniki podkładu w układzie modelu. Bez podkładów: kwadrat wokół działki, pod trawę w widoku 3D. */
export const PODKLAD_ROGI = (() => {
  if (PODKLAD) {
    const dl = PODKLAD.rozmiar / PODKLAD.pxNaM
    return {
      lg: zEN(PODKLAD.e0, PODKLAD.n1),
      pg: zEN(PODKLAD.e0 + dl, PODKLAD.n1),
      ld: zEN(PODKLAD.e0, PODKLAD.n1 - dl),
      pd: zEN(PODKLAD.e0 + dl, PODKLAD.n1 - dl),
    }
  }
  const xs = GRANICA.map((p) => p.x), ys = GRANICA.map((p) => p.y)
  const x0 = Math.min(...xs) - 120, x1 = Math.max(...xs) + 120, y0 = Math.min(...ys) - 120, y1 = Math.max(...ys) + 120
  return { lg: { x: x0, y: y1 }, pg: { x: x1, y: y1 }, ld: { x: x0, y: y0 }, pd: { x: x1, y: y0 } }
})()
