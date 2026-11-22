// Willa "Trzy stodoły" na działce przykładowej planera (src/dane/dzialka-przyklad.json).
// Układ modelu jak w całym planerze: x w głąb działki od granicy frontowej (drogi), y wzdłuż niej.
// Scena three.js: (x, wysokość, -y). Wysokości w metrach nad terenem.

export type Pt = { x: number; y: number }

/** Poziom podłogi parteru nad terenem. */
export const FL = 0.3
/** Grubość ściany zewnętrznej: konstrukcja z ociepleniem (0,36) i lamele na ruszcie (0,06). */
export const SZ = 0.36
export const OKL = 0.06
export const T_ZEW = SZ + OKL
/** Grubość dachu prostopadle do połaci (krokwie, ocieplenie, deskowanie, blacha). */
export const T_DACH = 0.4

/** Stodoła: prostokąt w rzucie, dach dwuspadowy z kalenicą wzdłuż osi y, bez okapów bocznych. */
export type Pawilon = {
  id: string
  nazwa: string
  x0: number; x1: number; y0: number; y1: number
  /** Wysokość okapu nad podłogą: tu zewnętrzna krawędź połaci spotyka lico ściany. */
  okap: number
  kat: number
  /** Wysunięcie dachu przed szczyt południowy (y0) i północny (y1). */
  wysY0: number; wysY1: number
  /** Szczyt ze szkła (y0 albo y1) zamiast ściany. */
  szklanySzczyt?: 'y0' | 'y1'
  /** Górny trójkąt szczytu przeszklony (nad kuchnią). */
  trojkatSzkla?: 'y0' | 'y1'
  sufit: 'tynk' | 'lamele'
}

export const PAWILONY: Pawilon[] = [
  { id: 'A', nazwa: 'Stodoła wjazdowa: garaż, studio, biura', x0: 5.4, x1: 15.4, y0: 88.0, y1: 108.0, okap: 3.5, kat: 38, wysY0: 0, wysY1: 0, sufit: 'tynk' },
  { id: 'B', nazwa: 'Stodoła dzieci', x0: 5.4, x1: 15.4, y0: 64.0, y1: 83.0, okap: 3.3, kat: 38, wysY0: 0, wysY1: 0, sufit: 'tynk' },
  { id: 'C', nazwa: 'Stodoła dzienna: salon, jadalnia, kuchnia', x0: 5.4, x1: 15.4, y0: 44.0, y1: 60.0, okap: 3.7, kat: 42, wysY0: 2.4, wysY1: 0, szklanySzczyt: 'y0', trojkatSzkla: 'y1', sufit: 'lamele' },
  { id: 'D', nazwa: 'Apartament rodziców', x0: 11.4, x1: 16.8, y0: 26.4, y1: 41.4, okap: 3.1, kat: 35, wysY0: 1.2, wysY1: 0, szklanySzczyt: 'y0', sufit: 'lamele' },
]

/** Szklane łączniki z płaskim dachem. */
export type Lacznik = { id: string; x0: number; x1: number; y0: number; y1: number; wys: number }
export const LACZNIKI: Lacznik[] = [
  { id: 'L1', x0: 5.82, x1: 8.18, y0: 83.0, y1: 88.0, wys: 3.0 },
  { id: 'L2', x0: 5.82, x1: 8.18, y0: 60.0, y1: 64.0, wys: 3.0 },
  { id: 'L3', x0: 12.8, x1: 14.6, y0: 41.4, y1: 44.0, wys: 2.9 },
]

const rad = (d: number) => (d * Math.PI) / 180

/** Wysokość górnej (zewnętrznej) powierzchni dachu nad podłogą w punkcie x. */
export function dachGora(p: Pawilon, x: number) {
  const pol = (p.x1 - p.x0) / 2
  const d = Math.max(0, Math.min(pol, Math.min(x - p.x0, p.x1 - x)))
  return p.okap + d * Math.tan(rad(p.kat))
}
/** Wysokość sufitu (spodu dachu) nad podłogą w punkcie x. */
export function sufit(p: Pawilon, x: number) {
  return dachGora(p, x) - T_DACH / Math.cos(rad(p.kat))
}
export const kalenica = (p: Pawilon) => dachGora(p, (p.x0 + p.x1) / 2)
export const srodekX = (p: Pawilon) => (p.x0 + p.x1) / 2

