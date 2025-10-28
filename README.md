# MangaVerse — Manga Reader (Expo)

Lightweight MangaDex reader built with React Native + Expo (expo-router). This README covers setup, running, and key features. The app UI is fully in English.



## Requirements
- Node.js 18+ recommended
- npm or yarn
- Expo CLI (via `npx expo`, no global install required)

## Installation
1) Go to the project directory:
```bash
cd /home/igor/Documents/projekty/MangaVerse/manga-reader
```
2) Install dependencies:
```bash
npm install
# or
yarn
```
3) Native helpers (already listed in package.json but for reference):
```bash
expo install @react-native-async-storage/async-storage
npm install react-native-image-pan-zoom
expo install react-native-gesture-handler
```

## Running (development)
Start Metro/Expo with a clean cache (recommended when routes change):
```bash
EXPO_ROUTER_APP_ROOT=app expo start -c
```
Then open on a device with Expo Go, or in an emulator/simulator.

## Building (production)
- Android:
```bash
eas build -p android
```
- iOS:
```bash
eas build -p ios
```
Use EAS with appropriate Apple/Google accounts as needed.

## Login and tokens
- The app stores tokens in AsyncStorage under:
  - `mangadex_token` (access token)
  - `mangadex_refresh_token` (refresh token)
  - `mangadex_client_id`, `mangadex_client_secret` (saved from the login screen)
- Login screen fields:
  - Client ID, Client Secret (from your MangaDex OAuth client)
  - Email and Password (your MangaDex credentials)
- Token refresh uses the stored client credentials automatically.

## Storage keys (reference)
- `selected_manga` — last selected manga object
- `selected_chapter` — last opened chapter object
- `chapters_order` — order of chapters for reader transitions
- `current_chapter_index` — index of the currently opened chapter
- `chapter_pages_<chapterId>` — cached array of page URLs
- `reading_pos_<chapterId>` — last page index for that chapter

## Project structure
- `app/` — screens and routing (expo-router):
  - `app/index.js` — boot and auth check
  - `app/screens/` — Login, Library, Manga Detail, Reader
- `src/api/` — MangaDex API integration (login, library, chapters, pages)
- `src/utils/` — helpers

## Troubleshooting
- Unmatched route with expo-router:
  - Ensure `app/index.js` exists and redirects to Login/Library appropriately.
- Gestures/zoom issues:
  - Ensure `react-native-gesture-handler` is installed and your layout is properly configured. The reader uses `react-native-image-pan-zoom` to avoid conflicts.
- Covers not showing:
  - Library requests use `includes[]=cover_art`. If you fork code, keep the param and bracket serialization via `qs`.
- Cache cleanup:
  - Deleting a chapter from the details screen removes `chapter_pages_<id>` and `reading_pos_<id>`.

## Contributing
Private project for now. If you plan to open source, consider adding a LICENSE (MIT/Apache-2.0) and PR templates.

## Roadmap (nice-to-have)
- Previous-chapter sentinel gesture
- Reader LTR/RTL toggle in settings
- Page scrubber or thumbnails

