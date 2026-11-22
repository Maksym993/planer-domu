import * as THREE from 'three'
import { Budowa } from './budowa'

// Meble modelowane z części. Układ lokalny: x szerokość, y głębokość, przód mebla patrzy w -y.
// obr: obrót w stopniach przeciwnie do zegara (w rzucie modelu).

const rad = (d: number) => (d * Math.PI) / 180
export type Rama = { p: (lx: number, ly: number) => { x: number; y: number }; obr: number }
export function rama(cx: number, cy: number, obr = 0): Rama {
  const a = rad(obr), c = Math.cos(a), s = Math.sin(a)
  return { p: (lx, ly) => ({ x: cx + lx * c - ly * s, y: cy + lx * s + ly * c }), obr }
}
/** Obrót, przy którym przód mebla (lokalne -y) patrzy w kierunku (fx, fy). */
export const przodem = (fx: number, fy: number) => (Math.atan2(fy, fx) * 180) / Math.PI + 90

function box(b: Budowa, r: Rama, mat: string, lx: number, ly: number, sx: number, sy: number, h0: number, h1: number, dobr = 0) {
  const q = r.p(lx, ly)
  b.pudloO(mat, q.x, q.y, sx, sy, h0, h1, r.obr + dobr)
}
function zbox(b: Budowa, r: Rama, mat: string, lx: number, ly: number, sx: number, sy: number, h0: number, h1: number, prom: number, dobr = 0) {
  const q = r.p(lx, ly)
  b.zaokr(mat, q.x, q.y, sx, sy, h0, h1, prom, r.obr + dobr, 4)
}
function walec(b: Budowa, r: Rama, mat: string, lx: number, ly: number, h0: number, h1: number, r0: number, r1 = r0, seg = 24) {
  const q = r.p(lx, ly)
  b.walec(mat, q.x, q.y, h0, h1, r0, r1, seg)
}
/** Bryła obrotowa z profilu [promień, wysokość]. */
export function toczony(b: Budowa, mat: string, x: number, y: number, h: number, profil: [number, number][], seg = 40, phi0 = 0, phiL = Math.PI * 2) {
  const g = new THREE.LatheGeometry(profil.map(([r, z]) => new THREE.Vector2(Math.max(0.0005, r), z)), seg, phi0, phiL)
  g.translate(x, h, -y)
  b.dodaj(mat, g)
}

// ------------------------------------------------ KUCHNIA ------------------------------------------------

/** Zabudowa wysoka z frontami ryflowanymi, piekarnikami i niszą kawową. Plecy przy +y. */
export function zabudowaWysoka(b: Budowa, r: Rama, dl: number, h0: number, wys: number) {
  const gl = 0.64
  box(b, r, 'orzech', 0, 0, dl, gl - 0.02, h0, h0 + 0.1)
  box(b, r, 'czarny_mat', 0, -gl / 2 + 0.06, dl, 0.06, h0, h0 + 0.1) // cokół cofnięty
  box(b, r, 'orzech', 0, 0.02, dl, gl - 0.04, h0 + 0.1, h0 + wys)
  // Ryflowanie frontów: pionowe listwy co 3,2 cm, z przerwami na szczeliny drzwi.
  const front = -gl / 2 + 0.01
  const nisza = { u0: dl * 0.22, u1: dl * 0.58 }
  for (let u = -dl / 2 + 0.016; u < dl / 2 - 0.01; u += 0.032) {
    const w = u + dl / 2
    if (w > nisza.u0 && w < nisza.u1) {
      box(b, r, 'orzech', u, front, 0.026, 0.014, h0 + 0.1, h0 + 0.94)
      box(b, r, 'orzech', u, front, 0.026, 0.014, h0 + 1.92, h0 + wys)
      continue
    }
    box(b, r, 'orzech', u, front, 0.026, 0.014, h0 + 0.1, h0 + wys)
  }
  // Nisza kawowa: marmurowe plecy, blat, półka, LED.
  const nc = -dl / 2 + (nisza.u0 + nisza.u1) / 2, nw = nisza.u1 - nisza.u0
  box(b, r, 'marmur', nc, 0.0, nw, 0.5, h0 + 0.92, h0 + 0.95)
  box(b, r, 'marmur', nc, 0.22, nw, 0.04, h0 + 0.95, h0 + 1.92)
  box(b, r, 'orzech', nc, 0.05, nw, 0.4, h0 + 1.45, h0 + 1.48)
  box(b, r, 'led', nc, -0.12, nw - 0.04, 0.01, h0 + 1.915, h0 + 1.92)
  box(b, r, 'led', nc, -0.12, nw - 0.04, 0.01, h0 + 1.44, h0 + 1.445)
  // ekspres w niszy
  box(b, r, 'stal', nc - nw * 0.28, 0.0, 0.3, 0.4, h0 + 0.95, h0 + 1.33)
  box(b, r, 'stal_czarna', nc - nw * 0.28, -0.2, 0.26, 0.02, h0 + 1.05, h0 + 1.3)
  // Dwa piekarniki jeden nad drugim, czarne szkło.
  const px = -dl / 2 + 0.42
  for (const hh of [0.98, 1.62]) {
    box(b, r, 'stal_czarna', px, front - 0.008, 0.6, 0.02, h0 + hh, h0 + hh + 0.58)
    box(b, r, 'stal', px, front - 0.022, 0.5, 0.012, h0 + hh + 0.5, h0 + hh + 0.515)
  }
  // Uchwyty ukryte: frezy (cienkie ciemne pionowe szczeliny między drzwiami).
  for (let u = -dl / 2 + 0.9; u < dl / 2 - 0.3; u += 0.6) {
    const w = u + dl / 2
    if (w > nisza.u0 - 0.05 && w < nisza.u1 + 0.05) continue
    box(b, r, 'filc', u, front - 0.002, 0.004, 0.016, h0 + 0.1, h0 + wys)
  }
}

