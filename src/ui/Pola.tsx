import { useEffect, useState } from 'react'

/** Pole liczbowe z przecinkiem dziesiętnym. Zatwierdza Enterem albo wyjściem z pola. */
export function Liczba({ wartosc, zmiana, krok = 0.05, min, max, jedn, miejsca = 2, puste = false, szer }: {
  wartosc: number | null; zmiana: (v: number | null) => void; krok?: number; min?: number; max?: number; jedn?: string; miejsca?: number; puste?: boolean; szer?: number
}) {
  const fmt = (v: number | null) => (v == null ? '' : String(Number(v.toFixed(miejsca))).replace('.', ','))
  const [t, setT] = useState(fmt(wartosc))
  useEffect(() => setT(fmt(wartosc)), [wartosc]) // eslint-disable-line
  const zatwierdz = () => {
    if (puste && t.trim() === '') { if (wartosc != null) zmiana(null); return }
    let v = parseFloat(t.replace(',', '.'))
    if (!isFinite(v)) { setT(fmt(wartosc)); return }
    if (min != null) v = Math.max(min, v)
    if (max != null) v = Math.min(max, v)
    setT(fmt(v))
    if (v !== wartosc) zmiana(v)
  }
  return (
    <span className="liczba" style={szer ? { width: szer } : undefined}>
      <input value={t} inputMode="decimal" placeholder={puste ? 'brak' : undefined}
        onChange={(e) => setT(e.target.value)} onBlur={zatwierdz}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const v = (parseFloat(t.replace(',', '.')) || 0) + (e.key === 'ArrowUp' ? krok : -krok)
            const w = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, v))
            setT(fmt(w)); zmiana(Number(w.toFixed(4)))
          }
        }} />
      {jedn && <em>{jedn}</em>}
    </span>
  )
}

export function Wiersz({ etykieta, children, opis }: { etykieta: string; children: React.ReactNode; opis?: string }) {
  return (
    <label className="wiersz">
      <span className="wiersz-et">{etykieta}{opis && <small>{opis}</small>}</span>
      <span className="wiersz-pole">{children}</span>
    </label>
  )
}

export function Sekcja({ tytul, children, akcja }: { tytul: string; children: React.ReactNode; akcja?: React.ReactNode }) {
  return (
    <section className="sekcja">
      <header><h3>{tytul}</h3>{akcja}</header>
      {children}
    </section>
  )
}

export function Przelacznik({ wartosc, zmiana, children }: { wartosc: boolean; zmiana: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`przelacznik ${wartosc ? 'wl' : ''}`} onClick={() => zmiana(!wartosc)} aria-pressed={wartosc}>
      <i /><span>{children}</span>
    </button>
  )
}

export function Segmenty<T extends string>({ wartosc, opcje, zmiana }: { wartosc: T; opcje: { id: T; nazwa: string; tytul?: string }[]; zmiana: (v: T) => void }) {
  return (
    <div className="segmenty">
      {opcje.map((o) => <button key={o.id} type="button" title={o.tytul} className={o.id === wartosc ? 'akt' : ''} onClick={() => zmiana(o.id)}>{o.nazwa}</button>)}
    </div>
  )
}
