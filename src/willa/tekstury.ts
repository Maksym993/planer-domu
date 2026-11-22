import * as THREE from 'three'

// Faktury PBR z Poly Haven (CC0), pobrane do public/willa/tex. Wymiary to rzeczywisty rozmiar
// jednego kafla faktury w metrach, z opisu zasobu na polyhaven.com.
const WYMIARY: Record<string, number> = {
  asphalt_02: 3.0, black_painted_planks: 1.6, concrete_floor_02: 2.0, concrete_wall_008: 2.71, curly_teddy_natural: 0.34,
  fabric_leather_02: 0.5, flamed_black_veneer: 1.0, granite_tile: 2.3, gravel_floor: 2.25, laminate_floor_02: 1.7,
  large_grey_tiles: 3.0, leafy_grass: 2.0, marble_01: 1.5, oak_veneer_01: 1.83, patio_tiles: 2.15, plastered_wall_02: 2.23,
  rough_linen: 0.27, smoked_walnut_veneer: 1.0, teak_veneer: 1.0, velour_velvet: 0.28, white_oak_veneer: 0.5,
  wood_textured_concrete: 1.8, wool_boucle: 0.35,
}

const ladowarka = new THREE.TextureLoader()
const pamiec = new Map<string, THREE.Texture>()
let anizotropia = 8
export function ustawAnizotropie(n: number) { anizotropia = n }

export function tekstura(url: string, srgb: boolean): THREE.Texture {
  const k = `${url}|${srgb}`
  let t = pamiec.get(k)
  if (!t) {
    t = ladowarka.load(url)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.anisotropy = anizotropia
    pamiec.set(k, t)
  }
  return t
}

/** Kopia tekstury z własnym powtórzeniem i obrotem, ze wspólnym obrazem. */
function wariant(t: THREE.Texture, rozmiar: number, obrot: number) {
  const c = t.clone()
  c.repeat.set(1 / rozmiar, 1 / rozmiar)
  c.rotation = (obrot * Math.PI) / 180
  c.needsUpdate = true
  return c
}

type Def = {
  tex?: string
  /** Rozmiar kafla w metrach, gdy ma być inny niż w opisie faktury. */
  rozmiar?: number
  obrot?: number
  kolor?: string
  szorstkosc?: number
  metal?: number
  normal?: number
  env?: number
  bezArm?: boolean
  fizyczny?: Partial<THREE.MeshPhysicalMaterialParameters>
  emisja?: string
  moc?: number
  dwustronny?: boolean
  plotno?: 'mozaika'
  /** Faktura daje tylko rzeźbę i szorstkość, kolor bierze z pola kolor (tkaniny w złym kolorze źródłowym). */
  bezKoloru?: boolean
}

/** Mozaika szklana 2,5 cm w odcieniach szarej zieleni, z fugą. */
function plotnoMozaiki(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 1024
  const g = c.getContext('2d')!
  g.fillStyle = '#9aa39c'
  g.fillRect(0, 0, 1024, 1024)
  const n = 40, k = 1024 / n
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const r = Math.random()
    const baza = r < 0.5 ? [70, 98, 96] : r < 0.8 ? [58, 84, 86] : r < 0.95 ? [88, 112, 106] : [44, 66, 70]
    const d = (Math.random() - 0.5) * 14
    g.fillStyle = `rgb(${baza[0] + d},${baza[1] + d},${baza[2] + d})`
    g.fillRect(i * k + 1.5, j * k + 1.5, k - 3, k - 3)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = anizotropia
  return t
}