export function pawilonW(x: number, y: number): Pawilon | undefined {
  return PAWILONY.find((p) => x > p.x0 && x < p.x1 && y > p.y0 - p.wysY0 && y < p.y1 + p.wysY1)
}

// Otwory w ścianach. u: środek otworu od początku ściany (punkt a), w metrach.
export type RodzajOtworu = 'okno' | 'drzwi' | 'przesuwne' | 'brama' | 'przejscie' | 'wejscie' | 'stale'
export type Otwor = { u: number; szer: number; wys: number; parapet?: number; rodzaj: RodzajOtworu; zawias?: 1 | -1; lamele?: boolean }

export type Sciana = {
  id: string
  a: Pt; b: Pt
  t: number
  /** Pawilon wyznacza górę ściany (do spodu dachu). Bez pawilonu: wysokość h. */
  pawilon?: string
  h?: number
  zew?: boolean
  szklo?: boolean
  otwory?: Otwor[]
  /** Wykończenie strony lewej i prawej (patrząc od a do b, lewa to strona normalnej (-dy, dx)). */
  lewa?: string; prawa?: string
}

const S: Sciana[] = []
let nr = 0
function sc(a: Pt, b: Pt, t: number, o: Partial<Sciana> = {}) { S.push({ id: `s${nr++}`, a, b, t, ...o }) }
const P = (x: number, y: number) => ({ x, y })

// ---------- Ściany zewnętrzne: osie w połowie grubości warstwy konstrukcyjnej. ----------
// Zewnętrzne lico konstrukcji leży OKL do środka od obrysu pawilonu, a lamele wychodzą na obrys.
function zewnetrzne(p: Pawilon, otw: Partial<Record<'W' | 'E' | 'S' | 'N', Otwor[]>>) {
  const o = OKL + SZ / 2
  const x0 = p.x0 + o, x1 = p.x1 - o, y0 = p.y0 + o, y1 = p.y1 - o
  const wsp = { pawilon: p.id, zew: true }
  // Kierunki tak, by lewa strona (normalna (-dy, dx)) patrzyła do środka.
  sc(P(x0, y1), P(x0, y0), SZ, { ...wsp, otwory: otw.W, id: `${p.id}-W` }) // zachód, a na północy
  sc(P(x1, y0), P(x1, y1), SZ, { ...wsp, otwory: otw.E, id: `${p.id}-E` }) // wschód, a na południu
  if (p.szklanySzczyt !== 'y0') sc(P(x0, y0), P(x1, y0), SZ, { ...wsp, otwory: otw.S, id: `${p.id}-S` })
  if (p.szklanySzczyt !== 'y1') sc(P(x1, y1), P(x0, y1), SZ, { ...wsp, otwory: otw.N, id: `${p.id}-N` })
}

const [A, B, C, D] = PAWILONY

