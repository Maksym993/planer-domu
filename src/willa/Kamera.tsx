import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { podlogaPod, rozwiaz } from './kolizje'

// Współrzędne widoków w układzie modelu: [x, y, wysokość].
export type Widok = { nazwa: string; poz: [number, number, number]; cel: [number, number, number]; fov?: number }

export const WIDOKI: Widok[] = [
  { nazwa: 'Z lotu ptaka', poz: [9, -16, 44], cel: [10, 56, 0], fov: 40 },
  { nazwa: 'Wjazd', poz: [16.5, 126.5, 2.1], cel: [9.5, 106, 3.2], fov: 50 },
  { nazwa: 'Ogród i basen', poz: [9.5, 12.5, 2.4], cel: [8.5, 44, 3.4], fov: 52 },
  { nazwa: 'Salon', poz: [13.8, 45.2, 1.75], cel: [9.0, 55.5, 1.6], fov: 64 },
  { nazwa: 'Dołek rozmów', poz: [8.3, 48.6, 0.95], cel: [11.6, 44.2, 0.9], fov: 66 },
  { nazwa: 'Kuchnia', poz: [7.0, 54.6, 1.65], cel: [12.5, 58.0, 1.0], fov: 62 },
  { nazwa: 'Oś domu', poz: [7.0, 94.8, 1.6], cel: [7.0, 60, 1.4], fov: 55 },
  { nazwa: 'Galeria', poz: [6.9, 82.0, 1.6], cel: [6.9, 66, 1.5], fov: 62 },
  { nazwa: 'Pokój dziecka', poz: [14.5, 72.7, 1.6], cel: [10.6, 69.4, 1.0], fov: 70 },
  { nazwa: 'Sypialnia', poz: [12.4, 27.4, 1.55], cel: [14.6, 32.0, 1.0], fov: 66 },
  { nazwa: 'Łazienka', poz: [14.7, 33.4, 1.6], cel: [12.4, 35.6, 0.8], fov: 70 },
  { nazwa: 'Studio', poz: [14.4, 96.2, 1.6], cel: [8.6, 100, 1.0], fov: 66 },
  { nazwa: 'Garaż', poz: [12.8, 96.6, 1.5], cel: [10.4, 104, 0.9], fov: 58 },
]

/** Ujęcia przelotu: każde to krótki, płynny ruch kamery; między ujęciami cięcie jak w montażu. */
export type Ujecie = { od: [number, number, number]; doo: [number, number, number]; celOd: [number, number, number]; celDo: [number, number, number]; s: number; fov?: number }
export const UJECIA: Ujecie[] = [
  { od: [6, -42, 72], doo: [8, -10, 36], celOd: [10, 62, 0], celDo: [10, 50, 0], s: 7, fov: 40 },
  { od: [5.2, 14.0, 0.9], doo: [5.2, 26.5, 0.9], celOd: [8.6, 46, 2.6], celDo: [9.6, 46, 3.0], s: 6, fov: 50 },
  { od: [12.6, 39.2, 1.6], doo: [10.6, 43.0, 1.65], celOd: [10.4, 55, 2.6], celDo: [10.4, 55, 2.2], s: 5.5, fov: 58 },
  { od: [12.9, 44.95, 0.95], doo: [8.2, 44.95, 0.95], celOd: [10.4, 49, 0.6], celDo: [10.4, 49, 0.6], s: 6, fov: 58 },
  { od: [7.4, 53.6, 1.4], doo: [7.4, 56.2, 1.2], celOd: [12.6, 57.4, 1.1], celDo: [12.6, 58.0, 1.1], s: 5, fov: 50 },
  { od: [10.4, 50.4, 1.5], doo: [10.4, 50.4, 1.5], celOd: [10.4, 56, 3.5], celDo: [10.4, 51, 8.0], s: 5, fov: 70 },
  { od: [7.0, 94.8, 1.6], doo: [7.0, 90.0, 1.6], celOd: [7.0, 60, 1.4], celDo: [7.0, 60, 1.4], s: 6, fov: 55 },
  { od: [14.4, 96.6, 1.4], doo: [11.0, 96.6, 1.4], celOd: [11.0, 104, 0.9], celDo: [9.6, 104, 0.9], s: 5.5, fov: 55 },
  { od: [16.2, 116.5, 0.7], doo: [7.5, 117.0, 0.9], celOd: [11.6, 112.2, 0.6], celDo: [11.6, 112.2, 0.8], s: 6, fov: 45 },
  { od: [12.4, 27.0, 1.5], doo: [13.4, 28.6, 1.4], celOd: [14.6, 32.2, 0.9], celDo: [14.4, 32.4, 0.9], s: 5, fov: 62 },
  { od: [10, 14, 3], doo: [8, -32, 62], celOd: [10, 50, 2], celDo: [10, 62, 0], s: 8, fov: 42 },
]

