import { Environment, Line, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { DZIALKA_META, GRANICA, MA_ORTO, OBSZAR_ZABUDOWY, PODKLADY, PODKLAD_ROGI, POLNOC, WSCHOD } from '../dane/dzialka'
import { ElementDachu, ProstokatDachu, elementyDachu, poddaszeCzynne, poziomyKondygnacji } from '../model/dach'
import { Pt, dist, klucz, norm, odlegloscOdLamanej, odsunWielokat, sub, wWielokacie } from '../model/geom'
import { typPokoju, wzorPodlogi } from '../model/katalog'
import { useMagazyn } from '../model/magazyn'
import { srodekDomu } from '../model/operacje'
import { dzienRoku, polozenieSlonca } from '../model/slonce'
import { Uklad, normalnaZewn, znajdzUklad } from '../model/topologia'
import type { Otwor, Pokrycie, Projekt, Sciana, Wykonczenie } from '../model/typy'
import { MebelBryla } from './Meble3D'
import { Pudlo, Teren } from './Teren3D'
import { K, M, bryla, przyciety, wSkali } from './materialy'

type V3 = [number, number, number]
// Model (x, y) -> scena (x, wysokość, -y).
const v3 = (p: Pt, h = 0) => new THREE.Vector3(p.x, h, -p.y)

function ksztalt(p: Pt[]): THREE.Shape {
  const s = new THREE.Shape()
  p.forEach((q, i) => (i ? s.lineTo(q.x, q.y) : s.moveTo(q.x, q.y)))
  s.closePath()
  return s
}

/** Ciemna elewacja bez podanego wykończenia to deska: tak powstała stodoła w zapisanych projektach. */
function wykonczenie(kolor: string | null | undefined, jawne: Wykonczenie | null | undefined, domyslne: Wykonczenie): Wykonczenie {
  if (jawne) return jawne
  if (kolor) {
    const c = new THREE.Color(kolor)
    if (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b < 0.12) return 'deska'
  }
  return domyslne
}

/** Płyta z wielokąta modelu: leży poziomo, spód na wysokości h, grubość g. */
function Plyta({ p, h, g, material, kafel = 1, cien = true }: { p: Pt[]; h: number; g: number; material: THREE.Material; kafel?: number; cien?: boolean }) {
  const geo = useMemo(() => {
    const e = wSkali(new THREE.ExtrudeGeometry(ksztalt(p), { depth: g, bevelEnabled: false }), kafel)
    e.rotateX(-Math.PI / 2)
    return e
  }, [p, g, kafel])
  useEffect(() => () => geo.dispose(), [geo])
  return <mesh geometry={geo} material={material} position={[0, h, 0]} castShadow={cien} receiveShadow />
}

type Kawalek = { od: number; do: number; dol: number; gora: number }

function kawalkiSciany(L: number, H: number, otwory: Otwor[], przes: number): Kawalek[] {
  const o = otwory.slice().sort((a, b) => a.poz - b.poz)
  const out: Kawalek[] = []
  let x = 0
  for (const w of o) {
    const a = Math.max(0, w.poz - w.szer / 2 + przes), b = Math.min(L, w.poz + w.szer / 2 + przes)
    if (a > x + 1e-3) out.push({ od: x, do: a, dol: 0, gora: H })
    if (w.parapet > 0.01) out.push({ od: a, do: b, dol: 0, gora: w.parapet })
    const g = Math.min(H, w.parapet + w.wys)
    if (H - g > 0.01) out.push({ od: a, do: b, dol: g, gora: H })
    x = Math.max(x, b)
  }
  if (L - x > 1e-3) out.push({ od: x, do: L, dol: 0, gora: H })
  return out
}

function Okno3D({ o, wys, z, znak, parapety, plan }: { o: Otwor; wys: number; z: number; znak: number; parapety: boolean; plan?: THREE.Plane[] }) {
  const rama = przyciety(M.rama(), plan), szklo = przyciety(M.szklo(), plan)
  const r = 0.065, gl = 0.09
  const pola = o.szer > 2.6 ? 3 : o.szer > 1.3 ? 2 : 1
  return (
    <group position={[o.poz, o.parapet + wys / 2, z]}>
      <mesh material={szklo}><boxGeometry args={[o.szer - 0.06, wys - 0.06, 0.024]} /></mesh>
      <Pudlo args={[o.szer, r, gl]} material={rama} position={[0, wys / 2 - r / 2, 0]} />
      <Pudlo args={[o.szer, r, gl]} material={rama} position={[0, -wys / 2 + r / 2, 0]} />
      {Array.from({ length: pola + 1 }, (_, j) => <Pudlo key={j} args={[r, wys, gl]} material={rama} position={[-o.szer / 2 + r / 2 + (j * (o.szer - r)) / pola, 0, 0]} />)}
      {parapety && o.parapet > 0.2 && <>
        <Pudlo args={[o.szer + 0.14, 0.03, 0.24]} material={przyciety(M.obrobka(), plan)} position={[0, -wys / 2 - 0.015, znak * 0.14]} />
        <Pudlo args={[o.szer + 0.08, 0.035, 0.2]} material={przyciety(M.gladki('#efece6', 0.5), plan)} position={[0, -wys / 2 - 0.017, -znak * 0.13]} cien={false} />
      </>}
    </group>
  )
}

function Drzwi3D({ o, wys, grub, znak, zewn, plan }: { o: Otwor; wys: number; grub: number; znak: number; zewn: boolean; plan?: THREE.Plane[] }) {
  const y = o.parapet + wys / 2
  if (o.rodzaj === 'brama') {
    // Brama segmentowa: poziome panele z cieniem w szczelinach.
    const n = 5, h = wys / n
    const m = przyciety(M.gladki('#33373c', 0.5, 0.35), plan)
    return <group position={[o.poz, o.parapet, znak * (grub / 2 - 0.12)]}>{Array.from({ length: n }, (_, i) => <Pudlo key={i} args={[o.szer - 0.04, h - 0.014, 0.045]} material={m} position={[0, h * (i + 0.5), 0]} />)}</group>
  }
  const wej = o.rodzaj === 'drzwi-wej'
  const oscieznica = przyciety(wej ? M.rama() : M.gladki('#e9e4da', 0.55), plan)
  const skrzydlo = przyciety(wej ? M.gladki('#2b2623', 0.6) : M.gladki('#f1ede6', 0.5), plan)
  const stal = przyciety(M.gladki('#c3c8cc', 0.3, 0.8), plan)
  const z = zewn ? znak * (grub / 2 - 0.13) : 0
  const gl = zewn ? 0.1 : grub + 0.02
  return (
    <group position={[o.poz, y, z]}>
      <Pudlo args={[0.05, wys, gl]} material={oscieznica} position={[-o.szer / 2 + 0.025, 0, 0]} />
      <Pudlo args={[0.05, wys, gl]} material={oscieznica} position={[o.szer / 2 - 0.025, 0, 0]} />
      <Pudlo args={[o.szer, 0.05, gl]} material={oscieznica} position={[0, wys / 2 - 0.025, 0]} />
      <Pudlo args={[o.szer - 0.1, wys - 0.06, 0.045]} material={skrzydlo} position={[0, -0.005, 0]} />
      {wej ? <>
        <mesh material={przyciety(M.szklo(), plan)} position={[-o.szer * 0.24, 0.05, 0]}><boxGeometry args={[0.14, wys * 0.72, 0.05]} /></mesh>
        <Pudlo args={[0.03, 1.2, 0.04]} material={stal} position={[o.szer * 0.26 * o.zawias, 0, znak * 0.06]} />
      </> : <>
        <Pudlo args={[0.13, 0.02, 0.05]} material={stal} position={[o.zawias * (o.szer / 2 - 0.13), -wys / 2 + 1.03, 0.045]} />
        <Pudlo args={[0.13, 0.02, 0.05]} material={stal} position={[o.zawias * (o.szer / 2 - 0.13), -wys / 2 + 1.03, -0.045]} />
      </>}
    </group>
  )
}

function ScianaBryla({ s, otwory, H, baza, stA, stB, zewn, nZewn, matZewn, kafelZewn, plan }: {
  s: Sciana; otwory: Otwor[]; H: number; baza: number; stA: number; stB: number; zewn: boolean; nZewn: Pt; matZewn: THREE.Material; kafelZewn: number; plan?: THREE.Plane[]
}) {
  const d = norm(sub(s.b, s.a))
  const szklana = s.rodzaj === 'szklana'
  const przedA = stA > 1 && !szklana ? s.grubosc / 2 : 0, przedB = stB > 1 && !szklana ? s.grubosc / 2 : 0
  const L = dist(s.a, s.b) + przedA + przedB
  const kat = Math.atan2(d.y, d.x)
  const start = { x: s.a.x - d.x * przedA, y: s.a.y - d.y * przedA }
  const kaw = useMemo(() => kawalkiSciany(L, H, otwory, przedA), [L, H, otwory, przedA])
  // W układzie lokalnym: oś X wzdłuż ściany, oś Z w poprzek. Normalna (d.y, -d.x) modelu to +Z sceny.
  const znak = nZewn.x * d.y + nZewn.y * -d.x > 0 ? 1 : -1
  const gZ = s.grubosc * 0.55, gW = s.grubosc - gZ
  const mZ = przyciety(matZewn, plan), mW = przyciety(M.wnetrze(), plan), rama = przyciety(M.rama(), plan), szklo = przyciety(M.szklo(), plan)
  return (
    <group position={[start.x, baza, -start.y]} rotation={[0, kat, 0]}>
      {kaw.map((k, i) => {
        const dl = k.do - k.od, wys = k.gora - k.dol
        const x = (k.od + k.do) / 2, y = (k.dol + k.gora) / 2
        if (szklana) {
          // Fasada: tafle szkła, słupki co ok. 1,25 m, rygiel na dole i na górze.
          const n = Math.max(1, Math.round(dl / 1.25))
          return (
            <group key={i}>
              <mesh material={szklo} position={[x, y, 0]}><boxGeometry args={[dl, wys, 0.03]} /></mesh>
              <Pudlo args={[dl, 0.08, 0.12]} material={rama} position={[x, k.dol + 0.04, 0]} />
              <Pudlo args={[dl, 0.08, 0.12]} material={rama} position={[x, k.gora - 0.04, 0]} />
              {Array.from({ length: n + 1 }, (_, j) => <Pudlo key={j} args={[0.07, wys, 0.12]} material={rama} position={[k.od + (j * dl) / n, y, 0]} />)}
            </group>
          )
        }
        if (!zewn) return <Pudlo key={i} args={[dl, wys, s.grubosc]} material={mW} position={[x, y, 0]} />
        return (
          <group key={i}>
            <Pudlo args={[dl, wys, gZ]} kafel={kafelZewn} material={mZ} position={[x, y, znak * (s.grubosc / 2 - gZ / 2)]} />
            <Pudlo args={[dl, wys, gW]} material={mW} position={[x, y, -znak * (s.grubosc / 2 - gW / 2)]} cien={false} />
          </group>
        )
      })}
      {otwory.map((o) => {
        const wysO = Math.min(o.wys, H - o.parapet)
        const oo = { ...o, poz: o.poz + przedA }
        if (o.rodzaj === 'przejscie') return null
        if (o.rodzaj === 'okno' || o.rodzaj === 'okno-taras') return <Okno3D key={o.id} o={oo} wys={wysO} z={szklana ? 0 : znak * (s.grubosc / 2 - 0.16)} znak={znak} parapety={!szklana && zewn} plan={plan} />
        return <Drzwi3D key={o.id} o={oo} wys={wysO} grub={s.grubosc} znak={znak} zewn={zewn && !szklana} plan={plan} />
      })}
    </group>
  )
}

function DachCzesc({ el, kolor, pokrycie, elewacja, wykDomu, szczyty }: { el: ElementDachu; kolor: string; pokrycie: Pokrycie; elewacja: string; wykDomu: Wykonczenie; szczyty: boolean }) {
  const pr = el.pr
  const k = (pr.katPolaci * Math.PI) / 180
  const tg = Math.tan(k), co = Math.cos(k)
  const o = pr.okap
  const { dl, rozp, wys, rodzaj } = pr
  const gr = 0.18
  const kolorElew = el.elewacja ?? elewacja
  const wyk = wykonczenie(el.elewacja, el.wykonczenie, wykDomu)
  const mElew = M.elewacja(kolorElew, wyk), kafElew = wyk === 'deska' ? K.deska : wyk === 'cegla' ? K.cegla : K.tynk
  const mDach = M.dach(kolor, pokrycie), obr = M.obrobka(), szklo = M.szklo(), rama = M.rama()
  const szklane = el.szklaneSzczyty && rodzaj === 'dwuspadowy'
  const kol = el.czescId ? el.kolankowa : 0
  const czesci = useMemo(() => {
    const hx = dl / 2, hz = rozp / 2
    if (rodzaj === 'czterospadowy') {
      const ex = hx + o, ez = hz + o, y0 = -o * tg, kal = Math.max(0, (dl - rozp) / 2)
      return { hip: bryla([[-ex, y0, ez], [ex, y0, ez], [ex, y0, -ez], [-ex, y0, -ez], [-kal, wys, 0], [kal, wys, 0]], [[0, 1, 5, 4], [1, 2, 5], [2, 3, 4, 5], [3, 0, 4], [3, 2, 1, 0]], K.dach) }
    }
    if (rodzaj === 'dwuspadowy') {
      if (szklane) {
        // Dwie cienkie tafle w szczytach zamiast pełnej bryły, żeby wnętrze było otwarte do kalenicy.
        const tafla = (x: number, g: number) => bryla([[x, 0, hz], [x, 0, -hz], [x, wys, 0], [x + g, 0, hz], [x + g, 0, -hz], [x + g, wys, 0]], [[0, 1, 2], [5, 4, 3], [0, 3, 4, 1], [1, 4, 5, 2], [2, 5, 3, 0]])
        return { tafle: [tafla(-hx + 0.06, 0.03), tafla(hx - 0.09, 0.03)] }
      }
      return { szczyt: bryla([[-hx, 0, hz], [hx, 0, hz], [hx, 0, -hz], [-hx, 0, -hz], [-hx, wys, 0], [hx, wys, 0]], [[0, 1, 5, 4], [2, 3, 4, 5], [3, 0, 4], [1, 2, 5], [3, 2, 1, 0]], kafElew) }
    }
    if (rodzaj === 'jednospadowy') return { szczyt: bryla([[-hx, 0, hz], [hx, 0, hz], [hx, 0, -hz], [-hx, 0, -hz], [-hx, wys, -hz], [hx, wys, -hz]], [[0, 1, 5, 4], [2, 3, 4, 5], [3, 0, 4], [1, 2, 5], [3, 2, 1, 0]], kafElew) }
    return {}
  }, [rodzaj, dl, rozp, wys, o, tg, szklane, kafElew])
  useEffect(() => () => { czesci.hip?.dispose(); czesci.szczyt?.dispose(); czesci.tafle?.forEach((g) => g.dispose()) }, [czesci])
  const oSzczyt = Math.min(o, 0.45)
  const pol = rozp / 2 + o
  const dlD = dl + 2 * oSzczyt
  const okapY = wys - pol * tg
  /** Rynna z rurą spustową wzdłuż okapu: x wzdłuż, z położenie, y wysokość okapu. */
  const rynna = (z: number, y: number, dlugosc: number, klucz: string, rura = 1) => (
    <group key={klucz}>
      <mesh material={obr} position={[0, y - 0.03, z]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.065, 0.065, dlugosc, 12]} /></mesh>
      <mesh material={obr} position={[rura * (dl / 2 - 0.25), (y - 0.08 - el.baza) / 2, Math.sign(z) * (rozp / 2 + 0.07)]} castShadow><cylinderGeometry args={[0.045, 0.045, y - 0.08 + el.baza, 10]} /></mesh>
    </group>
  )
  return (
    <group position={[pr.cx, el.baza, -pr.cy]} rotation={[0, pr.kat, 0]}>
      {/* Ścianka kolankowa albo attyka pod dachem części ułożonej ręcznie. */}
      {kol > 0.01 && szczyty && (szklane ? <>
        {[1, -1].map((zn) => <Pudlo key={zn} args={[dl, kol, 0.45]} kafel={kafElew} material={mElew} position={[0, -kol / 2, zn * (rozp / 2 - 0.225)]} />)}
        {[1, -1].map((zn) => <mesh key={zn} material={szklo} position={[zn * (dl / 2 - 0.075), -kol / 2, 0]}><boxGeometry args={[0.03, kol, rozp - 0.9]} /></mesh>)}
      </> : <Pudlo args={[dl, kol, rozp]} kafel={kafElew} material={mElew} position={[0, -kol / 2, 0]} />)}

      {czesci.hip && <>
        <mesh geometry={czesci.hip} material={mDach} castShadow receiveShadow />
        {[1, -1].map((zn) => rynna(zn * (rozp / 2 + o + 0.07), -o * tg, dl + 2 * o, `r${zn}`, zn))}
      </>}
      {czesci.szczyt && szczyty && <mesh geometry={czesci.szczyt} material={mElew} castShadow receiveShadow />}
      {czesci.tafle && szczyty && [1, -1].map((zn, i) => (
        <group key={zn}>
          <mesh geometry={czesci.tafle![i]} material={szklo} />
          {/* Słupki fasady szczytu: wysokość spada od kalenicy do okapu. */}
          {[-0.5, 0, 0.5].map((u) => { const h = wys * (1 - Math.abs(u)) + kol; return <Pudlo key={u} args={[0.1, h, 0.09]} material={rama} position={[zn * (dl / 2 - 0.075), h / 2 - kol, (u * rozp) / 2]} /> })}
          <Pudlo args={[0.1, 0.09, rozp - 0.9]} material={rama} position={[zn * (dl / 2 - 0.075), 0, 0]} />
        </group>
      ))}

      {rodzaj === 'dwuspadowy' && <>
        {[1, -1].map((zn) => (
          <group key={zn}>
            <Pudlo args={[dlD, gr, pol / co + 0.1]} kafel={K.dach} material={mDach} position={[0, wys - (pol / 2) * tg + gr / 2 / co, (zn * pol) / 2]} rotation={[zn * k, 0, 0]} />
            {/* Podbitka od środka: jasny sufit pod połacią. */}
            <Pudlo args={[dl - 0.16, 0.03, rozp / 2 / co - 0.04]} material={M.wnetrze()} position={[0, wys - (rozp / 4) * tg - 0.035 / co, (zn * rozp) / 4]} rotation={[zn * k, 0, 0]} cien={false} />
            {/* Deska czołowa przy okapie i wiatrownice na szczytach. */}
            <Pudlo args={[dlD, 0.2, 0.03]} material={obr} position={[0, okapY + 0.02, zn * (pol + 0.03)]} />
            {[1, -1].map((xn) => <Pudlo key={xn} args={[0.03, 0.24, pol / co + 0.12]} material={obr} position={[xn * (dlD / 2 + 0.015), wys - (pol / 2) * tg + 0.02, (zn * pol) / 2]} rotation={[zn * k, 0, 0]} />)}
            {rynna(zn * (pol + 0.1), okapY, dlD, `r${zn}`, zn)}
          </group>
        ))}
        <Pudlo args={[dlD + 0.04, 0.05, 0.36]} material={obr} position={[0, wys + gr / co - 0.005, 0]} />
      </>}
      {rodzaj === 'jednospadowy' && <>
        <Pudlo args={[dlD, gr, (rozp + 2 * o) / co]} kafel={K.dach} material={mDach} position={[0, wys / 2 + gr / 2 / co, 0]} rotation={[k, 0, 0]} />
        <Pudlo args={[dlD, 0.2, 0.03]} material={obr} position={[0, -o * tg + 0.02, rozp / 2 + o + 0.03]} />
        {rynna(rozp / 2 + o + 0.1, -o * tg, dlD, 'r')}
      </>}
      {rodzaj === 'plaski' && <>
        {/* Dach płaski: płyta, attyka dookoła z blaszaną obróbką i żwir w środku. */}
        <Pudlo args={[dl + 0.02, 0.2, rozp + 0.02]} kafel={kafElew} material={mElew} position={[0, 0.1, 0]} />
        {[1, -1].map((zn) => <Pudlo key={`a${zn}`} args={[dl + 0.02, 0.35, 0.3]} kafel={kafElew} material={mElew} position={[0, 0.375, zn * (rozp / 2 - 0.14)]} />)}
        {[1, -1].map((zn) => <Pudlo key={`b${zn}`} args={[0.3, 0.35, rozp - 0.56]} kafel={kafElew} material={mElew} position={[zn * (dl / 2 - 0.14), 0.375, 0]} />)}
        {[1, -1].map((zn) => <Pudlo key={`c${zn}`} args={[dl + 0.08, 0.025, 0.36]} material={obr} position={[0, 0.562, zn * (rozp / 2 - 0.14)]} />)}
        {[1, -1].map((zn) => <Pudlo key={`d${zn}`} args={[0.36, 0.025, rozp - 0.6]} material={obr} position={[zn * (dl / 2 - 0.14), 0.562, 0]} />)}
        {dl > 0.7 && rozp > 0.7 && <Pudlo args={[dl - 0.58, 0.03, rozp - 0.58]} kafel={K.zwir} material={M.zwir()} position={[0, 0.215, 0]} cien={false} />}
      </>}
    </group>
  )
}

