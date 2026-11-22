import type { RodzajOtworu, RodzajSciany, RodzajTerenu } from './typy'

export const SCIANY: Record<RodzajSciany, { nazwa: string; opis: string; grubosc: number }> = {
  zew: { nazwa: 'Zewnętrzna', opis: 'mur 25 cm i ocieplenie 20 cm', grubosc: 0.45 },
  nosna: { nazwa: 'Nośna', opis: 'mur 25 cm', grubosc: 0.25 },
  dzialowa: { nazwa: 'Działowa', opis: 'mur 12 cm', grubosc: 0.12 },
  szklana: { nazwa: 'Szklana', opis: 'fasada ze szkła w ramach', grubosc: 0.14 },
}

export const OTWORY: Record<RodzajOtworu, { nazwa: string; szer: number; wys: number; parapet: number; okno: boolean }> = {
  'drzwi': { nazwa: 'Drzwi wewnętrzne', szer: 0.9, wys: 2.05, parapet: 0, okno: false },
  'drzwi-wej': { nazwa: 'Drzwi wejściowe', szer: 1.0, wys: 2.1, parapet: 0, okno: false },
  'przejscie': { nazwa: 'Przejście bez drzwi', szer: 1.2, wys: 2.2, parapet: 0, okno: false },
  'brama': { nazwa: 'Brama garażowa', szer: 2.5, wys: 2.25, parapet: 0, okno: false },
  'okno': { nazwa: 'Okno', szer: 1.5, wys: 1.5, parapet: 0.85, okno: true },
  'okno-taras': { nazwa: 'Okno tarasowe', szer: 2.4, wys: 2.3, parapet: 0, okno: true },
}

export type TypPokoju = { id: string; nazwa: string; kolor: string; podloga: string; mieszkalny: boolean }
export const POKOJE: TypPokoju[] = [
  { id: 'salon', nazwa: 'Salon', kolor: '#f3e3c3', podloga: '#c9a878', mieszkalny: true },
  { id: 'kuchnia', nazwa: 'Kuchnia', kolor: '#f7d9b8', podloga: '#d9cdbd', mieszkalny: true },
  { id: 'jadalnia', nazwa: 'Jadalnia', kolor: '#f5e6b0', podloga: '#c9a878', mieszkalny: true },
  { id: 'sypialnia', nazwa: 'Sypialnia', kolor: '#cfe0f5', podloga: '#bf9c6c', mieszkalny: true },
  { id: 'pokoj', nazwa: 'Pokój', kolor: '#d6e8d0', podloga: '#bf9c6c', mieszkalny: true },
  { id: 'gabinet', nazwa: 'Gabinet', kolor: '#dcd6f2', podloga: '#a9895f', mieszkalny: true },
  { id: 'lazienka', nazwa: 'Łazienka', kolor: '#bfe6ea', podloga: '#cfd6d8', mieszkalny: false },
  { id: 'wc', nazwa: 'WC', kolor: '#c9ecef', podloga: '#cfd6d8', mieszkalny: false },
  { id: 'hol', nazwa: 'Hol', kolor: '#ebe7df', podloga: '#b9b2a6', mieszkalny: false },
  { id: 'wiatrolap', nazwa: 'Wiatrołap', kolor: '#e3ded4', podloga: '#aaa49a', mieszkalny: false },
  { id: 'garderoba', nazwa: 'Garderoba', kolor: '#ecd9e6', podloga: '#bf9c6c', mieszkalny: false },
  { id: 'spizarnia', nazwa: 'Spiżarnia', kolor: '#e9e2c6', podloga: '#cfd6d8', mieszkalny: false },
  { id: 'pralnia', nazwa: 'Pralnia', kolor: '#d3e4e6', podloga: '#cfd6d8', mieszkalny: false },
  { id: 'kotlownia', nazwa: 'Kotłownia', kolor: '#dedede', podloga: '#b5b5b5', mieszkalny: false },
  { id: 'garaz', nazwa: 'Garaż', kolor: '#d9d9d9', podloga: '#a8a8a8', mieszkalny: false },
  { id: 'inne', nazwa: 'Pomieszczenie', kolor: '#efede8', podloga: '#c4b8a4', mieszkalny: false },
]
export const typPokoju = (id: string) => POKOJE.find((p) => p.id === id) ?? POKOJE[POKOJE.length - 1]