/** Wyspa: blat z marmuru spływający na boki, korpus ryflowany, zlew, płyta indukcyjna, nadwieszenie na hokery od -y. */
export function wyspa(b: Budowa, r: Rama, dl: number, gl: number, h0: number) {
  const hb = 0.92, tb = 0.06
  box(b, r, 'marmur', 0, 0, dl, gl, h0 + hb, h0 + hb + tb)
  box(b, r, 'marmur', -dl / 2 + tb / 2, 0, tb, gl, h0, h0 + hb)
  box(b, r, 'marmur', dl / 2 - tb / 2, 0, tb, gl, h0, h0 + hb)
  const korpusGl = gl - 0.34
  box(b, r, 'orzech', 0, 0.17, dl - 2 * tb, korpusGl, h0 + 0.08, h0 + hb)
  box(b, r, 'czarny_mat', 0, 0.17, dl - 2 * tb - 0.04, korpusGl - 0.08, h0, h0 + 0.08)
  for (let u = -dl / 2 + tb + 0.016; u < dl / 2 - tb - 0.01; u += 0.032) {
    box(b, r, 'orzech', u, 0.17 - korpusGl / 2 - 0.007, 0.026, 0.014, h0 + 0.08, h0 + hb)
    box(b, r, 'orzech', u, 0.17 + korpusGl / 2 + 0.007, 0.026, 0.014, h0 + 0.08, h0 + hb)
  }
  // zlew podwieszany i bateria z mosiądzu
  const zx = -dl / 2 + 0.75
  box(b, r, 'stal_czarna', zx, 0.12, 0.7, 0.42, h0 + hb + tb - 0.002, h0 + hb + tb + 0.001)
  const bq = r.p(zx, 0.38)
  walec(b, r, 'mosiadz', zx, 0.4, h0 + hb + tb, h0 + hb + tb + 0.34, 0.016)
  b.pudloO('mosiadz', bq.x, bq.y, 0.03, 0.22, h0 + hb + tb + 0.32, h0 + hb + tb + 0.35, r.obr)
  // płyta indukcyjna
  box(b, r, 'stal_czarna', dl / 2 - 0.85, 0.12, 0.8, 0.52, h0 + hb + tb, h0 + hb + tb + 0.004)
  // przybory: deska, misa
  box(b, r, 'lamela', 0.25, 0.0, 0.5, 0.32, h0 + hb + tb, h0 + hb + tb + 0.03)
}

/** Hoker: siedzisko z koniakowej skóry na czarnej stali. */
export function hoker(b: Budowa, r: Rama, h0: number) {
  zbox(b, r, 'skora', 0, 0, 0.44, 0.4, h0 + 0.66, h0 + 0.73, 0.03)
  zbox(b, r, 'skora', 0, 0.18, 0.42, 0.06, h0 + 0.73, h0 + 0.92, 0.025)
  for (const [x, y] of [[-0.18, -0.16], [0.18, -0.16], [-0.18, 0.16], [0.18, 0.16]]) box(b, r, 'stal_czarna', x, y, 0.022, 0.022, h0, h0 + 0.66)
  box(b, r, 'stal_czarna', 0, -0.16, 0.36, 0.02, h0 + 0.26, h0 + 0.28)
}

// ------------------------------------------------ JADALNIA ------------------------------------------------

export function stol(b: Budowa, r: Rama, dl: number, gl: number, h0: number) {
  zbox(b, r, 'lamela', 0, 0, dl, gl, h0 + 0.68, h0 + 0.75, 0.012)
  for (const s of [-1, 1]) {
    box(b, r, 'stal_czarna', s * (dl / 2 - 0.45), 0, 0.06, gl - 0.25, h0, h0 + 0.68)
    box(b, r, 'stal_czarna', s * (dl / 2 - 0.45), 0, 0.14, gl - 0.25, h0, h0 + 0.02)
  }
}

export function krzeslo(b: Budowa, r: Rama, h0: number, tkanina = 'boucle') {
  zbox(b, r, tkanina, 0, 0, 0.5, 0.48, h0 + 0.4, h0 + 0.48, 0.035)
  zbox(b, r, tkanina, 0, 0.21, 0.48, 0.09, h0 + 0.48, h0 + 0.86, 0.04)
  for (const [x, y] of [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.2], [0.21, 0.2]]) box(b, r, 'lamela', x, y, 0.035, 0.035, h0, h0 + 0.41)
}

