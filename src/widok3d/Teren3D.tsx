// Elementy działki w widoku 3D: nawierzchnie, tarasy, zieleń, woda, pergola, ogrodzenie.

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { TEREN, WYSPA_RONDA } from '../model/katalog'
import type { ElementTerenu, Projekt } from '../model/typy'
import { K, M, los, pudlo } from './materialy'

type V3 = [number, number, number]

/** Pudełko z fakturą w skali rzeczywistej. */
export function Pudlo({ args, kafel = 1, material, position, rotation, cien = true }: { args: V3; kafel?: number; material: THREE.Material; position?: V3; rotation?: V3; cien?: boolean }) {
  const geo = useMemo(() => pudlo(args[0], args[1], args[2], kafel), [args[0], args[1], args[2], kafel])
  useEffect(() => () => geo.dispose(), [geo])
  return <mesh geometry={geo} material={material} position={position} rotation={rotation} castShadow={cien} receiveShadow />
}

const ziarnoZ = (id: string) => id.split('').reduce((a, z) => (a * 31 + z.charCodeAt(0)) | 0, 7)

/** Korona drzewa: kula z nieregularnymi wybrzuszeniami. */
function korona(r: number, ziarno: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, 22, 16)
  const rnd = los(ziarno)
  const garby = Array.from({ length: 9 }, () => ({ d: new THREE.Vector3(rnd() * 2 - 1, rnd() * 1.5 - 0.5, rnd() * 2 - 1).normalize(), a: 0.14 + rnd() * 0.22 }))
  const p = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize()
    let s = 0.86
    for (const q of garby) s += q.a * Math.max(0, v.dot(q.d)) ** 3
    v.multiplyScalar(r * s)
    if (v.y < -0.35 * r) v.y = -0.35 * r + (v.y + 0.35 * r) * 0.45
    p.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

function Drzewo({ e }: { e: ElementTerenu }) {
  const r = e.szer / 2
  const cz = useMemo(() => {
    const z = ziarnoZ(e.id), rnd = los(z)
    const barwy = ['#557f3f', '#5f8f4a', '#6c9a52', '#4d7639']
    const kule = [{ p: [0, 0, 0] as V3, r: r * 0.86, b: barwy[0] }]
    for (let i = 0; i < 4; i++) {
      const a = rnd() * 6.3, d = r * (0.35 + rnd() * 0.3)
      kule.push({ p: [Math.cos(a) * d, r * (rnd() * 0.5 - 0.1), Math.sin(a) * d], r: r * (0.45 + rnd() * 0.22), b: barwy[1 + (i % 3)] })
    }
    return kule.map((q, i) => ({ ...q, g: korona(q.r, z + i * 17) }))
  }, [e.id, r])
  useEffect(() => () => cz.forEach((q) => q.g.dispose()), [cz])
  const pien = Math.max(2.2, r * 0.9)
  return (
    <group position={[e.x, 0, -e.y]}>
      <mesh position={[0, pien / 2, 0]} material={M.gladki('#5a4633', 1)} castShadow><cylinderGeometry args={[Math.max(0.08, r * 0.045), Math.max(0.12, r * 0.075), pien, 10]} /></mesh>
      {cz.map((q, i) => <mesh key={i} geometry={q.g} material={M.liscie(q.b)} position={[q.p[0], pien + r * 0.55 + q.p[1], q.p[2]]} castShadow receiveShadow />)}
    </group>
  )
}

