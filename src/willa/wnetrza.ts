import * as THREE from 'three'
import { Budowa } from './budowa'
import {
  krzesloOgrodowe, lezak, sofaOgrodowa, stolOgrodowy, abazur, zaslona, biurko, dywan, fortepian, fotelBiurowy, hoker, kominekWiszacy, krzeslo, kulaWiszaca, ladowarka, lampaLiniowa, lampaLuk, lawa,
  lozko, mata, prysznic, przodem, rama, regal, silownia, sofaU, stol, szafa, szafkaNocna, toczony, umywalka, wanna, wc, wyspa, zabudowaWysoka,
} from './meble'
import { DOLEK, FL, PAWILONY, sufit } from './uklad'

const C = PAWILONY.find((p) => p.id === 'C')!
const D = PAWILONY.find((p) => p.id === 'D')!
const A = PAWILONY.find((p) => p.id === 'A')!
const sufitC = (x: number) => FL + sufit(C, x)

/** Modele z Poly Haven (CC0) rozstawione we wnętrzach i w ogrodzie. */
export type Model = { m: string; x: number; y: number; h?: number; obr?: number; s?: number }
export const MODELE: Model[] = []

/** Obrazy: płótna malowane w pamięci, na ścianach. */
export type Obraz = { x: number; y: number; h: number; szer: number; wys: number; obr: number; wzor: number }
export const OBRAZY: Obraz[] = []

/** Panele okładziny ścian łazienek (kamień, mikrocement) od podłogi do wysokości h. */
function okladzina(b: Budowa, mat: string, x0: number, x1: number, y0: number, y1: number, h: number) {
  b.pudlo(mat, x0, x1, y0, y1, FL, FL + h)
}

/** Butelki wina w podświetlanej szafie. */
function winiarnia(b: Budowa, sz: Budowa, x0: number, x1: number, y0: number, y1: number) {
  const h0 = FL, h1 = FL + 2.6
  b.pudlo('stal_czarna', x0, x1, y0, y0 + 0.03, h0, h1)
  b.pudlo('stal_czarna', x0, x1, y1 - 0.03, y1, h0, h1)
  b.pudlo('stal_czarna', x0, x1, y0, y1, h1 - 0.04, h1)
  b.pudlo('stal_czarna', x0, x1, y0, y1, h0, h0 + 0.1)
  b.pudlo('led', x0, x0 + 0.01, y0 + 0.03, y1 - 0.03, h0 + 0.1, h1 - 0.04)
  sz.pudlo('szklo', x1 - 0.012, x1, y0 + 0.03, y1 - 0.03, h0 + 0.1, h1 - 0.04)
  for (let h = h0 + 0.35; h < h1 - 0.2; h += 0.3) {
    b.pudlo('stal_czarna', x0 + 0.01, x1 - 0.03, y0 + 0.03, y1 - 0.03, h - 0.012, h - 0.004)
    for (let y = y0 + 0.08; y < y1 - 0.06; y += 0.095) {
      // butelka leżąca szyjką do frontu
      const g = new THREE.LatheGeometry([[0.0, 0], [0.037, 0.0], [0.037, 0.2], [0.03, 0.24], [0.014, 0.27], [0.014, 0.31], [0.0, 0.31]].map(([r, z]) => new THREE.Vector2(r, z)), 14)
      g.rotateZ(-Math.PI / 2)
      g.translate(x0 + 0.04, h + 0.035, -y)
      b.dodaj(Math.random() < 0.7 ? 'butelka' : 'butelka_jasna', g)
    }
  }
}

