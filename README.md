# MangaVerse — czytnik mang (Expo)

Krótki, lekki czytnik mang z integracją z MangaDex. Aplikacja napisana w React Native + Expo (expo-router). Ten README zawiera szybkie instrukcje instalacji, uruchomienia i najczęstsze problemy.

## Funkcje
- Przegląd biblioteki (MangaDex)
- Szczegóły mangi, lista rozdziałów
- Offline cache rozdziałów (AsyncStorage)
- Czytnik z pinch-to-zoom / pan (bez double‑tap)
- Prosty system logowania (token w AsyncStorage)

## Wymagania
- Node.js (14+ zalecane)
- Yarn lub npm
- Expo CLI: `npm install -g expo-cli` lub `npx expo`
- (opcjonalnie) Git, GH CLI jeśli chcesz utworzyć repozytorium z linii poleceń

## Instalacja
1. Przejdź do katalogu projektu:
   ```bash
   cd /home/igor/Documents/projekty/MangaVerse/manga-reader
   ```
2. Zainstaluj zależności (npm lub yarn):
   ```bash
   npm install
   # lub
   yarn
   ```
3. Zainstaluj dodatkowe biblioteki używane w projekcie (jeśli nie są w package.json):
   ```bash
   expo install expo-linear-gradient @react-native-async-storage/async-storage
   npm install react-native-image-pan-zoom
   # (opcjonalnie)
   expo install react-native-gesture-handler
   ```

## Uruchamianie podczas developmentu
- Metro / Expo (z czyszczeniem cache — zalecane przy zmianach routingu):
  ```bash
  EXPO_ROUTER_APP_ROOT=app expo start -c
  ```
- Otwórz w Expo Go (Android/iOS) albo w emulatorze.

## Budowanie (produkcja)
- Android:
  ```bash
  eas build -p android
  ```
- iOS:
  ```bash
  eas build -p ios
  ```
(Użyj EAS lub klasycznych narzędzi expo; skonfiguruj konto Apple/Google jeśli potrzebne.)

## Ustawienia środowiskowe / tokeny
- Aplikacja przechowuje token MangaDex w AsyncStorage pod kluczem `mangadex_token`. Możesz ustawić/usunąć go ręcznie dla debugowania.
- Jeśli dodasz zmienne środowiskowe, umieść je w pliku `.env` (uwaga: .env jest w .gitignore).

## Git / Repozytorium
- Projekt ma gotowy `.gitignore`. Aby utworzyć prywatne repo i wypchnąć:
  ```bash
  git init
  git add .
  git commit -m "Initial commit"
  gh repo create MangaVerse-manga-reader --private --source=. --remote=origin --push
  ```
  (jeśli nie masz `gh`, stwórz repo ręcznie na GitHub i ustaw remote)

## Najczęstsze problemy i rozwiązania
- "Unmatched Route" przy expo-router: upewnij się, że masz plik `app/index.js` który przekierowuje do `LoginScreen`/`LibraryScreen`.
- Ostrzeżenia o plikach w `app/` (np. api/utils traktowane jak route): przenieś helpery poza `app/` (np. `src/api`, `src/utils`) lub poprzedź folder `_` (ale lepiej poza `app/`).
- Pinch/gesture nie działa: upewnij się, że `react-native-gesture-handler` jest zainstalowany oraz że `app/_layout.js` opakowuje tree w `GestureHandlerRootView`. Jeśli występują konflikty, alternativa: `react-native-image-pan-zoom` (użyte w projekcie).
- Cache rozdziałów: klucz `chapter_pages_{id}` w AsyncStorage.

## Struktura projektu (ważne pliki)
- `app/` — ekranowa część expo-router (screens, _layout.js, index.js)
- `src/api/` — integracje z MangaDex (getChapterPages, getLibrary, login)
- `src/utils/` — pomocnicze funkcje
- `app/screens/` — ekrany: LoginScreen, LibraryScreen, MangaDetailScreen, ReaderScreen

## Kontrybucja
- Projekt prywatny — dodaj issue/przykłady lokalnie. Jeśli chcesz publicznie, rozważ dodanie licencji (MIT / Apache 2.0).

## Kontakt / dalsze kroki
- Jeśli chcesz, przygotuję gotowy plik LICENSE (MIT) i README w wersji angielskiej, lub dodam skrypt CI (GitHub Actions) do buildów.
