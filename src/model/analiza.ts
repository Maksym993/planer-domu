// Wskaźniki zabudowy i kontrola odległości dla działki z src/dane/dzialka.json.

import { DANE, GRANICA, LINIE_ZABUDOWY, MIN_BEZ_OTWOROW, OBSZAR_ZABUDOWY, ODCINKI_SASIAD, POW_GEOM, POW_MN } from '../dane/dzialka'
import { Pt, add, dot, lerp, mul, norm, odlegloscOdLamanej, odlegloscOdcinkow, perp, pole, rzutNaOdcinek, sub, wWielokacie } from './geom'
import { TEREN, WYSPA_RONDA } from './katalog'
import { elementyDachu, poddaszeCzynne } from './dach'
import { naroznikiProstokata } from './operacje'
import { Uklad, normalnaZewn, znajdzUklad } from './topologia'
import type { Projekt } from './typy'

export type Uwaga = { poziom: 'blad' | 'ostrz' | 'info'; tekst: string; scianaId?: string; kondygnacja?: string }

export type Wskazniki = {
  powOdniesienia: number
  powZabudowy: number
  procZabudowy: number
  powUtwardzona: number
  powBio: number
  procBio: number
  powCalkowita: number
  intensywnosc: number
  powUzytkowa: number
  wysokosc: number
  liczbaPokoi: number
  uwagi: Uwaga[]
  uklady: Uklad[]
}

const odlOdProstej = (q: Pt, a: Pt, b: Pt) => dot(sub(q, a), norm(perp(sub(b, a))))
const odlSasiada = (q: Pt) => Math.min(Infinity, ...ODCINKI_SASIAD.map(([a, b]) => rzutNaOdcinek(q, a, b).d))

function kontrolaLinii(pkty: Pt[], co: string, uwagi: Uwaga[]) {
  const przekr = LINIE_ZABUDOWY.map(() => 0)
  let poza = 0
  for (const q of pkty) {
    if (wWielokacie(q, OBSZAR_ZABUDOWY)) continue
    LINIE_ZABUDOWY.forEach((l, i) => {
      const ab = sub(l.b, l.a), t = dot(sub(q, l.a), ab) / dot(ab, ab)
      if (t < -0.2 || t > 1.2) return
      przekr[i] = Math.max(przekr[i], l.d - odlOdProstej(q, l.a, l.b))
    })
    if (!wWielokacie(q, GRANICA)) poza = Math.max(poza, odlegloscOdLamanej(q, GRANICA, true))
  }
  const f = (v: number) => v.toFixed(2).replace('.', ',')
  if (poza > 0.01) uwagi.push({ poziom: 'blad', tekst: `${co} wychodzi poza granicę działki o ${f(poza)} m.` })
  LINIE_ZABUDOWY.forEach((l, i) => {
    if (przekr[i] > 0.01) uwagi.push({ poziom: 'blad', tekst: `${co} przekracza linię zabudowy od granicy „${l.nazwa}” o ${f(przekr[i])} m.` })
  })
}

