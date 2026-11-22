# Planer domu

Aplikacja w przeglądarce do projektowania domu na działce: rzut 2D z granicami działki i liniami zabudowy, wskaźniki z planu miejscowego liczone na bieżąco, widok 3D ze słońcem i wizualizacja willi „Trzy stodoły” z wnętrzami, spacerem i przelotem kamery.

Granice swojej działki wczytasz z usługi ULDK, wpisując identyfikator z geoportalu. Razem z nimi planer może pobrać ortofotomapę, mapę ewidencyjną i rysunek planu miejscowego.

Zbudowane w Claude Code: React, three.js (react-three-fiber), Vite.

## Szybki start

Potrzebny jest Node.js 20.19 albo nowszy.

```bash
npm install
npm run dev
```

Planer: http://127.0.0.1:5183, wizualizacja willi: http://127.0.0.1:5183/?willa

## Pliki

- [INSTRUKCJA.md](INSTRUKCJA.md): instalacja, wczytanie własnej działki krok po kroku, parametry planu miejscowego, sterowanie.
- [PROMPTY.md](PROMPTY.md): polecenia, którymi zbudowałem planer i willę w Claude Code, oraz gotowe polecenia do przerobienia projektu na swoją działkę.
- [LICENCJE.md](LICENCJE.md): źródła i licencje modeli, faktur i nieba.
- `src/dane/`: działka przykładowa i moduł, który czyta działkę (`dzialka.ts`).
- `src/edytor/`: rzut 2D. `src/model/`: ściany, pokoje, dach, wskaźniki, słońce. `src/ui/`: panele. `src/widok3d/`: widok 3D planera.
- `src/willa/`: wizualizacja willi (układ domu w `uklad.ts`, meble w `wnetrza.ts`, ogród w `Ogrod.tsx`, światło w `Swiatlo.tsx`, kamera w `Kamera.tsx`).
- `narzedzia/dzialka.mjs`: pobieranie działki z ULDK i podkładów z geoportalu (`npm run dzialka -- "<identyfikator>"`).

Działka w repozytorium jest zmyślona. Dane Twojej działki (`src/dane/dzialka.json`, `public/mapy/`) są w `.gitignore`.
