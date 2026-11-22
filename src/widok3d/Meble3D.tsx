// Meble w widoku 3D: każdy mebel składa się z kilku prostych brył (nogi, blaty, poduszki, fronty).

import { useMemo } from 'react'
import * as THREE from 'three'
import { MEBLE } from '../model/katalog'
import type { Mebel } from '../model/typy'
import { M, los } from './materialy'

type V3 = [number, number, number]
/** t: b pudełko (rozmiar), c walec (promień góry, promień dołu, wysokość), k kula (promień). */
type Cz = { t: 'b' | 'c' | 'k'; s: V3; p: V3; m: THREE.Material; r?: V3; cien?: boolean }

const b = (s: V3, p: V3, m: THREE.Material, r?: V3): Cz => ({ t: 'b', s, p, m, r })
const c = (rg: number, rd: number, h: number, p: V3, m: THREE.Material, r?: V3): Cz => ({ t: 'c', s: [rg, rd, h], p, m, r })
const k = (r: number, p: V3, m: THREE.Material): Cz => ({ t: 'k', s: [r, 0, 0], p, m })

/** Przestawia zestaw części: obrót wokół pionu i przesunięcie. */
function ustaw(cz: Cz[], kat: number, dx: number, dz: number): Cz[] {
  const co = Math.cos(kat), si = Math.sin(kat)
  return cz.map((q) => ({ ...q, p: [q.p[0] * co + q.p[2] * si + dx, q.p[1], -q.p[0] * si + q.p[2] * co + dz] as V3, r: [q.r?.[0] ?? 0, (q.r?.[1] ?? 0) + kat, q.r?.[2] ?? 0] as V3 }))
}

const BIEL = () => M.gladki('#f3f4f4', 0.25)
const STAL = () => M.gladki('#c3c8cc', 0.3, 0.8)
const CZERN = () => M.gladki('#1b1c1e', 0.35, 0.2)
const KAMIEN = () => M.gladki('#3b3b3d', 0.35)
const NOGA = () => M.gladki('#2a2b2d', 0.5, 0.4)
const OGIEN = new THREE.MeshStandardMaterial({ color: '#ff8a3c', emissive: '#ff6a1a', emissiveIntensity: 1.6 })

function krzeslo(kolor: string): Cz[] {
  const t = M.tkanina(kolor)
  return [
    b([0.44, 0.06, 0.44], [0, 0.46, 0], t), b([0.44, 0.46, 0.05], [0, 0.72, -0.2], t),
    ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => b([0.035, 0.44, 0.035], [x * 0.19, 0.22, z * 0.19], NOGA())),
  ]
}

function fotelBiurowy(): Cz[] {
  const t = M.tkanina('#34383d')
  return [
    b([0.5, 0.08, 0.5], [0, 0.5, 0], t), b([0.46, 0.55, 0.07], [0, 0.85, -0.23], t),
    c(0.03, 0.03, 0.4, [0, 0.25, 0], NOGA()), c(0.3, 0.3, 0.04, [0, 0.04, 0], NOGA()),
  ]
}

function stol(W: number, D: number, H: number, kolor: string, krzesel: number): Cz[] {
  const d = M.drewno(kolor)
  const cz: Cz[] = [b([W, 0.045, D], [0, H - 0.022, 0], d)]
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) cz.push(b([0.07, H - 0.045, 0.07], [x * (W / 2 - 0.09), (H - 0.045) / 2, z * (D / 2 - 0.09)], d))
  const naBok = Math.max(1, Math.floor((krzesel - (krzesel > 4 ? 2 : 0)) / 2))
  for (let i = 0; i < naBok; i++) {
    const x = -W / 2 + ((i + 0.5) * W) / naBok
    cz.push(...ustaw(krzeslo('#8a7560'), Math.PI, x, D / 2 + 0.12), ...ustaw(krzeslo('#8a7560'), 0, x, -D / 2 - 0.12))
  }
  if (krzesel > 4) cz.push(...ustaw(krzeslo('#8a7560'), Math.PI / 2, -W / 2 - 0.12, 0), ...ustaw(krzeslo('#8a7560'), -Math.PI / 2, W / 2 + 0.12, 0))
  return cz
}

