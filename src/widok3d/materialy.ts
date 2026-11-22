// Faktury rysowane w pamięci i materiały widoku 3D. Wszystko powstaje raz i jest współdzielone między bryłami.

import * as THREE from 'three'
import type { Pokrycie, Wykonczenie } from '../model/typy'

/** Powtarzalny generator liczb losowych, żeby faktury wyglądały tak samo przy każdym uruchomieniu. */
export function los(ziarno: number) {
  let a = ziarno
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rys = (x: CanvasRenderingContext2D, n: number, r: () => number) => void

function plotno(n: number, ziarno: number, rysuj: Rys): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = n
  rysuj(c.getContext('2d')!, n, los(ziarno))
  return c
}
function tekstura(c: HTMLCanvasElement, kolor: boolean): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = kolor ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = 8
  return t
}
const szary = (v: number) => `rgb(${v | 0},${v | 0},${v | 0})`

function kropki(x: CanvasRenderingContext2D, n: number, r: () => number, ile: number, rozmMin: number, rozmMax: number, alfa: number) {
  for (let i = 0; i < ile; i++) {
    x.fillStyle = r() > 0.5 ? `rgba(255,255,255,${alfa * r()})` : `rgba(0,0,0,${alfa * r()})`
    const s = rozmMin + r() * (rozmMax - rozmMin)
    x.fillRect(r() * n, r() * n, s, s)
  }
}

