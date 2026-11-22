// Położenie słońca dla szerokości i długości geograficznej działki (wzory NOAA w uproszczeniu).

const RAD = Math.PI / 180

export function dzienRoku(miesiac: number, dzien: number): number {
  const dni = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let n = dzien
  for (let i = 0; i < miesiac - 1; i++) n += dni[i]
  return n
}

/** Czas letni w Polsce: od ostatniej niedzieli marca do ostatniej niedzieli października (przybliżenie dniem roku). */
const czasLetni = (n: number) => n >= 88 && n < 299

/**
 * @param godzina czas zegarowy w Polsce (np. 14.5)
 * @returns wysokość nad horyzontem i azymut od północy zgodnie z ruchem wskazówek zegara (stopnie)
 */
export function polozenieSlonca(szer: number, dlug: number, n: number, godzina: number) {
  const g = ((2 * Math.PI) / 365) * (n - 1 + (godzina - 12) / 24)
  const rownanieCzasu = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const dekl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const strefa = czasLetni(n) ? 2 : 1
  const czasSloneczny = godzina * 60 + rownanieCzasu + 4 * dlug - 60 * strefa
  const katGodz = (czasSloneczny / 4 - 180) * RAD
  const fi = szer * RAD
  const cosZen = Math.sin(fi) * Math.sin(dekl) + Math.cos(fi) * Math.cos(dekl) * Math.cos(katGodz)
  const zen = Math.acos(Math.max(-1, Math.min(1, cosZen)))
  const wys = 90 - zen / RAD
  let az = Math.acos(Math.max(-1, Math.min(1, (Math.sin(dekl) - Math.sin(fi) * Math.cos(zen)) / (Math.cos(fi) * Math.sin(zen) || 1e-9)))) / RAD
  if (katGodz > 0) az = 360 - az
  return { wys, az }
}

export function wschodZachod(szer: number, dlug: number, n: number) {
  let wsch = NaN, zach = NaN
  let poprz = polozenieSlonca(szer, dlug, n, 0).wys
  for (let h = 0.05; h <= 24; h += 0.05) {
    const w = polozenieSlonca(szer, dlug, n, h).wys
    if (poprz < 0 && w >= 0) wsch = h
    if (poprz >= 0 && w < 0) zach = h
    poprz = w
  }
  return { wsch, zach }
}

export const fmtGodz = (h: number) => {
  if (!isFinite(h)) return 'brak'
  const m = Math.round(h * 60)
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}