function Rabata({ e }: { e: ElementTerenu }) {
  const krzewy = useMemo(() => {
    const rnd = los(ziarnoZ(e.id))
    const barwy = ['#5f8f4a', '#6fa055', '#4d7639', '#7aa85e', '#b0559a', '#e6e2d5', '#8a6fb5']
    const n = Math.min(40, Math.max(3, Math.round(e.szer * e.gl * 0.9)))
    return Array.from({ length: n }, () => ({ x: (rnd() - 0.5) * (e.szer - 0.5), z: (rnd() - 0.5) * (e.gl - 0.5), r: 0.18 + rnd() * 0.3, b: barwy[(rnd() * barwy.length) | 0] }))
  }, [e.id, e.szer, e.gl])
  return (
    <group position={[e.x, 0, -e.y]} rotation={[0, (e.obrot * Math.PI) / 180, 0]}>
      <Pudlo args={[e.szer, 0.08, e.gl]} material={M.gladki('#4a3b2e', 1)} position={[0, 0.04, 0]} cien={false} />
      {krzewy.map((q, i) => <mesh key={i} position={[q.x, 0.08 + q.r * 0.7, q.z]} scale={[1, 0.8, 1]} material={M.liscie(q.b)} castShadow receiveShadow><icosahedronGeometry args={[q.r, 1]} /></mesh>)}
    </group>
  )
}

