import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Generator drzew: pień i gałęzie jako zwężające się rurki, liście jako karty z atlasu z przezroczystością.

export function losowa(ziarno: number) {
  let a = ziarno >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Komorka = [number, number, number, number] // u0, v0, u1, v1 w układzie tekstury three (v od dołu)
/** Atlasy liści: komórki i strona, z której wyrasta ogonek. */
export const ATLASY = {
  jesion: { plik: '/willa/liscie/jesion.png', komorki: [[0.162, 1 - 0.473, 0.988, 1 - 0.025], [0.246, 1 - 0.996, 1.0, 1 - 0.59], [0.0, 1 - 0.695, 0.43, 1 - 0.326]] as Komorka[], baza: 'lewo' as const },
  swierk: { plik: '/willa/liscie/swierk.png', komorki: [[0.314, 1 - 0.775, 0.639, 1 - 0.402], [0.635, 1 - 0.83, 0.949, 1 - 0.459], [0.654, 1 - 0.369, 0.938, 1 - 0.055], [0.193, 1 - 0.312, 0.43, 1 - 0.047]] as Komorka[], baza: 'dol' as const },
  brzoza: { plik: '/willa/liscie/brzoza.png', komorki: [[0.0, 0.0, 0.5, 1.0], [0.5, 0.0, 1.0, 1.0]] as Komorka[], baza: 'dol' as const },
  grab: { plik: '/willa/liscie/grab.png', komorki: [[0, 0.5, 0.5, 1], [0.5, 0.5, 1, 1], [0, 0, 0.5, 0.5], [0.5, 0, 1, 0.5]] as Komorka[], baza: 'srodek' as const },
}
export type Atlas = keyof typeof ATLASY

type V = THREE.Vector3

/** Rurka wzdłuż łamanej z promieniem malejącym od r0 do r1. */
function rurka(pts: V[], r0: number, r1: number, boki: number, out: { poz: number[]; nor: number[]; uv: number[]; ind: number[] }, dlUV = 1.2) {
  const n = pts.length
  const baza = out.poz.length / 3
  const styczne: V[] = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]
    return b.clone().sub(a).normalize()
  })
  // Rama przenoszona równolegle wzdłuż rurki: bez skręcania kory.
  const pom = Math.abs(styczne[0].y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  let nn = new THREE.Vector3().crossVectors(styczne[0], pom).normalize()
  let dl = 0
  for (let i = 0; i < n; i++) {
    if (i) dl += pts[i].distanceTo(pts[i - 1])
    const t = styczne[i]
    nn = nn.clone().addScaledVector(t, -t.dot(nn)).normalize()
    const bb = new THREE.Vector3().crossVectors(t, nn).normalize()
    const r = r0 + (r1 - r0) * (i / (n - 1))
    for (let k = 0; k <= boki; k++) {
      const a = (k / boki) * Math.PI * 2
      const kier = nn.clone().multiplyScalar(Math.cos(a)).addScaledVector(bb, Math.sin(a))
      const p = pts[i].clone().addScaledVector(kier, r)
      out.poz.push(p.x, p.y, p.z)
      out.nor.push(kier.x, kier.y, kier.z)
      out.uv.push((k / boki) * Math.max(1, Math.round(r * 2 * Math.PI / 0.35)), dl / dlUV)
    }
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < boki; k++) {
    const a = baza + i * (boki + 1) + k, b = a + boki + 1
    out.ind.push(a, b, a + 1, b, b + 1, a + 1)
  }
}

function geometria(o: { poz: number[]; nor: number[]; uv: number[]; ind: number[] }) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(o.poz, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(o.nor, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2))
  g.setIndex(o.ind)
  return g
}