/** Płaszczyzny połaci w układzie sceny, do przycięcia ścian poddasza. */
function plaszczyznyDachu(pr: ProstokatDachu, baza: number, srodek: Pt): THREE.Plane[] {
  if (pr.rodzaj === 'plaski') return []
  const k = (pr.katPolaci * Math.PI) / 180
  const os = new THREE.Vector3(0, 1, 0)
  const przes = new THREE.Vector3(pr.cx - srodek.x, baza, -(pr.cy - srodek.y))
  const plan = (nLok: THREE.Vector3, lok: THREE.Vector3) => {
    const n = nLok.clone().applyAxisAngle(os, pr.kat).normalize().negate()
    return new THREE.Plane(n, -n.dot(lok.clone().applyAxisAngle(os, pr.kat).add(przes)))
  }
  if (pr.rodzaj === 'jednospadowy') return [plan(new THREE.Vector3(0, Math.cos(k), Math.sin(k)), new THREE.Vector3(0, pr.wys / 2, 0))]
  const kal = new THREE.Vector3(0, pr.wys, 0)
  const out = [plan(new THREE.Vector3(0, Math.cos(k), Math.sin(k)), kal), plan(new THREE.Vector3(0, Math.cos(k), -Math.sin(k)), kal)]
  if (pr.rodzaj === 'czterospadowy') {
    const pol = Math.max(0, (pr.dl - pr.rozp) / 2)
    for (const zn of [1, -1]) out.push(plan(new THREE.Vector3(zn * Math.sin(k), Math.cos(k), 0), new THREE.Vector3(zn * pol, pr.wys, 0)))
  }
  return out
}