// ------------------------------------------------ SALON ------------------------------------------------

/** Wbudowana sofa w kształcie litery U w dołku rozmów. Wymiary wnętrza dołka, otwarta strona w -y. */
export function sofaU(b: Budowa, r: Rama, szer: number, gl: number, h0: number) {
  const gs = 0.98 // głębokość siedziska z oparciem
  const hs = 0.42
  const modul = 0.92
  // cokół cofnięty w cień
  box(b, r, 'lakier_grafit', 0, gl / 2 - gs / 2 + 0.03, szer - 0.06, gs - 0.06, h0, h0 + 0.08)
  box(b, r, 'lakier_grafit', -szer / 2 + gs / 2, -gs / 4, gs - 0.06, gl - gs * 1.5, h0, h0 + 0.08)
  box(b, r, 'lakier_grafit', szer / 2 - gs / 2, -gs / 4, gs - 0.06, gl - gs * 1.5, h0, h0 + 0.08)
  // siedziska modułowe ze szczelinami
  const nT = Math.round(szer / modul)
  for (let i = 0; i < nT; i++) {
    const lx = -szer / 2 + (i + 0.5) * (szer / nT)
    zbox(b, r, 'siedzisko', lx, gl / 2 - gs / 2 - 0.1, szer / nT - 0.012, gs - 0.22, h0 + 0.08, h0 + hs, 0.07)
    zbox(b, r, 'boucle', lx, gl / 2 - 0.12, szer / nT - 0.012, 0.24, h0 + 0.08, h0 + hs + 0.42, 0.08)
  }
  const dlBok = gl - gs * 1.5
  const nB = Math.max(1, Math.round(dlBok / modul))
  for (const sgn of [-1, 1]) {
    for (let i = 0; i < nB; i++) {
      const ly = -gs / 4 - dlBok / 2 + (i + 0.5) * (dlBok / nB)
      zbox(b, r, 'siedzisko', sgn * (szer / 2 - gs / 2 + 0.1), ly, gs - 0.22, dlBok / nB - 0.012, h0 + 0.08, h0 + hs, 0.07)
      zbox(b, r, 'boucle', sgn * (szer / 2 - 0.12), ly, 0.24, dlBok / nB - 0.012, h0 + 0.08, h0 + hs + 0.42, 0.08)
    }
  }
  // poduszki dekoracyjne, oparte o oparcie (22.11.2026: więcej, żeby z góry sofa czytała się jako sofa, a nie same oparcia)
  const pod = [[-szer / 2 + 1.25, gl / 2 - 0.33, 'welur', 6], [-szer / 2 + 1.72, gl / 2 - 0.34, 'welur', -9], [-0.35, gl / 2 - 0.33, 'welur_zielony', 3], [0.15, gl / 2 - 0.34, 'len', -6], [szer / 2 - 1.4, gl / 2 - 0.33, 'len', 4], [szer / 2 - 1.85, gl / 2 - 0.34, 'welur', -5]] as const
  for (const [x, y, m, o] of pod) zbox(b, r, m, x, y, 0.46, 0.13, h0 + hs, h0 + hs + 0.42, 0.06, o)
  for (const [sgn, ly, m] of [[-1, -0.55, 'welur'], [-1, -0.05, 'welur'], [1, -0.3, 'welur_zielony']] as const)
    zbox(b, r, m, sgn * (szer / 2 - 0.33), ly, 0.13, 0.46, h0 + hs, h0 + hs + 0.42, 0.06, sgn * 5)
  // pled przewieszony przez bok
  zbox(b, r, 'welna', szer / 2 - 0.5, -0.5, 0.7, 0.95, h0 + hs, h0 + hs + 0.03, 0.012, 4)
}

/** Wiszący kominek: czarny stożek z misą ognia, rura dymowa do kalenicy. Palenisko otwarte dookoła (360°): misa z żarem na dole,
 *  okap zawieszony nad nią na trzech cienkich prętach. */
export function kominekWiszacy(b: Budowa, x: number, y: number, hDol: number, hSufit: number) {
  // misa paleniska z obrzeżem
  toczony(b, 'stal_malowana_2s', x, y, hDol, [[0.0, 0], [0.42, 0.02], [0.56, 0.12], [0.6, 0.17], [0.57, 0.19]], 48)
  // okap nad otwartym paleniskiem, od dołu otwarty
  toczony(b, 'stal_malowana_2s', x, y, hDol, [[0.6, 0.47], [0.58, 0.53], [0.52, 0.6], [0.3, 0.88], [0.16, 1.05], [0.16, 1.1]], 48)
  // trzy pręty między misą a okapem
  for (const a of [0.35, 0.35 + (Math.PI * 2) / 3, 0.35 + (Math.PI * 4) / 3]) b.walec('stal_malowana', x + Math.cos(a) * 0.575, y + Math.sin(a) * 0.575, hDol + 0.16, hDol + 0.5, 0.009, 0.009, 8)
  // palenisko: misa z żarem
  b.walec('zar', x, y, hDol + 0.1, hDol + 0.13, 0.3, 0.32, 32)
  b.walec('stal_malowana', x, y, hDol + 1.1, hSufit, 0.125, 0.125, 24)
}