/** Karta liścia: punkt zaczepienia, kierunek wzrostu, rozmiar, komórka atlasu. Normalne wygięte od środka korony. */
function karta(o: { poz: number[]; nor: number[]; uv: number[]; ind: number[] }, zacz: V, kier: V, szer: number, dl: number, c: Komorka, baza: 'lewo' | 'dol' | 'srodek', srodek: V, rnd: () => number, przegiecie = 0.75) {
  const k = kier.clone().normalize()
  // oś poprzeczna karty: losowy obrót wokół kierunku wzrostu, z przewagą płaszczyzn poziomych
  let bok = new THREE.Vector3().crossVectors(k, new THREE.Vector3(0, 1, 0))
  if (bok.lengthSq() < 1e-4) bok.set(1, 0, 0)
  bok.normalize().applyAxisAngle(k, (rnd() - 0.5) * 1.6)
  const pts: V[] = []
  const odL = baza === 'srodek' ? -dl / 2 : 0
  for (const [s, t] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]]) {
    pts.push(zacz.clone().addScaledVector(k, odL + t * dl).addScaledVector(bok, s * szer))
  }
  const nKarty = new THREE.Vector3().crossVectors(bok, k).normalize()
  const b0 = o.poz.length / 3
  for (const p of pts) {
    const zew = p.clone().sub(srodek).normalize()
    const n = nKarty.clone().multiplyScalar(nKarty.dot(zew) < 0 ? -1 : 1).lerp(zew, przegiecie).normalize()
    o.poz.push(p.x, p.y, p.z)
    o.nor.push(n.x, n.y, n.z)
  }
  // współrzędne tekstury: dla 'lewo' ogonek na lewej krawędzi komórki, kierunek wzrostu wzdłuż u
  const [u0, v0, u1, v1] = c
  if (baza === 'lewo') o.uv.push(u0, v1, u0, v0, u1, v0, u1, v1)
  else o.uv.push(u0, v0, u1, v0, u1, v1, u0, v1)
  o.ind.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3)
}

export type Gatunek = 'jesion' | 'brzoza' | 'sosna' | 'klon' | 'klon_zielony'

export type Drzewo = { kora: THREE.BufferGeometry; liscie: THREE.BufferGeometry; atlas: Atlas }