function Dom({ projekt, uklady, srodek }: { projekt: Projekt; uklady: Uklad[]; srodek: Pt }) {
  const w3d = useMagazyn((s) => s.w3d)
  const u = projekt.ustawienia
  const n = projekt.kondygnacje.length
  const poziomy = poziomyKondygnacji(projekt)
  const ost = n - 1
  const poddasze = poddaszeCzynne(projekt)
  const reczny = projekt.dach.czesci.length > 0
  const wykDomu = u.wykonczenie ?? 'tynk'
  const elementy = useMemo(() => elementyDachu(projekt, uklady), [projekt, uklady])
  const wysDachu = Math.max(0, ...elementy.map((e) => e.pr.wys))
  const kolankowa = reczny ? (elementy[0]?.kolankowa ?? 0) : projekt.dach.kolankowa
  const pokazDach = w3d.dach && !w3d.przekroj && w3d.doKondygnacji >= ost
  // Poddasze: ściany przycinają połacie, gdy cały dach to jedna część.
  const planPoddasza = useMemo(() => {
    if (!poddasze || elementy.length !== 1) return undefined
    const p = plaszczyznyDachu(elementy[0].pr, elementy[0].baza, srodek)
    return p.length ? p : undefined
  }, [poddasze, elementy, srodek])

  return (
    <group>
      {projekt.kondygnacje.map((k, i) => {
        if (i > w3d.doKondygnacji) return null
        const uk = uklady[i]
        const baza = poziomy[i]
        const stopien = new Map<string, number>()
        for (const s of k.sciany) for (const p of [s.a, s.b]) stopien.set(klucz(p), (stopien.get(klucz(p)) ?? 0) + 1)
        const ostatnia = i === ost
        const plan = ostatnia ? planPoddasza : undefined
        return (
          <group key={k.id}>
            {uk.obrysy.map((o, j) => (
              i === 0
                ? <Plyta key={j} p={odsunWielokat(o.zewn, 0.03)} h={0} g={baza} material={M.cokol()} kafel={K.beton} />
                : <Plyta key={j} p={odsunWielokat(o.zewn, -0.06)} h={baza - projekt.kondygnacje[i - 1].strop} g={projekt.kondygnacje[i - 1].strop} material={M.gladki('#d9d5cd', 0.9)} />
            ))}
            {uk.pokoje.map((p) => { const t = typPokoju(p.etykieta?.typ ?? 'inne'); return <Plyta key={p.klucz} p={p.wnetrze} h={baza} g={0.02} material={M.podloga(t.podloga, wzorPodlogi(t.id))} kafel={K.parkiet} cien={false} /> })}
            {k.sciany.map((s) => {
              const zewn = uk.zewnetrzne.has(s.id)
              let H = k.wysokosc
              if (zewn) H += ostatnia ? (poddasze ? 0 : k.strop + (reczny ? 0 : projekt.dach.kolankowa)) : k.strop
              // Poddasze: ściany rosną do kalenicy, a połacie dachu przycinają je od góry.
              if (ostatnia && poddasze) H = plan ? kolankowa + wysDachu + 0.05 : Math.max(kolankowa, 1.2)
              const wyk = wykonczenie(s.kolor, s.wykonczenie, wykDomu)
              return <ScianaBryla key={s.id} s={s} otwory={k.otwory.filter((o) => o.scianaId === s.id)} H={H} baza={baza} stA={stopien.get(klucz(s.a)) ?? 1} stB={stopien.get(klucz(s.b)) ?? 1}
                zewn={zewn} nZewn={zewn ? normalnaZewn(s, uk.obrysy) : { x: 0, y: 1 }} matZewn={M.elewacja(s.kolor ?? u.kolorElewacji, wyk)} kafelZewn={wyk === 'deska' ? K.deska : wyk === 'cegla' ? K.cegla : K.tynk} plan={plan} />
            })}
            {w3d.meble && k.meble.map((m) => <MebelBryla key={m.id} m={m} baza={baza + 0.02} />)}
          </group>
        )
      })}
      {pokazDach && elementy.map((el, j) => <DachCzesc key={el.czescId ?? j} el={el} kolor={projekt.dach.kolor} pokrycie={projekt.dach.pokrycie ?? 'rabek'} elewacja={u.kolorElewacji} wykDomu={wykDomu} szczyty={!poddasze} />)}
    </group>
  )
}