const v = (p: [number, number, number]) => new THREE.Vector3(p[0], p[2], -p[1])
const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)))

export type Sterowanie = { leciDo: (w: Widok) => void; ustaw: (w: Widok) => void }

/** Kamera z orbitą, przelotem do widoku i spacerem. */
export function Kamera({ tryb, cel, ster, naKoniecPrzelotu }: { tryb: 'orbita' | 'spacer' | 'przelot'; cel: React.MutableRefObject<THREE.Vector3>; ster: React.MutableRefObject<Sterowanie | null>; naKoniecPrzelotu: () => void }) {
  const orbit = useRef<any>(null)
  const { camera, gl } = useThree()
  const p = camera as THREE.PerspectiveCamera
  const lot = useRef<{ t: number; z: THREE.Vector3; zc: THREE.Vector3; d: THREE.Vector3; dc: THREE.Vector3; fz: number; fd: number } | null>(null)

  useEffect(() => {
    ster.current = {
      leciDo: (w) => {
        lot.current = { t: 0, z: camera.position.clone(), zc: orbit.current ? orbit.current.target.clone() : cel.current.clone(), d: v(w.poz), dc: v(w.cel), fz: p.fov, fd: w.fov ?? 45 }
      },
      ustaw: (w) => {
        camera.position.copy(v(w.poz))
        cel.current.copy(v(w.cel))
        if (orbit.current) { orbit.current.target.copy(cel.current); orbit.current.update() }
        p.fov = w.fov ?? 45; p.updateProjectionMatrix()
      },
    }
    ;(window as any).__kamera = (x: number, y: number, h: number, cx: number, cy: number, ch: number, fov = 45) => ster.current!.ustaw({ nazwa: '', poz: [x, y, h], cel: [cx, cy, ch], fov })
  }, [camera, cel, p, ster])

  useEffect(() => {
    p.near = 0.05; p.far = 3000; p.updateProjectionMatrix()
  }, [p])

  // ---- przelot do widoku w trybie orbity ----
  useFrame((_, dt) => {
    const l = lot.current
    if (!l || tryb !== 'orbita') return
    l.t = Math.min(1, l.t + dt / 2.2)
    const e = ease(l.t)
    camera.position.lerpVectors(l.z, l.d, e)
    const c = new THREE.Vector3().lerpVectors(l.zc, l.dc, e)
    if (orbit.current) { orbit.current.target.copy(c); orbit.current.update() }
    cel.current.copy(c)
    p.fov = l.fz + (l.fd - l.fz) * e; p.updateProjectionMatrix()
    if (l.t >= 1) lot.current = null
  })

  // ---- przelot filmowy: ujęcia po kolei ----
  const film = useRef({ i: 0, t: 0 })
  useEffect(() => { if (tryb === 'przelot') film.current = { i: 0, t: 0 } }, [tryb])
  useFrame((_, dt) => {
    if (tryb !== 'przelot') return
    const f = film.current
    const u = UJECIA[f.i]
    f.t += Math.min(dt, 0.05)
    const e = ease(f.t / u.s)
    camera.position.lerpVectors(v(u.od), v(u.doo), e)
    const c = new THREE.Vector3().lerpVectors(v(u.celOd), v(u.celDo), e)
    camera.lookAt(c)
    cel.current.copy(c)
    const fov = u.fov ?? 50
    if (p.fov !== fov) { p.fov = fov; p.updateProjectionMatrix() }
    if (f.t >= u.s) {
      f.i++; f.t = 0
      if (f.i >= UJECIA.length) { f.i = 0; naKoniecPrzelotu() }
    }
  })

  // ---- spacer z poziomu oczu ----
  const sp = useRef({ yaw: 0, pitch: 0, klaw: new Set<string>(), ciagnie: false, px: 0, py: 0, h: 1.65 })
  useEffect(() => {
    if (tryb !== 'spacer') return
    const s = sp.current
    // start: w miejscu, na które patrzyła kamera, na wysokości oczu
    const start = rozwiaz({ x: cel.current.x, y: -cel.current.z })
    const kier = new THREE.Vector3().subVectors(cel.current, camera.position)
    s.yaw = Math.atan2(-kier.x, -kier.z)
    s.pitch = 0
    s.h = podlogaPod(start.x, start.y) + 1.65
    camera.position.set(start.x, s.h, -start.y)
    p.fov = 70; p.updateProjectionMatrix()
    const el = gl.domElement
    const blokada = () => document.pointerLockElement === el
    const klik = () => { if (!blokada()) el.requestPointerLock?.() }
    const ruch = (e: PointerEvent) => {
      if (blokada()) {
        s.yaw -= e.movementX * 0.0022
        s.pitch = Math.max(-1.3, Math.min(1.3, s.pitch - e.movementY * 0.0022))
      } else if (s.ciagnie) {
        s.yaw -= (e.clientX - s.px) * 0.004
        s.pitch = Math.max(-1.3, Math.min(1.3, s.pitch - (e.clientY - s.py) * 0.004))
        s.px = e.clientX; s.py = e.clientY
      }
    }
    const dol = (e: PointerEvent) => { s.ciagnie = true; s.px = e.clientX; s.py = e.clientY }
    const gora = () => { s.ciagnie = false }
    const KL = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'q', 'e']
    const wcisk = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (KL.includes(k)) { s.klaw.add(k); e.preventDefault() } }
    const pusc = (e: KeyboardEvent) => s.klaw.delete(e.key.toLowerCase())
    el.addEventListener('click', klik)
    el.addEventListener('pointermove', ruch)
    el.addEventListener('pointerdown', dol)
    window.addEventListener('pointerup', gora)
    window.addEventListener('keydown', wcisk)
    window.addEventListener('keyup', pusc)
    return () => {
      el.removeEventListener('click', klik)
      el.removeEventListener('pointermove', ruch)
      el.removeEventListener('pointerdown', dol)
      window.removeEventListener('pointerup', gora)
      window.removeEventListener('keydown', wcisk)
      window.removeEventListener('keyup', pusc)
      if (document.pointerLockElement === el) document.exitPointerLock()
      s.klaw.clear()
    }
  }, [tryb, camera, gl, cel, p])
  useFrame((_, dtR) => {
    if (tryb !== 'spacer') return
    const s = sp.current
    const dt = Math.min(dtR, 0.05)
    const k = s.klaw
    const bieg = k.has('shift') ? 2.4 : 1
    const przod = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0)
    const bok = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0)
    s.yaw += ((k.has('arrowleft') || k.has('q') ? 1 : 0) - (k.has('arrowright') || k.has('e') ? 1 : 0)) * 1.5 * dt
    const vel = 1.6 * bieg * dt
    const mx = camera.position.x + (-Math.sin(s.yaw) * przod + Math.cos(s.yaw) * bok) * vel
    const mz = camera.position.z + (-Math.cos(s.yaw) * przod - Math.sin(s.yaw) * bok) * vel
    const q = rozwiaz({ x: mx, y: -mz })
    const hDocel = podlogaPod(q.x, q.y) + 1.65
    s.h += (hDocel - s.h) * Math.min(1, dt * 8)
    // lekkie kołysanie kroku
    const krok = przod || bok ? Math.sin(performance.now() / 160) * 0.012 : 0
    camera.position.set(q.x, s.h + krok, -q.y)
    camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ')
    const kier = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation)
    cel.current.copy(camera.position).addScaledVector(kier, 3)
  })

  return tryb === 'orbita' ? (
    <OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI / 2 - 0.01} minDistance={0.3} maxDistance={600}
      target={cel.current} onStart={() => { lot.current = null }} onChange={() => { if (orbit.current) cel.current.copy(orbit.current.target) }} />
  ) : null
}