/** Jedno drzewo w układzie lokalnym (podstawa w 0,0,0), wysokość h. */
export function drzewo(gat: Gatunek, h: number, ziarno: number, uproszczone = false): Drzewo {
  const rnd = losowa(ziarno)
  const kora = { poz: [] as number[], nor: [] as number[], uv: [] as number[], ind: [] as number[] }
  const lis = { poz: [] as number[], nor: [] as number[], uv: [] as number[], ind: [] as number[] }
  const atlas: Atlas = gat === 'brzoza' ? 'brzoza' : gat === 'sosna' ? 'swierk' : 'jesion'
  const A = ATLASY[atlas]
  const kom = () => A.komorki[Math.floor(rnd() * A.komorki.length)]
  const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

  // Parametry gatunków.
  const P = {
    jesion: { pnie: 1, pienH: 0.32, r: 0.026 * h, korona: [0.42, 0.5], galezie: 16, kat: [25, 70], gesc: 7, lisc: [0.45, 0.75], zwis: 0.1 },
    brzoza: { pnie: rnd() < 0.5 ? 3 : 1, pienH: 0.3, r: 0.011 * h, korona: [0.2, 0.62], galezie: 20, kat: [20, 55], gesc: 6, lisc: [0.55, 0.95], zwis: 0.9 },
    sosna: { pnie: 1, pienH: 0.6, r: 0.02 * h, korona: [0.21, 0.3], galezie: 30, kat: [50, 88], gesc: 13, lisc: [0.75, 1.25], zwis: 0 },
    klon: { pnie: 4, pienH: 0.12, r: 0.03 * h, korona: [0.62, 0.55], galezie: 10, kat: [55, 85], gesc: 9, lisc: [0.22, 0.38], zwis: 0.05 },
    klon_zielony: { pnie: 3, pienH: 0.18, r: 0.026 * h, korona: [0.5, 0.55], galezie: 10, kat: [45, 80], gesc: 8, lisc: [0.25, 0.4], zwis: 0.05 },
  }[gat]
  // Drzewa lasu w tle: mniej gałęzi i liści, większe karty.
  if (uproszczone) { P.galezie = Math.round(P.galezie * 0.6); P.gesc = Math.max(4, Math.round(P.gesc * 0.55)); P.lisc = [P.lisc[0] * 1.8, P.lisc[1] * 1.8]; P.korona = [P.korona[0] * 1.15, P.korona[1]] }

  const srodek = V3(0, h * (P.pienH + (1 - P.pienH) / 2), 0)
  const promienKorony = h * P.korona[0]
  for (let ip = 0; ip < P.pnie; ip++) {
    // Pień: lekko krzywy, przy wielu pniach rozchylony.
    const azP = rnd() * Math.PI * 2
    const roz = P.pnie > 1 ? 0.12 + rnd() * 0.12 : 0.02
    const hP = h * (P.pnie > 1 ? 0.82 + rnd() * 0.15 : 0.97)
    const pien: V[] = []
    const seg = 10
    for (let i = 0; i <= seg; i++) {
      const t = i / seg
      const odch = roz * t * hP
      pien.push(V3(Math.cos(azP) * odch + (rnd() - 0.5) * 0.04 * h * t, t * hP, Math.sin(azP) * odch + (rnd() - 0.5) * 0.04 * h * t))
    }
    const rP = P.r * (P.pnie > 1 ? 0.62 : 1)
    rurka(pien, rP, rP * 0.12, 10, kora, gat === 'brzoza' ? 1.0 : 1.4)
    // Gałęzie główne.
    const ile = Math.round(P.galezie / Math.sqrt(P.pnie))
    for (let ig = 0; ig < ile; ig++) {
      const t = P.pienH + (1 - P.pienH) * (0.05 + 0.85 * (ig / ile)) + (rnd() - 0.5) * 0.05
      const i0 = Math.min(seg - 1, Math.floor(t * seg))
      const start = pien[i0].clone().lerp(pien[i0 + 1], t * seg - i0)
      const az = ig * 2.39996 + rnd() * 0.6 + azP
      const wysT = (start.y - h * P.pienH) / (h * (1 - P.pienH))
      const kat = THREE.MathUtils.degToRad(P.kat[1] - (P.kat[1] - P.kat[0]) * (1 - wysT) + (rnd() - 0.5) * 12)
      const kier = V3(Math.cos(az) * Math.sin(kat), Math.cos(kat), Math.sin(az) * Math.sin(kat))
      // długość tak, by koniec trafił w obrys korony (elipsoida)
      const ry = h * (1 - P.pienH) / 2, rx = promienKorony
      let dl = 0.3
      for (; dl < h; dl += 0.15) {
        const e = start.clone().addScaledVector(kier, dl).sub(srodek)
        if ((e.x * e.x + e.z * e.z) / (rx * rx) + (e.y * e.y) / (ry * ry) > 0.95) break
      }
      dl *= 0.75 + rnd() * 0.3
      if (gat === 'sosna') dl *= 0.62
      const pkt: V[] = []
      const n = 6
      for (let i = 0; i <= n; i++) {
        const s = i / n
        const p = start.clone().addScaledVector(kier, s * dl)
        p.y -= P.zwis * s * s * dl * 0.25
        p.y += (gat === 'sosna' ? 0.1 : 0.05) * Math.sin(s * Math.PI) * dl
        pkt.push(p)
      }
      const rG = rP * (0.42 - 0.2 * wysT)
      rurka(pkt, rG, rG * 0.2, 6, kora, 1.2)
      // Gałązki boczne z liśćmi.
      const ileG = Math.max(3, Math.round(dl * (gat === 'sosna' ? 2.2 : 3.2)))
      for (let j = 0; j < ileG; j++) {
        const s = 0.3 + 0.7 * (j / ileG) + rnd() * 0.05
        const ia = Math.min(n - 1, Math.floor(s * n))
        const p0 = pkt[ia].clone().lerp(pkt[ia + 1], s * n - ia)
        const kG = kier.clone().applyAxisAngle(V3(0, 1, 0), (rnd() - 0.5) * 2.2)
        kG.y += gat === 'brzoza' ? -0.6 : gat === 'sosna' ? 0.05 : 0.25
        kG.normalize()
        const dG = (0.35 + rnd() * 0.6) * (gat === 'klon' || gat === 'klon_zielony' ? 0.6 : 1) * Math.min(1.6, dl * 0.45)
        const p1 = p0.clone().addScaledVector(kG, dG)
        rurka([p0, p0.clone().lerp(p1, 0.5), p1], rG * 0.35, rG * 0.08, 4, kora)
        // Liście wzdłuż gałązki i na końcu.
        for (let q = 0; q < P.gesc; q++) {
          const u = 0.25 + 0.75 * rnd()
          const pz = p0.clone().lerp(p1, u)
          let kl = kG.clone().applyAxisAngle(V3(0, 1, 0), (rnd() - 0.5) * 2.6)
          if (gat === 'brzoza') kl = V3((rnd() - 0.5) * 0.4, -1, (rnd() - 0.5) * 0.4)
          else kl.y += (rnd() - 0.3) * 0.8
          if (gat === 'sosna') kl.y = 0.2 + rnd() * 0.6
          const dlL = P.lisc[0] + rnd() * (P.lisc[1] - P.lisc[0])
          const c = kom()
          const prop = (c[2] - c[0]) / (c[3] - c[1])
          const [szer, dlug] = A.baza === 'lewo' ? [dlL / prop, dlL] : [dlL * prop, dlL]
          karta(lis, pz, kl, szer, dlug, c, A.baza, srodek, rnd, gat === 'sosna' ? 0.55 : 0.75)
        }
      }
      // pęk na końcu gałęzi
      for (let q = 0; q < P.gesc; q++) {
        const kl = kier.clone().add(V3((rnd() - 0.5) * 1.4, (rnd() - 0.2) * 1.2, (rnd() - 0.5) * 1.4)).normalize()
        if (gat === 'brzoza') kl.set((rnd() - 0.5) * 0.4, -1, (rnd() - 0.5) * 0.4)
        const dlL = P.lisc[0] + rnd() * (P.lisc[1] - P.lisc[0])
        const c = kom()
        const prop = (c[2] - c[0]) / (c[3] - c[1])
        const [szer, dlug] = A.baza === 'lewo' ? [dlL / prop, dlL] : [dlL * prop, dlL]
        karta(lis, pkt[n], kl, szer, dlug, c, A.baza, srodek, rnd)
      }
    }
  }
  return { kora: geometria(kora), liscie: geometria(lis), atlas }
}

