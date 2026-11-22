import { dodajMebel, dodajOtwor, dodajProstokat, dodajSciane, nazwijPokoj, nowaKondygnacja } from './operacje'
import { znajdzUklad } from './topologia'
import type { Kondygnacja, Projekt } from './typy'
import { noweId } from './typy'
import { rzutNaOdcinek, wWielokacie } from './geom'
import { DANE } from '../dane/dzialka'

export function pustyProjekt(): Projekt {
  return {
    wersja: 1,
    nazwa: 'Mój dom',
    kondygnacje: [nowaKondygnacja('Parter')],
    teren: [],
    dach: { rodzaj: 'dwuspadowy', kat: 35, okap: 0.6, kalenicaPoprzecznie: false, kolankowa: 0, poddasze: false, kolor: '#4b5058', czesci: [] },
    ustawienia: {
      // Limity z planu miejscowego: domyślnie z pliku działki (src/dane/dzialka.json, pole plan).
      maxZabudowy: DANE.plan.maxZabudowy,
      minBioCzynna: DANE.plan.minBioCzynna,
      maxIntensywnosc: DANE.plan.maxIntensywnosc,
      minIntensywnosc: DANE.plan.minIntensywnosc,
      maxWysokosc: DANE.plan.maxWysokosc,
      maxKatDachu: DANE.plan.maxKatDachu,
      maxKondygnacji: DANE.plan.maxKondygnacji,
      wskaznikiOdTerenuMN: true,
      poziomParteru: 0.3,
      kolorElewacji: '#f1ede6',
    },
  }
}

function otworW(k: Kondygnacja, x: number, y: number, rodzaj: Parameters<typeof dodajOtwor>[3], szer?: number) {
  let naj: { s: Kondygnacja['sciany'][number]; t: number; d: number } | null = null
  for (const s of k.sciany) {
    const r = rzutNaOdcinek({ x, y }, s.a, s.b)
    if (!naj || r.d < naj.d) naj = { s, t: r.t, d: r.d }
  }
  if (!naj || naj.d > 0.3) return
  const L = Math.hypot(naj.s.b.x - naj.s.a.x, naj.s.b.y - naj.s.a.y)
  const id = dodajOtwor(k, naj.s, naj.t * L, rodzaj)
  if (szer) k.otwory.find((o) => o.id === id)!.szer = szer
}

function nazwij(k: Kondygnacja, x: number, y: number, nazwa: string, typ: string) {
  const u = znajdzUklad(k)
  const p = u.pokoje.find((r) => wWielokacie({ x, y }, r.obieg))
  if (p) nazwijPokoj(k, p.klucz, { nazwa, typ })
}

