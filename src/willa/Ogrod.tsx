import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Budowa } from './budowa'
import { ATLASY, drzewo, kula, losowa, rozstaw, trawa, zywoplot, type Gatunek } from './drzewa'
import { lasWokolDzialki } from './las'
import { H_WODA, budujOgrod } from './nawierzchnie'
import { material, swiatlaSztuczne, tekstura } from './tekstury'
import { BASEN, DRZEWA } from './uklad'

function Zbudowane({ fn }: { fn: (b: Budowa) => void }) {
  const czesci = useMemo(() => { const b = new Budowa(); fn(b); return b.scal() }, [fn])
  useEffect(() => () => czesci.forEach((c) => c.geo.dispose()), [czesci])
  return <>{czesci.map((c) => <mesh key={c.mat} geometry={c.geo} material={material(c.mat)} castShadow={!['zwir', 'plyty', 'asfalt'].includes(c.mat)} receiveShadow />)}</>
}

const lisc = new Map<string, THREE.MeshStandardMaterial>()
function materialLisci(plik: string, kolor: string) {
  const k = plik + kolor
  let m = lisc.get(k)
  if (!m) {
    const t = tekstura(plik, true)
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
    m = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.72, color: kolor, envMapIntensity: 0.7 })
    m.name = 'liscie'
    lisc.set(k, m)
  }
  return m
}
const kory = new Map<string, THREE.MeshStandardMaterial>()
function materialKory(rodzaj: 'zwykla' | 'sosna' | 'brzoza') {
  let m = kory.get(rodzaj)
  if (!m) {
    const pliki = {
      zwykla: ['/willa/mod/jacaranda_tree/textures/jacaranda_tree_trunk_diff_1k.jpg', '/willa/mod/jacaranda_tree/textures/jacaranda_tree_trunk_nor_gl_1k.jpg'],
      sosna: ['/willa/liscie/pine_tree_01_bark_diff.jpg', '/willa/liscie/pine_tree_01_bark_nor_gl.jpg'],
      brzoza: ['/willa/liscie/kora_brzozy.jpg', '/willa/liscie/pine_tree_01_bark_nor_gl.jpg'],
    }[rodzaj]
    m = new THREE.MeshStandardMaterial({ map: tekstura(pliki[0], true), normalMap: tekstura(pliki[1], false), roughness: 0.9, color: rodzaj === 'sosna' ? '#d9a07a' : '#ffffff' })
    if (rodzaj === 'brzoza') m.normalScale.set(0.3, 0.3)
    kory.set(rodzaj, m)
  }
  return m
}

function Drzewa() {
  const grupy = useMemo(() => {
    const wg = new Map<string, { kora: THREE.BufferGeometry[]; liscie: THREE.BufferGeometry[]; atlas: string; koraRodz: 'zwykla' | 'sosna' | 'brzoza'; kolor: string; plik: string }>()
    DRZEWA.filter((d) => d.h > 0).forEach((d, i) => {
      const t = drzewo(d.gat, d.h, 1000 + i * 77)
      const m = new THREE.Matrix4().compose(new THREE.Vector3(d.x, 0, -d.y), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (d.obr ?? i * 1.3)), new THREE.Vector3(1, 1, 1))
      t.kora.applyMatrix4(m); t.liscie.applyMatrix4(m)
      const plik = d.gat === 'klon' ? '/willa/liscie/klon.png' : ATLASY[t.atlas].plik
      const kolor = { jesion: '#d6e2b8', brzoza: '#e6f0c8', sosna: '#a8b89a', klon: '#ffffff', klon_zielony: '#d9e8b0' }[d.gat]
      const klucz = d.gat
      let g = wg.get(klucz)
      if (!g) { g = { kora: [], liscie: [], atlas: t.atlas, koraRodz: d.gat === 'sosna' ? 'sosna' : d.gat === 'brzoza' ? 'brzoza' : 'zwykla', kolor, plik }; wg.set(klucz, g) }
      g.kora.push(t.kora); g.liscie.push(t.liscie)
    })
    return [...wg.entries()].map(([k, g]) => ({ k, kora: rozstaw(g.kora, g.kora.map(() => ({ x: 0, y: 0 }))), liscie: rozstaw(g.liscie, g.liscie.map(() => ({ x: 0, y: 0 }))), mk: materialKory(g.koraRodz), ml: materialLisci(g.plik, g.kolor) }))
  }, [])
  return <>{grupy.map((g) => <group key={g.k}><mesh geometry={g.kora} material={g.mk} castShadow receiveShadow /><mesh geometry={g.liscie} material={g.ml} castShadow receiveShadow /></group>)}</>
}