export function dywan(b: Budowa, x: number, y: number, sx: number, sy: number, h0: number, mat = 'welna', obr = 0) {
  b.zaokr(mat, x, y, sx, sy, h0, h0 + 0.018, 0.008, obr, 2)
}

/** Ława z bloku trawertynu. */
export function lawa(b: Budowa, r: Rama, sx: number, sy: number, h0: number) {
  zbox(b, r, 'trawertyn_jasny', 0, 0, sx, sy, h0, h0 + 0.34, 0.015)
}

/** Lampa stojąca łukowa z mosiądzu. */
export function lampaLuk(b: Budowa, x: number, y: number, h0: number, kier: number) {
  b.walec('marmur', x, y, h0, h0 + 0.04, 0.2, 0.2)
  const a = rad(kier)
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    const d = Math.sin(t * Math.PI * 0.55) * 1.6
    const h = h0 + 0.04 + Math.sin(t * Math.PI * 0.85) * 2.1 + t * 0.0
    pts.push(new THREE.Vector3(x + Math.cos(a) * d, h, -(y + Math.sin(a) * d)))
  }
  const krzywa = new THREE.CatmullRomCurve3(pts)
  b.dodaj('mosiadz', new THREE.TubeGeometry(krzywa, 40, 0.012, 8))
  const k = pts[pts.length - 1]
  const g = new THREE.SphereGeometry(0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  g.translate(k.x, k.y - 0.2, k.z)
  b.dodaj('mosiadz', g)
  const z = new THREE.CircleGeometry(0.2, 24)
  z.rotateX(Math.PI / 2)
  z.translate(k.x, k.y - 0.2, k.z)
  b.dodaj('klosz', z)
}

/** Lampa wisząca: kula z mlecznego szkła na cienkim przewodzie. */
export function kulaWiszaca(b: Budowa, x: number, y: number, h: number, hSufit: number, r = 0.18) {
  b.kula('klosz', x, y, h, r)
  b.walec('stal_czarna', x, y, h + r - 0.01, hSufit, 0.004, 0.004, 6)
  b.walec('mosiadz', x, y, h + r - 0.02, h + r + 0.05, 0.03, 0.03, 16)
}

/** Lampa liniowa nad stołem. */
export function lampaLiniowa(b: Budowa, r: Rama, dl: number, h: number, hSufit: number) {
  box(b, r, 'stal_czarna', 0, 0, dl, 0.06, h, h + 0.05)
  box(b, r, 'led', 0, 0, dl - 0.04, 0.03, h - 0.002, h)
  for (const s of [-1, 1]) {
    const q = r.p(s * (dl / 2 - 0.2), 0)
    b.walec('stal_czarna', q.x, q.y, h + 0.05, hSufit, 0.003, 0.003, 6)
  }
}

// ------------------------------------------------ SYPIALNIE ------------------------------------------------

/** Łóżko tapicerowane z wysokim zagłówkiem, kołdrą, poduszkami i narzutą. Zagłówek przy +y. */
export function lozko(b: Budowa, r: Rama, szer: number, dl: number, h0: number, tkanina = 'welur', narzuta = 'len_ciemny') {
  zbox(b, r, tkanina, 0, 0, szer + 0.1, dl + 0.1, h0 + 0.08, h0 + 0.36, 0.05)
  box(b, r, 'czarny_mat', 0, 0, szer - 0.2, dl - 0.2, h0, h0 + 0.08)
  zbox(b, r, 'poscel', 0, 0, szer - 0.04, dl - 0.04, h0 + 0.36, h0 + 0.58, 0.07)
  // zagłówek
  zbox(b, r, tkanina, 0, dl / 2 + 0.06, szer + 0.5, 0.14, h0, h0 + 1.25, 0.06)
  // poduszki
  const np = szer > 1.4 ? 2 : 1
  for (let i = 0; i < np; i++) {
    const lx = np === 1 ? 0 : (i - 0.5) * (szer / 2)
    zbox(b, r, 'poscel', lx, dl / 2 - 0.28, szer / np - 0.12, 0.38, h0 + 0.56, h0 + 0.7, 0.07, 0)
    zbox(b, r, 'poscel', lx, dl / 2 - 0.12, szer / np - 0.16, 0.2, h0 + 0.6, h0 + 0.98, 0.08, 0)
  }
  zbox(b, r, 'len', 0.0, dl / 2 - 0.5, 0.5, 0.15, h0 + 0.62, h0 + 0.9, 0.06, 0)
  // kołdra odwinięta i narzuta w nogach
  zbox(b, r, 'poscel', 0, -0.15, szer + 0.02, dl - 0.6, h0 + 0.56, h0 + 0.64, 0.04)
  zbox(b, r, 'poscel', 0, dl / 2 - 0.78, szer + 0.02, 0.26, h0 + 0.62, h0 + 0.7, 0.04)
  zbox(b, r, narzuta, 0, -dl / 2 + 0.38, szer + 0.14, 0.62, h0 + 0.6, h0 + 0.67, 0.03)
}