export function budujWnetrza(b: Budowa, sz: Budowa) {
  // React w trybie deweloperskim liczy useMemo dwa razy: listy zaczynam od zera, żeby modele się nie dublowały.
  MODELE.length = 0
  OBRAZY.length = 0
  // ======================= STODOŁA C: kuchnia, jadalnia, salon =======================
  zabudowaWysoka(b, rama(11.73, 59.26, 0), 6.46, FL, 2.75)
  wyspa(b, rama(11.4, 57.1, 0), 4.6, 1.2, FL)
  for (const x of [9.9, 10.9, 11.9, 12.9]) hoker(b, rama(x, 56.12, przodem(0, 1)), FL)
  for (const x of [10.0, 11.4, 12.8]) kulaWiszaca(b, x, 57.1, FL + 2.05, sufitC(x), 0.19)
  winiarnia(b, sz, 5.82, 6.42, 54.9, 59.5)
  // Jadalnia: stół z litego dębu na dziesięć osób.
  stol(b, rama(10.4, 52.3, 0), 3.4, 1.1, FL)
  for (const x of [9.2, 10.0, 10.8, 11.6]) {
    krzeslo(b, rama(x, 51.42, przodem(0, 1)), FL)
    krzeslo(b, rama(x, 53.18, przodem(0, -1)), FL)
  }
  krzeslo(b, rama(8.35, 52.3, przodem(1, 0)), FL)
  krzeslo(b, rama(12.45, 52.3, przodem(-1, 0)), FL)
  lampaLiniowa(b, rama(10.4, 52.3, 0), 2.6, FL + 1.95, sufitC(10.4))
  // Salon: dołek rozmów z sofą w kształcie U, wiszący kominek, dywan, lampy.
  const hd = FL - DOLEK.gl
  const dx = (DOLEK.x0 + DOLEK.x1) / 2, dy = (DOLEK.y0 + DOLEK.y1) / 2
  dywan(b, dx, dy - 0.25, 3.4, 2.4, hd, 'len')
  sofaU(b, rama(dx, dy, 0), DOLEK.x1 - DOLEK.x0, DOLEK.y1 - DOLEK.y0, hd)
  kominekWiszacy(b, dx, dy - 0.55, hd + 0.42, sufitC(dx) - 0.3)
  // 22.11.2026: blok ławy wchodził w siedzisko i z góry wyglądał jak ciemna cegła przy poduszkach; bez ławy
  lampaLuk(b, 13.9, 49.6, FL, 200)
  dywan(b, 14.1, 45.9, 1.7, 2.2, FL, 'len')
  MODELE.push(
    { m: 'mid_century_lounge_chair', x: 6.75, y: 45.6, h: FL, obr: przodem(0.5, -1) },
    { m: 'mid_century_lounge_chair', x: 14.1, y: 45.6, h: FL, obr: przodem(-0.5, -1) },
    { m: 'Ottoman_01', x: 14.0, y: 44.85, h: FL, obr: 10 },
    { m: 'modern_wooden_cabinet', x: 14.72, y: 49.4, h: FL, obr: przodem(-1, 0) },
    { m: 'ceramic_vase_01', x: 14.72, y: 48.95, h: FL + 0.62, s: 1.0 },
    { m: 'ceramic_vase_04', x: 14.72, y: 49.25, h: FL + 0.62, s: 0.85 },
    { m: 'book_encyclopedia_set_01', x: 14.72, y: 49.85, h: FL + 0.62, obr: 90, s: 0.8 },
    { m: 'potted_plant_02', x: 6.3, y: 50.0, h: FL, s: 1.5 },
    { m: 'potted_plant_01', x: 14.55, y: 44.75, h: FL, s: 1.6 },
    { m: 'wooden_bowl_01', x: 10.4, y: 52.3, h: FL + 0.75, s: 1.2 },
    { m: 'ceramic_vase_03', x: 12.7, y: 57.0, h: FL + 0.98, s: 0.9 },
    { m: 'wine_bottles_01', x: 9.9, y: 57.0, h: FL + 0.98, obr: 20, s: 1 },
    { m: 'brass_vase_01', x: 7.85, y: 44.9, h: FL - 0.03, s: 1.2 },
  )

  // ======================= TARASY =======================
  const hT = FL - 0.02
  for (const y of [24.2, 26.4, 28.6, 30.8]) lezak(b, rama(9.95, y, -90), hT)
  sofaOgrodowa(b, rama(5.6, 40.4, 0), 2.6, hT)
  sofaOgrodowa(b, rama(3.95, 38.4, 90), 1.6, hT)
  b.zaokr('beton_szal', 5.7, 39.0, 1.2, 0.7, hT, hT + 0.32, 0.02)
  stolOgrodowy(b, rama(7.3, 42.85, 0), 2.6, 0.95, hT)
  for (const x of [6.5, 7.3, 8.1]) { krzesloOgrodowe(b, rama(x, 42.0, przodem(0, 1)), hT); krzesloOgrodowe(b, rama(x, 43.7, przodem(0, -1)), hT) }
  MODELE.push({ m: 'ceramic_vase_02', x: 7.3, y: 42.85, h: hT + 0.75, s: 0.9 }, { m: 'potted_plant_01', x: 3.75, y: 43.4, h: hT, s: 1.7 }, { m: 'potted_plant_01', x: 11.1, y: 21.1, h: hT, s: 1.5 })

  // ======================= APARTAMENT RODZICÓW (D) =======================
  const hS = FL + 2.75
  lozko(b, rama(14.1, 31.3, 0), 1.8, 2.15, FL, 'welur', 'len_ciemny')
  szafkaNocna(b, rama(12.75, 32.35, 0), FL)
  szafkaNocna(b, rama(15.45, 32.35, 0), FL)
  dywan(b, 14.1, 30.5, 3.2, 2.5, FL, 'welna')
  zaslona(b, 11.9, 27.4, 11.9, 31.9, FL + 0.01, FL + 2.85)
  // ława w nogach łóżka
  b.zaokr('skora', 14.1, 29.6, 1.4, 0.42, FL + 0.08, FL + 0.46, 0.04)
  MODELE.push(
    { m: 'modern_arm_chair_01', x: 12.6, y: 27.8, h: FL, obr: przodem(1, 0.6) },
    { m: 'potted_plant_04', x: 16.0, y: 27.3, h: FL, s: 1.3 },
    { m: 'side_table_01', x: 12.6, y: 28.7, h: FL, s: 0.9 },
  )
  // Łazienka rodziców: wanna przy oknie, podwójna umywalka, prysznic, WC, ściany w kamieniu.
  okladzina(b, 'marmur', 11.82, 15.11, 37.84, 37.86, 2.6)
  okladzina(b, 'marmur', 15.09, 15.11, 32.92, 37.86, 2.6)
  okladzina(b, 'marmur', 11.82, 15.11, 32.92, 32.94, 2.6)
  wanna(b, 12.75, 35.25, FL, 90)
  umywalka(b, rama(13.9, 37.6, 0), 1.8, FL, 2)
  prysznic(b, sz, rama(14.3, 33.75, 180), 1.5, 1.5, FL, FL + sufit(D, 14.3))
  wc(b, rama(14.85, 36.3, przodem(-1, 0)), FL)
  MODELE.push({ m: 'potted_plant_04', x: 12.2, y: 33.4, h: FL, s: 0.9 })
  // Garderoba: szafy po obu stronach, wyspa z szufladami.
  szafa(b, rama(12.13, 39.49, przodem(1, 0)), 2.9, FL, 2.6)
  szafa(b, rama(16.07, 39.85, przodem(-1, 0)), 2.1, FL, 2.6)
  b.zaokr('orzech', 14.1, 39.5, 1.3, 0.62, FL, FL + 0.9, 0.01)
  b.pudlo('szklo_dymione', 13.47, 14.73, 39.2, 39.8, FL + 0.9, FL + 0.92)
  b.pudlo('led', 12.0, 16.2, 39.48, 39.52, FL + 2.68, FL + 2.69)

  // ======================= STODOŁA B: galeria i pokoje dzieci =======================
  // Galeria: obrazy, ława, regały między drzwiami.
  OBRAZY.push({ x: 7.99, y: 75.2, h: FL + 1.55, szer: 2.2, wys: 1.6, obr: -90, wzor: 1 })
  OBRAZY.push({ x: 7.99, y: 70.0, h: FL + 1.5, szer: 1.4, wys: 1.8, obr: -90, wzor: 2 })
  OBRAZY.push({ x: 7.99, y: 79.6, h: FL + 1.5, szer: 1.4, wys: 1.8, obr: -90, wzor: 3 })
  b.zaokr('lamela', 7.62, 75.2, 0.4, 2.6, FL + 0.38, FL + 0.44, 0.01)
  b.pudlo('stal_czarna', 7.46, 7.78, 74.0, 74.04, FL, FL + 0.38)
  b.pudlo('stal_czarna', 7.46, 7.78, 76.36, 76.4, FL, FL + 0.38)
  for (const [i, y0] of [68.6, 73.3, 78.0].entries()) {
    const y1 = y0 + 4.56
    const kolor = ['welur_zielony', 'welur', 'len_ciemny'][i]
    // łóżko 140 przy ścianie południowej, wezgłowie na południe
    lozko(b, rama(13.4, y0 + 1.15, 180), 1.4, 2.0, FL, kolor, 'len')
    szafkaNocna(b, rama(14.5, y0 + 0.3, 180), FL)
    biurko(b, rama(12.4, y1 - 0.4, 0), 1.6, FL)
    fotelBiurowy(b, rama(12.3, y1 - 1.05, 0), FL)
    szafa(b, rama(9.35, y1 - 0.33, 180), 2.2, FL, 2.4)
    dywan(b, 12.4, y0 + 2.6, 2.4, 1.6, FL, i === 1 ? 'len' : 'welna')
    MODELE.push({ m: 'potted_plant_04', x: 14.6, y: y1 - 0.35, h: FL, s: 0.9 })
    zaslona(b, 14.9, y0 + 0.75, 14.9, y0 + 3.95, FL + 0.01, FL + 2.95)
    abazur(b, 12.6, y0 + 2.4, FL + 2.3, FL + sufit(PAWILONY[1], 12.6))
    b.zaokr('welur', 14.3, y0 + 3.6, 0.55, 0.55, FL, FL + 0.42, 0.2)
    if (i === 0) MODELE.push({ m: 'Ukulele_01', x: 11.5, y: y1 - 0.12, h: FL + 1.4, obr: 0 })
    if (i === 2) MODELE.push({ m: 'chess_set', x: 12.6, y: y1 - 0.4, h: FL + 0.76, s: 0.6 })
    // łazienka dziecka
    okladzina(b, 'mikrocement', 8.18, 10.44, y0 + 2.32, y0 + 2.34, 2.4)
    okladzina(b, 'mikrocement', 8.18, 8.2, y0, y0 + 2.34, 2.4)
    umywalka(b, rama(9.6, y0 + 2.05, 0), 1.0, FL, 1)
    wc(b, rama(8.45, y0 + 1.5, przodem(1, 0)), FL)
    prysznic(b, sz, rama(9.3, y0 + 0.55, 180), 2.2, 1.0, FL, FL + 2.7)
  }
  // WC gości
  wc(b, rama(8.45, 65.35, przodem(1, 0)), FL)
  umywalka(b, rama(9.2, 66.12, 0), 0.6, FL, 1)
  okladzina(b, 'granit', 8.18, 10.0, 66.28, 66.3, 2.7)
  // pralnia
  for (const x of [8.6, 9.3]) b.zaokr('lakier_bialy', x, 68.1, 0.6, 0.6, FL, FL + 0.85, 0.02)
  b.pudlo('orzech', 9.7, 12.2, 67.85, 68.44, FL, FL + 0.9)
  b.pudlo('marmur', 8.25, 12.25, 67.8, 68.44, FL + 0.9, FL + 0.93)

  // ======================= STODOŁA A: hol, biura, studio, garaż =======================
  // Hol: konsola z trawertynu, obraz, rzeźba, ława.
  lawa(b, rama(9.25, 91.9, przodem(-1, 0)), 1.8, 0.42, FL)
  b.pudlo('trawertyn_jasny', 9.04, 9.46, 91.0, 92.8, FL, FL + 0.82)
  OBRAZY.push({ x: 9.51, y: 91.9, h: FL + 1.75, szer: 1.6, wys: 1.1, obr: -90, wzor: 4 })
  MODELE.push({ m: 'marble_bust_01', x: 9.25, y: 92.45, h: FL + 0.82, obr: 270, s: 1.1 }, { m: 'ceramic_vase_02', x: 9.25, y: 91.2, h: FL + 0.82, s: 1.0 })
  b.zaokr('skora', 6.3, 94.6, 1.2, 0.42, FL + 0.08, FL + 0.46, 0.04)
  b.pudlo('stal_czarna', 5.85, 6.0, 93.4, 95.3, FL + 1.5, FL + 1.55)
  kulaWiszaca(b, 7.6, 91.9, FL + 2.7, FL + sufit(A, 7.6), 0.28)
  dywan(b, 7.6, 91.9, 2.2, 3.4, FL, 'welna')
  // Biura: biurko przodem do drzwi, krzesła dla klientów, regał.
  for (const [yc, y1] of [[93.8, 95.53], [90.15, 91.88]] as const) {
    biurko(b, rama(12.9, yc, 90), 1.8, FL)
    fotelBiurowy(b, rama(13.6, yc, 90), FL)
    krzeslo(b, rama(11.65, yc - 0.45, przodem(1, 0)), FL, 'skora')
    krzeslo(b, rama(11.65, yc + 0.45, przodem(1, 0)), FL, 'skora')
    regal(b, rama(12.3, y1 - 0.2, 180), 2.6, FL, 2.4)
    MODELE.push({ m: 'potted_plant_02', x: 14.6, y: y1 - 0.4, h: FL, s: 1.1 }, { m: 'desk_lamp_arm_01', x: 12.6, y: yc + 0.6, h: FL + 0.76, obr: 180 })
  }
  // Studio: fortepian, siłownia, lustro, mata.
  fortepian(b, rama(9.3, 98.4, 90), FL)
  dywan(b, 9.3, 98.3, 2.8, 3.2, FL, 'len_ciemny')
  silownia(b, rama(13.9, 97.3, przodem(1, 0)), FL)
  b.pudlo('lustro', 11.0, 14.9, 95.67, 95.69, FL + 0.1, FL + 2.5)
  mata(b, 12.0, 99.4, FL, 90)
  MODELE.push({ m: 'Ukulele_01', x: 7.6, y: 100.6, h: FL + 1.2, obr: 270 }, { m: 'potted_plant_01', x: 7.85, y: 96.1, h: FL, s: 1.3 })
  // Garaż: ładowarki, listwy LED pod sklepieniem, ściana z lamel.
  ladowarka(b, rama(14.9, 104.3, przodem(-1, 0)), FL)
  ladowarka(b, rama(5.9, 104.3, przodem(1, 0)), FL)
  for (const x of [7.4, 10.4, 13.4]) b.pudlo('led_zimny', x - 0.03, x + 0.03, 101.6, 107.2, FL + 3.25, FL + 3.27)
  for (let y = 101.3; y < 107.4; y += 0.07) b.pudlo('lamela', 14.92, 14.97, y, y + 0.045, FL + 0.1, FL + 3.0)
}

