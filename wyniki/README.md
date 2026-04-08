# 📁 Folder na wyniki CreepJS

## Konwencja nazewnictwa plików

Format: `Osoba_OS_Przegladarka_Konfiguracja_DD_MM_YYYY.json`

### Przykłady:
- `Kuba_Windows_Chrome_Czyste_01_01_1900.json`
- `Piotr_macOS_Safari_Czyste_11_09_2001.json`
- `Maks_Linux_Tor_Czyste_21_04_2005.json`
- `Bartek_Windows_Brave_Strict_30_04_1945.json`
- `Ola_Windows_LibreWolf_Test1_05_03_1953.json`
- `Ola_Windows_LibreWolf_Test2_09_09_1976.json` *(test losowości)*
- `Kuba_Windows_Chrome_Incognito_20_07_1969.json`

### Zasady:
1. **Bez spacji** — używaj `_` jako separatora
2. **Bez polskich znaków** — `macOS` zamiast `macOS`
3. **4 segmenty** oddzielone `_` (Osoba_OS_Przeglądarka_Konfiguracja)
4. Rozszerzenie `.json`
5. Dla testów losowości (Brave, LibreWolf) — dodaj `Test1`, `Test2` w konfiguracji

### Konfiguracje:
- `Czyste` — czysta przeglądarka, bez rozszerzeń
- `Incognito` — tryb prywatny
- `Strict` — tryb ścisłej prywatności (np. Brave Strict)
- `CanvasBlocker` — z rozszerzeniem CanvasBlocker
- `Test1`, `Test2` — powtórzone testy (randomizacja)
