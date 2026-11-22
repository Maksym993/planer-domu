import { Environment } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { POLNOC, WSCHOD } from '../dane/dzialka'
import { ustawSwiatla } from './tekstury'

export type Pora = 'dzien' | 'zlota' | 'zmierzch' | 'noc'

type Ustawienia = {
  plik: string
  /** Położenie słońca na zdjęciu HDR: u (0..1) i wysokość w stopniach, zmierzone z najjaśniejszego piksela. */
  hdrU: number
  wys: number
  /** Azymut, pod którym ustawiam słońce nad działką (od północy, zgodnie z zegarem). */
  azymut: number
  moc: number
  kolor: string
  otoczenie: number
  tlo: number
  sztuczne: number
  mgla: string
  ekspozycja: number
}

export const PORY: Record<Pora, Ustawienia> = {
  dzien: { plik: '/willa/hdri/dzien_bs.hdr', hdrU: 0.595, wys: 47.9, azymut: 208, moc: 5.2, kolor: '#fff2e2', otoczenie: 1.0, tlo: 1, sztuczne: 0, mgla: '#c9d6e2', ekspozycja: 1 },
  zlota: { plik: '/willa/hdri/zlota_bs.hdr', hdrU: 0.5999, wys: 6.1, azymut: 258, moc: 3.4, kolor: '#ffb070', otoczenie: 0.5, tlo: 0.75, sztuczne: 0.35, mgla: '#c9a98a', ekspozycja: 0.9 },
  zmierzch: { plik: '/willa/hdri/zmierzch.hdr', hdrU: 0.6086, wys: 10.5, azymut: 285, moc: 0.0, kolor: '#9fb6ff', otoczenie: 0.42, tlo: 0.55, sztuczne: 1, mgla: '#4b556c', ekspozycja: 1.0 },
  noc: { plik: '/willa/hdri/noc_bs.hdr', hdrU: 0.5989, wys: 17, azymut: 150, moc: 0.12, kolor: '#9db4ff', otoczenie: 0.18, tlo: 0.35, sztuczne: 1, mgla: '#0d1320', ekspozycja: 1.6 },
}

/** Kierunek do słońca w układzie sceny dla azymutu i wysokości w stopniach. */
export function kierunekSlonca(azymut: number, wys: number) {
  const a = (azymut * Math.PI) / 180, h = (wys * Math.PI) / 180
  const mx = Math.sin(a) * WSCHOD.x + Math.cos(a) * POLNOC.x
  const my = Math.sin(a) * WSCHOD.y + Math.cos(a) * POLNOC.y
  return new THREE.Vector3(mx * Math.cos(h), Math.sin(h), -my * Math.cos(h)).normalize()
}

export const ZNAK_OBROTU = { v: 1 }

export function Swiatlo({ pora, cel }: { pora: Pora; cel: React.MutableRefObject<THREE.Vector3> }) {
  const u = PORY[pora]
  const ref = useRef<THREE.DirectionalLight>(null)
  const { scene, gl } = useThree()
  const kier = useMemo(() => kierunekSlonca(u.azymut, Math.max(u.wys, 4)), [u])
  // Obrót HDR tak, by słońce na niebie stało tam, skąd pada cień.
  const obrot = useMemo(() => {
    const aH = (u.hdrU - 0.5) * 2 * Math.PI
    const aS = Math.atan2(kier.z, kier.x)
    return new THREE.Euler(0, ZNAK_OBROTU.v * (aS - aH), 0)
  }, [u, kier])

  useEffect(() => { ustawSwiatla(u.sztuczne) }, [u])
  useEffect(() => {
    gl.toneMappingExposure = u.ekspozycja
    scene.fog = new THREE.Fog(u.mgla, 160, 900)
    return () => { scene.fog = null }
  }, [u, gl, scene])

  const tgt = useMemo(() => new THREE.Object3D(), [])
  useEffect(() => { scene.add(tgt); return () => { scene.remove(tgt) } }, [scene, tgt])
  useFrame(({ camera }) => {
    const l = ref.current
    if (!l) return
    // Cień idzie za tym, na co patrzy kamera: ostry z bliska, szeroki z daleka. Nagranie filmu może podać stałą ramkę
    // cienia (window.__cien = { x, y, r } w układzie modelu): przy przelocie z wysoka ramka jadąca za kamerą i zmieniająca
    // rozmiar w każdej klatce dawała migotanie cieni rąbków na dachach (rolka willa, 22.11.2026).
    const st = (window as unknown as { __cien?: { x: number; y: number; r: number } }).__cien
    const c = st ? new THREE.Vector3(st.x, 0, -st.y) : cel.current
    const odl = camera.position.distanceTo(c)
    const r = st ? st.r : THREE.MathUtils.clamp(odl * 0.9, 18, 95)
    tgt.position.copy(c)
    l.target = tgt
    l.position.copy(c).addScaledVector(kier, 160)
    const sc = l.shadow.camera
    if (sc.right !== r) {
      sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r
      sc.updateProjectionMatrix()
    }
  })

  return (
    <>
      <Environment files={u.plik} background environmentIntensity={u.otoczenie} backgroundIntensity={u.tlo} environmentRotation={obrot} backgroundRotation={obrot} />
      <directionalLight ref={ref} intensity={u.moc} color={u.kolor} castShadow={u.moc > 0.05}
        shadow-mapSize={[4096, 4096]} shadow-bias={-0.00025} shadow-normalBias={0.035} shadow-radius={2.5}
        shadow-camera-near={10} shadow-camera-far={340} />
    </>
  )
}