/** Obraz abstrakcyjny w duchu malarstwa barwnych pól, rysowany w pamięci. */
export function plotnoObrazu(wzor: number): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 1024; c.height = 768
  const g = c.getContext('2d')!
  const palety: string[][] = [
    ['#e9e2d6', '#c96f4a', '#2f2a26', '#d9b58a'],
    ['#efe9df', '#3c4a43', '#b9a07c', '#8a3f2c'],
    ['#ece6dc', '#24303a', '#c2a477', '#6d7f73'],
    ['#f1ece3', '#a8483a', '#1f1f1f', '#e0c9a6'],
    ['#e7e1d6', '#55606b', '#d7c3a2', '#2c2824'],
  ]
  const p = palety[wzor % palety.length]
  g.fillStyle = p[0]; g.fillRect(0, 0, 1024, 768)
  const rnd = (() => { let s = wzor * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280) })()
  // miękkie pola barwne
  for (let i = 0; i < 3; i++) {
    const x = 70 + rnd() * 200, y = 60 + i * 230 + rnd() * 30, w = 1024 - x - 70 - rnd() * 120, h = 150 + rnd() * 60
    g.globalAlpha = 0.85
    g.fillStyle = p[1 + (i % 3)]
    g.filter = 'blur(6px)'
    g.fillRect(x, y, w, h)
  }
  g.filter = 'none'
  g.globalAlpha = 1
  // faktura płótna
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(${rnd() < 0.5 ? 255 : 0},${rnd() < 0.5 ? 255 : 0},${rnd() < 0.5 ? 255 : 0},0.035)`
    g.fillRect(rnd() * 1024, rnd() * 768, 2, 2)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Butelki: osobne materiały szkła. */
export const MAT_BUTELEK = {
  butelka: new THREE.MeshPhysicalMaterial({ color: '#1d2a17', roughness: 0.08, metalness: 0, clearcoat: 1, envMapIntensity: 1.2 }),
  butelka_jasna: new THREE.MeshPhysicalMaterial({ color: '#4a1a1a', roughness: 0.08, metalness: 0, clearcoat: 1, envMapIntensity: 1.2 }),
  szklo_dymione: new THREE.MeshPhysicalMaterial({ color: '#2b2b2b', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.55, envMapIntensity: 1.4 }),
}

export { toczony }