/** Żywopłot: prostopadłościan wypełniony kartami liści grabu na całej powierzchni. */
export function zywoplot(dl: number, gl: number, h: number, ziarno: number, gestosc = 26) {
  const rnd = losowa(ziarno)
  const lis = { poz: [] as number[], nor: [] as number[], uv: [] as number[], ind: [] as number[] }
  const A = ATLASY.grab
  const pow = 2 * dl * h + dl * gl + 2 * gl * h
  const ile = Math.round(pow * gestosc)
  const srodek = new THREE.Vector3(0, h * 0.4, 0)
  for (let i = 0; i < ile; i++) {
    // losowy punkt na powierzchni (bez spodu), lekko wgłąb
    let r = rnd() * pow, p: THREE.Vector3, n: THREE.Vector3
    const w = 0.06 + rnd() * 0.12
    if ((r -= dl * h) < 0) { p = new THREE.Vector3((rnd() - 0.5) * dl, rnd() * h, gl / 2 - w); n = new THREE.Vector3(0, 0, 1) }
    else if ((r -= dl * h) < 0) { p = new THREE.Vector3((rnd() - 0.5) * dl, rnd() * h, -gl / 2 + w); n = new THREE.Vector3(0, 0, -1) }
    else if ((r -= dl * gl) < 0) { p = new THREE.Vector3((rnd() - 0.5) * dl, h - w, (rnd() - 0.5) * gl); n = new THREE.Vector3(0, 1, 0) }
    else { const s = rnd() < 0.5 ? -1 : 1; p = new THREE.Vector3(s * (dl / 2 - w), rnd() * h, (rnd() - 0.5) * gl); n = new THREE.Vector3(s, 0, 0) }
    const kier = n.clone().add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(1.6)).normalize()
    const s = 0.32 + rnd() * 0.22
    karta(lis, p, kier, s, s, A.komorki[Math.floor(rnd() * 4)], 'srodek', srodek, rnd, 0.5)
  }
  return geometria(lis)
}