// Stodoła A: od północy garaż na trzy auta, za nim studio (siłownia z pokojem muzycznym), na końcu hol i dwa biura.
zewnetrzne(A, {
  // a na wschodzie (x 15,19): bramy na osiach x 13,4, 10,4 i 7,4
  N: [13.4, 10.4, 7.4].map((x) => ({ u: 15.19 - x, szer: 2.6, wys: 2.45, rodzaj: 'brama' as const, lamele: true })),
  W: [
    // od północy (a = y 107,8): okno korytarza, okno studia muzycznego, drzwi wejściowe, okno holu
    { u: 107.79 - 91.2, szer: 1.6, wys: 3.0, rodzaj: 'wejscie', zawias: 1 },
    { u: 107.79 - 93.9, szer: 1.5, wys: 2.9, parapet: 0, rodzaj: 'stale' },
    { u: 107.79 - 89.4, szer: 1.4, wys: 2.9, parapet: 0, rodzaj: 'stale', lamele: true },
  ],
  E: [
    // a na południu (y 88,21)
    { u: 92.0 - 88.21 + 1.7, szer: 2.6, wys: 1.7, parapet: 0.85, rodzaj: 'okno' }, // biuro 1
    { u: 89.9 - 88.21, szer: 1.6, wys: 1.7, parapet: 0.85, rodzaj: 'okno' }, // biuro 2
    { u: 98.3 - 88.21, szer: 4.6, wys: 1.4, parapet: 1.1, rodzaj: 'okno' }, // studio
  ],
  S: [
    { u: 7.0 - 5.61, szer: 2.36, wys: 3.0, rodzaj: 'przejscie' }, // do łącznika L1
    { u: 12.3 - 5.61, szer: 3.6, wys: 2.6, parapet: 0.3, rodzaj: 'stale' }, // biuro 2 na dziedziniec
  ],
})
// Działówki A
sc(P(5.82, 101.0), P(14.98, 101.0), 0.14, { pawilon: 'A', otwory: [{ u: 6.6 - 5.82, szer: 0.9, wys: 2.4, rodzaj: 'drzwi', zawias: 1 }] }) // garaż / korytarz i studio
// Szklana ściana studia na garaż (część wschodnia nad działówką zastąpiona szkłem).
S[S.length - 1].b = P(7.4, 101.0)
sc(P(7.4, 101.0), P(14.98, 101.0), 0.1, { pawilon: 'A', szklo: true, h: 3.0 })
sc(P(7.4, 95.6), P(7.4, 101.0), 0.14, { pawilon: 'A', otwory: [{ u: 1.2, szer: 1.0, wys: 2.5, rodzaj: 'drzwi', zawias: -1 }] }) // korytarz / studio
sc(P(5.82, 95.6), P(14.98, 95.6), 0.14, { pawilon: 'A', otwory: [{ u: 0.79, szer: 1.4, wys: 2.7, rodzaj: 'przejscie' }] })
sc(P(9.6, 88.42), P(9.6, 95.6), 0.14, { pawilon: 'A', otwory: [{ u: 1.75, szer: 1.0, wys: 2.5, rodzaj: 'drzwi', zawias: 1 }, { u: 5.2, szer: 1.0, wys: 2.5, rodzaj: 'drzwi', zawias: -1 }] })
sc(P(9.6, 91.95), P(14.98, 91.95), 0.14, { pawilon: 'A' })
// WC dla klientów w rogu holu
sc(P(8.0, 93.6), P(9.6, 93.6), 0.12, { pawilon: 'A', h: 2.7 })
sc(P(8.0, 93.6), P(8.0, 95.6), 0.12, { pawilon: 'A', h: 2.7, otwory: [{ u: 1.0, szer: 0.8, wys: 2.2, rodzaj: 'drzwi', zawias: 1 }] })