function Zywoploty() {
  const geo = useMemo(() => {
    const warianty = [0, 1, 2].map((i) => zywoplot(8, 0.9, 2.1, 50 + i))
    const poz: { x: number; y: number; obr: number }[] = []
    // zachodnia granica (od drogi dojazdowej)
    for (let y = 4.5; y < 110; y += 8) poz.push({ x: 0.75, y, obr: Math.PI / 2 })
    // wschodnia granica od apartamentu do placu
    for (let y = 24; y < 108; y += 8) poz.push({ x: 21.25 + (0.6 * (y - 1.5)) / 118.79, y, obr: Math.PI / 2 })
    return rozstaw(warianty, poz)
  }, [])
  const kule = useMemo(() => {
    const w = [0, 1, 2].map((i) => kula(0.42, 300 + i))
    const poz = [
      [3.7, 38.6], [3.7, 36.2], [10.9, 21.4], [9.9, 21.4], [4.1, 21.4], [3.5, 47.8], [3.5, 49.6],
      [5.2, 107.3], [15.6, 107.3], [1.9, 92.4], [1.7, 90.0],
    ].map(([x, y], i) => ({ x, y, obr: i, skala: 0.8 + (i % 3) * 0.2 }))
    return rozstaw(w, poz)
  }, [])
  return (
    <>
      <mesh geometry={geo} material={materialLisci(ATLASY.grab.plik, '#c9d8a8')} castShadow receiveShadow />
      <mesh geometry={kule} material={materialLisci(ATLASY.grab.plik, '#8fa878')} castShadow receiveShadow />
    </>
  )
}

const matTrawy = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.78 })
function Trawy() {
  const geo = useMemo(() => {
    const w = [0, 1, 2, 3].map((i) => trawa(1.0, 80, 500 + i, '#3f5a2a', '#9faa6a'))
    const rnd = losowa(9)
    const poz: { x: number; y: number; obr: number; skala: number }[] = []
    const pas = (x0: number, x1: number, y0: number, y1: number, krok: number) => {
      for (let y = y0; y < y1; y += krok) for (let x = x0; x < x1; x += krok) poz.push({ x: x + (rnd() - 0.5) * krok * 0.6, y: y + (rnd() - 0.5) * krok * 0.6, obr: rnd() * 6.3, skala: 0.75 + rnd() * 0.5 })
    }
    pas(1.6, 2.1, 89.5, 107.8, 0.55) // przy ścieżce wejściowej, od strony żywopłotu
    pas(1.5, 3.1, 22.0, 37.0, 0.6) // między żywopłotem a basenem
    pas(1.6, 4.6, 51.5, 63.0, 0.6) // zachodni ogród przy jadalni
    pas(8.4, 9.6, 1.0, 5.5, 0.55) // przy południowej granicy
    pas(11.0, 18.0, 1.5, 4.0, 0.6)
    return rozstaw(w, poz)
  }, [])
  return <mesh geometry={geo} material={matTrawy} castShadow receiveShadow />
}