// --- Rysunki faktur. Rozmiar kafla w metrach podaje K. ---
const tynk: Rys = (x, n, r) => { x.fillStyle = szary(128); x.fillRect(0, 0, n, n); kropki(x, n, r, 30000, 1, 2.4, 0.2) }
const deska: Rys = (x, n, r) => {
  const ile = 10, w = n / ile
  for (let i = 0; i < ile; i++) {
    x.fillStyle = szary(196 + r() * 52); x.fillRect(i * w, 0, w, n)
    for (let j = 0; j < 16; j++) { x.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.08})`; x.fillRect(i * w + r() * w, 0, 1 + r(), n) }
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(i * w, 0, 3, n)
    x.fillStyle = 'rgba(255,255,255,0.16)'; x.fillRect(i * w + 3, 0, 1.5, n)
  }
}
const cegla: Rys = (x, n, r) => {
  x.fillStyle = szary(118); x.fillRect(0, 0, n, n)
  const rzedy = 13, h = n / rzedy, w = n / 4
  for (let j = 0; j < rzedy; j++) for (let i = -1; i < 5; i++) {
    x.fillStyle = szary(176 + r() * 64)
    x.fillRect(i * w + (j % 2 ? w / 2 : 0) + 3, j * h + 3, w - 6, h - 6)
  }
  kropki(x, n, r, 6000, 1, 2, 0.12)
}
const rabek: Rys = (x, n, r) => {
  x.fillStyle = szary(232); x.fillRect(0, 0, n, n)
  for (let j = 0; j < 60; j++) { x.fillStyle = `rgba(0,0,0,${r() * 0.035})`; x.fillRect(0, r() * n, n, 1 + r() * 3) }
  for (const px of [0, n / 2]) {
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(px, 0, 5, n)
    x.fillStyle = 'rgba(255,255,255,0.85)'; x.fillRect(px + 5, 0, 3, n)
    x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(px + 8, 0, 6, n)
  }
}
const dachowka: Rys = (x, n, r) => {
  const rzedy = 3, h = n / rzedy, w = n / 4
  for (let j = 0; j < rzedy; j++) for (let i = -1; i < 5; i++) {
    const px = i * w + (j % 2 ? w / 2 : 0), py = j * h
    const g = x.createLinearGradient(0, py, 0, py + h)
    const b = 205 + r() * 40
    g.addColorStop(0, szary(b)); g.addColorStop(0.8, szary(b - 45)); g.addColorStop(1, szary(b - 95))
    x.fillStyle = g; x.fillRect(px, py, w, h)
    x.fillStyle = 'rgba(0,0,0,0.38)'; x.fillRect(px, py, 2.5, h)
  }
}
const zwir: Rys = (x, n, r) => { x.fillStyle = szary(150); x.fillRect(0, 0, n, n); kropki(x, n, r, 16000, 2, 5, 0.3) }
const deskaTaras: Rys = (x, n, r) => {
  const ile = 8, h = n / ile
  for (let j = 0; j < ile; j++) {
    x.fillStyle = szary(194 + r() * 50); x.fillRect(0, j * h, n, h)
    for (let i = 0; i < 12; i++) { x.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.07})`; x.fillRect(0, j * h + r() * h, n, 1 + r()) }
    x.fillStyle = 'rgba(0,0,0,0.62)'; x.fillRect(0, j * h, n, 3.5)
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(r() * n, j * h, 2, h)
  }
}
const kostka: Rys = (x, n, r) => {
  x.fillStyle = szary(108); x.fillRect(0, 0, n, n)
  const rzedy = 10, h = n / rzedy, w = n / 5
  for (let j = 0; j < rzedy; j++) for (let i = -1; i < 6; i++) {
    x.fillStyle = szary(178 + r() * 58)
    x.fillRect(i * w + (j % 2 ? w / 2 : 0) + 2, j * h + 2, w - 4, h - 4)
  }
  kropki(x, n, r, 5000, 1, 2, 0.1)
}
const trawa: Rys = (x, n, r) => {
  x.fillStyle = '#7d9f5a'; x.fillRect(0, 0, n, n)
  for (let i = 0; i < 70; i++) {
    x.fillStyle = r() > 0.5 ? 'rgba(160,190,110,0.08)' : 'rgba(60,90,40,0.08)'
    x.beginPath(); x.arc(r() * n, r() * n, 20 + r() * 60, 0, 6.3); x.fill()
  }
  const barwy = ['#5f8a45', '#6c9650', '#8fb268', '#9dbd72', '#557d3e']
  for (let i = 0; i < 42000; i++) {
    x.fillStyle = barwy[(r() * barwy.length) | 0]; x.globalAlpha = 0.25 + r() * 0.3
    x.fillRect(r() * n, r() * n, 1 + r() * 1.6, 1.5 + r() * 3)
  }
  x.globalAlpha = 1
}
const parkiet: Rys = (x, n, r) => {
  const rzedy = 10, h = n / rzedy
  for (let j = 0; j < rzedy; j++) {
    let px = -r() * n
    while (px < n) {
      const dl = n * (0.55 + r() * 0.5)
      x.fillStyle = szary(196 + r() * 50); x.fillRect(px, j * h, dl, h)
      for (let i = 0; i < 6; i++) { x.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.05})`; x.fillRect(px, j * h + r() * h, dl, 1) }
      x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(px, j * h, 1.5, h)
      px += dl
    }
    x.fillStyle = 'rgba(0,0,0,0.34)'; x.fillRect(0, j * h, n, 1.5)
  }
}
const plytki: Rys = (x, n, r) => {
  x.fillStyle = szary(234); x.fillRect(0, 0, n, n)
  kropki(x, n, r, 4000, 1, 3, 0.05)
  x.fillStyle = 'rgba(0,0,0,0.3)'
  for (const p of [0, n / 2]) { x.fillRect(p, 0, 4, n); x.fillRect(0, p, n, 4) }
}
const beton: Rys = (x, n, r) => {
  x.fillStyle = szary(176); x.fillRect(0, 0, n, n)
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},0.05)`; x.beginPath(); x.arc(r() * n, r() * n, 30 + r() * 80, 0, 6.3); x.fill() }
  kropki(x, n, r, 9000, 1, 2.5, 0.12)
}
const liscie: Rys = (x, n, r) => {
  x.fillStyle = szary(150); x.fillRect(0, 0, n, n)
  for (let i = 0; i < 9000; i++) {
    x.fillStyle = r() > 0.5 ? `rgba(255,255,255,${0.1 + r() * 0.25})` : `rgba(0,0,0,${0.12 + r() * 0.3})`
    x.beginPath(); x.ellipse(r() * n, r() * n, 2 + r() * 5, 1.5 + r() * 3, r() * 3.1, 0, 6.3); x.fill()
  }
}
const tkanina: Rys = (x, n) => {
  x.fillStyle = szary(128); x.fillRect(0, 0, n, n)
  for (let i = 0; i < n; i += 4) { x.fillStyle = 'rgba(255,255,255,0.1)'; x.fillRect(i, 0, 1.5, n); x.fillStyle = 'rgba(0,0,0,0.1)'; x.fillRect(0, i, n, 1.5) }
}