function Grunt({ orto }: { orto: boolean }) {
  // Ortofotomapa tylko wtedy, gdy pobrano ją razem z działką. MA_ORTO jest stałe, więc kolejność hooków się nie zmienia.
  const tekstura = MA_ORTO ? useLoader(THREE.TextureLoader, PODKLADY.orto.plik) : null
  const geo = useMemo(() => {
    const { lg, pg, ld, pd } = PODKLAD_ROGI
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([lg, pg, ld, pd].flatMap((p) => [p.x, 0, -p.y]), 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2))
    g.setIndex([0, 2, 1, 1, 2, 3])
    g.computeVertexNormals()
    return g
  }, [])
  useEffect(() => { if (!tekstura) return; tekstura.colorSpace = THREE.SRGBColorSpace; tekstura.anisotropy = 8; tekstura.needsUpdate = true }, [tekstura])
  const dzialka = useMemo(() => { const g = wSkali(new THREE.ShapeGeometry(ksztalt(GRANICA)), K.trawa); g.rotateX(-Math.PI / 2); return g }, [])
  return (
    <group>
      <mesh geometry={geo} receiveShadow>
        {orto && tekstura ? <meshStandardMaterial map={tekstura} roughness={1} /> : <meshStandardMaterial color="#a3b38c" roughness={1} />}
      </mesh>
      {/* Działka jako trawnik: z bliska ortofotomapa jest za mało ostra. */}
      <mesh geometry={dzialka} material={M.trawa()} position={[0, 0.02, 0]} receiveShadow />
      <Line points={[...GRANICA, GRANICA[0]].map((p) => v3(p, 0.06))} color="#ffffff" lineWidth={1.6} />
      <Line points={[...OBSZAR_ZABUDOWY, OBSZAR_ZABUDOWY[0]].map((p) => v3(p, 0.07))} color="#eafff5" lineWidth={1} dashed dashSize={0.8} gapSize={0.6} />
    </group>
  )
}