/** Refleksy światła na dnie (kaustyka): sieć jasnych krawędzi komórek Voronoia, kafelkowana bez szwu. */
function plotnoKaustyki() {
  const N = 512, P = 46, rnd = losowa(4242)
  const pk = Array.from({ length: P }, () => [rnd() * N, rnd() * N])
  const c = document.createElement('canvas'); c.width = N; c.height = N
  const g = c.getContext('2d')!, im = g.createImageData(N, N)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let d1 = 1e9, d2 = 1e9
    for (const [px, py] of pk) {
      let dx = Math.abs(x - px), dy = Math.abs(y - py)
      if (dx > N / 2) dx = N - dx
      if (dy > N / 2) dy = N - dy
      const d = dx * dx + dy * dy
      if (d < d1) { d2 = d1; d1 = d } else if (d < d2) d2 = d
    }
    const e = Math.sqrt(d2) - Math.sqrt(d1)
    const v = Math.pow(Math.max(0, 1 - e / 7), 4.0)
    const i = (y * N + x) * 4
    im.data[i] = im.data[i + 1] = im.data[i + 2] = Math.round(255 * v); im.data[i + 3] = 255
  }
  g.putImageData(im, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

/** Miękka plama światła: jasna w środku, ciemniejsza w rogach (podświetlenie z lamp w ścianach). */
function plotnoPoswiaty(pion = false) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256
  const g = c.getContext('2d')!
  const gr = pion ? g.createLinearGradient(0, 256, 0, 0) : g.createLinearGradient(0, 0, 0, 256)
  if (pion) {
    gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.45, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0.25)')
  } else {
    gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0.55)')
  }
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256)
  const t = new THREE.CanvasTexture(c)
  return t
}

/** Woda w basenie: falująca normalna, przejrzysta, nocą podświetlona lampami w ścianach (poświata dna i ścian, kaustyka). */
function Woda() {
  const mat = useMemo(() => {
    const n = tekstura('/willa/tex/waternormals.jpg', false)
    const n2 = n.clone(); n2.repeat.set(0.35, 0.35)
    const m = new THREE.MeshPhysicalMaterial({ color: '#7fc4cf', metalness: 0, roughness: 0.03, transparent: true, opacity: 0.42, normalMap: n2, normalScale: new THREE.Vector2(0.25, 0.25), envMapIntensity: 1.3, ior: 1.33, depthWrite: false })
    return m
  }, [])
  const sx = BASEN.x1 - BASEN.x0, sy = BASEN.y1 - BASEN.y0
  const cx = (BASEN.x0 + BASEN.x1) / 2, cy = (BASEN.y0 + BASEN.y1) / 2
  const dno = H_WODA - 1.38
  const m = useMemo(() => {
    const kaust = plotnoKaustyki()
    const k1 = kaust.clone(); k1.repeat.set(sx / 1.5, sy / 1.5)
    const k2 = kaust.clone(); k2.repeat.set(sx / 2.1, sy / 2.1)
    const pDno = plotnoPoswiaty(false), pSciana = plotnoPoswiaty(true)
    const dodaj = (o: THREE.MeshBasicMaterialParameters) => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending, ...o })
    return {
      dno: dodaj({ map: pDno, color: new THREE.Color(0.03, 0.40, 0.62) }),
      k1: dodaj({ map: k1, color: new THREE.Color(0.18, 0.75, 1.0) }),
      k2: dodaj({ map: k2, color: new THREE.Color(0.12, 0.6, 0.9) }),
      sciana: dodaj({ map: pSciana, color: new THREE.Color(0.02, 0.30, 0.50), side: THREE.DoubleSide }),
      lampa: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 3.4, 4.6), toneMapped: false, transparent: true, opacity: 0 }),
    }
  }, [sx, sy])
  useFrame((_, dt) => {
    const t = mat.normalMap!
    t.offset.x += dt * 0.012; t.offset.y += dt * 0.008
    const s = swiatlaSztuczne.moc
    m.dno.opacity = 0.95 * s
    m.k1.opacity = 0.26 * s; m.k2.opacity = 0.18 * s
    m.sciana.opacity = 0.85 * s
    m.lampa.opacity = s
    m.k1.map!.offset.x += dt * 0.035; m.k1.map!.offset.y += dt * 0.022
    m.k2.map!.offset.x -= dt * 0.026; m.k2.map!.offset.y += dt * 0.031
    // nocą powierzchnia przepuszcza więcej światła z dna
    mat.opacity = 0.42 - 0.14 * s
  })
  // lampy w dłuższych ścianach co ok. 3,1 m, 0,45 m pod lustrem wody
  const lampy: [number, number, number][] = []
  for (let i = 0; i < 5; i++) {
    const y = BASEN.y0 + sy * (i + 0.5) / 5
    lampy.push([BASEN.x0 + 0.012, y, Math.PI / 2], [BASEN.x1 - 0.012, y, -Math.PI / 2])
  }
  const glab = H_WODA - dno
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, H_WODA, -cy]} material={mat} renderOrder={3}>
        <planeGeometry args={[sx, sy, 1, 1]} />
      </mesh>
      {/* poświata dna nocą i refleksy światła */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[cx, dno, -cy]} material={m.dno} renderOrder={1}>
        <planeGeometry args={[sy - 0.1, sx - 0.1]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, dno + 0.01, -cy]} material={m.k1} renderOrder={2}>
        <planeGeometry args={[sx - 0.1, sy - 0.1]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, dno + 0.015, -cy]} material={m.k2} renderOrder={2}>
        <planeGeometry args={[sx - 0.1, sy - 0.1]} />
      </mesh>
      {/* ściany podświetlone od lamp */}
      {[[BASEN.x0 + 0.01, Math.PI / 2, sy], [BASEN.x1 - 0.01, -Math.PI / 2, sy]].map(([x, r, d], i) => (
        <mesh key={`s${i}`} position={[x as number, dno + glab / 2, -cy]} rotation={[0, r as number, 0]} material={m.sciana} renderOrder={1}>
          <planeGeometry args={[d as number, glab]} />
        </mesh>
      ))}
      {[[BASEN.y0 + 0.01, 0, sx], [BASEN.y1 - 0.01, Math.PI, sx]].map(([y, r, d], i) => (
        <mesh key={`k${i}`} position={[cx, dno + glab / 2, -(y as number)]} rotation={[0, r as number, 0]} material={m.sciana} renderOrder={1}>
          <planeGeometry args={[d as number, glab]} />
        </mesh>
      ))}
      {lampy.map(([x, y, r], i) => (
        <mesh key={`l${i}`} position={[x, H_WODA - 0.45, -y]} rotation={[0, r, 0]} material={m.lampa} renderOrder={2}>
          <circleGeometry args={[0.09, 24]} />
        </mesh>
      ))}
    </group>
  )
}

