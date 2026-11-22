import { Canvas, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Auta } from './Auta'
import { PODPIS_DZIALKI } from '../dane/dzialka'
import { Budowa } from './budowa'
import { budujDom } from './dom'
import { Kamera, UJECIA, WIDOKI, type Sterowanie, type Widok } from './Kamera'
import { Modele, Obrazy } from './Modele'
import { Ogrod } from './Ogrod'
import { PORY, Swiatlo, type Pora } from './Swiatlo'
import { Grunt } from './Teren'
import { material, szklo } from './tekstury'
import { MAT_BUTELEK, budujWnetrza } from './wnetrza'
import { Lampy } from './Lampy'
import { Ogien } from './Ogien'
import './willa.css'

const matPo = (n: string) => (MAT_BUTELEK as Record<string, THREE.Material>)[n] ?? material(n)
const BEZ_CIENIA = ['filc', 'led', 'led_zimny', 'klosz', 'zar']

function Dom() {
  const czesci = useMemo(() => {
    const b = new Budowa(), sz = new Budowa()
    budujDom(b, sz)
    budujWnetrza(b, sz)
    return { b: b.scal(), sz: sz.scal() }
  }, [])
  useEffect(() => () => { for (const c of [...czesci.b, ...czesci.sz]) c.geo.dispose() }, [czesci])
  return (
    <group>
      {czesci.b.map((c) => <mesh key={c.mat} geometry={c.geo} material={matPo(c.mat)} castShadow={!BEZ_CIENIA.includes(c.mat)} receiveShadow />)}
      {czesci.sz.map((c) => <mesh key={c.mat} geometry={c.geo} material={szklo} />)}
    </group>
  )
}

function Debug() {
  const { scene, gl, camera } = useThree()
  useEffect(() => { Object.assign(window as any, { __scene: scene, __gl: gl, __cam: camera }) }, [scene, gl, camera])
  return null
}

type Tryb = 'orbita' | 'spacer' | 'przelot'
const NAZWY_POR: Record<Pora, string> = { dzien: 'Dzień', zlota: 'Złota godzina', zmierzch: 'Zmierzch', noc: 'Noc' }

export default function Willa() {
  const [pora, setPora] = useState<Pora>('dzien')
  const [tryb, setTryb] = useState<Tryb>('orbita')
  const [pion, setPion] = useState(false)
  const [ukryj, setUkryj] = useState(false)
  const [widok, setWidok] = useState(0)
  const cel = useRef(new THREE.Vector3(10, 1, -60))
  const ster = useRef<Sterowanie | null>(null)
  const [gotowe, setGotowe] = useState(false)

  useEffect(() => { (window as any).__pora = setPora; (window as any).__tryb = setTryb }, [])
  // Pierwszy widok po wczytaniu.
  useEffect(() => {
    const t = setInterval(() => { if (ster.current) { ster.current.ustaw(WIDOKI[0]); setGotowe(true); clearInterval(t) } }, 100)
    return () => clearInterval(t)
  }, [])
  const idzDo = useCallback((i: number) => {
    setWidok(i)
    if (tryb !== 'orbita') { setTryb('orbita'); setTimeout(() => ster.current?.ustaw(WIDOKI[i]), 30) }
    else ster.current?.leciDo(WIDOKI[i])
  }, [tryb])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT')) return
      if (e.key === 'h' || e.key === 'H') setUkryj((u) => !u)
      if (e.key === 'Escape' && tryb === 'przelot') setTryb('orbita')
      if (e.key === 'Escape' && tryb === 'spacer' && !document.pointerLockElement) setTryb('orbita')
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [tryb])

  const zdjecie = () => {
    const c = document.querySelector('.willa canvas') as HTMLCanvasElement | null
    if (!c) return
    const a = document.createElement('a')
    a.href = c.toDataURL('image/png')
    a.download = `willa-${WIDOKI[widok]?.nazwa.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/g, '-') ?? 'widok'}-${pora}.png`
    a.click()
  }

  const czasPrzelotu = Math.round(UJECIA.reduce((s, u) => s + u.s, 0))
  const panelUkryty = ukryj || tryb === 'przelot'
  return (
    <div className={`willa ${pion ? 'pion' : ''}`}>
      <div className="willa-scena">
        <Canvas shadows={{ type: THREE.PCFSoftShadowMap }} flat dpr={[1, 2]} gl={{ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
          camera={{ fov: 45, near: 0.05, far: 3000, position: [-22, 30, -4] }}>
          <Suspense fallback={null}>
            <Swiatlo pora={pora} cel={cel} />
            <Grunt />
            <Dom />
            <Ogrod />
            <Obrazy />
            <Lampy pora={pora} />
            <Ogien />
          </Suspense>
          <Suspense fallback={null}>
            <Modele />
            <Auta />
          </Suspense>
          <Kamera tryb={tryb} cel={cel} ster={ster} naKoniecPrzelotu={() => setTryb('orbita')} />
          <Debug />
          <EffectComposer multisampling={4} enableNormalPass={false}>
            <N8AO aoRadius={1.4} intensity={2.6} distanceFalloff={0.9} quality="high" halfRes={false} />
            <Bloom mipmapBlur luminanceThreshold={1.0} luminanceSmoothing={0.2} intensity={0.7} />
            <ToneMapping mode={ToneMappingMode.AGX} />
            <Vignette offset={0.32} darkness={0.45} />
          </EffectComposer>
        </Canvas>
        {!gotowe && <div className="willa-ladowanie">Wczytuję dom, ogród i auta…</div>}
      </div>
      {!panelUkryty && (
        <div className="willa-panel">
          <div className="willa-tytul">Willa „Trzy stodoły” <span>{PODPIS_DZIALKI}</span></div>
          <div className="willa-grupa">
            <a className="willa-powrot" href="/">← Ten dom w planerze: rzut, ściany, dach, wskaźniki</a>
          </div>
          <div className="willa-grupa">
            {(Object.keys(PORY) as Pora[]).map((p) => <button key={p} className={p === pora ? 'on' : ''} onClick={() => setPora(p)}>{NAZWY_POR[p]}</button>)}
          </div>
          <div className="willa-grupa">
            <button className={tryb === 'orbita' ? 'on' : ''} onClick={() => setTryb('orbita')}>Orbita</button>
            <button className={tryb === 'spacer' ? 'on' : ''} onClick={() => setTryb('spacer')}>Spacer</button>
            <button onClick={() => setTryb('przelot')}>Przelot {czasPrzelotu} s</button>
          </div>
          <div className="willa-grupa">
            <button className={pion ? 'on' : ''} onClick={() => setPion((p) => !p)}>Kadr 9:16</button>
            <button onClick={zdjecie}>Zdjęcie PNG</button>
            <button onClick={() => setUkryj(true)}>Ukryj panel (H)</button>
          </div>
          <div className="willa-widoki">
            {WIDOKI.map((w: Widok, i) => <button key={w.nazwa} className={i === widok && tryb === 'orbita' ? 'on' : ''} onClick={() => idzDo(i)}>{w.nazwa}</button>)}
          </div>
          {tryb === 'spacer' && <div className="willa-podpowiedz">Kliknij w obraz, żeby rozglądać się myszą. W A S D albo strzałki: chodzenie, Shift: szybciej, Esc: koniec.</div>}
        </div>
      )}
    </div>
  )
}
