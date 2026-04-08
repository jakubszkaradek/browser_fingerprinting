# 📁 Folder na wyniki CreepJS

## Konwencja nazewnictwa plików

Format: `Osoba_OS_Przegladarka_Konfiguracja.json`

### Przykłady:
- `Kuba_Windows_Chrome_Czyste.json`
- `Piotr_macOS_Safari_Czyste.json`
- `Maks_Linux_Tor_Czyste.json`
- `Bartek_Windows_Brave_Strict.json`
- `Ola_Windows_LibreWolf_Test1.json`
- `Ola_Windows_LibreWolf_Test2.json` *(test losowości)*
- `Kuba_Windows_Chrome_Incognito.json`

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