function sofa(W: number, D: number, kolor: string, szezlong: boolean): Cz[] {
  const t = M.tkanina(kolor), j = M.tkanina('#aab4be')
  const gl = szezlong ? 0.98 : D
  const z0 = -D / 2 + gl / 2
  const cz: Cz[] = [
    b([W, 0.22, gl], [0, 0.17, z0], t),
    b([W, 0.46, 0.2], [0, 0.6, -D / 2 + 0.1], t),
    b([0.16, 0.34, gl], [-W / 2 + 0.08, 0.45, z0], t), b([0.16, 0.34, gl], [W / 2 - 0.08, 0.45, z0], t),
  ]
  const n = Math.max(1, Math.round((W - 0.32) / 0.8))
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 0.16 + ((i + 0.5) * (W - 0.32)) / n, sz = (W - 0.32) / n - 0.03
    cz.push(b([sz, 0.15, gl - 0.26], [x, 0.36, z0 + 0.1], t), b([sz, 0.34, 0.14], [x, 0.6, -D / 2 + 0.27], j, [-0.14, 0, 0]))
  }
  if (szezlong) cz.push(b([0.98, 0.22, D - gl], [W / 2 - 0.49, 0.17, D / 2 - (D - gl) / 2], t), b([0.92, 0.15, D - gl - 0.04], [W / 2 - 0.49, 0.36, D / 2 - (D - gl) / 2], t))
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) cz.push(b([0.05, 0.06, 0.05], [x * (W / 2 - 0.08), 0.03, z0 + z * (gl / 2 - 0.08)], NOGA()))
  return cz
}

function lozko(W: number, D: number): Cz[] {
  const d = M.drewno('#b79a74')
  const cz: Cz[] = [
    b([W, 0.24, D], [0, 0.2, 0], d), b([W, 0.95, 0.07], [0, 0.48, -D / 2 + 0.035], d),
    b([W - 0.08, 0.2, D - 0.14], [0, 0.42, 0.03], BIEL()),
    b([W - 0.02, 0.09, D * 0.62], [0, 0.56, D * 0.17], M.tkanina('#c9c2b6')),
    b([W - 0.02, 0.03, 0.4], [0, 0.61, -D * 0.1], M.tkanina('#e9e5dd')),
  ]
  const n = W > 1.3 ? 2 : 1
  for (let i = 0; i < n; i++) cz.push(b([(W - 0.2) / n - 0.06, 0.13, 0.42], [-W / 2 + 0.1 + ((i + 0.5) * (W - 0.2)) / n, 0.585, -D / 2 + 0.36], BIEL(), [0.12, 0, 0]))
  return cz
}

function zabudowa(W: number, D: number, kolor: string, gorne: boolean): Cz[] {
  const f = M.gladki(kolor, 0.45)
  const cz: Cz[] = [b([W, 0.1, D - 0.06], [0, 0.05, -0.03], CZERN()), b([W, 0.76, D - 0.02], [0, 0.48, -0.01], f), b([W + 0.02, 0.04, D + 0.02], [0, 0.88, 0], KAMIEN())]
  const n = Math.max(1, Math.round(W / 0.6))
  for (let i = 1; i < n; i++) cz.push(b([0.008, 0.72, 0.01], [-W / 2 + (i * W) / n, 0.48, D / 2 - 0.012], CZERN()))
  if (gorne) cz.push(b([W, 0.72, 0.35], [0, 1.82, -D / 2 + 0.175], f))
  return cz
}