export type WzorMebla = { id: string; nazwa: string; grupa: string; szer: number; gl: number; wys: number; kolor: string }
export const MEBLE: WzorMebla[] = [
  { id: 'sofa3', nazwa: 'Sofa 3-osobowa', grupa: 'Salon', szer: 2.2, gl: 0.95, wys: 0.8, kolor: '#8d99a6' },
  { id: 'naroznik', nazwa: 'Narożnik', grupa: 'Salon', szer: 2.8, gl: 1.8, wys: 0.8, kolor: '#8d99a6' },
  { id: 'fotel', nazwa: 'Fotel', grupa: 'Salon', szer: 0.9, gl: 0.9, wys: 0.8, kolor: '#a3907a' },
  { id: 'stolik', nazwa: 'Stolik kawowy', grupa: 'Salon', szer: 1.1, gl: 0.6, wys: 0.42, kolor: '#b08a5a' },
  { id: 'rtv', nazwa: 'Szafka RTV', grupa: 'Salon', szer: 1.8, gl: 0.45, wys: 0.5, kolor: '#6f6557' },
  { id: 'stol6', nazwa: 'Stół na 6 osób', grupa: 'Jadalnia', szer: 1.8, gl: 0.9, wys: 0.75, kolor: '#b08a5a' },
  { id: 'stol4', nazwa: 'Stół na 4 osoby', grupa: 'Jadalnia', szer: 1.2, gl: 0.8, wys: 0.75, kolor: '#b08a5a' },
  { id: 'blat', nazwa: 'Szafki z blatem', grupa: 'Kuchnia', szer: 2.4, gl: 0.6, wys: 0.9, kolor: '#e6e1d8' },
  { id: 'wyspa', nazwa: 'Wyspa', grupa: 'Kuchnia', szer: 2.0, gl: 0.9, wys: 0.9, kolor: '#d8d2c6' },
  { id: 'lodowka', nazwa: 'Lodówka', grupa: 'Kuchnia', szer: 0.6, gl: 0.65, wys: 2.0, kolor: '#c2c7cc' },
  { id: 'slupek', nazwa: 'Słupek z piekarnikiem', grupa: 'Kuchnia', szer: 0.6, gl: 0.6, wys: 2.1, kolor: '#dcd6ca' },
  { id: 'lozko160', nazwa: 'Łóżko 160 x 200', grupa: 'Sypialnia', szer: 1.7, gl: 2.1, wys: 0.5, kolor: '#d9cbb8' },
  { id: 'lozko90', nazwa: 'Łóżko 90 x 200', grupa: 'Sypialnia', szer: 1.0, gl: 2.1, wys: 0.5, kolor: '#d9cbb8' },
  { id: 'szafa', nazwa: 'Szafa', grupa: 'Sypialnia', szer: 2.0, gl: 0.62, wys: 2.3, kolor: '#c9b89c' },
  { id: 'biurko', nazwa: 'Biurko', grupa: 'Sypialnia', szer: 1.4, gl: 0.7, wys: 0.75, kolor: '#b08a5a' },
  { id: 'komoda', nazwa: 'Komoda', grupa: 'Sypialnia', szer: 1.2, gl: 0.45, wys: 0.85, kolor: '#c9b89c' },
  { id: 'wanna', nazwa: 'Wanna', grupa: 'Łazienka', szer: 1.7, gl: 0.75, wys: 0.58, kolor: '#f4f6f7' },
  { id: 'prysznic', nazwa: 'Prysznic', grupa: 'Łazienka', szer: 0.9, gl: 0.9, wys: 2.0, kolor: '#dfeef2' },
  { id: 'wc', nazwa: 'Miska WC', grupa: 'Łazienka', szer: 0.38, gl: 0.6, wys: 0.42, kolor: '#f4f6f7' },
  { id: 'umywalka', nazwa: 'Umywalka z szafką', grupa: 'Łazienka', szer: 0.8, gl: 0.48, wys: 0.85, kolor: '#eef1f2' },
  { id: 'pralka', nazwa: 'Pralka', grupa: 'Łazienka', szer: 0.6, gl: 0.6, wys: 0.85, kolor: '#e3e6e8' },
  { id: 'krzeslo', nazwa: 'Krzesło', grupa: 'Jadalnia', szer: 0.46, gl: 0.5, wys: 0.9, kolor: '#8a7560' },
  { id: 'regal', nazwa: 'Regał', grupa: 'Biuro i hobby', szer: 1.8, gl: 0.36, wys: 2.0, kolor: '#c9b89c' },
  { id: 'stolkonf', nazwa: 'Stół do spotkań', grupa: 'Biuro i hobby', szer: 2.2, gl: 1.0, wys: 0.75, kolor: '#b08a5a' },
  { id: 'pianino', nazwa: 'Pianino', grupa: 'Biuro i hobby', szer: 1.5, gl: 0.62, wys: 1.2, kolor: '#1d1d1f' },
  { id: 'perkusja', nazwa: 'Perkusja', grupa: 'Biuro i hobby', szer: 1.8, gl: 1.5, wys: 1.2, kolor: '#7a2f2a' },
  { id: 'bieznia', nazwa: 'Bieżnia', grupa: 'Biuro i hobby', szer: 0.85, gl: 1.9, wys: 1.4, kolor: '#3a3d42' },
  { id: 'atlas', nazwa: 'Atlas do ćwiczeń', grupa: 'Biuro i hobby', szer: 1.3, gl: 1.7, wys: 2.1, kolor: '#33363a' },
  { id: 'lawka', nazwa: 'Ławka i hantle', grupa: 'Biuro i hobby', szer: 1.4, gl: 1.3, wys: 0.9, kolor: '#2f3134' },
  { id: 'roslina', nazwa: 'Roślina w donicy', grupa: 'Dom', szer: 0.55, gl: 0.55, wys: 1.5, kolor: '#5f8f4e' },
  { id: 'schody', nazwa: 'Schody proste', grupa: 'Dom', szer: 1.0, gl: 3.9, wys: 3.0, kolor: '#b99b74' },
  { id: 'kominek', nazwa: 'Kominek', grupa: 'Dom', szer: 1.2, gl: 0.6, wys: 2.7, kolor: '#7d7770' },
  { id: 'piec', nazwa: 'Pompa ciepła, zasobnik', grupa: 'Dom', szer: 0.7, gl: 0.7, wys: 1.9, kolor: '#cfd3d6' },
  { id: 'auto', nazwa: 'Samochód', grupa: 'Dom', szer: 1.85, gl: 4.6, wys: 1.5, kolor: '#5b6875' },
]
export const wzorMebla = (id: string) => MEBLE.find((m) => m.id === id)