const P = {
  tynk: plotno(256, 1, tynk), deska: plotno(512, 2, deska), cegla: plotno(512, 3, cegla), rabek: plotno(512, 4, rabek),
  dachowka: plotno(512, 5, dachowka), zwir: plotno(256, 6, zwir), deskaTaras: plotno(512, 7, deskaTaras), kostka: plotno(512, 8, kostka),
  trawa: plotno(512, 9, trawa), parkiet: plotno(512, 10, parkiet), plytki: plotno(512, 11, plytki), beton: plotno(256, 12, beton),
  liscie: plotno(256, 13, liscie), tkanina: plotno(128, 14, tkanina),
}
type Nazwa = keyof typeof P
const mapy = new Map<string, THREE.CanvasTexture>()
/** Ta sama faktura jako kolor (sRGB) albo jako nierówność powierzchni (liniowo). */
function T(n: Nazwa, kolor = true): THREE.CanvasTexture {
  const k = `${n}:${kolor}`
  if (!mapy.has(k)) mapy.set(k, tekstura(P[n], kolor))
  return mapy.get(k)!
}

/** Rozmiar jednego powtórzenia faktury w metrach. */
export const K = { tynk: 1.4, deska: 1.2, cegla: 1, dach: 1, zwir: 1.5, taras: 1.12, kostka: 1, trawa: 4, parkiet: 1.2, plytki: 1.2, beton: 2.5, liscie: 1.2, tkanina: 0.5 }

const pamiec = new Map<string, THREE.Material>()
function mat<Tm extends THREE.Material>(klucz: string, tworz: () => Tm): Tm {
  if (!pamiec.has(klucz)) pamiec.set(klucz, tworz())
  return pamiec.get(klucz) as Tm
}
const S = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p)

export type WzorPodlogi = 'parkiet' | 'plytki' | 'beton'

export const M = {
  elewacja: (kolor: string, w: Wykonczenie) => mat(`el:${w}:${kolor}`, () =>
    w === 'deska' ? S({ color: kolor, map: T('deska'), bumpMap: T('deska', false), bumpScale: 2.2, roughness: 0.82 })
    : w === 'cegla' ? S({ color: kolor, map: T('cegla'), bumpMap: T('cegla', false), bumpScale: 2.4, roughness: 0.9 })
    : S({ color: kolor, bumpMap: T('tynk', false), bumpScale: 0.9, roughness: 0.94 })),
  wnetrze: () => mat('wn', () => S({ color: '#f6f3ee', roughness: 0.96 })),
  cokol: () => mat('cokol', () => S({ color: '#6f6c67', map: T('beton'), roughness: 0.95 })),
  dach: (kolor: string, p: Pokrycie) => mat(`dach:${p}:${kolor}`, () =>
    p === 'dachowka' ? S({ color: kolor, map: T('dachowka'), bumpMap: T('dachowka', false), bumpScale: 3, roughness: 0.78, side: THREE.DoubleSide })
    : S({ color: kolor, map: T('rabek'), bumpMap: T('rabek', false), bumpScale: 2, roughness: 0.5, metalness: 0.45, side: THREE.DoubleSide })),
  zwir: () => mat('zwir', () => S({ color: '#8f8c86', map: T('zwir'), bumpMap: T('zwir', false), bumpScale: 2, roughness: 1 })),
  obrobka: (kolor = '#2a2c2f') => mat(`obr:${kolor}`, () => S({ color: kolor, roughness: 0.45, metalness: 0.6 })),
  szklo: () => mat('szklo', () => new THREE.MeshPhysicalMaterial({ color: '#d3e6f0', roughness: 0.03, metalness: 0.2, transparent: true, opacity: 0.2, envMapIntensity: 2.4, side: THREE.DoubleSide })),
  rama: () => mat('rama', () => S({ color: '#24272b', roughness: 0.5, metalness: 0.35 })),
  taras: (kolor: string) => mat(`taras:${kolor}`, () => S({ color: kolor, map: T('deskaTaras'), bumpMap: T('deskaTaras', false), bumpScale: 2, roughness: 0.8 })),
  kostka: (kolor: string) => mat(`kostka:${kolor}`, () => S({ color: kolor, map: T('kostka'), bumpMap: T('kostka', false), bumpScale: 1.6, roughness: 0.95 })),
  trawa: () => mat('trawa', () => S({ map: T('trawa'), roughness: 1 })),
  podloga: (kolor: string, w: WzorPodlogi) => mat(`podl:${w}:${kolor}`, () =>
    w === 'parkiet' ? S({ color: kolor, map: T('parkiet'), roughness: 0.55 })
    : w === 'plytki' ? S({ color: kolor, map: T('plytki'), roughness: 0.35 })
    : S({ color: kolor, map: T('beton'), roughness: 0.9 })),
  woda: () => mat('woda', () => new THREE.MeshPhysicalMaterial({ color: '#3f7f95', roughness: 0.06, metalness: 0.2, transparent: true, opacity: 0.82, envMapIntensity: 2.4 })),
  liscie: (kolor: string) => mat(`lisc:${kolor}`, () => S({ color: kolor, map: T('liscie'), bumpMap: T('liscie', false), bumpScale: 3, roughness: 1 })),
  tkanina: (kolor: string) => mat(`tk:${kolor}`, () => S({ color: kolor, bumpMap: T('tkanina', false), bumpScale: 0.8, roughness: 0.98 })),
  drewno: (kolor: string) => mat(`drw:${kolor}`, () => S({ color: kolor, map: T('parkiet'), roughness: 0.6 })),
  gladki: (kolor: string, chropowatosc = 0.6, metal = 0) => mat(`gl:${kolor}:${chropowatosc}:${metal}`, () => S({ color: kolor, roughness: chropowatosc, metalness: metal })),
}