export function szafkaNocna(b: Budowa, r: Rama, h0: number, lampa = true) {
  zbox(b, r, 'orzech', 0, 0, 0.5, 0.4, h0 + 0.12, h0 + 0.5, 0.01)
  box(b, r, 'stal_czarna', 0, 0, 0.44, 0.34, h0, h0 + 0.12)
  if (lampa) {
    const q = r.p(0.05, 0.03)
    toczony(b, 'ceramika', q.x, q.y, h0 + 0.5, [[0.0, 0], [0.08, 0.0], [0.1, 0.12], [0.06, 0.26], [0.02, 0.3]])
    toczony(b, 'klosz', q.x, q.y, h0 + 0.8, [[0.16, -0.24], [0.12, 0.0], [0.0, 0.0]])
  }
}

/** Biurko z dębu z szufladą i lampą. Przód w -y. */
export function biurko(b: Budowa, r: Rama, dl: number, h0: number) {
  zbox(b, r, 'lamela', 0, 0, dl, 0.7, h0 + 0.72, h0 + 0.76, 0.006)
  box(b, r, 'lamela', -dl / 2 + 0.25, 0.05, 0.45, 0.6, h0 + 0.02, h0 + 0.72)
  for (const s of [-1, 1]) box(b, r, 'stal_czarna', dl / 2 - 0.05, s * 0.3, 0.03, 0.03, h0, h0 + 0.72)
  // monitor i klawiatura
  box(b, r, 'stal_czarna', 0.1, 0.2, 0.68, 0.025, h0 + 0.9, h0 + 1.3)
  box(b, r, 'stal', 0.1, 0.22, 0.06, 0.06, h0 + 0.76, h0 + 0.9)
  box(b, r, 'stal', 0.1, -0.08, 0.42, 0.13, h0 + 0.76, h0 + 0.775)
}

/** Fotel biurowy. */
export function fotelBiurowy(b: Budowa, r: Rama, h0: number) {
  zbox(b, r, 'skora', 0, 0, 0.52, 0.5, h0 + 0.44, h0 + 0.52, 0.04)
  zbox(b, r, 'skora', 0, 0.24, 0.5, 0.08, h0 + 0.55, h0 + 1.05, 0.04)
  walec(b, r, 'stal_czarna', 0, 0, h0 + 0.08, h0 + 0.44, 0.025)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    box(b, r, 'stal_czarna', Math.cos(a) * 0.17, Math.sin(a) * 0.17, 0.34, 0.03, h0 + 0.05, h0 + 0.08, (a * 180) / Math.PI)
  }
}

/** Regał z półkami: rama z czarnej stali, półki z orzecha. */
export function regal(b: Budowa, r: Rama, dl: number, h0: number, wys = 2.4) {
  for (const s of [-1, 1]) box(b, r, 'stal_czarna', s * dl / 2, 0, 0.02, 0.36, h0, h0 + wys)
  for (let i = 0; i < 6; i++) box(b, r, 'orzech', 0, 0, dl, 0.36, h0 + 0.05 + i * (wys - 0.1) / 5, h0 + 0.08 + i * (wys - 0.1) / 5)
}

/** Garderoba / szafa: fronty ryflowane z orzecha, cokół, oświetlona nisza. Przód w -y. */
export function szafa(b: Budowa, r: Rama, dl: number, h0: number, wys: number, gl = 0.62) {
  box(b, r, 'orzech', 0, 0, dl, gl - 0.02, h0 + 0.06, h0 + wys)
  box(b, r, 'czarny_mat', 0, 0.03, dl - 0.02, gl - 0.08, h0, h0 + 0.06)
  for (let u = -dl / 2 + 0.016; u < dl / 2 - 0.01; u += 0.032) box(b, r, 'orzech', u, -gl / 2 + 0.003, 0.026, 0.014, h0 + 0.06, h0 + wys)
  for (let u = -dl / 2 + 0.5; u < dl / 2 - 0.2; u += 0.5) box(b, r, 'filc', u, -gl / 2 - 0.006, 0.004, 0.012, h0 + 0.06, h0 + wys)
}

// ------------------------------------------------ ŁAZIENKI ------------------------------------------------

/** Wanna wolnostojąca: owalna, biała, z baterią podłogową. */
export function wanna(b: Budowa, x: number, y: number, h0: number, obr: number) {
  const g = new THREE.CylinderGeometry(0.5, 0.42, 0.58, 48, 1, false)
  g.scale(1.7, 1, 0.82)
  g.rotateY(rad(obr))
  g.translate(x, h0 + 0.29, -y)
  b.dodaj('ceramika', g)
  const w = new THREE.CylinderGeometry(0.44, 0.44, 0.02, 48)
  w.scale(1.65, 1, 0.75)
  w.rotateY(rad(obr))
  w.translate(x, h0 + 0.52, -y)
  b.dodaj('woda_wanny', w)
  const a = rad(obr)
  const bx = x + Math.cos(a) * 0.98, by = y + Math.sin(a) * 0.98
  b.walec('stal_czarna', bx, by, h0, h0 + 0.95, 0.018)
  b.pudloO('stal_czarna', bx - Math.cos(a) * 0.08, by - Math.sin(a) * 0.08, 0.2, 0.025, h0 + 0.93, h0 + 0.96, obr)
}

