import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { PORY, type Pora } from './Swiatlo'
import { FL } from './uklad'

// Światła wieczorne: ciepłe 2700 K w domu, zimniejsze w garażu, turkus w basenie, kilka świateł ogrodu.
type L = { x: number; y: number; h: number; moc: number; kolor: string; zasieg: number; migocze?: boolean }
const WEWN: L[] = [
  { x: 11.4, y: 57.1, h: FL + 1.85, moc: 9, kolor: '#ffc98f', zasieg: 9 },
  { x: 10.4, y: 52.3, h: FL + 1.8, moc: 8, kolor: '#ffc98f', zasieg: 8 },
  { x: 10.4, y: 46.5, h: FL + 0.1, moc: 7, kolor: '#ff8a3d', zasieg: 7, migocze: true },
  { x: 13.6, y: 48.0, h: FL + 2.2, moc: 5, kolor: '#ffcf9c', zasieg: 7 },
  { x: 7.6, y: 91.9, h: FL + 2.4, moc: 6, kolor: '#ffcf9c', zasieg: 7 },
  { x: 6.9, y: 74.0, h: FL + 2.3, moc: 6, kolor: '#ffcf9c', zasieg: 12 },
  { x: 14.1, y: 30.5, h: FL + 2.0, moc: 5, kolor: '#ffc68a', zasieg: 6 },
  { x: 13.3, y: 35.4, h: FL + 2.2, moc: 4, kolor: '#ffd7a8', zasieg: 5 },
  { x: 11.2, y: 98.2, h: FL + 2.6, moc: 6, kolor: '#ffd9ad', zasieg: 8 },
  { x: 10.4, y: 104.4, h: FL + 3.0, moc: 9, kolor: '#eef3ff', zasieg: 8 },
]
const ZEWN: L[] = [
  { x: 6.3, y: 29.7, h: FL - 0.9, moc: 10, kolor: '#3cc4e6', zasieg: 10 },
  { x: 4.6, y: 91.2, h: FL + 2.9, moc: 4, kolor: '#ffc98f', zasieg: 6 },
]
// Reflektory gruntowe: wydobywają z ciemności pnie drzew i lamele elewacji.
const REFLEKTORY = [
  { x: 13.0, y: 8.0, cx: 14.2, cy: 9.5, ch: 8, moc: 60 },
  { x: 16.0, y: 110.5, cx: 17.4, cy: 112.2, ch: 6, moc: 30 },
  { x: 3.8, y: 104.0, cx: 2.3, cy: 104.5, ch: 6, moc: 30 },
  { x: 9.0, y: 39.0, cx: 9.0, cy: 44.0, ch: 7, moc: 40 },
]

function Swiatlo({ l }: { l: L }) {
  const ref = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    if (l.migocze && ref.current) ref.current.intensity = l.moc * (0.85 + 0.15 * Math.sin(clock.elapsedTime * 11) * Math.sin(clock.elapsedTime * 7.3 + 1))
  })
  return <pointLight ref={ref} position={[l.x, l.h, -l.y]} intensity={l.moc} color={l.kolor} distance={l.zasieg} decay={1.6} />
}

function Reflektor({ r }: { r: (typeof REFLEKTORY)[number] }) {
  const cel = useRef(new THREE.Object3D())
  cel.current.position.set(r.cx, r.ch, -r.cy)
  return (
    <>
      <primitive object={cel.current} />
      <spotLight position={[r.x, 0.15, -r.y]} target={cel.current} intensity={r.moc} angle={0.42} penumbra={0.8} distance={22} decay={1.5} color="#ffd2a0" />
    </>
  )
}

export function Lampy({ pora }: { pora: Pora }) {
  if (PORY[pora].sztuczne < 0.5) return null
  return (
    <>
      {WEWN.map((l, i) => <Swiatlo key={i} l={l} />)}
      {ZEWN.map((l, i) => <Swiatlo key={`z${i}`} l={l} />)}
      {REFLEKTORY.map((r, i) => <Reflektor key={`r${i}`} r={r} />)}
    </>
  )
}
