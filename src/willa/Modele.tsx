import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { tekstura } from './tekstury'
import { MODELE, OBRAZY, plotnoObrazu, type Model } from './wnetrza'

const url = (m: string) => `/willa/mod/${m}/${m}.gltf`
// Mapy przezroczystości liści, pobrane osobno (gltf z Poly Haven ma kolor w jpg bez kanału alfa).
const ALFA: Record<string, string> = {
  potted_plant_01: '/willa/mod/potted_plant_01/textures/potted_plant_01_leaves_alpha_1k.jpg',
  potted_plant_02: '/willa/mod/potted_plant_02/textures/potted_plant_02_leaves_alpha_1k.jpg',
}

function Jeden({ d }: { d: Model }) {
  const { scene } = useGLTF(url(d.m))
  const obiekt = useMemo(() => {
    const o = scene.clone(true)
    o.traverse((c) => {
      const m = c as THREE.Mesh
      if (!m.isMesh) return
      m.castShadow = true
      m.receiveShadow = true
      const mat = m.material as THREE.MeshStandardMaterial
      if (ALFA[d.m] && /leaves|leaf/i.test(mat.name)) {
        const k = mat.clone()
        k.alphaMap = tekstura(ALFA[d.m], false)
        k.alphaMap.flipY = false
        k.alphaTest = 0.5
        k.transparent = false
        k.side = THREE.DoubleSide
        m.material = k
      }
    })
    return o
  }, [scene, d.m])
  return <primitive object={obiekt} position={[d.x, d.h ?? 0, -d.y]} rotation={[0, ((d.obr ?? 0) * Math.PI) / 180, 0]} scale={d.s ?? 1} />
}

export function Modele() {
  return <>{MODELE.map((d, i) => <Jeden key={i} d={d} />)}</>
}

export function Obrazy() {
  const tex = useMemo(() => OBRAZY.map((o) => plotnoObrazu(o.wzor)), [])
  return (
    <>
      {OBRAZY.map((o, i) => (
        <group key={i} position={[o.x, o.h, -o.y]} rotation={[0, (o.obr * Math.PI) / 180, 0]}>
          <mesh position={[0, 0, 0.035]} castShadow>
            <planeGeometry args={[o.szer, o.wys]} />
            <meshStandardMaterial map={tex[i]} roughness={0.92} />
          </mesh>
          <mesh position={[0, 0, 0.005]} castShadow receiveShadow>
            <boxGeometry args={[o.szer + 0.04, o.wys + 0.04, 0.05]} />
            <meshStandardMaterial color="#1b1a19" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </>
  )
}