// Stodoła B: galeria wzdłuż zachodniej ściany, trzy pokoje dzieci z łazienkami, na południu WC, pralnia, technika.
zewnetrzne(B, {
  W: [
    // a na północy (y 82,79), galeria z przeszkleniami za lamelami
    ...[2.4, 7.4, 12.4].map((u) => ({ u, szer: 3.4, wys: 2.8, parapet: 0, rodzaj: 'stale' as const, lamele: true })),
    { u: 16.6, szer: 1.4, wys: 2.8, parapet: 0, rodzaj: 'stale', lamele: true },
  ],
  E: [
    // a na południu (y 64,21): okna pokojów dzieci i pralni
    { u: 66.4 - 64.21, szer: 1.0, wys: 1.2, parapet: 1.2, rodzaj: 'okno' },
    { u: 70.9 - 64.21, szer: 2.6, wys: 2.5, parapet: 0.35, rodzaj: 'przesuwne' },
    { u: 75.6 - 64.21, szer: 2.6, wys: 2.5, parapet: 0.35, rodzaj: 'przesuwne' },
    { u: 80.3 - 64.21, szer: 2.6, wys: 2.5, parapet: 0.35, rodzaj: 'przesuwne' },
  ],
  N: [{ u: 15.19 - 7.0, szer: 2.24, wys: 3.0, rodzaj: 'przejscie' }],
  S: [{ u: 7.0 - 5.61, szer: 2.24, wys: 3.0, rodzaj: 'przejscie' }],
})
sc(P(8.1, 64.42), P(8.1, 82.58), 0.16, {
  pawilon: 'B',
  otwory: [
    { u: 65.35 - 64.42, szer: 0.8, wys: 2.4, rodzaj: 'drzwi', zawias: 1 }, // WC gości
    { u: 67.45 - 64.42, szer: 0.9, wys: 2.4, rodzaj: 'drzwi', zawias: 1 }, // pralnia
    { u: 72.4 - 64.42, szer: 1.0, wys: 2.6, rodzaj: 'drzwi', zawias: -1 },
    { u: 77.1 - 64.42, szer: 1.0, wys: 2.6, rodzaj: 'drzwi', zawias: -1 },
    { u: 81.8 - 64.42, szer: 1.0, wys: 2.6, rodzaj: 'drzwi', zawias: -1 },
  ],
})
for (const y of [68.53, 73.23, 77.93]) sc(P(8.18, y), P(14.98, y), 0.14, { pawilon: 'B' })
// Strefa gospodarcza: WC gości i schowek przy galerii, za nimi pralnia, na wschodzie technika.
sc(P(8.18, 66.36), P(12.3, 66.36), 0.12, { pawilon: 'B', h: 2.7, otwory: [{ u: 11.2 - 8.18, szer: 0.8, wys: 2.2, rodzaj: 'drzwi', zawias: 1 }] })
sc(P(10.06, 64.42), P(10.06, 66.3), 0.12, { pawilon: 'B', h: 2.7 })
sc(P(12.36, 64.42), P(12.36, 68.46), 0.12, { pawilon: 'B', h: 2.7, otwory: [{ u: 67.4 - 64.42, szer: 0.8, wys: 2.2, rodzaj: 'drzwi', zawias: 1 }] })
// Łazienki dzieci przy galerii: ścianki do wysokości 2,7 m, nad nimi otwarte sklepienie pokoju.
for (const y0 of [68.6, 73.3, 78.0]) {
  sc(P(10.5, y0), P(10.5, y0 + 2.4), 0.12, { pawilon: 'B', h: 2.7, otwory: [{ u: 1.2, szer: 0.8, wys: 2.2, rodzaj: 'drzwi', zawias: 1 }] })
  sc(P(8.18, y0 + 2.4), P(10.56, y0 + 2.4), 0.12, { pawilon: 'B', h: 2.7 })
}

// Stodoła C: kuchnia przy północnym szczycie, jadalnia, salon z dołkiem rozmów przy szklanym szczycie.
zewnetrzne(C, {
  W: [
    // a na północy (y 59,79)
    { u: 59.79 - 52.3, szer: 3.6, wys: 2.9, parapet: 0, rodzaj: 'stale' }, // za stołem, widok na zachodni ogród
    { u: 59.79 - 47.2, szer: 4.6, wys: 3.1, parapet: 0, rodzaj: 'przesuwne' }, // salon na taras basenu
  ],
  E: [
    // a na południu (y 44,21)
    { u: 47.0 - 44.21, szer: 2.4, wys: 3.1, parapet: 0, rodzaj: 'stale' },
    { u: 52.3 - 44.21, szer: 3.6, wys: 2.9, parapet: 0, rodzaj: 'przesuwne' },
  ],
  N: [{ u: 15.19 - 7.0, szer: 2.24, wys: 3.0, rodzaj: 'przejscie' }],
})