/** Wersja materiału przycinana płaszczyznami dachu (poddasze użytkowe). */
const zPlanami = new WeakMap<THREE.Plane[], Map<THREE.Material, THREE.Material>>()
export function przyciety<Tm extends THREE.Material>(m: Tm, plan?: THREE.Plane[]): Tm {
  if (!plan) return m
  if (!zPlanami.has(plan)) zPlanami.set(plan, new Map())
  const mapa = zPlanami.get(plan)!
  if (!mapa.has(m)) { const k = m.clone(); k.clippingPlanes = plan; k.clipShadows = true; mapa.set(m, k) }
  return mapa.get(m) as Tm
}

/** Pudełko z fakturą w skali rzeczywistej: jeden kafel faktury to „kafel” metrów na każdej ścianie. */
export function pudlo(w: number, h: number, d: number, kafel = 1): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(w, h, d)
  const uv = g.attributes.uv
  const skale = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
    const j = f * 4 + i
    uv.setXY(j, (uv.getX(j) * skale[f][0]) / kafel, (uv.getY(j) * skale[f][1]) / kafel)
  }
  return g
}

/** Bryła z listy ścian. Faktura układa się poziomo i w górę połaci, w metrach. */
export function bryla(wierzch: number[][], sciany: number[][], kafel = 1): THREE.BufferGeometry {
  const poz: number[] = [], uv: number[] = []
  const gora = new THREE.Vector3(0, 1, 0)
  for (const f of sciany) {
    const a = new THREE.Vector3(...wierzch[f[0]]), b = new THREE.Vector3(...wierzch[f[1]]), c = new THREE.Vector3(...wierzch[f[2]])
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize()
    let u = gora.clone().cross(n)
    if (u.lengthSq() < 1e-6) u = new THREE.Vector3(1, 0, 0)
    u.normalize()
    const v = n.clone().cross(u)
    for (let i = 1; i < f.length - 1; i++) for (const j of [f[0], f[i], f[i + 1]]) {
      const p = new THREE.Vector3(...wierzch[j])
      poz.push(p.x, p.y, p.z)
      uv.push(p.dot(u) / kafel, p.dot(v) / kafel)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.computeVertexNormals()
  return g
}

/** Skaluje współrzędne faktury geometrii z kształtu (są w metrach) do rozmiaru kafla. */
export function wSkali<G extends THREE.BufferGeometry>(g: G, kafel: number): G {
  const uv = g.attributes.uv
  if (uv) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / kafel, uv.getY(i) / kafel)
  return g
}
