import type { Pt } from './geom'

export type RodzajSciany = 'zew' | 'nosna' | 'dzialowa' | 'szklana'
export type Wykonczenie = 'tynk' | 'deska' | 'cegla'
export type Pokrycie = 'rabek' | 'dachowka'
/** kolor: wykończenie elewacji tej ściany, gdy ma być inne niż całego domu. */
export type Sciana = { id: string; a: Pt; b: Pt; grubosc: number; rodzaj: RodzajSciany; kolor?: string; wykonczenie?: Wykonczenie }

export type RodzajOtworu = 'drzwi' | 'drzwi-wej' | 'okno' | 'okno-taras' | 'brama' | 'przejscie'
export type Otwor = {
  id: string
  scianaId: string
  /** Odległość środka otworu od końca a ściany, w metrach. */
  poz: number
  szer: number
  wys: number
  /** Wysokość parapetu nad podłogą. */
  parapet: number
  rodzaj: RodzajOtworu
  /** Strona zawiasów i kierunek otwierania. */
  zawias: 1 | -1
  strona: 1 | -1
}

export type Etykieta = { id: string; x: number; y: number; nazwa: string; typ: string }

export type Mebel = {
  id: string
  wzor: string
  x: number
  y: number
  szer: number
  gl: number
  wys: number
  /** Obrót w stopniach. */
  obrot: number
}

export type Kondygnacja = {
  id: string
  nazwa: string
  /** Wysokość pomieszczeń w świetle. */
  wysokosc: number
  /** Grubość stropu nad kondygnacją. */
  strop: number
  sciany: Sciana[]
  otwory: Otwor[]
  etykiety: Etykieta[]
  meble: Mebel[]
}

export type RodzajTerenu = 'rondo' | 'pergola' | 'ogrodzenie' | 'podjazd' | 'taras' | 'sciezka' | 'garaz' | 'wiata' | 'drzewo' | 'zywoplot' | 'trawnik' | 'woda'
export type ElementTerenu = {
  id: string
  rodzaj: RodzajTerenu
  x: number
  y: number
  szer: number
  gl: number
  obrot: number
}

export type RodzajDachu = 'dwuspadowy' | 'czterospadowy' | 'plaski' | 'jednospadowy'
export type CzescDachu = {
  id: string
  /** Środek części w układzie modelu. */
  x: number
  y: number
  szer: number
  gl: number
  /** Obrót w stopniach. */
  obrot: number
  rodzaj: RodzajDachu
  kat: number
  okap: number
  kalenicaPoprzecznie: boolean
  /** Dla dachu jednospadowego: spadek w drugą stronę. */
  odwroc: boolean
  /** Podniesienie podstawy dachu nad strop (ścianka kolankowa albo attyka). */
  kolankowa: number
  /** Szczyty dachu dwuspadowego ze szkła zamiast ściany. */
  szklaneSzczyty?: boolean
  /** Kolor ścian szczytowych i ścianki kolankowej tej części. */
  elewacja?: string
  wykonczenie?: Wykonczenie
}

export type Dach = {
  rodzaj: RodzajDachu
  /** Kąt nachylenia połaci w stopniach. */
  kat: number
  okap: number
  /** Obrót kalenicy o 90 stopni względem dłuższego boku. */
  kalenicaPoprzecznie: boolean
  /** Wysokość ścianki kolankowej ponad strop ostatniej kondygnacji. */
  kolankowa: number
  /** Ostatnia kondygnacja jest poddaszem użytkowym: dach zaczyna się od ścianki kolankowej nad jej podłogą. */
  poddasze: boolean
  kolor: string
  /** Części ułożone ręcznie. Pusta lista oznacza dach liczony sam z obrysu. */
  czesci: CzescDachu[]
  /** Pokrycie połaci. Dachy płaskie mają zawsze żwir i attykę. */
  pokrycie?: Pokrycie
}

export type Ustawienia = {
  /** Limity z planu miejscowego. Puste pole oznacza brak danych. */
  maxZabudowy: number | null // % działki
  minBioCzynna: number | null // % działki
  maxIntensywnosc: number | null
  minIntensywnosc: number | null
  maxKatDachu: number | null
  maxKondygnacji: number | null
  maxWysokosc: number | null // m
  /** Czy wskaźniki liczyć od części działki poza pasem drogi z planu. */
  wskaznikiOdTerenuMN: boolean
  poziomParteru: number // m nad terenem
  kolorElewacji: string
  /** Wykończenie elewacji całego domu. Ściana może mieć własne. */
  wykonczenie?: Wykonczenie
}

export type Projekt = {
  wersja: 1
  nazwa: string
  kondygnacje: Kondygnacja[]
  teren: ElementTerenu[]
  dach: Dach
  ustawienia: Ustawienia
}

export type Zaznaczenie =
  | { typ: 'sciana'; id: string }
  | { typ: 'otwor'; id: string }
  | { typ: 'pokoj'; klucz: string }
  | { typ: 'mebel'; id: string }
  | { typ: 'teren'; id: string }
  | { typ: 'dach'; id: string }
  | null

export type Narzedzie =
  | 'zaznacz'
  | 'sciana'
  | 'pokoj'
  | 'drzwi'
  | 'okno'
  | 'miara'
  | 'teren'
  | 'dach'

let licznik = 0
export const noweId = (p: string) => `${p}${Date.now().toString(36)}${(licznik++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