/** Las wokół działki: kępy drzew rozstawione z szumu (src/willa/las.ts). */
function Las() {
  const pkt = useMemo(() => lasWokolDzialki(), [])
  const grupy = useMemo(() => {
    if (!pkt) return null
    const sos = [0, 1, 2].map((i) => drzewo('sosna', 17 + i * 3, 9000 + i, true))
    const lis = [0, 1].map((i) => drzewo('jesion', 14 + i * 3, 9100 + i, true))
    const rnd = losowa(77)
    const ps = pkt.filter((p) => p[2] === 1).map((p) => ({ x: p[0] + (rnd() - 0.5) * 2, y: p[1] + (rnd() - 0.5) * 2, obr: rnd() * 6.28, skala: 0.85 + rnd() * 0.35 }))
    const pl = pkt.filter((p) => p[2] === 0).map((p) => ({ x: p[0] + (rnd() - 0.5) * 2, y: p[1] + (rnd() - 0.5) * 2, obr: rnd() * 6.28, skala: 0.8 + rnd() * 0.4 }))
    return {
      sk: rozstaw(sos.map((d) => d.kora), ps), sl: rozstaw(sos.map((d) => d.liscie), ps),
      lk: rozstaw(lis.map((d) => d.kora), pl), ll: rozstaw(lis.map((d) => d.liscie), pl),
    }
  }, [pkt])
  if (!grupy) return null
  return (
    <>
      <mesh geometry={grupy.sk} material={materialKory('sosna')} receiveShadow />
      <mesh geometry={grupy.sl} material={materialLisci(ATLASY.swierk.plik, '#93a487')} receiveShadow />
      <mesh geometry={grupy.lk} material={materialKory('zwykla')} receiveShadow />
      <mesh geometry={grupy.ll} material={materialLisci(ATLASY.jesion.plik, '#c3d0a6')} receiveShadow />
    </>
  )
}

export function Ogrod() {
  return (
    <>
      <Zbudowane fn={budujOgrod} />
      <Woda />
      <Drzewa />
      <Zywoploty />
      <Trawy />
      <Las />
    </>
  )
}