const BARWY_NIEBA = { dzien: ['#6aa6ea', '#bcdcf7', '#eef5fb'], niskie: ['#5b83b5', '#f3cba3', '#fbe6cf'], noc: ['#060b16', '#12203a', '#1c2b45'] }

/** Kopuła nieba z łagodnym przejściem od zenitu do horyzontu, zależnie od pory dnia. */
function Niebo({ pora }: { pora: keyof typeof BARWY_NIEBA }) {
  const tekstura = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 4; c.height = 256
    const x = c.getContext('2d')!
    const g = x.createLinearGradient(0, 0, 0, 256)
    const [zenit, srodek, horyzont] = BARWY_NIEBA[pora]
    g.addColorStop(0, zenit); g.addColorStop(0.3, srodek); g.addColorStop(0.5, horyzont); g.addColorStop(1, horyzont)
    x.fillStyle = g; x.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [pora])
  useEffect(() => () => tekstura.dispose(), [tekstura])
  return <mesh scale={900}><sphereGeometry args={[1, 32, 24]} /><meshBasicMaterial map={tekstura} side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false} /></mesh>
}

function Swiatlo() {
  const sl = useMagazyn((s) => s.slonce)
  const ref = useRef<THREE.DirectionalLight>(null)
  const { wys, az } = polozenieSlonca(DZIALKA_META.szerokoscGeo, DZIALKA_META.dlugoscGeo, dzienRoku(sl.miesiac, sl.dzien), sl.godzina)
  const a = (az * Math.PI) / 180, h = (Math.max(wys, -5) * Math.PI) / 180
  const e = Math.sin(a), nn = Math.cos(a)
  const mx = e * WSCHOD.x + nn * POLNOC.x, my = e * WSCHOD.y + nn * POLNOC.y
  const kier = new THREE.Vector3(mx * Math.cos(h), Math.sin(h), -my * Math.cos(h))
  const dzien = Math.max(0, Math.min(1, (wys + 2) / 12))
  useEffect(() => { if (ref.current) { ref.current.target.position.set(0, 0, 0); ref.current.target.updateMatrixWorld() } })
  return (
    <>
      <Niebo pora={wys < -2 ? 'noc' : wys < 10 ? 'niskie' : 'dzien'} />
      {wys > 0 && <mesh position={kier.clone().multiplyScalar(820)}><sphereGeometry args={[16, 20, 12]} /><meshBasicMaterial color="#fff6dc" fog={false} toneMapped={false} /></mesh>}
      <hemisphereLight args={['#e3ecff', '#7d806c', 0.3 + 0.35 * dzien]} />
      <directionalLight ref={ref} position={kier.clone().multiplyScalar(120)} intensity={3.4 * dzien} color={wys < 12 ? '#ffd3a6' : '#fff3df'} castShadow
        shadow-mapSize={[4096, 4096]} shadow-bias={-0.0003} shadow-normalBias={0.05} shadow-radius={3}
        shadow-camera-left={-62} shadow-camera-right={62} shadow-camera-top={62} shadow-camera-bottom={-62} shadow-camera-near={1} shadow-camera-far={300} />
      {/* Nieruchome otoczenie do odbić w szkle i miękkiego światła z nieba. */}
      <Environment resolution={128} frames={1} environmentIntensity={0.6}>
        <mesh scale={60}><sphereGeometry args={[1, 32, 16]} /><meshBasicMaterial color="#c4dcf2" side={THREE.BackSide} /></mesh>
        <mesh position={[0, -8, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[60, 32]} /><meshBasicMaterial color="#6f7f58" /></mesh>
        <mesh position={[0, 40, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[26, 32]} /><meshBasicMaterial color="#ffffff" /></mesh>
        <mesh position={[30, 12, -40]}><sphereGeometry args={[9, 16, 8]} /><meshBasicMaterial color="#fff6e0" /></mesh>
      </Environment>
    </>
  )
}

function Przekroj({ wys }: { wys: number | null }) {
  const { gl } = useThree()
  useEffect(() => {
    gl.localClippingEnabled = true
    gl.clippingPlanes = wys == null ? [] : [new THREE.Plane(new THREE.Vector3(0, -1, 0), wys)]
    return () => { gl.clippingPlanes = [] }
  }, [gl, wys])
  return null
}

export type Kamera3D = 'ogrod' | 'droga' | 'gora' | 'wejscie'
const kamera = { ustaw: (_: Kamera3D) => {} }
export const ustawKamere = (k: Kamera3D) => kamera.ustaw(k)

function Sterowanie({ zasieg }: { zasieg: number }) {
  const ref = useRef<any>(null)
  const { camera } = useThree()
  useEffect(() => {
    kamera.ustaw = (k) => {
      const d = Math.max(26, Math.min(zasieg * 2.3, 95))
      // Oś x modelu: w głąb działki od granicy frontowej. Oś y modelu (-z sceny): wzdłuż niej.
      const poz: Record<Kamera3D, V3> = {
        ogrod: [-d * 0.55, d * 0.38, d * 0.8],
        droga: [-d * 0.95, d * 0.4, d * 0.12],
        wejscie: [-d * 0.5, d * 0.32, -d * 0.82],
        gora: [0.01, d * 1.5, 0.02],
      }
      camera.position.set(...poz[k])
      ref.current?.target.set(0, 1.6, 0)
      ref.current?.update()
    }
    const p = camera as THREE.PerspectiveCamera
    p.fov = 36; p.near = 0.3; p.updateProjectionMatrix()
    kamera.ustaw('wejscie')
  }, [camera, zasieg])
  return <OrbitControls ref={ref} makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI / 2 - 0.02} minDistance={3} maxDistance={260} target={[0, 1.6, 0]} />
}

/** Spacer po domu z poziomu oczu: przeciąganie rozgląda się, W A S D albo strzałki chodzą. */
function Spacer({ start }: { start: V3 }) {
  const { camera, gl } = useThree()
  const st = useRef({ yaw: Math.PI, pitch: 0, klawisze: new Set<string>(), ciagnie: false, px: 0, py: 0 })
  useEffect(() => {
    const p = camera as THREE.PerspectiveCamera
    p.fov = 64; p.near = 0.08; p.updateProjectionMatrix()
    camera.position.set(...start)
    const s = st.current
    s.yaw = Math.PI; s.pitch = 0
    const el = gl.domElement
    const dol = (e: PointerEvent) => { s.ciagnie = true; s.px = e.clientX; s.py = e.clientY; el.setPointerCapture(e.pointerId) }
    const ruch = (e: PointerEvent) => {
      if (!s.ciagnie) return
      s.yaw -= (e.clientX - s.px) * 0.0045
      s.pitch = Math.max(-1.25, Math.min(1.25, s.pitch - (e.clientY - s.py) * 0.0045))
      s.px = e.clientX; s.py = e.clientY
    }
    const gora = () => { s.ciagnie = false }
    const kolko = (e: WheelEvent) => { e.preventDefault(); const k = -e.deltaY * 0.004; camera.position.x += -Math.sin(s.yaw) * k; camera.position.z += -Math.cos(s.yaw) * k }
    const CHOD = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift']
    const wcisk = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return
      const kl = e.key.toLowerCase()
      if (!CHOD.includes(kl) || e.metaKey || e.ctrlKey) return
      s.klawisze.add(kl)
      if (kl !== 'shift') { e.preventDefault(); e.stopImmediatePropagation() }
    }
    const pusc = (e: KeyboardEvent) => s.klawisze.delete(e.key.toLowerCase())
    el.addEventListener('pointerdown', dol); el.addEventListener('pointermove', ruch); el.addEventListener('pointerup', gora)
    el.addEventListener('wheel', kolko, { passive: false })
    window.addEventListener('keydown', wcisk, true); window.addEventListener('keyup', pusc, true)
    return () => {
      el.removeEventListener('pointerdown', dol); el.removeEventListener('pointermove', ruch); el.removeEventListener('pointerup', gora)
      el.removeEventListener('wheel', kolko)
      window.removeEventListener('keydown', wcisk, true); window.removeEventListener('keyup', pusc, true)
    }
  }, [camera, gl, start])
  useFrame((_, dt) => {
    const s = st.current
    const v = 2.2 * (s.klawisze.has('shift') ? 2.6 : 1) * Math.min(dt, 0.1)
    const przod = (s.klawisze.has('w') || s.klawisze.has('arrowup') ? 1 : 0) - (s.klawisze.has('s') || s.klawisze.has('arrowdown') ? 1 : 0)
    const bok = (s.klawisze.has('d') ? 1 : 0) - (s.klawisze.has('a') ? 1 : 0)
    const skret = (s.klawisze.has('arrowleft') ? 1 : 0) - (s.klawisze.has('arrowright') ? 1 : 0)
    s.yaw += skret * 1.6 * Math.min(dt, 0.1)
    camera.position.x += (-Math.sin(s.yaw) * przod + Math.cos(s.yaw) * bok) * v
    camera.position.z += (-Math.cos(s.yaw) * przod - Math.sin(s.yaw) * bok) * v
    camera.position.y = start[1]
    camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ')
  })
  return null
}