/** Lista brył jednego mebla w jego układzie: x wzdłuż szerokości, z wzdłuż głębokości (tył po stronie -z). */
function czesci(m: Mebel, kolor: string): Cz[] {
  const W = m.szer, D = m.gl, H = m.wys
  const r = los(m.id.split('').reduce((a, z) => a * 31 + z.charCodeAt(0), 7))
  switch (m.wzor) {
    case 'sofa3': return sofa(W, D, kolor, false)
    case 'naroznik': return sofa(W, D, kolor, true)
    case 'fotel': return sofa(W, D, kolor, false)
    case 'krzeslo': return krzeslo(kolor)
    case 'stolik': return [b([W, 0.04, D], [0, H - 0.02, 0], M.drewno(kolor)), ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => b([0.04, H - 0.04, 0.04], [x * (W / 2 - 0.06), (H - 0.04) / 2, z * (D / 2 - 0.06)], NOGA()))]
    case 'stol6': return stol(W, D, H, kolor, 6)
    case 'stol4': return stol(W, D, H, kolor, 4)
    case 'stolkonf': return stol(W, D, H, kolor, 8)
    case 'rtv': return [b([W, H, D], [0, H / 2 + 0.03, 0], M.drewno(kolor)), b([W * 0.78, 0.78, 0.04], [0, H + 0.55, -D / 2 + 0.06], CZERN()), b([0.3, 0.14, 0.2], [0, H + 0.1, -D / 2 + 0.1], CZERN())]
    case 'blat': return [...zabudowa(W, D, kolor, true), b([0.56, 0.012, 0.5], [W / 4, 0.905, 0], CZERN()), b([0.5, 0.02, 0.4], [-W / 4, 0.9, 0], STAL()), c(0.015, 0.015, 0.24, [-W / 4, 1.02, -0.18], STAL())]
    case 'wyspa': return [...zabudowa(W, D, kolor, false), b([0.58, 0.012, 0.5], [0, 0.905, 0], CZERN())]
    case 'lodowka': return [b([W, H, D], [0, H / 2, 0], STAL()), b([W + 0.002, 0.012, 0.01], [0, H * 0.4, D / 2], CZERN()), b([0.025, 0.5, 0.03], [W / 2 - 0.08, H * 0.62, D / 2 + 0.02], NOGA()), b([0.025, 0.3, 0.03], [W / 2 - 0.08, H * 0.25, D / 2 + 0.02], NOGA())]
    case 'slupek': return [b([W, H, D], [0, H / 2, 0], M.gladki(kolor, 0.45)), b([W - 0.08, 0.5, 0.012], [0, 1.0, D / 2], CZERN()), b([W - 0.08, 0.32, 0.012], [0, 1.5, D / 2], CZERN()), b([W - 0.12, 0.02, 0.03], [0, 1.29, D / 2 + 0.02], STAL())]
    case 'lozko160': case 'lozko90': return lozko(W, D)
    case 'szafa': {
      const cz: Cz[] = [b([W, H, D], [0, H / 2, 0], M.drewno(kolor))]
      const n = Math.max(2, Math.round(W / 0.5))
      for (let i = 1; i < n; i++) cz.push(b([0.008, H - 0.06, 0.01], [-W / 2 + (i * W) / n, H / 2, D / 2], CZERN()))
      for (let i = 0; i < n; i++) cz.push(b([0.02, 0.24, 0.025], [-W / 2 + ((i + (i % 2 ? 0.14 : 0.86)) * W) / n, H * 0.48, D / 2 + 0.016], NOGA()))
      return cz
    }
    case 'komoda': return [b([W, H - 0.1, D], [0, H / 2 + 0.05, 0], M.drewno(kolor)), ...[0.33, 0.66].map((u) => b([W - 0.04, 0.008, 0.01], [0, 0.1 + (H - 0.1) * u, D / 2], CZERN())), ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => b([0.04, 0.1, 0.04], [x * (W / 2 - 0.05), 0.05, z * (D / 2 - 0.05)], NOGA()))]
    case 'biurko': return [
      b([W, 0.035, D], [0, H - 0.017, 0], M.drewno(kolor)), b([0.04, H - 0.035, D - 0.06], [-W / 2 + 0.04, (H - 0.035) / 2, 0], NOGA()), b([0.04, H - 0.035, D - 0.06], [W / 2 - 0.04, (H - 0.035) / 2, 0], NOGA()),
      b([0.62, 0.36, 0.025], [0, H + 0.3, -D / 2 + 0.16], CZERN()), b([0.05, 0.12, 0.05], [0, H + 0.06, -D / 2 + 0.16], NOGA()), b([0.24, 0.012, 0.16], [0, H + 0.006, -D / 2 + 0.16], NOGA()),
      b([0.44, 0.012, 0.14], [0, H + 0.006, 0.08], CZERN()),
      ...ustaw(fotelBiurowy(), Math.PI, 0, D / 2 + 0.3),
    ]
    case 'wanna': return [b([W, H, D], [0, H / 2, 0], BIEL()), b([W - 0.16, 0.02, D - 0.16], [0, H - 0.05, 0], M.woda()), c(0.018, 0.018, 0.16, [-W / 2 + 0.2, H + 0.08, -D / 2 + 0.12], STAL())]
    case 'prysznic': return [b([W, 0.05, D], [0, 0.025, 0], BIEL()), b([0.012, H, D], [W / 2, H / 2, 0], M.szklo()), b([W, H, 0.012], [0, H / 2, D / 2], M.szklo()), c(0.012, 0.012, H, [-W / 2 + 0.08, H / 2, -D / 2 + 0.08], STAL()), c(0.1, 0.1, 0.02, [-W / 2 + 0.22, H - 0.02, -D / 2 + 0.22], STAL())]
    case 'wc': return [c(0.19, 0.15, 0.4, [0, 0.2, 0.08], BIEL()), c(0.2, 0.2, 0.03, [0, 0.415, 0.08], BIEL()), b([W, 0.4, 0.17], [0, 0.6, -D / 2 + 0.085], BIEL()), b([0.1, 0.012, 0.05], [0, 0.805, -D / 2 + 0.085], STAL())]
    case 'umywalka': return [b([W, 0.5, D - 0.04], [0, 0.55, -0.02], M.drewno('#b79a74')), b([W + 0.02, 0.09, D + 0.02], [0, 0.85, 0], BIEL()), b([W * 0.6, 0.02, D * 0.55], [0, 0.89, 0.02], M.gladki('#dfe6e9', 0.15)), c(0.014, 0.014, 0.18, [0, 0.98, -D / 2 + 0.08], STAL()), b([W, 0.8, 0.02], [0, 1.6, -D / 2 + 0.012], M.gladki('#cfdde4', 0.05, 0.9))]
    case 'pralka': return [b([W, H, D], [0, H / 2, 0], BIEL()), c(0.19, 0.19, 0.03, [0, H * 0.47, D / 2 + 0.01], CZERN(), [Math.PI / 2, 0, 0]), b([W - 0.04, 0.09, 0.012], [0, H - 0.07, D / 2], M.gladki('#d9dcdf', 0.4))]
    case 'kominek': return [b([W, H, D], [0, H / 2, 0], M.gladki(kolor, 0.9)), b([W * 0.62, 0.5, 0.03], [0, 0.6, D / 2], CZERN()), b([W * 0.5, 0.16, 0.02], [0, 0.44, D / 2 + 0.012], OGIEN)]
    case 'piec': return [b([W * 0.9, 1.15, D * 0.5], [0, 0.6, -D * 0.2], BIEL()), c(W * 0.36, W * 0.36, H, [0, H / 2, D * 0.2], M.gladki('#e3e6e8', 0.35, 0.3))]
    case 'auto': {
      const lak = M.gladki(kolor, 0.25, 0.6)
      return [
        b([W, 0.52, D * 0.97], [0, 0.56, 0], lak), b([W * 0.92, 0.2, D * 0.94], [0, 0.34, 0], NOGA()),
        b([W * 0.88, 0.46, D * 0.52], [0, 1.03, -D * 0.04], M.gladki('#1d2a35', 0.08, 0.6)), b([W * 0.86, 0.05, D * 0.46], [0, 1.28, -D * 0.04], lak),
        ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => c(0.33, 0.33, 0.22, [x * (W / 2 - 0.1), 0.33, z * D * 0.31], CZERN(), [0, 0, Math.PI / 2])),
        b([W * 0.7, 0.08, 0.02], [0, 0.62, D * 0.485], M.gladki('#f4f1e6', 0.1)), b([W * 0.7, 0.07, 0.02], [0, 0.64, -D * 0.485], M.gladki('#b3261e', 0.2)),
      ]
    }
    case 'regal': {
      const d = M.drewno(kolor)
      const cz: Cz[] = [b([W, H, 0.02], [0, H / 2, -D / 2 + 0.01], d), b([0.03, H, D], [-W / 2 + 0.015, H / 2, 0], d), b([0.03, H, D], [W / 2 - 0.015, H / 2, 0], d)]
      const barwy = ['#8d5a3b', '#3f5f7a', '#c7b08a', '#5c6b52', '#a3463c', '#d8d2c6', '#2f3a48']
      for (let i = 0; i <= 5; i++) {
        const y = 0.04 + (i * (H - 0.06)) / 5
        cz.push(b([W - 0.06, 0.025, D - 0.02], [0, y, 0.01], d))
        if (i < 5) for (let x = -W / 2 + 0.1; x < W / 2 - 0.2;) { const sz = 0.05 + r() * 0.2, wys = 0.2 + r() * 0.1; if (r() > 0.25) cz.push(b([sz, wys, D * 0.7], [x + sz / 2, y + 0.012 + wys / 2, 0], M.gladki(barwy[(r() * barwy.length) | 0], 0.8))); x += sz + 0.01 + (r() > 0.8 ? 0.2 : 0) }
      }
      return cz
    }
    case 'pianino': return [b([W, 1.12, D * 0.5], [0, 0.56, -D * 0.25], M.gladki(kolor, 0.12, 0.3)), b([W, 0.1, D * 0.45], [0, 0.68, D * 0.2], M.gladki(kolor, 0.12, 0.3)), b([W - 0.12, 0.02, 0.15], [0, 0.74, D * 0.3], M.gladki('#f5f3ec', 0.2)), b([0.06, 0.62, 0.06], [-W / 2 + 0.06, 0.31, D * 0.38], M.gladki(kolor, 0.12, 0.3)), b([0.06, 0.62, 0.06], [W / 2 - 0.06, 0.31, D * 0.38], M.gladki(kolor, 0.12, 0.3)), b([0.8, 0.07, 0.36], [0, 0.48, D / 2 + 0.36], M.tkanina('#2b2b2d')), ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => b([0.04, 0.45, 0.04], [x * 0.34, 0.225, D / 2 + 0.36 + z * 0.13], CZERN()))]
    case 'perkusja': {
      const beb = M.gladki(kolor, 0.3, 0.3), zl = M.gladki('#c9a44a', 0.25, 0.9), naciag = M.gladki('#efece4', 0.6)
      return [
        c(0.28, 0.28, 0.4, [0, 0.3, -0.1], beb, [Math.PI / 2, 0, 0]), c(0.285, 0.285, 0.01, [0, 0.3, 0.105], naciag, [Math.PI / 2, 0, 0]),
        c(0.18, 0.18, 0.15, [-0.42, 0.62, 0.3], beb), c(0.16, 0.16, 0.2, [-0.2, 0.86, -0.05], beb), c(0.17, 0.17, 0.22, [0.22, 0.86, -0.05], beb), c(0.2, 0.2, 0.4, [0.55, 0.5, 0.3], beb),
        c(0.2, 0.2, 0.012, [-0.66, 0.95, 0.1], zl), c(0.012, 0.012, 0.95, [-0.66, 0.475, 0.1], NOGA()), c(0.24, 0.24, 0.012, [0.7, 1.15, -0.2], zl), c(0.012, 0.012, 1.15, [0.7, 0.575, -0.2], NOGA()),
        c(0.17, 0.17, 0.06, [0, 0.5, 0.6], M.tkanina('#2b2b2d')), c(0.02, 0.02, 0.48, [0, 0.24, 0.6], NOGA()),
      ]
    }
    case 'bieznia': return [b([W * 0.82, 0.14, D * 0.8], [0, 0.12, D * 0.08], CZERN()), b([W * 0.6, 0.01, D * 0.72], [0, 0.195, D * 0.08], M.gladki('#3d4044', 0.9)), b([0.07, H, 0.07], [-W * 0.4, H / 2, -D * 0.34], NOGA(), [0.12, 0, 0]), b([0.07, H, 0.07], [W * 0.4, H / 2, -D * 0.34], NOGA(), [0.12, 0, 0]), b([W * 0.86, 0.24, 0.08], [0, H - 0.1, -D * 0.4], CZERN()), b([0.05, 0.05, D * 0.4], [-W * 0.4, H * 0.72, -D * 0.2], NOGA()), b([0.05, 0.05, D * 0.4], [W * 0.4, H * 0.72, -D * 0.2], NOGA())]
    case 'atlas': {
      const st = M.gladki(kolor, 0.4, 0.6)
      const cz: Cz[] = [...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => b([0.07, H, 0.07], [x * W * 0.42, H / 2, -D * 0.2 + z * D * 0.22], st)), b([W * 0.9, 0.07, 0.07], [0, H - 0.035, -D * 0.42], st), b([W * 0.9, 0.07, 0.07], [0, H - 0.035, D * 0.02], st), b([0.07, 0.07, D * 0.5], [0, H - 0.035, -D * 0.2], st)]
      for (let i = 0; i < 9; i++) cz.push(b([0.32, 0.055, 0.14], [0, 0.4 + i * 0.065, -D * 0.4], CZERN()))
      cz.push(b([0.36, 0.09, 1.1], [0, 0.48, D * 0.2], M.tkanina('#2b2b2d')), b([0.3, 0.34, 0.08], [0, 0.24, D * 0.35], st), b([0.3, 0.34, 0.08], [0, 0.24, D * 0.02], st), c(0.016, 0.016, W * 0.8, [0, 1.6, D * 0.02], STAL(), [0, 0, Math.PI / 2]))
      return cz
    }
    case 'lawka': {
      const cz: Cz[] = [b([0.36, 0.09, D * 0.9], [-W * 0.28, 0.47, 0], M.tkanina(kolor)), b([0.3, 0.42, 0.07], [-W * 0.28, 0.21, D * 0.3], NOGA()), b([0.3, 0.42, 0.07], [-W * 0.28, 0.21, -D * 0.3], NOGA()), b([0.5, 0.04, D * 0.8], [W * 0.26, 0.5, 0], NOGA()), b([0.5, 0.04, D * 0.8], [W * 0.26, 0.82, 0], NOGA()), ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => b([0.04, H, 0.04], [W * 0.26 + x * 0.23, H / 2, z * D * 0.38], NOGA()))]
      for (let i = 0; i < 5; i++) for (const y of [0.57, 0.89]) cz.push(c(0.055 + (y > 0.6 ? 0 : 0.015), 0.055 + (y > 0.6 ? 0 : 0.015), 0.34, [W * 0.26, y, -D * 0.32 + i * D * 0.16], CZERN(), [0, 0, Math.PI / 2]))
      return cz
    }
    case 'roslina': return [c(W * 0.36, W * 0.28, 0.42, [0, 0.21, 0], M.gladki('#d8d2c6', 0.8)), c(0.02, 0.03, H * 0.5, [0, 0.42 + H * 0.25, 0], M.gladki('#5b4632', 0.9)), k(W * 0.6, [0, H * 0.72, 0], M.liscie(kolor)), k(W * 0.42, [W * 0.25, H * 0.55, 0.1], M.liscie('#6fa055')), k(W * 0.4, [-W * 0.22, H * 0.6, -0.12], M.liscie('#4f8a3f'))]
    default: return [b([W, H, D], [0, H / 2, 0], M.gladki(kolor, 0.8))]
  }
}