/** Kula strzyżonego bukszpanu. */
export function kula(r: number, ziarno: number) {
  const rnd = losowa(ziarno)
  const lis = { poz: [] as number[], nor: [] as number[], uv: [] as number[], ind: [] as number[] }
  const ile = Math.round(4 * Math.PI * r * r * 70)
  const srodek = new THREE.Vector3(0, r, 0)
  for (let i = 0; i < ile; i++) {
    const n = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize()
    if (n.y < -0.4) continue
    const p = srodek.clone().addScaledVector(n, r * (0.86 + rnd() * 0.12))
    const kier = n.clone().add(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5)).normalize()
    const s = 0.12 + rnd() * 0.1
    karta(lis, p, kier, s, s, ATLASY.grab.komorki[Math.floor(rnd() * 4)], 'srodek', srodek, rnd, 0.7)
  }
  return geometria(lis)
}

/** Kępa trawy ozdobnej: wąskie, łukowate źdźbła z kolorem od zielonego do słomkowego. */
export function trawa(h: number, ile: number, ziarno: number, kolorDol: string, kolorGora: string, kwiaty = true) {
  const rnd = losowa(ziarno)
  const poz: number[] = [], nor: number[] = [], kol: number[] = [], ind: number[] = []
  const cD = new THREE.Color(kolorDol), cG = new THREE.Color(kolorGora)
  for (let i = 0; i < ile; i++) {
    const az = rnd() * Math.PI * 2
    const nach = 0.15 + rnd() * 0.55
    const hh = h * (0.6 + rnd() * 0.5)
    const sz = 0.012 + rnd() * 0.01
    const x0 = (rnd() - 0.5) * 0.12, z0 = (rnd() - 0.5) * 0.12
    const dx = Math.cos(az), dz = Math.sin(az)
    const b0 = poz.length / 3
    const seg = 5
    for (let s = 0; s <= seg; s++) {
      const t = s / seg
      const wyg = nach * t * t * hh
      const x = x0 + dx * wyg, z = z0 + dz * wyg, y = hh * t * (1 - 0.2 * nach * t)
      const w = sz * (1 - t * 0.9)
      poz.push(x - dz * w, y, z + dx * w, x + dz * w, y, z - dx * w)
      const n = new THREE.Vector3(dx * 0.4, 0.8, dz * 0.4).normalize()
      nor.push(n.x, n.y, n.z, n.x, n.y, n.z)
      const c = cD.clone().lerp(cG, Math.pow(t, 1.3) * (0.7 + rnd() * 0.3))
      kol.push(c.r, c.g, c.b, c.r, c.g, c.b)
      if (s < seg) ind.push(b0 + s * 2, b0 + s * 2 + 1, b0 + s * 2 + 2, b0 + s * 2 + 1, b0 + s * 2 + 3, b0 + s * 2 + 2)
    }
  }
  if (kwiaty) {
    // wiechy na szczytach części źdźbeł
    for (let i = 0; i < ile / 14; i++) {
      const az = rnd() * Math.PI * 2, hh = h * (1.0 + rnd() * 0.3), nach = 0.1 + rnd() * 0.3
      const b0 = poz.length / 3
      const x = Math.cos(az) * nach * hh * 0.5, z = Math.sin(az) * nach * hh * 0.5
      const w = 0.03
      const c = new THREE.Color('#b8a983')
      poz.push(x - w, hh * 0.78, z, x + w, hh * 0.78, z, x + w * 0.2, hh, z, x - w * 0.2, hh, z)
      for (let k = 0; k < 4; k++) { nor.push(0, 1, 0); kol.push(c.r, c.g, c.b) }
      ind.push(b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(kol, 3))
  g.setIndex(ind)
  return g
}

/** Scala geometrie z przesunięciem i obrotem każdej kopii. */
export function rozstaw(geo: THREE.BufferGeometry[], pozycje: { x: number; y: number; h?: number; obr?: number; skala?: number }[]) {
  const out: THREE.BufferGeometry[] = []
  pozycje.forEach((p, i) => {
    const g = geo[i % geo.length].clone()
    const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.h ?? 0, -p.y), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.obr ?? 0), new THREE.Vector3(p.skala ?? 1, p.skala ?? 1, p.skala ?? 1))
    g.applyMatrix4(m)
    out.push(g)
  })
  const w = mergeGeometries(out, false)
  out.forEach((g) => g.dispose())
  return w!
}
