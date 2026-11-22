import { Pt, rot } from '../model/geom'
import type { Widok } from '../model/magazyn'

/** Przeliczenia między układem modelu (metry) a ekranem (piksele). */
export type Rzutnia = {
  W: number
  H: number
  skala: number
  obrot: number
  doE: (p: Pt) => Pt
  zE: (p: Pt) => Pt
}

export function rzutnia(w: Widok, W: number, H: number): Rzutnia {
  const k = (w.obrot * Math.PI) / 180
  const c = { x: w.cx, y: w.cy }
  return {
    W, H, skala: w.skala, obrot: w.obrot,
    doE: (p) => {
      const r = rot({ x: p.x - c.x, y: p.y - c.y }, k)
      return { x: W / 2 + r.x * w.skala, y: H / 2 - r.y * w.skala }
    },
    zE: (s) => {
      const r = rot({ x: (s.x - W / 2) / w.skala, y: -(s.y - H / 2) / w.skala }, -k)
      return { x: r.x + c.x, y: r.y + c.y }
    },
  }
}

export const sciezka = (p: Pt[], zamknij = true) => (p.length ? `M${p.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join('L')}${zamknij ? 'Z' : ''}` : '')

/** Kąt tekstu wzdłuż odcinka na ekranie, tak żeby nie stał do góry nogami. */
export function katTekstu(a: Pt, b: Pt): number {
  let k = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
  if (k > 90) k -= 180
  if (k <= -90) k += 180
  return k
}