export function MebelBryla({ m, baza }: { m: Mebel; baza: number }) {
  const kolor = MEBLE.find((x) => x.id === m.wzor)?.kolor ?? '#b9b9b9'
  const cz = useMemo(() => (m.wzor === 'schody' ? [] : czesci(m, kolor)), [m.wzor, m.szer, m.gl, m.wys, m.id, kolor])
  if (m.wzor === 'schody') {
    const n = 16
    return (
      <group position={[m.x, baza, -m.y]} rotation={[0, (m.obrot * Math.PI) / 180, 0]}>
        {Array.from({ length: n }, (_, i) => (
          <mesh key={i} position={[0, ((i + 1) * m.wys) / n / 2, m.gl / 2 - ((i + 0.5) * m.gl) / n]} material={M.drewno(kolor)} castShadow receiveShadow>
            <boxGeometry args={[m.szer, ((i + 1) * m.wys) / n, m.gl / n]} />
          </mesh>
        ))}
      </group>
    )
  }
  return (
    <group position={[m.x, baza, -m.y]} rotation={[0, (m.obrot * Math.PI) / 180, 0]}>
      {cz.map((q, i) => (
        <mesh key={i} position={q.p} rotation={q.r} material={q.m} castShadow receiveShadow>
          {q.t === 'b' ? <boxGeometry args={q.s} /> : q.t === 'c' ? <cylinderGeometry args={[q.s[0], q.s[1], q.s[2], 24]} /> : <icosahedronGeometry args={[q.s[0], 2]} />}
        </mesh>
      ))}
    </group>
  )
}
