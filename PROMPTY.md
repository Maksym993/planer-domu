# Prompty

Planer i willę zbudowałem w Claude Code, pisząc zwykłe polecenia po polsku. Poniżej są dokładnie te, których użyłem, w tej kolejności, z literówkami. Pod każdym krótko, co z niego powstało. Na końcu są gotowe polecenia, którymi przerobisz projekt na swoją działkę.

Jak tego używać: otwórz Claude Code w katalogu repozytorium (`claude` w terminalu), wklej polecenie i dopisz swoje szczegóły. Claude Code czyta kod, zmienia pliki i uruchamia planer, a Ty oglądasz wynik w przeglądarce.

## Planer domu (dzień 1 i 3)

### 1. Start

Do tego polecenia dołączyłem zdjęcia z danymi działki i ustaleniami planu miejscowego. W repozytorium ich nie ma, zamiast nich jest działka przykładowa.

```text
na podstawie tych zdjęć zrób mi przestrzeń do projektowania domu, chce móc rozmiesccic przestrzennie pierw projekt a pozniej zrobic mozliwosc wizualną, ma to byc na zasadzie aplikacji webowej, wez pod uwage reeserch jak takie aplikacje mialyby wygladac i czego potrzebujesz aby to wygladało w dobry posób
```

Powstał planer: rzut 2D z granicami działki i liniami zabudowy, rysowanie ścian i pokoi, okna i drzwi, wskaźniki z planu i widok 3D.

### 2. Dach z części

```text
dach mi sie teraz robi na całosci nie wazne w jakiej formie sobie zrobie dom to ja chce to sobie ukladac jak chce nie chce na calosci miec dom z dachem chce np przod mniec w stozku a 2 czesc miec prosta np pozniej rób wyglad 3d
```

Dach układa się z części: każda ma własny rodzaj (dwuspadowy, kopertowy, jednospadowy, płaski) i kąt.

### 3. Program domu

```text
chcialbym parterowy nowoczesny dom długi z łącnzikiem w literze H lewa czesc dzialki to podiazdz z mozliwościa zawróceniem auta moze male rondo garaze zprozdu dom pierwsza czesc 120m2 saoln z kuchnia pozniej waski  szklany lacznik i 2 czesc domu to 3 pokje dla dzieci 1 sypiania 2 biura garderoba 3 lazienki pierwsza czesc domu bardzo wysoka ala stodola 2 czesc domu wysoka ale juz bez stozkowanego dachu, duzo oszklnia duze tarasy duze, na tyle dzialki miejsce z silownia i pojem muzycznym okolo 60m2
```

```text
120m2 to tylko czesc salon z kuchnia dom okolo 270-300m2
```

```text
ten dom ktory opisalem jest parterowy
```

Pierwszy wariant domu jako szablon w menu Projekt.

### 4. Układ mniej szablonowy

```text
biura na przud domu za garazami tak aby byla przestrzen na przyjomwanie klientów nie muszac przechodzic przez cały dom, przestrzen na silownie i pokoj muzyczny polaczone i tez gdzies na poczatku domu, tyl ma byc głównie przestrzen na taras i ogórd bez budynków na tyle, zastanawaim sie czy dom nie jest zaporjektowany w sposob zbyt prosty ponieważ chcielibyśmy zagospodarować tą przestrzen w jakis indywidaulany sposob i ciekawy, troche boimy sie ze od salonu zk uchnia jest za daleko na tylnią główna przestrzen ogrodowo tarasową co porponujesz ?
```

```text
niee teraz nie ma sypialni z garderoba i lazienka jak wczesniej co jest bardzo wazne dla rodziców a przestrzen sypialniana wyglada jak korytaz to zle wyglada, myśl nieszbalonowo, dom moze byc zygzakiem albo nie wiem miec nietypowy ksztalt L, masz pelną swobode zmiany na calej dzialce ukaldu
```

Kolejne warianty układu, z apartamentem rodziców i skrzydłem dzieci pod kątem.

### 5. Zapis projektu

```text
dlaczego jak kopiuje localhos na przekladarke to projekt sie nie przenosi ?
```

Projekt zapisuje się na dysku (katalog `zapis/`), więc ten sam adres pokazuje go w każdej przeglądarce.

### 6. Więcej 3D

```text
możesz zrobić wszystkie elementy bardziej 3d bardziej realistyczne ? sprawdz jescze czego brakuje co mozna dodac zeby funkcjonalnosc była jeszcze lepsza
```

Faktury rysowane w pamięci, meble z części, rynny i attyki, niebo, spacer po domu z poziomu oczu, animacja słońca, zakładka Pokoje, wykończenia elewacji i dachu, ogrodzenie, druk rzutu.

## Willa „Trzy stodoły” (dzień 8)

### 7. Dom najwyższej klasy

Do tego polecenia dołączyłem zdjęcie wnętrza, które mi się podobało (salon z sufitem z drewnianych lameli i sofą w dołku).