// Apartament rodziców: garderoba od łącznika, łazienka, sypialnia przy szklanym szczycie.
zewnetrzne(D, {
  W: [
    // a na północy (y 41,19)
    { u: 41.19 - 35.2, szer: 3.0, wys: 1.6, parapet: 1.0, rodzaj: 'okno' }, // łazienka nad wanną
    { u: 41.19 - 29.6, szer: 3.6, wys: 2.7, parapet: 0, rodzaj: 'przesuwne' }, // sypialnia na taras basenu
  ],
  E: [],
  N: [{ u: 16.59 - 13.7, szer: 1.6, wys: 2.7, rodzaj: 'przejscie' }],
})
sc(P(11.82, 37.93), P(16.38, 37.93), 0.14, { pawilon: 'D', otwory: [{ u: 15.8 - 11.82, szer: 0.9, wys: 2.6, rodzaj: 'przejscie' }] })
sc(P(15.17, 32.83), P(15.17, 37.86), 0.12, { pawilon: 'D', otwory: [{ u: 2.5, szer: 0.9, wys: 2.5, rodzaj: 'drzwi', zawias: 1 }] })
sc(P(11.82, 32.83), P(16.38, 32.83), 0.18, { pawilon: 'D', otwory: [{ u: 15.8 - 11.82, szer: 0.9, wys: 2.6, rodzaj: 'przejscie' }] })

export const SCIANY = S

// ---------- Pomieszczenia: podłogi i nazwy ----------
export type Pomieszczenie = { id: string; nazwa: string; x0: number; x1: number; y0: number; y1: number; podloga: string; poziom?: number }
export const POMIESZCZENIA: Pomieszczenie[] = [
  { id: 'garaz', nazwa: 'Garaż na trzy auta', x0: 5.82, x1: 14.98, y0: 101.07, y1: 107.58, podloga: 'beton_gar' },
  { id: 'studio', nazwa: 'Studio: siłownia i pokój muzyczny', x0: 7.47, x1: 14.98, y0: 95.67, y1: 100.93, podloga: 'dab' },
  { id: 'korytarzA', nazwa: 'Korytarz do garażu', x0: 5.82, x1: 7.33, y0: 95.67, y1: 100.93, podloga: 'dab' },
  { id: 'hol', nazwa: 'Hol wejściowy', x0: 5.82, x1: 9.53, y0: 88.42, y1: 95.53, podloga: 'kamien' },
  { id: 'biuro1', nazwa: 'Biuro 1', x0: 9.67, x1: 14.98, y0: 92.02, y1: 95.53, podloga: 'dab' },
  { id: 'biuro2', nazwa: 'Biuro 2', x0: 9.67, x1: 14.98, y0: 88.42, y1: 91.88, podloga: 'dab' },
  { id: 'L1', nazwa: 'Szklany łącznik', x0: 5.82, x1: 8.18, y0: 82.58, y1: 88.42, podloga: 'kamien' },
  { id: 'galeria', nazwa: 'Galeria', x0: 5.82, x1: 8.02, y0: 64.42, y1: 82.58, podloga: 'dab' },
  { id: 'dz1', nazwa: 'Pokój dziecka 1', x0: 8.18, x1: 14.98, y0: 78.0, y1: 82.58, podloga: 'dab' },
  { id: 'dz2', nazwa: 'Pokój dziecka 2', x0: 8.18, x1: 14.98, y0: 73.3, y1: 77.86, podloga: 'dab' },
  { id: 'dz3', nazwa: 'Pokój dziecka 3', x0: 8.18, x1: 14.98, y0: 68.6, y1: 73.16, podloga: 'dab' },
  { id: 'wcB', nazwa: 'WC gości', x0: 8.18, x1: 10.0, y0: 64.42, y1: 66.3, podloga: 'kamien' },
  { id: 'schowek', nazwa: 'Schowek', x0: 10.12, x1: 12.3, y0: 64.42, y1: 66.3, podloga: 'kamien' },
  { id: 'pralnia', nazwa: 'Pralnia', x0: 8.18, x1: 12.3, y0: 66.42, y1: 68.46, podloga: 'kamien' },
  { id: 'technika', nazwa: 'Technika', x0: 12.42, x1: 14.98, y0: 64.42, y1: 68.46, podloga: 'kamien' },
  { id: 'L2', nazwa: 'Szklany łącznik', x0: 5.82, x1: 8.18, y0: 59.58, y1: 64.42, podloga: 'kamien' },
  { id: 'salon', nazwa: 'Salon, jadalnia i kuchnia', x0: 5.82, x1: 14.98, y0: 44.0, y1: 59.58, podloga: 'dab' },
  { id: 'L3', nazwa: 'Przejście do apartamentu', x0: 12.84, x1: 14.56, y0: 40.98, y1: 44.21, podloga: 'dab' },
  { id: 'garderoba', nazwa: 'Garderoba', x0: 11.82, x1: 16.38, y0: 38.0, y1: 40.98, podloga: 'dab' },
  { id: 'lazD', nazwa: 'Łazienka rodziców', x0: 11.82, x1: 15.11, y0: 32.92, y1: 37.86, podloga: 'kamien' },
  { id: 'przejD', nazwa: 'Przejście', x0: 15.23, x1: 16.38, y0: 32.92, y1: 37.86, podloga: 'dab' },
  { id: 'sypialnia', nazwa: 'Sypialnia rodziców', x0: 11.82, x1: 16.38, y0: 26.4, y1: 32.74, podloga: 'dab' },
]
// Łazienki dzieci
for (const [i, y0] of [68.6, 73.3, 78.0].entries()) POMIESZCZENIA.push({ id: `laz${i + 1}`, nazwa: `Łazienka dziecka ${3 - i}`, x0: 8.18, x1: 10.44, y0, y1: y0 + 2.34, podloga: 'kamien' })