/** Umywalka nablatowa z kamienia na konsoli z orzecha, lustro z podświetleniem. Plecy przy +y. */
export function umywalka(b: Budowa, r: Rama, dl: number, h0: number, ile = 1) {
  box(b, r, 'orzech', 0, 0, dl, 0.5, h0 + 0.5, h0 + 0.85)
  box(b, r, 'marmur', 0, 0, dl + 0.02, 0.52, h0 + 0.85, h0 + 0.88)
  for (let i = 0; i < ile; i++) {
    const lx = ile === 1 ? 0 : (i - (ile - 1) / 2) * (dl / ile)
    const q = r.p(lx, -0.02)
    toczony(b, 'ceramika', q.x, q.y, h0 + 0.88, [[0.0, 0.0], [0.18, 0.0], [0.22, 0.03], [0.22, 0.13], [0.2, 0.13], [0.19, 0.04], [0.0, 0.035]])
    box(b, r, 'stal_czarna', lx, 0.2, 0.025, 0.025, h0 + 0.88, h0 + 1.12)
    box(b, r, 'stal_czarna', lx, 0.12, 0.025, 0.18, h0 + 1.1, h0 + 1.125)
    // lustro okrągłe z podświetleniem od tyłu
    const lq = r.p(lx, 0.245)
    const g = new THREE.CylinderGeometry(0.36, 0.36, 0.02, 48)
    g.rotateX(Math.PI / 2)
    g.rotateY(rad(r.obr))
    g.translate(lq.x, h0 + 1.62, -lq.y)
    b.dodaj('lustro', g)
    const gl2 = new THREE.CylinderGeometry(0.37, 0.37, 0.005, 48)
    gl2.rotateX(Math.PI / 2)
    gl2.rotateY(rad(r.obr))
    const lq2 = r.p(lx, 0.255)
    gl2.translate(lq2.x, h0 + 1.62, -lq2.y)
    b.dodaj('led', gl2)
  }
}

/** Miska WC podwieszana. Plecy przy +y. */
export function wc(b: Budowa, r: Rama, h0: number) {
  zbox(b, r, 'ceramika', 0, 0.06, 0.37, 0.54, h0 + 0.26, h0 + 0.42, 0.12)
  zbox(b, r, 'ceramika', 0, 0.06, 0.38, 0.56, h0 + 0.42, h0 + 0.44, 0.012)
  box(b, r, 'stal_czarna', 0, 0.38, 0.22, 0.01, h0 + 1.0, h0 + 1.15)
}

/** Prysznic walk-in: tafla szkła, deszczownica, odpływ liniowy. */
export function prysznic(b: Budowa, sz: Budowa, r: Rama, szer: number, gl: number, h0: number, hS: number) {
  const q = r.p(szer / 2, -gl / 2 + 0.6)
  sz.pudloO('szklo', q.x, q.y, 0.012, 1.2, h0, h0 + 2.1, r.obr)
  box(b, r, 'stal_czarna', szer / 2, -gl / 2 + 0.6, 0.02, 1.2, h0 + 2.1, h0 + 2.12)
  const d = r.p(0, 0.1)
  b.walec('stal_czarna', d.x, d.y, h0 + 2.2, h0 + 2.22, 0.17, 0.17, 32)
  b.walec('stal_czarna', d.x, d.y, h0 + 2.22, hS, 0.012, 0.012, 8)
  box(b, r, 'stal_czarna', 0, gl / 2 - 0.08, 0.9, 0.04, h0 - 0.001, h0 + 0.002)
  box(b, r, 'stal_czarna', -szer / 2 + 0.3, gl / 2 - 0.02, 0.05, 0.03, h0 + 0.9, h0 + 1.25)
}

// ------------------------------------------------ STUDIO ------------------------------------------------

