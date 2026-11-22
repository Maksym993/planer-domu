import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { DOLEK, FL } from './uklad'

/** Płomienie w wiszącym kominku: trzy skrzyżowane tafle z gradientem ognia, migoczące. */
function plotnoOgnia() {
  const c = document.createElement('canvas')
  c.width = 128; c.height = 256
  const g = c.getContext('2d')!
  for (let i = 0; i < 7; i++) {
    const x = 64 + (i - 3) * 9, w = 26 - Math.abs(i - 3) * 4, h = 210 - Math.abs(i - 3) * 38
    const gr = g.createRadialGradient(x, 250, 2, x, 250 - h * 0.45, h * 0.6)
    gr.addColorStop(0, 'rgba(255,240,200,0.95)')
    gr.addColorStop(0.25, 'rgba(255,170,60,0.85)')
    gr.addColorStop(0.6, 'rgba(240,90,20,0.45)')
    gr.addColorStop(1, 'rgba(120,20,0,0)')
    g.fillStyle = gr
    g.beginPath()
    g.ellipse(x, 250 - h / 2, w, h / 2, 0, 0, Math.PI * 2)
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function Ogien() {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ map: plotnoOgnia(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, color: new THREE.Color(2.2, 2.0, 1.8) }), [])
  const grupa = useRef<THREE.Group>(null)
  const dx = (DOLEK.x0 + DOLEK.x1) / 2, dy = (DOLEK.y0 + DOLEK.y1) / 2 - 0.55
  const h = FL - DOLEK.gl + 0.42 + 0.1
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!grupa.current) return
    grupa.current.children.forEach((m, i) => {
      m.scale.y = 0.85 + 0.2 * Math.sin(t * (7 + i * 1.7) + i) * Math.sin(t * 3.1 + i * 2)
      m.scale.x = 0.9 + 0.1 * Math.sin(t * 5.3 + i)
    })
  })
  return (
    <group ref={grupa} position={[dx, h, -dy]}>
      {[0, 60, 120].map((a) => (
        <mesh key={a} material={mat} rotation={[0, (a * Math.PI) / 180, 0]} position={[0, 0.2, 0]} renderOrder={5}>
          <planeGeometry args={[0.56, 0.44]} />
        </mesh>
      ))}
    </group>
  )
}