export const TEREN: Record<RodzajTerenu, { nazwa: string; szer: number; gl: number; kolor: string; zabudowa: boolean; bio: number; wys: number }> = {
  rondo: { nazwa: 'Rondo, zawrotka', szer: 12.4, gl: 12.4, kolor: '#b9b4ab', zabudowa: false, bio: 0, wys: 0.04 },
  podjazd: { nazwa: 'Podjazd', szer: 3.5, gl: 8, kolor: '#b9b4ab', zabudowa: false, bio: 0, wys: 0.04 },
  sciezka: { nazwa: 'Ścieżka', szer: 1.2, gl: 6, kolor: '#c9c3b8', zabudowa: false, bio: 0, wys: 0.04 },
  taras: { nazwa: 'Taras', szer: 5, gl: 3.5, kolor: '#b89872', zabudowa: false, bio: 0, wys: 0.18 },
  garaz: { nazwa: 'Garaż wolnostojący', szer: 6, gl: 6, kolor: '#e4e0d8', zabudowa: true, bio: 0, wys: 2.8 },
  wiata: { nazwa: 'Wiata', szer: 5.5, gl: 5.5, kolor: '#cdbfa8', zabudowa: true, bio: 0, wys: 2.5 },
  pergola: { nazwa: 'Pergola', szer: 5, gl: 4, kolor: '#b08d62', zabudowa: false, bio: 1, wys: 2.6 },
  ogrodzenie: { nazwa: 'Ogrodzenie', szer: 0.12, gl: 10, kolor: '#3a3d42', zabudowa: false, bio: 1, wys: 1.6 },
  drzewo: { nazwa: 'Drzewo', szer: 5, gl: 5, kolor: '#5f8f4e', zabudowa: false, bio: 1, wys: 7 },
  zywoplot: { nazwa: 'Żywopłot', szer: 8, gl: 0.8, kolor: '#4f7d44', zabudowa: false, bio: 1, wys: 1.6 },
  trawnik: { nazwa: 'Ogród, rabata', szer: 6, gl: 4, kolor: '#9cc08a', zabudowa: false, bio: 1, wys: 0.02 },
  woda: { nazwa: 'Oczko wodne, basen', szer: 4, gl: 3, kolor: '#8fc4dc', zabudowa: false, bio: 0, wys: 0.02 },
}

/** Promień zielonej wyspy ronda jako część promienia zewnętrznego. */
export const WYSPA_RONDA = 0.3

/** Rodzaj posadzki w widoku 3D dla typu pomieszczenia. */
export function wzorPodlogi(typ: string): 'parkiet' | 'plytki' | 'beton' {
  if (typ === 'garaz' || typ === 'kotlownia') return 'beton'
  if (['lazienka', 'wc', 'pralnia', 'spizarnia', 'wiatrolap', 'hol', 'kuchnia'].includes(typ)) return 'plytki'
  return 'parkiet'
}
