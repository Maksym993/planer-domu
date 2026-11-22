import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { tekstura } from './tekstury'

// Auta: samochód koncepcyjny CarConcept z Khronos glTF Sample Assets (Eric Chadwick, Darmstadt Graphics Group, CC BY 4.0)
// i opcjonalnie Ferrari 458 Italia z przykładów three.js. Ferrari nie ma w repozytorium, pobiera je npm run ferrari.

type Ustaw = { x: number; y: number; obr: number; dl: number }

function przygotuj(scene: THREE.Object3D, dl: number, lakier?: THREE.Material, szyby?: THREE.Material) {
  const o = scene.clone(true)
  const box = new THREE.Box3().setFromObject(o)
  const r = box.getSize(new THREE.Vector3())
  const s = dl / Math.max(r.x, r.z)
  o.scale.setScalar(s)
  const b2 = new THREE.Box3().setFromObject(o)
  o.position.y -= b2.min.y
  const sr = b2.getCenter(new THREE.Vector3())
  o.position.x -= sr.x; o.position.z -= sr.z
  o.traverse((c) => {
    const m = c as THREE.Mesh
    if (!m.isMesh) return
    m.castShadow = true
    m.receiveShadow = true
    if (lakier && /body|paint/i.test(m.name + (m.material as THREE.Material).name)) m.material = lakier
    if (szyby && /glass/i.test(m.name + (m.material as THREE.Material).name)) m.material = szyby
  })
  const g = new THREE.Group()
  g.add(o)
  return { g, dlugosc: r.x > r.z ? 'x' : 'z' }
}

const lakierCzerwony = new THREE.MeshPhysicalMaterial({ color: '#8e0a0a', metalness: 0.6, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4 })
const szybyAuta = new THREE.MeshPhysicalMaterial({ color: '#ffffff', metalness: 0.25, roughness: 0, transmission: 1, transparent: true, envMapIntensity: 1.5 })

function Auto({ plik, u, lakier, szyby, cien }: { plik: string; u: Ustaw; lakier?: THREE.Material; szyby?: THREE.Material; cien?: string }) {
  const { scene } = useGLTF(plik, '/willa/draco/')
  const { g, dlugosc } = useMemo(() => przygotuj(scene, u.dl, lakier, szyby), [scene, u.dl, lakier, szyby])
  const aoTex = useMemo(() => (cien ? tekstura(cien, false) : null), [cien])
  // obrót: oś długości modelu ustawiam wzdłuż kierunku jazdy w rzucie
  const obrMod = dlugosc === 'x' ? 0 : Math.PI / 2
  return (
    <group position={[u.x, 0.03, -u.y]} rotation={[0, (u.obr * Math.PI) / 180 + obrMod, 0]}>
      <primitive object={g} />
      {aoTex && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} renderOrder={1}>
          <planeGeometry args={[u.dl * 0.45, u.dl * 1.0]} />
          <meshBasicMaterial map={aoTex} blending={THREE.MultiplyBlending} toneMapped={false} transparent premultipliedAlpha />
        </mesh>
      )}
    </group>
  )
}

/** Czy plik leży w public/ (serwer deweloperski na brakujący plik odpowiada stroną HTML). */
function useJest(plik: string) {
  const [jest, setJest] = useState(false)
  useEffect(() => {
    fetch(plik, { method: 'HEAD' }).then((r) => setJest(r.ok && !(r.headers.get('content-type') ?? '').includes('text/html'))).catch(() => setJest(false))
  }, [plik])
  return jest
}

export function Auta() {
  const ferrari = useJest('/willa/auta/ferrari.glb')
  return (
    <>
      {/* Ferrari na placu przed garażem, ustawione skosem do bramy */}
      {ferrari && <Auto plik="/willa/auta/ferrari.glb" u={{ x: 11.6, y: 112.2, obr: 205, dl: 4.53 }} lakier={lakierCzerwony} szyby={szybyAuta} />}
      {/* auto koncepcyjne w garażu, przodem do szklanej ściany studia */}
      <Auto plik="/willa/auta/concept.glb" u={{ x: 10.4, y: 104.0, obr: 270, dl: 4.7 }} />
    </>
  )
}
