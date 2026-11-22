# Instrukcja: planer domu na Twojej działce

Planer to aplikacja w przeglądarce. Rysujesz w niej dom na działce, a ona od razu liczy powierzchnię zabudowy, powierzchnię biologicznie czynną, intensywność, wysokość i sprawdza linie zabudowy oraz odległości od sąsiada. Obok jest widok 3D ze słońcem o dowolnej porze roku i osobna wizualizacja willi „Trzy stodoły” z wnętrzami, spacerem i przelotem kamery.

Po pobraniu planer pokazuje działkę przykładową (zmyśloną). Swoją wczytasz w kilka minut, opis niżej.

## 1. Co trzeba mieć

- Node.js w wersji 20.19 albo nowszej (najprościej wersja LTS ze strony https://nodejs.org). Sprawdzisz to w terminalu poleceniem `node --version`.
- Komputer z przeglądarką Chrome, Edge, Safari albo Firefox. Wizualizacja willi jest ciężka, na starszym laptopie będzie zwalniać.
- Około 500 MB miejsca na dysku (aplikacja z zasobami 3D i biblioteki).

## 2. Pobranie i uruchomienie

Pobierz repozytorium: na GitHubie zielony przycisk „Code”, potem „Download ZIP” (i rozpakuj), albo w terminalu:

```bash
git clone https://github.com/Maksym993/planer-domu.git
cd planer-domu
```

Zainstaluj biblioteki i uruchom planer:

```bash
npm install
npm run dev
```

Otwórz w przeglądarce adres http://127.0.0.1:5183. Gdy port 5183 jest zajęty, uruchom planer na innym, np. `npm run dev -- --port 5200`, i otwórz http://127.0.0.1:5200.

Na starcie zobaczysz okno „Od czego zaczynamy?”:

- „Wczytaj trzy stodoły” wstawia gotowy dom z wizualizacji,
- „Obrys domu” wstawia prostokąt ścian przy linii zabudowy,
- „Mały dom przykładowy” to parterowy dom 137 m² z pokojami i meblami,
- „Pusta działka” zostawia Cię z narzędziami rysowania.

Wizualizacja willi jest pod adresem http://127.0.0.1:5183/?willa albo pod przyciskiem „Willa 3D” na górnym pasku.

## 3. Twoja działka krok po kroku

### Krok 1. Znajdź identyfikator działki

1. Wejdź na https://mapy.geoportal.gov.pl.
2. Wpisz w wyszukiwarkę adres albo przybliż mapę do swojej działki.
3. Kliknij działkę. W okienku z informacją znajdziesz pole „Identyfikator działki”. Ma postać `123456_7.0001.123/4`: kod gminy z cyfrą typu gminy, numer obrębu i numer działki.
4. Skopiuj go.

Zamiast identyfikatora możesz wpisać nazwę obrębu i numer działki, np. „Nazwa obrębu 123/4”. Jeśli pasuje kilka działek, planer pokaże listę do wyboru.

### Krok 2. Pobierz granice i podkłady

W planerze otwórz zakładkę **Działka** w prawym panelu. W sekcji „Twoja działka”:

1. Wklej identyfikator.
2. Zostaw zaznaczone „Pobierz też podkłady z geoportalu”, jeśli chcesz mieć pod rzutem ortofotomapę, mapę ewidencyjną i rysunek planu miejscowego.
3. Kliknij „Pobierz”. Granice przychodzą w kilka sekund, podkłady do minuty.

Strona przeładuje się sama i pokaże Twoją działkę.

Co dzieje się w środku:

- granice pobiera usługa ULDK GUGiK (https://uldk.gugik.gov.pl) w układzie PL-1992 (EPSG:2180), to dane z ewidencji gruntów;
- ortofotomapa pochodzi z usługi WMS geoportalu (GUGiK), działki i budynki z Krajowej Integracji Ewidencji Gruntów, a rysunek planu z Krajowej Integracji Miejscowych Planów Zagospodarowania Przestrzennego (jeśli gmina przekazała tam swój plan);
- wynik zapisuje się w pliku `src/dane/dzialka.json`, a obrazy w katalogu `public/mapy/`.

To samo zrobisz w terminalu, przy wyłączonym albo włączonym planerze:

```bash
npm run dzialka -- "123456_7.0001.123/4"
npm run dzialka -- "123456_7.0001.123/4" --bez-map
```

### Krok 3. Opisz granice

ULDK podaje same granice. Nie wie, która z nich biegnie wzdłuż drogi, a która przy sąsiedzie. To trzeba ustawić raz, w zakładce **Działka**, w sekcji „Granice”:

1. Przy każdej granicy wybierz typ: „droga”, „sąsiad”, „rów, woda” albo „inne”. Długość granicy pomaga rozpoznać, która jest która. Możesz też wpisać własną nazwę, np. „droga gminna”.
2. Przy drodze (i przy rowie, jeśli plan tak mówi) wpisz nieprzekraczalną linię zabudowy w metrach. Znajdziesz ją na rysunku planu albo w tekście uchwały, zwykle to 4 do 8 m od drogi.
3. Kliknij „na front” przy granicy, od której wjeżdżasz na działkę. Od niej liczy się układ rzutu: oś x biegnie w głąb działki, oś y wzdłuż frontu.
4. Kliknij „Zapisz granice i przelicz”.

Planer narysuje zieloną przerywaną linią obszar, w którym wolno stawiać budynek. Przy granicach oznaczonych jako „sąsiad” sprawdza odległości z warunków technicznych (§ 12): 4 m dla ściany z oknami albo drzwiami, 3 m dla ściany bez otworów.

### Krok 4. Wpisz ustalenia planu miejscowego

Plan miejscowy znajdziesz w Biuletynie Informacji Publicznej gminy (zakładka z planami zagospodarowania przestrzennego) albo w geoportalu, w warstwie planów. Jeśli dla działki nie ma planu, te same parametry wpisuje gmina w decyzji o warunkach zabudowy.

Liczby wpisujesz w zakładce **Wskaźniki**, w sekcji „Limity z planu”: maksymalna powierzchnia zabudowy, minimalna powierzchnia biologicznie czynna, intensywność zabudowy od i do, maksymalna wysokość, maksymalne nachylenie dachu. Kontrola wyżej przelicza się od razu.

Te limity zapisują się w projekcie. Żeby każdy nowy projekt zaczynał z Twoimi wartościami, wpisz je też w pliku `src/dane/dzialka.json`, w polu `plan`:

```json
"plan": {
  "maxZabudowy": 30,
  "minBioCzynna": 40,
  "minIntensywnosc": 0.05,
  "maxIntensywnosc": 0.6,
  "maxWysokosc": 10,
  "maxKatDachu": 45,
  "maxKondygnacji": 2,
  "dachSpadzisty": true,
  "opis": ["Teren MN: zabudowa mieszkaniowa jednorodzinna.", "Linia zabudowy 6 m od drogi."],
  "zrodlo": "Uchwała nr ... rady gminy ... z dnia ..."
}
```

- `maxZabudowy` i `minBioCzynna` to procenty powierzchni działki, `null` znaczy „plan nie określa”;
- `minIntensywnosc` i `maxIntensywnosc` to stosunek powierzchni wszystkich kondygnacji do powierzchni działki;
- `maxWysokosc` w metrach, `maxKatDachu` w stopniach;
- `dachSpadzisty: true` włącza ostrzeżenie przy dachu płaskim i jednospadowym;
- `opis` to lista zdań, którą planer pokazuje w zakładce Działka, a `zrodlo` to numer uchwały albo decyzji.

W tym samym pliku są jeszcze cztery pola, przydatne rzadziej:

- `teren`: symbol przeznaczenia z planu, np. `MN` (pokazuje się na górnym pasku);
- `powEwidencyjna`: powierzchnia z wypisu z rejestru gruntów, w m²;
- `minBezOtworow`: odległość ściany bez okien od granicy z sąsiadem, jeśli plan pozwala na mniej niż 3 m;
- `pasDrogi`: część działki, którą plan przeznacza pod poszerzenie drogi, jako lista punktów w układzie PL-1992 (te same współrzędne co `wierzcholki`). Planer zakreskuje ten pas i pozwoli liczyć wskaźniki bez niego.

Po zapisaniu pliku planer przeładuje się sam.

### Krok 5. Narysuj dom

Menu **Projekt** na górnym pasku: „Nowy, pusta działka” daje czysty rzut. Narzędzia są na pasku po lewej: zaznaczanie, ściana, pokój z prostokąta, drzwi, okno, układanie dachu, zagospodarowanie działki i miara. Każde ma skrót z jednej litery, listę pokazuje przycisk z klawiaturą na górnym pasku. Meble wstawiasz z zakładki Meble w prawym panelu. Rzut 2D i widok 3D możesz oglądać obok siebie przyciskiem „Rzut i 3D”. W widoku 3D jest panel słońca: miesiąc, godzina i przycisk „Odtwórz dzień”, który przesuwa cienie przez cały dzień.

Projekt zapisuje się sam w przeglądarce i w katalogu `zapis/`. Menu Projekt ma też zapis i odczyt pliku JSON oraz druk rzutu albo zapis do PDF.

### Krok 6. Willa na Twojej działce

Willa „Trzy stodoły” jest zaprojektowana pod działkę przykładową: około 22 na 123 m, z wjazdem od północy. Jej geometria jest w pliku `src/willa/uklad.ts`, a ogród, ogrodzenie i podjazd w `src/willa/nawierzchnie.ts` i `src/willa/Ogrod.tsx`. Na Twojej działce dom może wyjść poza granice albo stanąć bokiem do drogi. Najszybciej przeniesiesz go poleceniem w Claude Code, gotowy tekst jest w pliku PROMPTY.md, w części „Polecenia do Twojej działki”.

### Powrót do działki przykładowej

W zakładce Działka przycisk „Wróć do działki przykładowej” albo w terminalu:

```bash
npm run dzialka -- --przyklad
```

## 4. Sterowanie w wizualizacji willi

- Orbita: przeciągnij myszą, kółkiem przybliżasz.
- Punkty widokowe (z lotu ptaka, wjazd, ogród i basen, salon, kuchnia, pokoje, garaż i inne) oraz pory dnia (dzień, złota godzina, zmierzch, noc): przyciski w panelu.
- „Spacer”: kliknij w obraz, mysz rozgląda się, W, A, S, D chodzą, Shift przyspiesza, Esc kończy.
- „Przelot”: kamera przejeżdża po ujęciach domu.
- „Kadr 9:16”: pionowy kadr do nagrania na telefon.
- H chowa panel, „Zdjęcie PNG” zapisuje klatkę.

Model Ferrari z przykładów three.js nie jest częścią repozytorium (patrz LICENCJE.md). Jeśli chcesz go mieć przed garażem, pobierz go poleceniem `npm run ferrari` i odśwież willę.

## 5. Prywatność i ograniczenia

- Plik `src/dane/dzialka.json`, katalog `public/mapy/` i zapisane projekty są w `.gitignore`. Gdy wrzucisz swoją wersję na GitHuba, numer działki i ortofotomapa zostaną na Twoim komputerze. Pamiętaj o tym, gdy publikujesz zrzuty ekranu: górny pasek i zakładka Działka pokazują numer i obręb.
- Granice z ULDK to dane ewidencyjne. Do projektu budowlanego potrzebna jest mapa do celów projektowych od geodety.
- Kontrola wskaźników jest orientacyjna. Nie zastępuje architekta ani wypisu i wyrysu z planu.