/** Fortepian koncertowy z podniesioną klapą. Klawiatura w -y. */
export function fortepian(b: Budowa, r: Rama, h0: number) {
  const s = new THREE.Shape()
  // obrys skrzydła: prosty bok, łuk po stronie wiolinowej, ogon
  s.moveTo(-0.75, 0)
  s.lineTo(0.75, 0)
  s.lineTo(0.75, 0.55)
  s.bezierCurveTo(0.75, 1.1, 0.25, 1.15, 0.12, 1.55)
  s.bezierCurveTo(0.02, 1.85, -0.2, 2.05, -0.45, 2.05)
  s.bezierCurveTo(-0.65, 2.05, -0.75, 1.9, -0.75, 1.7)
  s.lineTo(-0.75, 0)
  const korpus = new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 })
  const m = (g: THREE.BufferGeometry, h: number) => {
    g.rotateX(-Math.PI / 2)
    const q = r.p(0, 0)
    g.rotateY(rad(r.obr))
    g.translate(q.x, h, -q.y)
    return g
  }
  b.dodaj('lakier_czarny', m(korpus, h0 + 0.68))
  // klapa uniesiona o 35 stopni na wspornik
  const klapa = new THREE.ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: false })
  klapa.rotateX(-Math.PI / 2)
  klapa.translate(0.75, 0, 0)
  klapa.rotateZ(rad(35))
  klapa.translate(-0.75, 0, 0)
  b.dodaj('lakier_czarny', m(klapa, h0 + 0.99))
  // klawiatura
  box(b, r, 'lakier_czarny', 0, -0.12, 1.55, 0.3, h0 + 0.62, h0 + 0.72)
  box(b, r, 'ceramika', 0, -0.17, 1.22, 0.15, h0 + 0.72, h0 + 0.745)
  for (let i = 0; i < 36; i++) {
    if ([2, 6, 9, 13, 16].includes(i % 7 === 2 || i % 7 === 6 ? 99 : -1)) continue
    const u = -0.6 + i * (1.2 / 36)
    if (i % 7 === 2 || i % 7 === 6) continue
    box(b, r, 'lakier_czarny', u, -0.13, 0.012, 0.08, h0 + 0.745, h0 + 0.76)
  }
  // nogi i lira
  for (const [x, y] of [[-0.65, 0.08], [0.65, 0.08], [-0.45, 1.85]]) box(b, r, 'lakier_czarny', x, y, 0.1, 0.1, h0, h0 + 0.68)
  box(b, r, 'mosiadz', 0, 0.3, 0.12, 0.06, h0 + 0.05, h0 + 0.1)
  box(b, r, 'lakier_czarny', 0, 0.3, 0.06, 0.04, h0 + 0.1, h0 + 0.68)
  // ława
  zbox(b, r, 'skora_czarna', 0, -0.72, 0.8, 0.36, h0 + 0.44, h0 + 0.52, 0.03)
  for (const [x, y] of [[-0.35, -0.85], [0.35, -0.85], [-0.35, -0.59], [0.35, -0.59]]) box(b, r, 'lakier_czarny', x, y, 0.04, 0.04, h0, h0 + 0.44)
}

/** Bieżnia, ławeczka, stojak z hantlami, lustro na ścianie. */
export function silownia(b: Budowa, r: Rama, h0: number) {
  // bieżnia: przód w -y
  box(b, r, 'lakier_grafit', 0, 0, 0.8, 1.9, h0, h0 + 0.18)
  box(b, r, 'guma', 0, -0.05, 0.56, 1.55, h0 + 0.18, h0 + 0.2)
  for (const s of [-1, 1]) box(b, r, 'stal_czarna', s * 0.36, -0.82, 0.05, 0.05, h0 + 0.18, h0 + 1.3)
  box(b, r, 'stal_czarna', 0, -0.86, 0.8, 0.22, h0 + 1.25, h0 + 1.32)
  box(b, r, 'ekran', 0, -0.9, 0.42, 0.02, h0 + 1.32, h0 + 1.6, 0)
  // stojak z hantlami obok
  const st = rama(r.p(1.4, 0.4).x, r.p(1.4, 0.4).y, r.obr)
  box(b, st, 'stal_czarna', 0, 0, 0.5, 1.2, h0 + 0.0, h0 + 0.06)
  for (const hh of [0.45, 0.8]) {
    box(b, st, 'stal_czarna', 0, 0, 0.42, 1.2, h0 + hh, h0 + hh + 0.03)
    for (let i = 0; i < 5; i++) {
      const ly = -0.48 + i * 0.24
      for (const sx of [-0.12, 0.12]) {
        const q = st.p(sx, ly)
        const g = new THREE.CylinderGeometry(0.055 + i * 0.008, 0.055 + i * 0.008, 0.05, 20)
        g.rotateZ(Math.PI / 2)
        g.rotateY(rad(st.obr))
        g.translate(q.x, h0 + hh + 0.1, -q.y)
        b.dodaj('guma', g)
      }
      box(b, st, 'stal', 0, ly, 0.3, 0.025, h0 + hh + 0.085, h0 + hh + 0.11)
    }
  }
}

/** Mata do jogi zwinięta i rozłożona. */
export function mata(b: Budowa, x: number, y: number, h0: number, obr: number) {
  b.zaokr('guma_oliwka', x, y, 0.62, 1.83, h0, h0 + 0.006, 0.002, obr, 1)
}

// ------------------------------------------------ GARAŻ ------------------------------------------------

/** Ładowarka samochodowa na ścianie. */
export function ladowarka(b: Budowa, r: Rama, h0: number) {
  zbox(b, r, 'lakier_bialy', 0, 0, 0.26, 0.1, h0 + 1.1, h0 + 1.45, 0.03)
  box(b, r, 'led_zimny', 0, -0.051, 0.12, 0.003, h0 + 1.36, h0 + 1.38)
  box(b, r, 'guma', 0.18, -0.02, 0.1, 0.06, h0 + 0.9, h0 + 1.2)
}

/** Zasłona z lnu: pofalowana tafla od sufitu do podłogi, wzdłuż odcinka w rzucie. */
export function zaslona(b: Budowa, x0: number, y0: number, x1: number, y1: number, h0: number, h1: number, fale = 0.055) {
  const L = Math.hypot(x1 - x0, y1 - y0)
  const n = Math.max(8, Math.round(L / 0.05))
  const dx = (x1 - x0) / L, dy = (y1 - y0) / L
  const nx = -dy, ny = dx
  const poz: number[] = []
  for (let i = 0; i < n; i++) {
    for (const k of [i, i + 1]) {}
  }
  const g = new THREE.PlaneGeometry(L, h1 - h0, n, 1)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) + L / 2
    const w = Math.sin((u / 0.16) * Math.PI) * fale
    const x = x0 + dx * u + nx * w, y = y0 + dy * u + ny * w
    const h = h0 + (p.getY(i) + (h1 - h0) / 2)
    p.setXYZ(i, x, h, -y)
  }
  void poz
  g.computeVertexNormals()
  b.dodaj('firanka', g)
}