function Element({ e }: { e: ElementTerenu }) {
  const w = TEREN[e.rodzaj]
  const obrot = (e.obrot * Math.PI) / 180
  const poz: V3 = [e.x, 0, -e.y]
  const ciemny = M.gladki('#2c2a27', 0.7)

  if (e.rodzaj === 'drzewo') return <Drzewo e={e} />
  if (e.rodzaj === 'trawnik') return <Rabata e={e} />
  if (e.rodzaj === 'rondo') {
    const r = e.szer / 2, ri = r * WYSPA_RONDA
    return (
      <group position={poz}>
        <mesh position={[0, 0.03, 0]} material={M.kostka(w.kolor)} receiveShadow><cylinderGeometry args={[r, r, 0.06, 72]} /></mesh>
        <mesh position={[0, 0.07, 0]} material={M.gladki('#9b978f', 0.9)} receiveShadow castShadow><cylinderGeometry args={[ri + 0.14, ri + 0.14, 0.14, 48]} /></mesh>
        <mesh position={[0, 0.1, 0]} material={M.trawa()} receiveShadow><cylinderGeometry args={[ri, ri, 0.12, 48]} /></mesh>
      </group>
    )
  }
  if (e.rodzaj === 'taras') {
    // Deski biegną wzdłuż dłuższego boku.
    const wzdluz = e.szer >= e.gl
    return (
      <group position={poz} rotation={[0, obrot + (wzdluz ? 0 : Math.PI / 2), 0]}>
        <Pudlo args={wzdluz ? [e.szer, w.wys, e.gl] : [e.gl, w.wys, e.szer]} kafel={K.taras} material={M.taras(w.kolor)} position={[0, w.wys / 2, 0]} />
      </group>
    )
  }
  if (e.rodzaj === 'podjazd' || e.rodzaj === 'sciezka') return <group position={poz} rotation={[0, obrot, 0]}><Pudlo args={[e.szer, 0.06, e.gl]} kafel={K.kostka} material={M.kostka(w.kolor)} position={[0, 0.03, 0]} cien={false} /></group>
  if (e.rodzaj === 'zywoplot') return <group position={poz} rotation={[0, obrot, 0]}><Pudlo args={[e.szer, w.wys, e.gl]} kafel={K.liscie} material={M.liscie('#527f44')} position={[0, w.wys / 2, 0]} /></group>
  if (e.rodzaj === 'woda') {
    const kam = M.gladki('#bdb8ae', 0.85)
    return (
      <group position={poz} rotation={[0, obrot, 0]}>
        <Pudlo args={[e.szer, 0.04, e.gl]} material={M.gladki('#274c59', 0.6)} position={[0, 0.02, 0]} cien={false} />
        <mesh position={[0, 0.075, 0]} material={M.woda()}><boxGeometry args={[e.szer - 0.3, 0.02, e.gl - 0.3]} /></mesh>
        {[1, -1].map((z) => <Pudlo key={`a${z}`} args={[e.szer, 0.14, 0.26]} material={kam} position={[0, 0.07, z * (e.gl / 2 - 0.13)]} />)}
        {[1, -1].map((z) => <Pudlo key={`b${z}`} args={[0.26, 0.14, e.gl - 0.52]} material={kam} position={[z * (e.szer / 2 - 0.13), 0.07, 0]} />)}
      </group>
    )
  }
  if (e.rodzaj === 'pergola') {
    const n = Math.max(2, Math.round(e.gl / 0.4))
    return (
      <group position={poz} rotation={[0, obrot, 0]}>
        {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b], i) => <Pudlo key={i} args={[0.14, w.wys, 0.14]} material={ciemny} position={[a * (e.szer / 2 - 0.08), w.wys / 2, b * (e.gl / 2 - 0.08)]} />)}
        {[-1, 1].map((b) => <Pudlo key={b} args={[e.szer, 0.2, 0.1]} material={ciemny} position={[0, w.wys + 0.1, b * (e.gl / 2 - 0.08)]} />)}
        {Array.from({ length: n + 1 }, (_, i) => <Pudlo key={`l${i}`} args={[e.szer + 0.3, 0.16, 0.045]} material={M.drewno(w.kolor)} position={[0, w.wys + 0.26, -e.gl / 2 + (i * e.gl) / n]} />)}
      </group>
    )
  }
  if (e.rodzaj === 'ogrodzenie') {
    // Przęsła biegną wzdłuż dłuższego boku: słupki co ok. 2,5 m i poziome listwy.
    const wzdluzX = e.szer >= e.gl
    const L = Math.max(e.szer, e.gl)
    const n = Math.max(1, Math.round(L / 2.5))
    const st = M.gladki(w.kolor, 0.5, 0.5)
    return (
      <group position={poz} rotation={[0, obrot + (wzdluzX ? 0 : Math.PI / 2), 0]}>
        {Array.from({ length: n + 1 }, (_, i) => <Pudlo key={i} args={[0.08, w.wys, 0.08]} material={st} position={[-L / 2 + (i * L) / n, w.wys / 2, 0]} />)}
        {Array.from({ length: 10 }, (_, i) => <Pudlo key={`l${i}`} args={[L, 0.09, 0.025]} material={st} position={[0, 0.18 + i * ((w.wys - 0.3) / 9), 0]} />)}
      </group>
    )
  }
  if (e.rodzaj === 'wiata') {
    return (
      <group position={poz} rotation={[0, obrot, 0]}>
        {[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b], i) => <Pudlo key={i} args={[0.14, w.wys, 0.14]} material={M.drewno('#8a6f52')} position={[a * (e.szer / 2 - 0.1), w.wys / 2, b * (e.gl / 2 - 0.1)]} />)}
        <Pudlo args={[e.szer + 0.4, 0.16, e.gl + 0.4]} material={M.obrobka()} position={[0, w.wys + 0.08, 0]} />
      </group>
    )
  }
  // Garaż wolnostojący: tynkowana bryła z bramą i płaskim dachem.
  return (
    <group position={poz} rotation={[0, obrot, 0]}>
      <Pudlo args={[e.szer, w.wys, e.gl]} kafel={K.tynk} material={M.elewacja('#e9e5dd', 'tynk')} position={[0, w.wys / 2, 0]} />
      <Pudlo args={[e.szer + 0.2, 0.12, e.gl + 0.2]} material={M.obrobka()} position={[0, w.wys + 0.06, 0]} />
      <Pudlo args={[Math.min(e.szer - 0.8, 5), 2.2, 0.06]} material={M.gladki('#33373c', 0.5, 0.3)} position={[0, 1.1, -e.gl / 2 - 0.01]} />
    </group>
  )
}

export function Teren({ projekt }: { projekt: Projekt }) {
  return <group>{projekt.teren.map((e) => <Element key={e.id} e={e} />)}</group>
}
