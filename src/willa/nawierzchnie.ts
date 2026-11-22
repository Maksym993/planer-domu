import { Budowa } from './budowa'
import { BASEN, FL, type Pt } from './uklad'

/** Północna granica działki (E-F): y w funkcji x. */
export const granicaN = (x: number) => 123.02 - 0.1206 * x
const P = (x: number, y: number): Pt => ({ x, y })
const prost = (x0: number, x1: number, y0: number, y1: number): Pt[] => [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)]

/** Poziom tarasu przy basenie: równo z podłogą domu. */
export const H_TARAS = FL - 0.02
/** Poziom wody w basenie przelewowym. */
export const H_WODA = FL - 0.07

/** Twarda nawierzchnia, tarasy, basen, ogrodzenie, brama, dziedzińce. */
export function budujOgrod(b: Budowa) {
  // ---- Droga gminna na północy (szuter utwardzony) i zjazd ----
  const nx = 0.1206, dl = Math.hypot(1, nx)
  const kier = { x: 1 / dl, y: -nx / dl }, norm = { x: nx / dl, y: 1 / dl }
  const F = P(0, granicaN(0))
  const pk = (s: number, t: number) => P(F.x + kier.x * s + norm.x * t, F.y + kier.y * s + norm.y * t)
  b.plyta('asfalt', [pk(-60, 0.4), pk(80, 0.4), pk(80, 6.4), pk(-60, 6.4)], -0.06, 0.0)
  // Zjazd z drogi do bramy.
  b.plyta('plyty', [P(6.0, granicaN(6.0) - 0.2), P(12.2, granicaN(12.2) - 0.2), P(12.2 + 0.05, granicaN(12.2) + 0.45), P(6.0 - 0.05, granicaN(6.0) + 0.45)], -0.02, 0.025)

  // ---- Podjazd i plac przed garażem z wielkich płyt, z odwodnieniem liniowym ----
  const yN = (x: number) => granicaN(x) - 0.25
  b.plyta('plyty', [P(4.8, 108.15), P(16.2, 108.15), P(16.2, 114.6), P(12.2, 116.4), P(12.2, yN(12.2)), P(6.0, yN(6.0)), P(6.0, 116.4), P(4.8, 114.6)], -0.05, 0.03)
  b.pudlo('stal_czarna', 5.6, 15.2, 108.25, 108.4, 0.0, 0.034)
  // obrzeża
  b.pudlo('granit', 4.72, 4.8, 108.15, 114.6, -0.05, 0.05)
  b.pudlo('granit', 16.2, 16.28, 108.15, 114.6, -0.05, 0.05)

  // ---- Ogrodzenie z lameli na stalowej ramie, brama przesuwna, słupek z numerem ----
  const hP = 1.7
  const plot = (x0: number, x1: number) => {
    for (let x = x0 + 0.04; x < x1 - 0.02; x += 0.075) {
      const y = granicaN(x) - 0.25
      b.pudloO('spalone', x, y, 0.046, 0.03, 0.08, hP, -6.88)
    }
    b.pudloO('stal_czarna', (x0 + x1) / 2, granicaN((x0 + x1) / 2) - 0.29, x1 - x0, 0.03, 0.2, 0.25, -6.88)
    b.pudloO('stal_czarna', (x0 + x1) / 2, granicaN((x0 + x1) / 2) - 0.29, x1 - x0, 0.03, hP - 0.2, hP - 0.15, -6.88)
    b.pudloO('beton_szal', (x0 + x1) / 2, granicaN((x0 + x1) / 2) - 0.25, x1 - x0, 0.22, -0.1, 0.08, -6.88)
  }
  plot(0.2, 4.2)
  plot(13.9, 22.4)
  // Brama przesuwna (6 m) między betonowymi słupami.
  for (let x = 6.05; x < 12.15; x += 0.075) b.pudloO('spalone', x, granicaN(x) - 0.18, 0.046, 0.03, 0.06, hP, -6.88)
  b.pudloO('stal_czarna', 9.1, granicaN(9.1) - 0.22, 6.2, 0.04, 0.05, 0.12, -6.88)
  // Furtka i ściana z betonu szalunkowego: skrzynka, wideodomofon, podświetlany numer.
  b.pudloO('beton_szal', 5.0, granicaN(5.0) - 0.3, 1.6, 0.32, -0.1, 2.1, -6.88)
  b.pudloO('beton_szal', 13.05, granicaN(13.05) - 0.3, 1.6, 0.32, -0.1, 2.1, -6.88)
  b.pudloO('stal_czarna', 13.05, granicaN(13.05) - 0.47, 0.42, 0.04, 1.1, 1.42, -6.88)
  b.pudloO('led', 12.6, granicaN(12.6) - 0.465, 0.36, 0.01, 1.62, 1.72, -6.88)
  b.pudloO('stal_czarna', 5.0, granicaN(5.0) - 0.47, 0.16, 0.03, 1.25, 1.5, -6.88)

  // ---- Ścieżka wejściowa wzdłuż zachodniej elewacji: płyty w żwirze ----
  b.plyta('zwir', prost(2.1, 4.9, 89.2, 108.15), -0.03, 0.012)
  for (let y = 107.6; y > 92.9; y -= 0.78) b.pudlo('trawertyn', 2.6, 4.3, y - 0.62, y, -0.02, 0.045)
  // Podest przed drzwiami i daszek ze stalowej płyty.
  b.pudlo('trawertyn', 3.2, 5.36, 89.7, 92.7, -0.05, FL - 0.03)
  b.pudlo('trawertyn', 3.2, 3.8, 92.7, 93.3, -0.05, (FL - 0.03) / 2)
  b.pudlo('blacha', 3.85, 5.4, 89.55, 92.85, FL + 3.12, FL + 3.18)
  b.pudlo('led', 4.0, 5.25, 90.4, 92.0, FL + 3.115, FL + 3.12)

  // ---- Dziedziniec zen między A i B: biały żwir, kamienie, płyty ----
  b.plyta('zwir', prost(8.22, 15.4, 83.0, 88.0), -0.03, 0.02)
  for (const [x, y] of [[9.0, 85.5], [9.8, 86.1], [10.6, 85.4]] as const) b.pudlo('trawertyn', x - 0.3, x + 0.3, y - 0.3, y + 0.3, -0.02, 0.05)
  b.pudlo('stal_czarna', 8.2, 15.4, 82.98, 83.0, -0.05, 0.06)

  // ---- Dziedziniec wodny między B i C: płytki basen z czarną wodą ----
  b.pudlo('granit', 8.3, 15.3, 60.1, 63.9, -0.2, 0.08)
  b.pudlo('lakier_grafit', 8.5, 15.1, 60.3, 63.7, 0.0, 0.081)

  // ---- Taras basenowy z trawertynu: podest równo z podłogą, basen przelewowy ----
  const taras: Pt[] = [P(3.3, 20.6), P(11.4, 20.6), P(11.4, 41.6), P(15.4, 41.6), P(15.4, 44.0), P(5.4, 44.0), P(5.4, 50.6), P(3.3, 50.6)]
  const basen: Pt[] = prost(BASEN.x0 - 0.25, BASEN.x1 + 0.25, BASEN.y0 - 0.25, BASEN.y1 + 0.25)
  b.plyta('trawertyn', taras, -0.25, H_TARAS, [basen])
  // Rynna przelewowa dookoła lustra wody: kratka z kamienia.
  b.plyta('granit', [P(BASEN.x0 - 0.25, BASEN.y0 - 0.25), P(BASEN.x1 + 0.25, BASEN.y0 - 0.25), P(BASEN.x1 + 0.25, BASEN.y1 + 0.25), P(BASEN.x0 - 0.25, BASEN.y1 + 0.25)], H_TARAS - 0.04, H_TARAS - 0.015, [prost(BASEN.x0, BASEN.x1, BASEN.y0, BASEN.y1)])
  // Niecka: ściany i dno w ciemnej mozaice, schody rzymskie przy północnym końcu.
  const dno = FL - BASEN.gl
  const m = 'mozaika'
  b.pudlo(m, BASEN.x0 - 0.2, BASEN.x0, BASEN.y0 - 0.2, BASEN.y1 + 0.2, dno - 0.2, H_TARAS - 0.04)
  b.pudlo(m, BASEN.x1, BASEN.x1 + 0.2, BASEN.y0 - 0.2, BASEN.y1 + 0.2, dno - 0.2, H_TARAS - 0.04)
  b.pudlo(m, BASEN.x0, BASEN.x1, BASEN.y0 - 0.2, BASEN.y0, dno - 0.2, H_TARAS - 0.04)
  b.pudlo(m, BASEN.x0, BASEN.x1, BASEN.y1, BASEN.y1 + 0.2, dno - 0.2, H_TARAS - 0.04)
  b.pudlo(m, BASEN.x0, BASEN.x1, BASEN.y0, BASEN.y1, dno - 0.2, dno)
  for (let i = 0; i < 4; i++) b.pudlo(m, BASEN.x0, BASEN.x1, BASEN.y1 - 0.4 * (i + 1), BASEN.y1, dno, H_TARAS - 0.3 - i * 0.3)
  // Stopnie z tarasu na trawnik od południa.
  for (let i = 0; i < 2; i++) b.pudlo('trawertyn', 3.3, 11.4, 20.6 - 0.42 * (i + 1), 20.6 - 0.42 * i, -0.2, H_TARAS * (1 - (i + 1) / 3))

  // ---- Taras sypialni rodziców: deski, schodek do ogrodu ----
  b.pudlo('trawertyn', 11.4, 16.8, 22.7, 26.4, -0.25, H_TARAS - 0.04)
  for (let x = 11.45; x < 16.75; x += 0.145) b.pudlo('deska_tarasu', x, x + 0.13, 22.75, 26.38, H_TARAS - 0.04, H_TARAS)

  // ---- Podesty przy oknach dzieci i jadalni od wschodu ----
  for (const yc of [70.9, 75.6, 80.3]) b.pudlo('deska_tarasu', 15.45, 17.0, yc - 1.6, yc + 1.6, -0.1, FL - 0.06)
  b.pudlo('deska_tarasu', 15.45, 17.2, 50.0, 54.6, -0.1, FL - 0.06)

  // ---- Krąg ogniska na końcu ogrodu: żwir, ława z betonu, misa ognia ----
  const ox = 7.2, oy = 11.0
  b.walec('zwir', ox, oy, -0.03, 0.015, 3.0, 3.0, 48)
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 1.35 + Math.PI * 0.82
    b.pudloO('beton_szal', ox + Math.cos(a) * 2.35, oy + Math.sin(a) * 2.35, 0.52, 0.48, 0.0, 0.44, (a * 180) / Math.PI + 90)
  }
  b.walec('stal_czarna', ox, oy, 0.0, 0.42, 0.42, 0.6, 32)
  // ścieżka z tarasu do ogniska
  for (let i = 0; i < 6; i++) b.pudlo('trawertyn', 6.4, 7.6, 18.6 - i * 0.95 - 0.55, 18.6 - i * 0.95, -0.02, 0.04)
}