/** Lampa wisząca z lnianym abażurem (pokoje dzieci). */
export function abazur(b: Budowa, x: number, y: number, h: number, hSufit: number) {
  toczony(b, 'klosz', x, y, h, [[0.0, 0.0], [0.26, 0.0], [0.26, 0.005], [0.22, 0.26], [0.0, 0.26]])
  b.walec('stal_czarna', x, y, h + 0.26, hSufit, 0.004, 0.004, 6)
}

// ------------------------------------------------ OGRÓD ------------------------------------------------

/** Leżak z teku z grubym materacem i oparciem uniesionym pod kątem. Głowa w +y. */
export function lezak(b: Budowa, r: Rama, h0: number) {
  box(b, r, 'teak', 0, 0, 0.72, 1.95, h0 + 0.18, h0 + 0.24)
  for (const [x, y] of [[-0.32, -0.9], [0.32, -0.9], [-0.32, 0.9], [0.32, 0.9]]) box(b, r, 'teak', x, y, 0.06, 0.06, h0, h0 + 0.2)
  zbox(b, r, 'len', 0, -0.25, 0.68, 1.4, h0 + 0.24, h0 + 0.32, 0.03)
  // oparcie: kilka segmentów schodkowo dla kąta
  for (let i = 0; i < 6; i++) zbox(b, r, 'len', 0, 0.5 + i * 0.075, 0.68, 0.1, h0 + 0.3 + i * 0.07, h0 + 0.4 + i * 0.07, 0.03)
  zbox(b, r, 'len_ciemny', 0, 0.82, 0.4, 0.14, h0 + 0.62, h0 + 0.74, 0.05)
  zbox(b, r, 'welna', 0.05, -0.55, 0.62, 0.5, h0 + 0.32, h0 + 0.345, 0.01, 6)
}

/** Sofa ogrodowa z teku z poduchami. Przód w -y. */
export function sofaOgrodowa(b: Budowa, r: Rama, dl: number, h0: number) {
  box(b, r, 'teak', 0, 0, dl, 0.86, h0 + 0.12, h0 + 0.2)
  for (const s of [-1, 1]) box(b, r, 'teak', s * (dl / 2 - 0.04), 0, 0.08, 0.86, h0, h0 + 0.62)
  box(b, r, 'teak', 0, 0.39, dl, 0.08, h0, h0 + 0.62)
  zbox(b, r, 'len', 0, -0.04, dl - 0.2, 0.72, h0 + 0.2, h0 + 0.36, 0.05)
  const n = Math.round(dl / 0.8)
  for (let i = 0; i < n; i++) zbox(b, r, 'len', -dl / 2 + 0.1 + (i + 0.5) * ((dl - 0.2) / n), 0.25, (dl - 0.2) / n - 0.02, 0.2, h0 + 0.36, h0 + 0.8, 0.07)
  zbox(b, r, 'len_ciemny', -dl / 2 + 0.45, 0.12, 0.45, 0.13, h0 + 0.36, h0 + 0.78, 0.06, 8)
}

/** Stół ogrodowy z teku. */
export function stolOgrodowy(b: Budowa, r: Rama, dl: number, gl: number, h0: number) {
  for (let u = -gl / 2 + 0.04; u < gl / 2; u += 0.095) box(b, r, 'teak', 0, u, dl, 0.085, h0 + 0.71, h0 + 0.75)
  for (const [x, y] of [[-dl / 2 + 0.1, -gl / 2 + 0.1], [dl / 2 - 0.1, -gl / 2 + 0.1], [-dl / 2 + 0.1, gl / 2 - 0.1], [dl / 2 - 0.1, gl / 2 - 0.1]]) box(b, r, 'teak', x, y, 0.07, 0.07, h0, h0 + 0.71)
}

/** Krzesło ogrodowe z teku z siedziskiem z poduchą. */
export function krzesloOgrodowe(b: Budowa, r: Rama, h0: number) {
  box(b, r, 'teak', 0, 0, 0.5, 0.5, h0 + 0.4, h0 + 0.44)
  for (const [x, y] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) box(b, r, 'teak', x, y, 0.04, 0.04, h0, h0 + 0.42)
  for (let i = 0; i < 4; i++) box(b, r, 'teak', 0, 0.23, 0.48, 0.03, h0 + 0.5 + i * 0.1, h0 + 0.57 + i * 0.1)
  for (const s of [-1, 1]) box(b, r, 'teak', s * 0.22, 0.23, 0.04, 0.04, h0 + 0.44, h0 + 0.86)
  zbox(b, r, 'len', 0, -0.01, 0.46, 0.46, h0 + 0.44, h0 + 0.5, 0.02)
}
