# Browser Fingerprinting Analysis — Projekt AGH

Projekt badawczy dotyczący prywatności w sieci, skupiający się na zjawisku **Browser Fingerprinting**. W ramach projektu wykorzystujemy zmodyfikowane narzędzie [CreepJS](https://github.com/abrahamjuliot/CreepJS) do zbierania unikalnych identyfikatorów z różnych konfiguracji przeglądarek w celu sprawdzenia skuteczności mechanizmów anti-fingerprinting.

## Pomiary i zbiory danych (JSON)

Każdy z członków zespołu zbiera próbki fingerprintingu z różnych przeglądarek i systemów operacyjnych. Pliki wynikowe w formacie JSON wrzucamy do odpowiednich folderów w obrębie katalogu `wyniki/`:

- `wyniki/jakub_json/`
- `wyniki/kamil_json/`
- `wyniki/maksymilian_json/`
- `wyniki/piotr_pazdan_json/`
- `wyniki/piotr_straszak_json/`

> **Ważne:** Trzymaj się konwencji nazewnictwa plików określonej w `wyniki/README.md`. Zapewni to prawidłowe działanie parsera!

## Architektura Projektu

1. **Hostowany CreepJS (zbieranie danych):** Ten fork CreepJS pozwala członkom zespołu wchodzić na udostępniony adres (przez Vercel lub GitHub Pages) z rożnych konfiguracji systemowych i zapisywać informacje zebrane z Canvas, WebGL, Fonts, itp.
2. **Parser Python:** Zebrane setki metryk z 30+ środowisk parsowane są skryptem `parser/parse_creepjs.py`. Ekstrahujemy kluczowe cechy (Trust Score, Lies, Canvas/WebGL hash).
3. **Pliki wyjściowe:** Skrypt generuje zagregowany plik `.csv` oraz `dashboard/data/raport.json` do podglądu z gotowymi statystykami.
4. **Interaktywny Dashboard:** Plik `dashboard/index.html` przedstawia raport wizualizujący zebrane dane — czy Incognito zmienia fingerprint? Jak rozszerzenia blokujące modyfikują Canvas (i co za tym idzie obniżają "trust score")?

## Jak wygenerować najnowszy raport?

Zainstaluj wymagane pakiety:
```bash
pip install -r parser/requirements.txt
```

Uruchom parser (zbierze statystyki i nadpisze pliki dashboardu automatycznie) będąc w folderze głównym repozytorium:
```bash
python parser/parse_creepjs.py
```

Następnie otwórz `dashboard/index.html` w przeglądarce, żeby zobaczyć gotową analizę. Hostować ten dashboard można na dowolnym statycznym serwerze (także na GitHub Pages).
