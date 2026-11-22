import { useLoader } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { GRANICA, MA_ORTO, PODKLADY, PODKLAD_ROGI } from '../dane/dzialka'
import { uvSwiata } from './budowa'
import { BASEN, DOLEK } from './uklad'
import { material } from './tekstury'

/** Otwory w gruncie nad niecką basenu i dołkiem rozmów: bez nich trawnik i podkład leżały nad dnem i zasłaniały wnętrze
 *  basenu, a w dołku rozmów było widać trawę (22.11.2026). */
const otwor = (r: { x0: number; x1: number; y0: number; y1: number }) => {
  const h = new THREE.Path()
  h.moveTo(r.x0, r.y0); h.lineTo(r.x0, r.y1); h.lineTo(r.x1, r.y1); h.lineTo(r.x1, r.y0); h.closePath()
  return h
}
const otwory = () => [otwor(BASEN), otwor(DOLEK)]

/** Ortofotomapa wokół działki i trawnik na samej działce. */
export function Grunt() {
  // Ortofotomapa tylko wtedy, gdy pobrano ją razem z działką (zakładka Działka w planerze).
  const orto = MA_ORTO ? useLoader(THREE.TextureLoader, PODKLADY.orto.plik) : null
  const geo = useMemo(() => {
    // podkład jako kształt z otworem na basen; UV z rogów podkładu (lg: 0,1, pg: 1,1, ld: 0,0)
    const r = PODKLAD_ROGI
    const s = new THREE.Shape([r.lg, r.pg, r.pd, r.ld].map((q) => new THREE.Vector2(q.x, q.y)))
    s.holes.push(...otwory())
    const g = new THREE.ShapeGeometry(s)
    const ux = r.pg.x - r.lg.x, uy = r.pg.y - r.lg.y, vx = r.ld.x - r.lg.x, vy = r.ld.y - r.lg.y
    const det = ux * vy - uy * vx
    const pos = g.getAttribute('position'), uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i++) {
      const dx = pos.getX(i) - r.lg.x, dy = pos.getY(i) - r.lg.y
      uv[i * 2] = (dx * vy - dy * vx) / det
      uv[i * 2 + 1] = 1 - (ux * dy - uy * dx) / det
    }
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    g.rotateX(-Math.PI / 2)
    g.translate(0, -0.04, 0)
    g.computeVertexNormals()
    return g
  }, [])
  const kolo = useMemo(() => {
    const s = new THREE.Shape(); s.absarc(10, 60, 1500, 0, Math.PI * 2, false)
    s.holes.push(...otwory())
    const g = new THREE.ShapeGeometry(s, 48)
    g.rotateX(-Math.PI / 2)
    g.computeVertexNormals()
    return g
  }, [])
  const mat = useMemo(() => {
    if (!orto) return null
    orto.colorSpace = THREE.SRGBColorSpace
    orto.anisotropy = 8
    const m = new THREE.MeshStandardMaterial({ map: orto, roughness: 1, color: '#f3f6cf', envMapIntensity: 0.35 })
    return m
  }, [orto])
  const trawnik = useMemo(() => {
    const s = new THREE.Shape()
    GRANICA.forEach((q, i) => (i ? s.lineTo(q.x, q.y) : s.moveTo(q.x, q.y)))
    s.holes.push(...otwory())
    const g = new THREE.ShapeGeometry(s)
    g.rotateX(-Math.PI / 2)
    g.computeVertexNormals()
    uvSwiata(g)
    return g
  }, [])
  return (
    <>
      {mat && <mesh geometry={geo} material={mat} receiveShadow />}
      <mesh geometry={kolo} position={[0, -0.08, 0]} receiveShadow>
        <meshStandardMaterial color="#5f6d3c" roughness={1} envMapIntensity={0.35} />
      </mesh>
      <mesh geometry={trawnik} material={material('trawa')} position={[0, 0.0, 0]} receiveShadow />
    </>
  )
}