/** Dołek rozmów w salonie: obniżona podłoga. */
export const DOLEK = { x0: 7.6, x1: 13.2, y0: 44.9, y1: 49.2, gl: 0.45 }

/** Basen i tarasy. */
export const BASEN = { x0: 4.4, x1: 8.2, y0: 22.0, y1: 37.4, gl: 1.5 }

/** Poziom podłogi w punkcie (dla spaceru): dom na FL, dołek niżej, poza domem teren albo taras. */
export function poziomPodlogi(x: number, y: number): number {
  if (x > DOLEK.x0 + 0.5 && x < DOLEK.x1 - 0.5 && y > DOLEK.y0 + 0.5 && y < DOLEK.y1 - 0.4) return FL - DOLEK.gl
  return FL
}

export type Miejsce = { x: number; y: number; h: number; gat: 'jesion' | 'brzoza' | 'sosna' | 'klon' | 'klon_zielony'; obr?: number }
// Drzewa dojrzałe od pierwszego dnia, jak w domu KWK Promes „From the Garden House”.
export const DRZEWA: Miejsce[] = [
  // Jesion w głębi ogrodu, cień dla kręgu ogniska.
  { x: 14.2, y: 9.5, h: 15, gat: 'jesion' },
  // Brzozy: przy ścieżce wejściowej, na placu, w zachodnim pasie i w południowym zagajniku.
  { x: 2.3, y: 104.5, h: 10.5, gat: 'brzoza' }, { x: 3.1, y: 99.0, h: 9.0, gat: 'brzoza' }, { x: 17.4, y: 112.2, h: 9.5, gat: 'brzoza' },
  { x: 2.6, y: 112.0, h: 8.5, gat: 'brzoza' }, { x: 2.6, y: 79.0, h: 11, gat: 'brzoza' }, { x: 2.2, y: 66.0, h: 10, gat: 'brzoza' },
  { x: 2.4, y: 7.0, h: 11, gat: 'brzoza' }, { x: 4.6, y: 3.6, h: 9.5, gat: 'brzoza' }, { x: 1.6, y: 11.8, h: 10, gat: 'brzoza' },
  // Sosny zwyczajne wzdłuż wschodniej granicy: wysoko podniesione korony nie zasłaniają okien.
  { x: 18.0, y: 30.0, h: 16, gat: 'sosna' }, { x: 18.4, y: 43.5, h: 18, gat: 'sosna' }, { x: 18.0, y: 57.0, h: 15, gat: 'sosna' },
  { x: 18.3, y: 88.0, h: 17, gat: 'sosna' }, { x: 18.1, y: 101.0, h: 15.5, gat: 'sosna' }, { x: 17.2, y: 17.0, h: 17, gat: 'sosna' },
  // Klony japońskie na dziedzińcach.
  { x: 12.6, y: 85.7, h: 3.6, gat: 'klon' }, { x: 13.9, y: 62.0, h: 3.2, gat: 'klon_zielony' }, { x: 9.6, y: 26.0, h: 0, gat: 'klon' },
]