const DEF: Record<string, Def> = {
  // Drewno
  dab: { tex: 'laminate_floor_02', obrot: 90, szorstkosc: 0.58, normal: 0.6, kolor: '#efd9bd' },
  dab_jasny: { tex: 'white_oak_veneer', rozmiar: 1.2, obrot: 90, szorstkosc: 0.6, kolor: '#efe4d6' },
  lamela: { tex: 'oak_veneer_01', obrot: 90, szorstkosc: 0.68, kolor: '#f2e2cc' },
  lamela_zew: { tex: 'oak_veneer_01', obrot: 90, szorstkosc: 0.75, kolor: '#cfb89c' },
  spalone: { tex: 'flamed_black_veneer', obrot: 90, rozmiar: 1.4, szorstkosc: 0.78, kolor: '#57524e', normal: 1.0 },
  orzech: { tex: 'smoked_walnut_veneer', obrot: 90, szorstkosc: 0.5, kolor: '#e9ddd3' },
  teak: { tex: 'teak_veneer', obrot: 90, szorstkosc: 0.7, kolor: '#c9b49c' },
  deska_tarasu: { tex: 'teak_veneer', rozmiar: 1.6, obrot: 0, szorstkosc: 0.78, kolor: '#a99a8a' },
  // Kamień, beton, tynk
  trawertyn: { tex: 'large_grey_tiles', rozmiar: 3.2, szorstkosc: 0.68, kolor: '#f3eee6' },
  beton_szal: { tex: 'wood_textured_concrete', rozmiar: 2.2, szorstkosc: 0.85, kolor: '#d8d3cc' },
  beton_gar: { tex: 'concrete_floor_02', rozmiar: 3.0, szorstkosc: 0.32, kolor: '#bdbab5' },
  plyty: { tex: 'large_grey_tiles', rozmiar: 3.6, szorstkosc: 0.7, kolor: '#d9d5cf' },
  mikrocement: { tex: 'concrete_wall_008', rozmiar: 3.2, szorstkosc: 0.5, kolor: '#ddd5ca', bezKoloru: true, normal: 0.5 },
  firanka: { kolor: '#f4f1ea', szorstkosc: 1, dwustronny: true, fizyczny: { transmission: 0.35, thickness: 0.01, sheen: 0.5, sheenColor: new THREE.Color('#ffffff') } },
  kamien: { tex: 'concrete_wall_008', rozmiar: 3.6, szorstkosc: 0.38, kolor: '#e4ded5' },
  marmur: { tex: 'marmur_calacatta', rozmiar: 3.0, szorstkosc: 1.0, kolor: '#ffffff', env: 1.15, normal: 0, fizyczny: { clearcoat: 0.4, clearcoatRoughness: 0.08 } },
  granit: { tex: 'granite_tile', rozmiar: 2.4, szorstkosc: 0.3, kolor: '#9a9590' },
  tynk: { tex: 'plastered_wall_02', rozmiar: 3.0, szorstkosc: 0.92, kolor: '#f1ede7', normal: 0.12, bezKoloru: true, bezArm: true },
  tynk_sufit: { tex: 'plastered_wall_02', rozmiar: 3.0, szorstkosc: 0.95, kolor: '#f5f2ed', normal: 0.08, bezKoloru: true, bezArm: true },
  tynk_zew: { tex: 'concrete_wall_008', rozmiar: 3.0, szorstkosc: 0.9, kolor: '#e8e3dc' },
  zwir: { tex: 'gravel_floor', rozmiar: 2.0, szorstkosc: 0.95, kolor: '#e8e2d8' },
  asfalt: { tex: 'asphalt_02', szorstkosc: 0.9, kolor: '#9a9a9a' },
  trawa: { tex: 'trawnik', rozmiar: 2.4, szorstkosc: 0.95, kolor: '#e4ecd6', normal: 1.0 },
  // Tkaniny
  boucle: { tex: 'curly_teddy_natural', rozmiar: 0.45, szorstkosc: 1, kolor: '#fbf6ee', bezArm: true },
  siedzisko: { tex: 'rough_linen', rozmiar: 0.35, szorstkosc: 1, kolor: '#efe6d8', bezKoloru: true },
  len: { tex: 'rough_linen', rozmiar: 0.35, szorstkosc: 1, kolor: '#d6c9b6', bezKoloru: true },
  len_ciemny: { tex: 'rough_linen', rozmiar: 0.35, szorstkosc: 1, kolor: '#5f564d', bezKoloru: true },
  skora: { tex: 'fabric_leather_02', rozmiar: 0.6, szorstkosc: 0.55, kolor: '#e2c6a8' },
  welna: { tex: 'curly_teddy_natural', rozmiar: 0.8, szorstkosc: 1, kolor: '#e7ddcd', normal: 0.6, bezArm: true },
  welur: { tex: 'velour_velvet', rozmiar: 0.35, szorstkosc: 0.9, kolor: '#b3a089', bezKoloru: true, fizyczny: { sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff') } },
  welur_zielony: { tex: 'velour_velvet', rozmiar: 0.35, szorstkosc: 0.9, kolor: '#5f7a5e', bezKoloru: true, fizyczny: { sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color('#d9f0d8') } },
  // Metal i szkło
  rama: { kolor: '#232220', szorstkosc: 0.42, metal: 0.55 },
  blacha: { kolor: '#2a2b2d', szorstkosc: 0.48, metal: 0.55, env: 0.9 },
  czarny_mat: { kolor: '#161616', szorstkosc: 0.55, metal: 0.2 },
  stal: { kolor: '#c8cacc', szorstkosc: 0.25, metal: 1 },
  stal_czarna: { kolor: '#1b1b1c', szorstkosc: 0.35, metal: 0.9 },
  mosiadz: { kolor: '#c9a46a', szorstkosc: 0.28, metal: 1 },
  chrom: { kolor: '#f2f2f2', szorstkosc: 0.06, metal: 1 },
  lakier_bialy: { kolor: '#f3f1ec', szorstkosc: 0.35 },
  lakier_grafit: { kolor: '#3b3a38', szorstkosc: 0.4 },
  ceramika: { kolor: '#fbfbf9', szorstkosc: 0.12, fizyczny: { clearcoat: 0.6, clearcoatRoughness: 0.08 } },
  filc: { kolor: '#141414', szorstkosc: 1 },
  guma: { kolor: '#202020', szorstkosc: 0.8 },
  biel: { kolor: '#f7f5f0', szorstkosc: 0.8 },
  poscel: { kolor: '#f3efe8', szorstkosc: 0.95, fizyczny: { sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color('#ffffff') } },
  trawertyn_jasny: { tex: 'marmur_calacatta', rozmiar: 2.4, szorstkosc: 2.8, kolor: '#e4d6c2', normal: 0 },
  skora_czarna: { tex: 'fabric_leather_02', rozmiar: 0.6, szorstkosc: 0.5, kolor: '#4a4440' },
  stal_malowana: { kolor: '#1c1b1a', szorstkosc: 0.55, metal: 0.25 },
  stal_malowana_2s: { kolor: '#1c1b1a', szorstkosc: 0.55, metal: 0.25, dwustronny: true },
  lakier_czarny: { kolor: '#0a0a0a', szorstkosc: 0.12, fizyczny: { clearcoat: 1, clearcoatRoughness: 0.04 } },
  lustro: { kolor: '#ffffff', szorstkosc: 0.02, metal: 1, env: 1.2 },
  woda_wanny: { kolor: '#e6f1f2', szorstkosc: 0.02, env: 1.2 },
  ekran: { kolor: '#0e1216', szorstkosc: 0.15, emisja: '#1d2a38', moc: 0.6 },
  guma_oliwka: { kolor: '#6b7356', szorstkosc: 0.9 },
  zar: { kolor: '#2a0f05', szorstkosc: 1, emisja: '#ff6a1c', moc: 7 },
  // Mozaika basenu rysowana w pamięci
  mozaika: { plotno: 'mozaika', rozmiar: 1.0, szorstkosc: 0.25, kolor: '#ffffff', env: 1.0 },
  // Światło
  led: { kolor: '#fff1dc', emisja: '#ffd9a6', moc: 4 },
  led_zimny: { kolor: '#ffffff', emisja: '#eef4ff', moc: 3 },
  klosz: { kolor: '#fff8ee', emisja: '#ffe2b8', moc: 2.2, szorstkosc: 0.4 },
}

const materialy = new Map<string, THREE.MeshStandardMaterial>()
/** Natężenie świateł sztucznych: 0 w dzień, 1 w nocy. Zmieniane przez porę dnia. */
export const swiatlaSztuczne = { moc: 0 }

export function material(nazwa: string): THREE.MeshStandardMaterial {
  let m = materialy.get(nazwa)
  if (m) return m
  const d = DEF[nazwa]
  if (!d) throw new Error(`Brak materiału ${nazwa}`)
  const par: THREE.MeshPhysicalMaterialParameters = {
    color: new THREE.Color(d.kolor ?? '#ffffff'),
    roughness: d.szorstkosc ?? 0.8,
    metalness: d.metal ?? 0,
    side: d.dwustronny ? THREE.DoubleSide : THREE.FrontSide,
    ...(d.fizyczny ?? {}),
  }
  if (d.tex) {
    const r = d.rozmiar ?? WYMIARY[d.tex] ?? 1
    const o = d.obrot ?? 0
    const baza = `/willa/tex/${d.tex}`
    if (!d.bezKoloru) par.map = wariant(tekstura(`${baza}/diff.jpg`, true), r, o)
    par.normalMap = wariant(tekstura(`${baza}/nor.jpg`, false), r, o)
    const n = d.normal ?? 1
    par.normalScale = new THREE.Vector2(n, n)
    if (!d.bezArm) {
      const arm = wariant(tekstura(`${baza}/arm.jpg`, false), r, o)
      par.roughnessMap = arm
      par.aoMap = arm
      par.aoMapIntensity = 0.7
    }
  }
  if (d.plotno === 'mozaika') {
    const t = plotnoMozaiki()
    t.repeat.set(1 / (d.rozmiar ?? 1), 1 / (d.rozmiar ?? 1))
    par.map = t
  }
  if (d.emisja) {
    par.emissive = new THREE.Color(d.emisja)
    par.emissiveIntensity = d.moc ?? 1
  }
  m = d.fizyczny ? new THREE.MeshPhysicalMaterial(par) : new THREE.MeshStandardMaterial(par)
  if (d.env != null) m.envMapIntensity = d.env
  m.name = nazwa
  if (d.emisja && nazwa !== 'zar') m.userData.emisja = d.moc ?? 1
  materialy.set(nazwa, m)
  return m
}

/** Szkło okien: odbija niebo, przepuszcza widok. */
export const szklo = new THREE.MeshPhysicalMaterial({
  color: '#ffffff', metalness: 0, roughness: 0.0, transmission: 1, thickness: 0.02, ior: 1.5,
  envMapIntensity: 1.0, specularIntensity: 1, side: THREE.DoubleSide, attenuationColor: new THREE.Color('#e9f2ef'), attenuationDistance: 2,
})
szklo.name = 'szklo'

/** Ustawia moc świateł sztucznych we wszystkich materiałach świecących. */
export function ustawSwiatla(moc: number) {
  swiatlaSztuczne.moc = moc
  for (const m of materialy.values()) {
    if (m.userData.emisja != null) m.emissiveIntensity = m.userData.emisja * (0.05 + moc)
  }
}