```text
na działce z projektu  http://127.0.0.1:5183/?piaskownica=wariant3 zrób dob który będzie spektakluarnym miejscem, nie ogrniczaj sie ma to być projekt najwyzszej klasy jaki mogłby zrobić projektant, wnętrze ma być dopracowane do kazdego minimalnego detalu, chodzenie 3d, samochody garaże, ogórd i wszystko maja byc najlepsza wersja realistyczneych odzwierciedlen, dom ma być zmienony bo obecnie jest niekoniecznie swoja najlepsza wersją. spróbuj znaleśc w itnernecie prawdziwe milionowe projekty które mogłbys usadowic na działce. pózniej bedziemy robić z tego film instruktarzowy na instagram wiec efekt musi byc powalający
```

Powstała osobna scena `?willa`: stodoły połączone szklanymi łącznikami, salon z dołkiem rozmów i wiszącym kominkiem, kuchnia z wyspą, basen, garaż z autem, ogród, cztery pory dnia, spacer i przelot kamery. Claude zapytał o metraż (wyszło ok. 505 m²), odpowiedziałem „Zostaje 505 m²”.

### 8. Ten sam dom w planerze

```text
ale dlaczego funkcje całego profgramu teraz znikneły ?
```

Willa dostała link do planera, a dom „Trzy stodoły” trafił do planera jako szablon, więc rzut, wskaźniki i wizualizacja pokazują ten sam budynek.

### 9. Poprawki przy nagrywaniu filmu

```text
Jeżeli uważasz że w projekcie coś mogłby zostac pokazane lepiej w willi 3d ze cos nie jest dopracowane to to zrób
```

Basen nocą z poświatą dna i lampami w ścianach (wcześniej trawnik leżał nad niecką).

```text
z lota salon nie ma kanapy tylko jest jakas dziwna ciemna cegla przy oduszkach
```

Dołek rozmów z prawdziwą sofą i poduszkami (wcześniej zalewała go płyta stropu).

```text
a komin zwisajacy powinien być dookoła otwarty a nie tlyko od strony ogrodu
```

Wiszący kominek otwarty dookoła, okap na trzech prętach.

## Polecenia do Twojej działki

Tych nie pisałem przy budowie, to gotowe teksty do skopiowania. Najpierw wczytaj swoją działkę (INSTRUKCJA.md, krok 2 i 3), potem otwórz Claude Code w katalogu planera.

Przeniesienie willi na Twoją działkę:

```text
W src/dane/dzialka.json jest moja działka. Willa „Trzy stodoły” (src/willa/uklad.ts, nawierzchnie.ts, Ogrod.tsx, wnetrza.ts, Kamera.tsx) jest zaprojektowana pod działkę przykładową. Dopasuj ją do mojej: dom ma stać w obszarze zabudowy (OBSZAR_ZABUDOWY z src/dane/dzialka.ts), wjazd od granicy typu „droga”, ogrodzenie i żywopłoty wzdłuż moich granic, ujęcia kamery tak, żeby było widać dom. Jeśli dom się nie mieści, zaproponuj, co skrócić, zanim zaczniesz zmieniać. Na koniec sprawdź w planerze zakładkę Wskaźniki, czy nie ma błędów.
```

Dom według Twojego programu:

```text
Zaprojektuj w planerze dom na mojej działce (src/dane/dzialka.json). Program: [tu wpisz: ile pięter, jakie pokoje i ile metrów, garaż, taras, styl dachu]. Dodaj go jako nowy szablon w menu Projekt, obok „Trzy stodoły”, i sprawdź wskaźniki z planu oraz odległości od sąsiadów. Pokaż mi rzut i widok 3D, zanim zaczniesz dopracowywać wnętrza.
```

Dom ze zdjęcia, które Ci się podoba (dołącz zdjęcie domu albo wnętrza):

```text
Dołączam zdjęcie domu, który mi się podoba. Zaprojektuj podobny dom na mojej działce z src/dane/dzialka.json: [co ma się znaleźć w domu, np. 4 sypialnie, garaż, taras]. Dodaj go jako nowy szablon w menu Projekt planera i zrób dla niego wizualizację jak w src/willa, z wnętrzami w stylu ze zdjęcia. Najpierw pokaż mi rzut i wskaźniki z planu, potem dopracowuj wnętrza.
```

Ustalenia planu miejscowego ze zdjęcia albo PDF:

```text
Dołączam wypis z planu miejscowego dla mojej działki. Wpisz z niego do src/dane/dzialka.json pole plan (maksymalna zabudowa, biologicznie czynna, intensywność, wysokość, dach, liczba kondygnacji, opis i źródło) oraz linie zabudowy przy granicach w polu krawedzie. Wypisz mi, czego w dokumencie nie znalazłeś.
```

Wizualizacja własnego domu w stylu willi:

```text
Na podstawie mojego projektu z planera (zapis/glowny.json) zrób wizualizację jak w src/willa: prawdziwe materiały, meble we wnętrzach, ogród, pory dnia, spacer i przelot kamery. Korzystaj z zasobów, które już są w public/willa, a nowe bierz tylko z licencją CC0.
```