/** Parterowy dom 9,8 x 14 m w północnej części obszaru zabudowy, do pokazania możliwości edytora. */
export function przykladowyProjekt(): Projekt {
  const p = pustyProjekt()
  p.nazwa = 'Dom przykładowy, parter 137 m²'
  const k = p.kondygnacje[0]
  const X = 5.3, Y = 92 // lewy dolny narożnik po osiach ścian
  const q = (x: number, y: number) => ({ x: X + x, y: Y + y })
  dodajProstokat(k, q(0, 0), q(9.8, 14), 'zew')
  dodajSciane(k, q(0, 5.6), q(9.8, 5.6), 'nosna')
  dodajSciane(k, q(6, 0), q(6, 5.6), 'dzialowa')
  dodajSciane(k, q(4.1, 5.6), q(4.1, 14), 'nosna')
  dodajSciane(k, q(5.7, 5.6), q(5.7, 12.4), 'dzialowa')
  dodajSciane(k, q(4.1, 12.4), q(9.8, 12.4), 'dzialowa')
  dodajSciane(k, q(0, 7.7), q(4.1, 7.7), 'dzialowa')
  dodajSciane(k, q(0, 10.3), q(4.1, 10.3), 'dzialowa')
  dodajSciane(k, q(5.7, 9.2), q(9.8, 9.2), 'dzialowa')
  dodajSciane(k, q(7.4, 12.4), q(7.4, 14), 'dzialowa')

  nazwij(k, X + 3, Y + 2.8, 'Salon', 'salon')
  nazwij(k, X + 8, Y + 2.8, 'Kuchnia z jadalnią', 'kuchnia')
  nazwij(k, X + 2, Y + 6.6, 'Wiatrołap', 'wiatrolap')
  nazwij(k, X + 2, Y + 9, 'Łazienka', 'lazienka')
  nazwij(k, X + 2, Y + 12, 'Sypialnia', 'sypialnia')
  nazwij(k, X + 4.9, Y + 9, 'Hol', 'hol')
  nazwij(k, X + 7.7, Y + 7.4, 'Pokój', 'pokoj')
  nazwij(k, X + 7.7, Y + 10.8, 'Pokój', 'pokoj')
  nazwij(k, X + 5.7, Y + 13.2, 'Kotłownia', 'kotlownia')
  nazwij(k, X + 8.6, Y + 13.2, 'Garderoba', 'garderoba')

  // Okna i drzwi: współrzędne środka otworu na osi ściany.
  otworW(k, X + 3, Y, 'okno-taras', 3.0)
  otworW(k, X + 8, Y, 'okno', 1.8)
  otworW(k, X, Y + 2.8, 'okno', 1.8)
  otworW(k, X + 9.8, Y + 2.8, 'okno', 1.5)
  otworW(k, X, Y + 6.65, 'drzwi-wej')
  otworW(k, X, Y + 9, 'okno', 0.9)
  otworW(k, X, Y + 12.2, 'okno', 1.5)
  otworW(k, X + 2, Y + 14, 'okno', 1.5)
  otworW(k, X + 9.8, Y + 7.4, 'okno', 1.5)
  otworW(k, X + 9.8, Y + 10.8, 'okno', 1.5)
  otworW(k, X + 6, Y + 3.4, 'przejscie', 2.4)
  otworW(k, X + 4.9, Y + 5.6, 'przejscie', 1.3)
  otworW(k, X + 4.1, Y + 6.65, 'drzwi')
  otworW(k, X + 4.1, Y + 9, 'drzwi', 0.8)
  otworW(k, X + 4.1, Y + 11.4, 'drzwi')
  otworW(k, X + 5.7, Y + 7.4, 'drzwi')
  otworW(k, X + 5.7, Y + 10.8, 'drzwi')
  otworW(k, X + 4.9, Y + 12.4, 'drzwi', 0.8)
  otworW(k, X + 7.4, Y + 13.2, 'drzwi', 0.8)

  dodajMebel(k, 'naroznik', q(2.0, 1.6), 180)
  dodajMebel(k, 'stolik', q(2.2, 3.2), 0)
  dodajMebel(k, 'rtv', q(3.0, 5.1), 0)
  dodajMebel(k, 'blat', q(9.25, 2.6), 90)
  dodajMebel(k, 'lodowka', q(9.2, 4.9), 90)
  dodajMebel(k, 'stol6', q(7.5, 2.2), 90)
  dodajMebel(k, 'lozko160', q(1.3, 12.6), 90)
  dodajMebel(k, 'szafa', q(3.55, 12.2), 90)
  dodajMebel(k, 'wanna', q(0.65, 9.0), 90)
  dodajMebel(k, 'wc', q(3.5, 8.1), 270)
  dodajMebel(k, 'umywalka', q(2.2, 10.0), 0)
  dodajMebel(k, 'lozko90', q(9.1, 8.0), 0)
  dodajMebel(k, 'biurko', q(6.6, 6.2), 0)
  dodajMebel(k, 'lozko90', q(9.1, 11.2), 0)
  dodajMebel(k, 'biurko', q(6.6, 9.8), 0)
  dodajMebel(k, 'piec', q(4.7, 13.4), 0)

  const t = (rodzaj: Projekt['teren'][number]['rodzaj'], x: number, y: number, szer: number, gl: number) =>
    p.teren.push({ id: noweId('t'), rodzaj, x, y, szer, gl, obrot: 0 })
  t('taras', X + 3, Y - 2.2, 5.4, 3.6)
  t('podjazd', 2.5, Y + 9.6, 5.0, 5.6)
  t('sciezka', 2.5, Y + 6.2, 5.0, 1.3)
  t('drzewo', 9, 70, 6, 6)
  t('drzewo', 15, 58, 5, 5)
  t('drzewo', 7.5, 45, 6, 6)
  t('zywoplot', 19.0, 84, 0.8, 14)
  return p
}