export function Widok3D() {
  const projekt = useMagazyn((s) => s.projekt)
  const w3d = useMagazyn((s) => s.w3d)
  const uklady = useMemo(() => projekt.kondygnacje.map((k) => znajdzUklad(k)), [projekt.kondygnacje])
  const srodek = useMemo(() => srodekDomu(projekt) ?? { x: 10, y: 96 }, [projekt])
  const zasieg = useMemo(() => {
    const pk = projekt.kondygnacje.flatMap((k) => k.sciany.flatMap((s) => [s.a, s.b]))
    return pk.length ? Math.round(Math.max(...pk.map((p) => dist(p, srodek)))) : 14
  }, [projekt, srodek])
  const wysPrzekroju = useMemo(() => {
    if (!w3d.przekroj) return null
    const i = Math.min(w3d.doKondygnacji, projekt.kondygnacje.length - 1)
    return poziomyKondygnacji(projekt)[i] + 1.25
  }, [w3d.przekroj, w3d.doKondygnacji, projekt])
  // Spacer zaczyna się w największym pomieszczeniu parteru, twarzą do ogrodu, w miejscu wolnym od mebli.
  const startSpaceru = useMemo<V3>(() => {
    const naj = uklady[0]?.pokoje.slice().sort((a, b) => b.pow - a.pow)[0]
    let p = naj?.srodek ?? srodek
    if (naj) {
      const meble = projekt.kondygnacje[0].meble
      let najdalej = -1
      for (let dx = -4; dx <= 4; dx += 1) for (let dy = -6; dy <= 6; dy += 1) {
        const q = { x: naj.srodek.x + dx, y: naj.srodek.y + dy }
        if (!wWielokacie(q, naj.wnetrze) || odlegloscOdLamanej(q, naj.wnetrze, true) < 1) continue
        const d = Math.min(8, ...meble.map((m) => dist(q, m) - Math.max(m.szer, m.gl) / 2)) - Math.abs(dx) * 0.05 + dy * 0.08
        if (d > najdalej) { najdalej = d; p = q }
      }
    }
    return [p.x - srodek.x, projekt.ustawienia.poziomParteru + 1.65, -(p.y - srodek.y)]
  }, [w3d.spacer]) // eslint-disable-line
  return (
    <Canvas flat shadows camera={{ fov: 36, near: 0.3, far: 1200, position: [14, 14, 26] }} dpr={[1, 2]} gl={{ antialias: true, preserveDrawingBuffer: true }}>
      <Przekroj wys={wysPrzekroju} />
      <fog attach="fog" args={['#dde8f1', 190, 560]} />
      <Swiatlo />
      <group position={[-srodek.x, 0, srodek.y]}>
        <Suspense fallback={null}><Grunt orto={w3d.orto} /></Suspense>
        <Teren projekt={projekt} />
        <Dom projekt={projekt} uklady={uklady} srodek={srodek} />
      </group>
      {w3d.spacer ? <Spacer start={startSpaceru} /> : <Sterowanie zasieg={zasieg} />}
      <EffectComposer multisampling={4} enableNormalPass={false}>
        <N8AO aoRadius={1.4} intensity={2.6} distanceFalloff={1} quality="medium" />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  )
}
