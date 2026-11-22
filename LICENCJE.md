# Licencje i źródła zasobów

Zasoby 3D w `public/willa/` pochodzą z poniższych źródeł. Licencje sprawdziłem na stronach źródeł 22.11.2026.

## Poly Haven, CC0

https://polyhaven.com, licencja CC0 (domena publiczna, bez obowiązku podpisu): https://polyhaven.com/license

- Modele w `public/willa/mod/`: Ottoman_01, Ukulele_01, book_encyclopedia_set_01, brass_vase_01, ceramic_vase_01, ceramic_vase_02, ceramic_vase_03, ceramic_vase_04, chess_set, desk_lamp_arm_01, marble_bust_01, mid_century_lounge_chair, modern_arm_chair_01, modern_wooden_cabinet, potted_plant_01, potted_plant_02, potted_plant_04, side_table_01, wine_bottles_01, wooden_bowl_01 oraz same faktury kory jacaranda_tree.
- Faktury w `public/willa/tex/`: asphalt_02, concrete_floor_02, concrete_wall_008, curly_teddy_natural, fabric_leather_02, flamed_black_veneer, granite_tile, gravel_floor, laminate_floor_02, large_grey_tiles, oak_veneer_01, plastered_wall_02, rough_linen, smoked_walnut_veneer, teak_veneer, velour_velvet, white_oak_veneer, wood_textured_concrete. Pliki przepakowane do `diff.jpg`, `nor.jpg`, `arm.jpg`.
- Niebo HDR w `public/willa/hdri/`: kloofendal_48d_partly_cloudy_puresky, qwantani_sunset_puresky, qwantani_dusk_2_puresky, kloppenheim_02_puresky. W plikach z końcówką `_bs` tarcza słońca jest wycięta, bo słońce w scenie to osobne światło z cieniem.
- Liście i kora w `public/willa/liscie/`: `pine_tree_01_bark_*` bez zmian; `jesion.png`, `swierk.png` i `klon.png` to faktury liści jacaranda_tree i gałązki fir_tree_01 złożone w jeden obraz z przezroczystością i przebarwione; `brzoza.png` i `grab.png` składają się z wycinków liści island_tree_01 na łodygach narysowanych skryptem.

## ambientCG, CC0

https://ambientcg.com, licencja CC0: https://docs.ambientcg.com/license/

- Trawnik `public/willa/tex/trawnik/`: zestaw Grass001 (2K), przepakowany do `diff.jpg`, `nor.jpg`, `arm.jpg`.

## Khronos glTF Sample Assets, CC BY 4.0

- Samochód koncepcyjny `public/willa/auta/concept.glb`: model CarConcept z https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept. © 2024 Darmstadt Graphics Group GmbH, model i faktury: Eric Chadwick, licencja Creative Commons Attribution 4.0 International (https://creativecommons.org/licenses/by/4.0/). Logo Khronos i 3D Commerce na modelu to znaki towarowe Khronos Group i licencja ich nie obejmuje. Ten podpis musi zostać przy publikacji obrazu z autem.

## three.js

- Dekoder Draco `public/willa/draco/`: z repozytorium three.js (`examples/jsm/libs/draco`), biblioteka Google Draco, licencja Apache 2.0 (https://github.com/google/draco).
- Mapa fal wody `public/willa/tex/waternormals.jpg`: z przykładów three.js (`examples/textures/waternormals.jpg`), repozytorium three.js ma licencję MIT.
- Ferrari 458 Italia: plik `ferrari.glb` z przykładów three.js (`examples/models/gltf/ferrari.glb`). Przykład three.js `webgl_materials_car` podpisuje go: model by vicent091036 (Sketchfab). Strona modelu na Sketchfab już nie istnieje i licencji nie udało się potwierdzić, dlatego tego pliku nie ma w repozytorium. Pobiera go z repozytorium three.js polecenie `npm run ferrari`; bez niego willa pokazuje samo auto koncepcyjne.

## Wygenerowane

- Marmur `public/willa/tex/marmur_calacatta/`: wygenerowany skryptem (szum i żyły), bez obrazu źródłowego.
- Kora brzozy `public/willa/liscie/kora_brzozy.jpg`: wygenerowana skryptem.
- Faktury planera (tynk, deska, rąbek, dachówka, kostka, podłogi) rysuje w pamięci kod w `src/widok3d/materialy.ts`, a mozaikę basenu, refleksy na dnie i drzewa kod w `src/willa/`.

## Dane o działkach

Planer nie zawiera danych żadnej prawdziwej działki. Granice, ortofotomapę, mapę ewidencyjną i rysunek planu pobiera na Twoje polecenie z usług państwowych: ULDK GUGiK (https://uldk.gugik.gov.pl), geoportal GUGiK (https://www.geoportal.gov.pl), Krajowa Integracja Ewidencji Gruntów i Krajowa Integracja Miejscowych Planów Zagospodarowania Przestrzennego. Przy publikacji ortofotomapy podaj źródło: geoportal.gov.pl (GUGiK).
