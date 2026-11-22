import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Pt } from './uklad'

/**
 * Współrzędne tekstur z położenia w świecie, w metrach: rzut na płaszczyznę prostopadłą do dominującej osi normalnej.
 * Dzięki temu faktura ma ten sam rozmiar na każdej ścianie, podłodze i meblu.
 */
export function uvSwiata(g: THREE.BufferGeometry) {
  const p = g.attributes.position as THREE.BufferAttribute
  const n = g.attributes.normal as THREE.BufferAttribute
  const uv = new Float32Array(p.count * 2)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i))
    let u: number, v: number
    if (ay >= ax && ay >= az) { u = x; v = -z }
    else if (ax >= az) { u = n.getX(i) > 0 ? -z : z; v = y }
    else { u = n.getZ(i) > 0 ? x : -x; v = y }
    uv[i * 2] = u; uv[i * 2 + 1] = v
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}

const rad = (d: number) => (d * Math.PI) / 180

/** Zbiera geometrię według materiałów i scala ją w jeden bufor na materiał. */
export class Budowa {
  czesci = new Map<string, THREE.BufferGeometry[]>()

  dodaj(mat: string, geo: THREE.BufferGeometry, liczUV = true) {
    let q = geo.index ? geo.toNonIndexed() : geo
    if (q !== geo) geo.dispose()
    for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') q.deleteAttribute(k)
    if (!q.attributes.normal) q.computeVertexNormals()
    if (liczUV || !q.attributes.uv) uvSwiata(q)
    q.clearGroups()
    let l = this.czesci.get(mat)
    if (!l) { l = []; this.czesci.set(mat, l) }
    l.push(q)
  }