export function policz(p: Projekt): Wskazniki {
  const u = p.ustawienia
  const powOdniesienia = u.wskaznikiOdTerenuMN ? POW_MN : POW_GEOM
  const uklady = p.kondygnacje.map((k) => znajdzUklad(k))
  const uwagi: Uwaga[] = []
  const f = (v: number) => v.toFixed(2).replace('.', ',')

  let powZabudowy = 0, powCalkowita = 0, powUzytkowa = 0, liczbaPokoi = 0
  uklady.forEach((uk, i) => {
    const k = p.kondygnacje[i]
    const powK = uk.obrysy.reduce((s, o) => s + o.pow, 0)
    if (i === 0) powZabudowy += powK
    powCalkowita += powK
    powUzytkowa += uk.pokoje.reduce((s, r) => s + r.pow, 0)
    liczbaPokoi += uk.pokoje.length
    for (const o of uk.obrysy) kontrolaLinii(o.zewn, i === 0 ? 'Budynek' : `Kondygnacja „${k.nazwa}”`, uwagi)

    // Odległość ścian zewnętrznych od granicy z sąsiadem: 4 m z oknami lub drzwiami, 3 m bez.
    for (const s of k.sciany) {
      if (!uk.zewnetrzne.has(s.id)) continue
      const n = normalnaZewn(s, uk.obrysy)
      const a = add(s.a, mul(n, s.grubosc / 2)), b = add(s.b, mul(n, s.grubosc / 2))
      // Liczą się granice z sąsiadem, do których ściana jest zwrócona (normalna zewnętrzna w ich stronę).
      let d = Infinity
      for (const [c, e] of ODCINKI_SASIAD) {
        const sr = lerp(a, b, 0.5), ku = sub(rzutNaOdcinek(sr, c, e).p, sr)
        if (dot(n, ku) < 0.26 * Math.hypot(ku.x, ku.y)) continue
        d = Math.min(d, odlegloscOdcinkow(a, b, c, e))
      }
      if (d === Infinity) continue
      const zOtworami = s.rodzaj === 'szklana' || k.otwory.some((o) => o.scianaId === s.id && o.rodzaj !== 'przejscie')
      // Ściana bez otworów: odległość z pliku działki (warunki techniczne: 3 m, plan może dopuścić mniej).
      const wymagane = zOtworami ? 4 : MIN_BEZ_OTWOROW
      if (d < wymagane - 0.005) uwagi.push({
        poziom: 'blad', scianaId: s.id, kondygnacja: k.id,
        tekst: `Ściana ${zOtworami ? 'z oknami lub drzwiami' : 'bez otworów'} jest ${f(d)} m od granicy z sąsiadem, wymagane ${zOtworami ? '4 m' : `${f(MIN_BEZ_OTWOROW)} m`} (kondygnacja „${k.nazwa}”).`,
      })
    }
  })

  let powUtwardzona = 0
  for (const e of p.teren) {
    const w = TEREN[e.rodzaj]
    const rogi = naroznikiProstokata(e.x, e.y, e.szer, e.gl, e.obrot)
    if (w.zabudowa) {
      powZabudowy += e.szer * e.gl
      powCalkowita += e.szer * e.gl
      kontrolaLinii(rogi, w.nazwa, uwagi)
      const d = Math.min(...rogi.map((q) => odlSasiada(q)))
      if (d < 3 - 0.005) uwagi.push({ poziom: 'ostrz', tekst: `${w.nazwa}: ${f(d)} m od granicy z sąsiadem. Bliżej niż 3 m wolno tylko ścianą bez otworów i tylko gdy pozwala na to plan.` })
    } else if (e.rodzaj === 'rondo') powUtwardzona += Math.PI * (e.szer / 2) ** 2 * (1 - WYSPA_RONDA ** 2)
    else if (w.bio === 0) powUtwardzona += e.szer * e.gl
    else if (e.rodzaj !== 'drzewo' && rogi.some((q) => !wWielokacie(q, GRANICA))) uwagi.push({ poziom: 'ostrz', tekst: `${w.nazwa} wychodzi poza działkę.` })
  }

  const powBio = Math.max(0, powOdniesienia - powZabudowy - powUtwardzona)
  const procZabudowy = (powZabudowy / powOdniesienia) * 100
  const procBio = (powBio / powOdniesienia) * 100
  const intensywnosc = powCalkowita / powOdniesienia

  // Wysokość: poziom parteru, kondygnacje, ścianka kolankowa i dach.
  let wysokosc = 0
  const n = p.kondygnacje.length
  const ost = uklady[n - 1]
  const dachy = elementyDachu(p, uklady)
  if (ost && ost.obrysy.length) {
    // Bez dachu nad najwyższą kondygnacją liczy się jej strop.
    wysokosc = u.poziomParteru
    for (let i = 0; i < (poddaszeCzynne(p) ? n - 1 : n); i++) wysokosc += p.kondygnacje[i].wysokosc + p.kondygnacje[i].strop
    for (const d of dachy) wysokosc = Math.max(wysokosc, d.baza + d.pr.wys)
  }

  if (u.maxZabudowy != null && procZabudowy > u.maxZabudowy + 0.01) uwagi.push({ poziom: 'blad', tekst: `Powierzchnia zabudowy ${f(procZabudowy)}% przekracza limit ${u.maxZabudowy}% z planu.` })
  if (u.minBioCzynna != null && procBio < u.minBioCzynna - 0.01) uwagi.push({ poziom: 'blad', tekst: `Powierzchnia biologicznie czynna ${f(procBio)}% jest poniżej minimum ${u.minBioCzynna}% z planu.` })
  if (u.maxIntensywnosc != null && intensywnosc > u.maxIntensywnosc + 0.0001) uwagi.push({ poziom: 'blad', tekst: `Intensywność zabudowy ${f(intensywnosc)} przekracza limit ${f(u.maxIntensywnosc)}.` })
  if (u.minIntensywnosc != null && powCalkowita > 0 && intensywnosc < u.minIntensywnosc - 0.0001) uwagi.push({ poziom: 'ostrz', tekst: `Intensywność zabudowy ${f(intensywnosc)} jest poniżej minimum ${f(u.minIntensywnosc)} z planu. Potrzeba co najmniej ${Math.ceil(u.minIntensywnosc * powOdniesienia)} m² powierzchni całkowitej.` })
  if (u.maxKondygnacji != null && n > u.maxKondygnacji) uwagi.push({ poziom: 'blad', tekst: `Plan dopuszcza najwyżej ${u.maxKondygnacji} kondygnacje naziemne.` })
  if (ost && ost.obrysy.length) {
    if (DANE.plan.dachSpadzisty && dachy.some((d) => d.pr.rodzaj === 'plaski' || d.pr.rodzaj === 'jednospadowy')) uwagi.push({ poziom: 'ostrz', tekst: 'Plan miejscowy wymaga dachu dwu- lub wielospadowego, a w projekcie jest dach płaski albo jednospadowy.' })
    const stromy = Math.max(0, ...dachy.filter((d) => d.pr.rodzaj !== 'plaski').map((d) => d.pr.katPolaci))
    if (u.maxKatDachu != null && stromy > u.maxKatDachu) uwagi.push({ poziom: 'blad', tekst: `Nachylenie połaci ${stromy}° przekracza ${u.maxKatDachu}° z planu.` })
    if (p.dach.czesci.length) {
      // Próbkowanie co metr: jaka część rzutu najwyższych stropów nie ma nad sobą żadnej części dachu.
      let wszystkie = 0, odkryte = 0
      uklady.forEach((uk, i) => {
        const wyzej = uklady.slice(i + 1).flatMap((x) => x.obrysy.map((o) => o.zewn))
        for (const o of uk.obrysy) {
          const xs = o.zewn.map((q) => q.x), ys = o.zewn.map((q) => q.y)
          for (let x = Math.min(...xs) + 0.5; x < Math.max(...xs); x += 1) for (let y = Math.min(...ys) + 0.5; y < Math.max(...ys); y += 1) {
            const q = { x, y }
            if (!wWielokacie(q, o.zewn) || wyzej.some((w) => wWielokacie(q, w))) continue
            wszystkie++
            if (!p.dach.czesci.some((c) => wWielokacie(q, naroznikiProstokata(c.x, c.y, c.szer + 0.4, c.gl + 0.4, c.obrot)))) odkryte++
          }
        }
      })
      if (wszystkie && odkryte / wszystkie > 0.03) uwagi.push({ poziom: 'info', tekst: `Około ${Math.round((odkryte / wszystkie) * 100)}% rzutu domu nie ma nad sobą dachu. Dorysuj część narzędziem Dach albo rozciągnij sąsiednią.` })
    }
  }
  if (u.maxWysokosc != null && wysokosc > u.maxWysokosc + 0.01) uwagi.push({ poziom: 'blad', tekst: `Wysokość budynku ${f(wysokosc)} m przekracza limit ${f(u.maxWysokosc)} m z planu.` })

  return { powOdniesienia, powZabudowy, procZabudowy, powUtwardzona, powBio, procBio, powCalkowita, intensywnosc, powUzytkowa, wysokosc, liczbaPokoi, uwagi, uklady }
}

export { pole, lerp }