  /** Prostopadłościan wyrównany do osi, w układzie modelu. */
  pudlo(mat: string, x0: number, x1: number, y0: number, y1: number, h0: number, h1: number) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || h1 - h0 < 1e-4) return
    const g = new THREE.BoxGeometry(x1 - x0, h1 - h0, y1 - y0)
    g.translate((x0 + x1) / 2, (h0 + h1) / 2, -(y0 + y1) / 2)
    this.dodaj(mat, g)
  }

  /** Prostopadłościan o środku (cx, cy), wymiarach sx na sy, obrócony o kąt w stopniach przeciwnie do zegara. */
  pudloO(mat: string, cx: number, cy: number, sx: number, sy: number, h0: number, h1: number, obr = 0) {
    const g = new THREE.BoxGeometry(sx, h1 - h0, sy)
    if (obr) g.rotateY(rad(obr))
    g.translate(cx, (h0 + h1) / 2, -cy)
    this.dodaj(mat, g)
  }

  /** Prostopadłościan z zaokrąglonymi krawędziami (poduchy, materace, blaty). */
  zaokr(mat: string, cx: number, cy: number, sx: number, sy: number, h0: number, h1: number, r: number, obr = 0, seg = 3) {
    const rr = Math.min(r, sx / 2 - 1e-3, sy / 2 - 1e-3, (h1 - h0) / 2 - 1e-3)
    const g = new RoundedBoxGeometry(sx, h1 - h0, sy, seg, Math.max(rr, 0.001))
    if (obr) g.rotateY(rad(obr))
    g.translate(cx, (h0 + h1) / 2, -cy)
    this.dodaj(mat, g)
  }

  walec(mat: string, cx: number, cy: number, h0: number, h1: number, r0: number, r1 = r0, seg = 28) {
    const g = new THREE.CylinderGeometry(r1, r0, h1 - h0, seg)
    g.translate(cx, (h0 + h1) / 2, -cy)
    this.dodaj(mat, g)
  }

  kula(mat: string, cx: number, cy: number, h: number, r: number, sx = 1, sy = 1, sz = 1) {
    const g = new THREE.SphereGeometry(r, 24, 16)
    g.scale(sx, sz, sy)
    g.translate(cx, h, -cy)
    this.dodaj(mat, g)
  }

  /** Płyta z wielokąta w rzucie, od h0 do h1. Otwory to wielokąty wewnątrz. */
  plyta(mat: string, poly: Pt[], h0: number, h1: number, otwory: Pt[][] = []) {
    const s = new THREE.Shape()
    poly.forEach((q, i) => (i ? s.lineTo(q.x, q.y) : s.moveTo(q.x, q.y)))
    s.closePath()
    for (const o of otwory) {
      const h = new THREE.Path()
      o.forEach((q, i) => (i ? h.lineTo(q.x, q.y) : h.moveTo(q.x, q.y)))
      h.closePath()
      s.holes.push(h)
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: h1 - h0, bevelEnabled: false })
    g.rotateX(-Math.PI / 2)
    g.translate(0, h0, 0)
    this.dodaj(mat, g)
  }

  /** Dowolna geometria w układzie sceny z macierzą. */
  geo(mat: string, g: THREE.BufferGeometry, m?: THREE.Matrix4, liczUV = true) {
    if (m) g.applyMatrix4(m)
    this.dodaj(mat, g, liczUV)
  }

  /**
   * Graniastosłup z profilu w płaszczyźnie pionowej wzdłuż odcinka a-b.
   * Profil to wielokąt (u wzdłuż ściany, v wysokość), grubość t na prawo od osi przesuniętej o 'od'.
   */
  profil(mat: string, a: Pt, b: Pt, pts: [number, number][], t: number, od: number) {
    const dx = b.x - a.x, dy = b.y - a.y
    const L = Math.hypot(dx, dy)
    if (L < 1e-6 || pts.length < 3) return
    const d = { x: dx / L, y: dy / L }
    const s = new THREE.Shape()
    pts.forEach(([u, v], i) => (i ? s.lineTo(u, v) : s.moveTo(u, v)))
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false })
    const ex = new THREE.Vector3(d.x, 0, -d.y)
    const ey = new THREE.Vector3(0, 1, 0)
    const ez = new THREE.Vector3(d.y, 0, d.x)
    const m = new THREE.Matrix4().makeBasis(ex, ey, ez)
    const o = new THREE.Vector3(a.x, 0, -a.y).addScaledVector(ez, od)
    m.setPosition(o)
    g.applyMatrix4(m)
    this.dodaj(mat, g)
  }

  /** Bryła ośmiu wierzchołków: dolny i górny czworokąt (np. lamela ze skośnym wierzchem). */
  bryla8(mat: string, dol: THREE.Vector3[], gora: THREE.Vector3[]) {
    const v = [...dol, ...gora]
    const sciany = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]]
    const sr = new THREE.Vector3()
    v.forEach((q) => sr.add(q))
    sr.multiplyScalar(1 / 8)
    const poz: number[] = []
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), c = new THREE.Vector3()
    // Bryła wypukła: każdy trójkąt odwracam tak, by normalna patrzyła od środka.
    for (const [i, j, k] of sciany) {
      e1.subVectors(v[j], v[i]); e2.subVectors(v[k], v[i])
      c.copy(v[i]).add(v[j]).add(v[k]).multiplyScalar(1 / 3).sub(sr)
      const tri = e1.cross(e2).dot(c) >= 0 ? [v[i], v[j], v[k]] : [v[i], v[k], v[j]]
      for (const q of tri) poz.push(q.x, q.y, q.z)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3))
    g.computeVertexNormals()
    this.dodaj(mat, g)
  }

  scal(): { mat: string; geo: THREE.BufferGeometry }[] {
    const out: { mat: string; geo: THREE.BufferGeometry }[] = []
    for (const [mat, l] of this.czesci) {
      if (!l.length) continue
      const g = mergeGeometries(l, false)
      if (!g) continue
      g.computeBoundingSphere()
      out.push({ mat, geo: g })
      for (const q of l) q.dispose()
    }
    this.czesci.clear()
    return out
  }
}
