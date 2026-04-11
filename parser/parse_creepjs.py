#!/usr/bin/env python3
"""
CreepJS JSON Parser — Browser Fingerprinting Analysis
=====================================================
Parsuje pliki JSON wygenerowane przez CreepJS i tworzy:
1. raport_koncowy.csv — płaski CSV do analizy
2. dashboard/data/raport.json — JSON zoptymalizowany pod dashboard

Użycie:
    python parse_creepjs.py                    # domyślnie szuka w ../wyniki/
    python parse_creepjs.py --input ../wyniki  # custom ścieżka
    python parse_creepjs.py --input ../wyniki --output ../dashboard/data
"""

import json
import os
import sys
import argparse
import hashlib
from datetime import datetime
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("❌ Brak biblioteki pandas. Zainstaluj: pip install pandas")
    sys.exit(1)


# ─────────────────────────────────────────────────
# Bezpieczne wyciąganie zagnieżdżonych wartości
# ─────────────────────────────────────────────────
def safe_get(data, *keys, default=None):
    """Bezpiecznie wyciąga zagnieżdżoną wartość z dict."""
    current = data
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key)
        else:
            return default
        if current is None:
            return default
    return current


def parse_filename(filename):
    """
    Parsuje nazwę pliku wg konwencji: Osoba_OS_Przegladarka_Konfiguracja.json
    Zwraca dict z kluczami lub None jeśli format nie pasuje.
    """
    name = Path(filename).stem
    parts = name.split('_')

    if len(parts) >= 4:
        return {
            'Osoba': parts[0],
            'OS': parts[1],
            'Przegladarka': parts[2],
            'Konfiguracja': '_'.join(parts[3:])  # pozwala na "Test1" itp.
        }
    elif len(parts) == 3:
        return {
            'Osoba': parts[0],
            'OS': parts[1],
            'Przegladarka': parts[2],
            'Konfiguracja': 'Nieznana'
        }
    else:
        # Fallback — traktuj całą nazwę jako label
        return {
            'Osoba': name,
            'OS': 'Nieznany',
            'Przegladarka': 'Nieznana',
            'Konfiguracja': 'Nieznana'
        }


def extract_metrics(data, filename):
    """
    Wyciąga 40+ metryk z jednego pliku JSON CreepJS.
    Zwraca płaski dict gotowy do DataFrame.
    """
    fp = data.get('fullFingerprint', {})
    summary = data.get('summary', {})
    trust = data.get('trustScore', {})
    lies = data.get('lies', {})
    nav = fp.get('navigator', {})
    screen = fp.get('screen', {})
    tz = fp.get('timezone', {})
    css_media = fp.get('cssMedia', {})
    audio = fp.get('offlineAudioContext', {})
    fonts = fp.get('fonts', {})
    headless = fp.get('headless', {})
    resistance = fp.get('resistance', {})
    worker = fp.get('workerScope', {})
    canvas_webgl = fp.get('canvasWebgl', {})

    # Parsowanie nazwy pliku
    file_meta = parse_filename(filename)

    # Lies details
    lie_keys = summary.get('lieKeys', [])
    lies_details = safe_get(lies, 'details', 'data', default={})

    # GPU info
    gpu_compressed = safe_get(summary, 'gpu', 'compressedGPU', default='Brak')
    gpu_confidence = safe_get(summary, 'gpu', 'confidence', default='Brak')
    gpu_grade = safe_get(summary, 'gpu', 'grade', default='Brak')

    # Media CSS
    media_css = safe_get(css_media, 'mediaCSS', default={})

    # Headless details
    like_headless = safe_get(headless, 'likeHeadless', default={})
    headless_details = safe_get(headless, 'headless', default={})
    stealth_details = safe_get(headless, 'stealth', default={})

    # Fonts list
    fonts_list = summary.get('fontsList', [])
    font_face_load = safe_get(fonts, 'fontFaceLoadFonts', default=[])

    # WebGL extensions count
    webgl_extensions = safe_get(canvas_webgl, 'extensions', default=[])

    row = {
        # ─── Meta z nazwy pliku ───
        'Osoba': file_meta['Osoba'],
        'OS': file_meta['OS'],
        'Przegladarka': file_meta['Przegladarka'],
        'Konfiguracja': file_meta['Konfiguracja'],
        'Plik': filename,

        # ─── Główne metryki ───
        'Fingerprint_ID': data.get('fingerprintId', 'Brak'),
        'Fingerprint_ID_Short': data.get('fingerprintId', 'Brak')[:12] + '...' if data.get('fingerprintId') else 'Brak',
        'Trust_Score': trust.get('score', 0),
        'Trust_Grade': trust.get('grade', '?'),
        'Lies_Count': trust.get('liesCount', 0),
        'Trash_Count': trust.get('trashCount', 0),
        'Errors_Count': trust.get('errorsCount', 0),
        'Headless_Rating': trust.get('headlessRating', 0),
        'Stealth_Rating': trust.get('stealthRating', 0),
        'Like_Headless_Rating': trust.get('likeHeadlessRating', 0),
        'Engine': trust.get('engine', 'Nieznany'),
        'Trust_Note': trust.get('note', ''),

        # ─── Hashe fingerprint ───
        'Canvas2D_Hash': summary.get('canvas2dHash', 'Brak'),
        'Canvas2D_Hash_Short': (summary.get('canvas2dHash', 'Brak') or 'Brak')[:12],
        'WebGL_Hash': summary.get('webglHash', 'Brak'),
        'WebGL_Hash_Short': (summary.get('webglHash', 'Brak') or 'Brak')[:12],
        'Audio_Hash': summary.get('audioHash', 'Brak'),
        'Audio_Hash_Short': (summary.get('audioHash', 'Brak') or 'Brak')[:12],
        'Fonts_Hash': summary.get('fontsHash', 'Brak'),
        'Navigator_Hash': summary.get('navigatorHash', 'Brak'),
        'Screen_Hash': summary.get('screenHash', 'Brak'),
        'Timezone_Hash': summary.get('timezoneHash', 'Brak'),
        'Worker_Hash': summary.get('workerHash', 'Brak'),
        'WebRTC_Hash': summary.get('webrtcHash', 'Brak'),
        'WebRTC_Hash_Short': (summary.get('webrtcHash', 'Brak') or 'Brak')[:12],
        'Status_Hash': summary.get('statusHash', 'Brak'),
        'Status_Hash_Short': (summary.get('statusHash', 'Brak') or 'Brak')[:12],

        # ─── Dane systemowe ───
        'User_Agent': data.get('userAgent', 'Brak'),
        'Platform': summary.get('platform', 'Brak'),
        'System': summary.get('system', 'Brak'),
        'Resistance': summary.get('resistance', 'Brak'),
        'WebGL_Renderer': summary.get('webglRenderer', 'Brak'),
        'GPU_Compressed': gpu_compressed,
        'GPU_Confidence': gpu_confidence,
        'GPU_Grade': gpu_grade,

        # ─── Lies (kłamstwa) ───
        'Lie_Keys': ', '.join(lie_keys) if lie_keys else 'Brak',
        'Lie_Keys_List': lie_keys,
        'Client_Rects_Lied': summary.get('clientRectsLied', False),
        'Lies_Details': json.dumps(lies_details, ensure_ascii=False) if lies_details else 'Brak',

        # ─── Screen ───
        'Screen_Width': screen.get('width', 0),
        'Screen_Height': screen.get('height', 0),
        'Screen_Resolution': f"{screen.get('width', '?')}x{screen.get('height', '?')}",
        'Color_Depth': screen.get('colorDepth', 0),
        'Pixel_Depth': screen.get('pixelDepth', 0),
        'Touch_Support': screen.get('touch', False),
        'Screen_Lied': screen.get('lied', False),

        # ─── Navigator ───
        'Device_Memory': nav.get('deviceMemory', 0),
        'Hardware_Concurrency': nav.get('hardwareConcurrency', 0),
        'Language': nav.get('language', 'Brak'),
        'Max_Touch_Points': nav.get('maxTouchPoints', 0),
        'Do_Not_Track': nav.get('doNotTrack', None),
        'Navigator_Lied': nav.get('lied', False),
        'Bluetooth': nav.get('bluetoothAvailability', None),

        # ─── Czcionki ───
        'Fonts_Count': summary.get('fontsCount', 0),
        'Fonts_List': ', '.join(fonts_list) if fonts_list else 'Brak',

        # ─── Timezone ───
        'Timezone_Zone': tz.get('zone', 'Brak'),
        'Timezone_Location': tz.get('location', 'Brak'),
        'Timezone_Offset': tz.get('offset', 0),
        'Timezone_Lied': tz.get('lied', False),

        # ─── CSS / Media ───
        'Prefers_Color_Scheme': media_css.get('prefers-color-scheme', 'Brak'),
        'Prefers_Reduced_Motion': media_css.get('prefers-reduced-motion', 'Brak'),
        'Device_Screen_CSS': media_css.get('device-screen', 'Brak'),
        'Color_Gamut': media_css.get('color-gamut', 'Brak'),
        'Forced_Colors': media_css.get('forced-colors', 'Brak'),

        # ─── Audio ───
        'Audio_Sample_Sum': audio.get('sampleSum', 0),
        'Audio_Unique_Samples': audio.get('totalUniqueSamples', 0),
        'Audio_Noise': audio.get('noise', 0),
        'Audio_Lied': audio.get('lied', False),

        # ─── Headless indicators ───
        'Is_Chromium': safe_get(headless, 'chromium', default=False),
        'WebDriver_On': safe_get(headless_details, 'webDriverIsOn', default=False),
        'Has_Headless_UA': safe_get(headless_details, 'hasHeadlessUA', default=False),
        'Platform_Estimate': safe_get(headless, 'platformEstimate', default=[]),

        # ─── Stealth indicators ───
        'Has_Iframe_Proxy': safe_get(stealth_details, 'hasIframeProxy', default=False),
        'Has_ToString_Proxy': safe_get(stealth_details, 'hasToStringProxy', default=False),

        # ─── Resistance ───
        'Resistance_Engine': resistance.get('engine', 'Brak'),
        'Extension_Hash_Pattern': json.dumps(resistance.get('extensionHashPattern', {})),

        # ─── Worker ───
        'Worker_Platform': worker.get('platform', 'Brak'),
        'Worker_System': worker.get('system', 'Brak'),
        'Worker_Device': worker.get('device', 'Brak'),
        'Worker_GPU': safe_get(worker, 'gpu', 'compressedGPU', default='Brak'),

        # ─── WebGL ───
        'WebGL_Extensions_Count': len(webgl_extensions) if isinstance(webgl_extensions, list) else 0,
        'WebGL_Lied': canvas_webgl.get('lied', False),

        # ─── Export metadata ───
        'Exported_At': data.get('exportedAt', 'Brak'),
    }

    return row


def compute_dashboard_analytics(df, data_list):
    """
    Oblicza dodatkowe statystyki analityczne dla dashboardu.
    """
    analytics = {}

    # ─── Ogólne statystyki ───
    analytics['total_environments'] = len(df)
    analytics['unique_fingerprints'] = df['Fingerprint_ID'].nunique()
    analytics['avg_trust_score'] = round(df['Trust_Score'].mean(), 1)
    analytics['total_lies'] = int(df['Lies_Count'].sum())
    analytics['unique_canvas_hashes'] = df['Canvas2D_Hash'].nunique()
    analytics['unique_webgl_hashes'] = df['WebGL_Hash'].nunique()

    # ─── Trust Score breakdown ───
    analytics['trust_high'] = int((df['Trust_Score'] >= 80).sum())
    analytics['trust_medium'] = int(((df['Trust_Score'] >= 50) & (df['Trust_Score'] < 80)).sum())
    analytics['trust_low'] = int((df['Trust_Score'] < 50).sum())

    # ─── Grupy identyczności fingerprint ───
    fp_groups = df.groupby('Fingerprint_ID').apply(
        lambda g: g[['Osoba', 'OS', 'Przegladarka', 'Konfiguracja', 'Plik']].to_dict('records'),
        include_groups=False
    ).to_dict()
    analytics['fingerprint_groups'] = {
        fp_id[:16] + '...': {
            'full_id': fp_id,
            'count': len(members),
            'members': members
        }
        for fp_id, members in fp_groups.items()
    }

    # ─── Porównanie Normal vs Incognito ───
    incognito_pairs = []
    normal = df[~df['Konfiguracja'].str.contains('Incognito|incognito', na=False)]
    incognito = df[df['Konfiguracja'].str.contains('Incognito|incognito', na=False)]

    for _, inc_row in incognito.iterrows():
        matching_normal = normal[
            (normal['Osoba'] == inc_row['Osoba']) &
            (normal['OS'] == inc_row['OS']) &
            (normal['Przegladarka'] == inc_row['Przegladarka'])
        ]
        for _, norm_row in matching_normal.iterrows():
            incognito_pairs.append({
                'person': inc_row['Osoba'],
                'browser': inc_row['Przegladarka'],
                'os': inc_row['OS'],
                'normal_fingerprint': norm_row['Fingerprint_ID'],
                'incognito_fingerprint': inc_row['Fingerprint_ID'],
                'fingerprints_match': norm_row['Fingerprint_ID'] == inc_row['Fingerprint_ID'],
                'normal_canvas': norm_row['Canvas2D_Hash'],
                'incognito_canvas': inc_row['Canvas2D_Hash'],
                'canvas_match': norm_row['Canvas2D_Hash'] == inc_row['Canvas2D_Hash'],
                'normal_webgl': norm_row['WebGL_Hash'],
                'incognito_webgl': inc_row['WebGL_Hash'],
                'webgl_match': norm_row['WebGL_Hash'] == inc_row['WebGL_Hash'],
                'normal_trust': int(norm_row['Trust_Score']),
                'incognito_trust': int(inc_row['Trust_Score']),
            })
    analytics['incognito_comparison'] = incognito_pairs

    # ─── Porównanie per OS (ten sam browser, różne OS) ───
    os_impact = []
    for browser in df['Przegladarka'].unique():
        browser_data = df[df['Przegladarka'] == browser]
        if browser_data['OS'].nunique() > 1:
            entries = browser_data[['OS', 'Fingerprint_ID', 'Canvas2D_Hash', 'WebGL_Hash',
                                      'Fonts_Hash', 'Trust_Score', 'Fonts_Count']].to_dict('records')
            os_impact.append({
                'browser': browser,
                'os_count': browser_data['OS'].nunique(),
                'unique_fingerprints': browser_data['Fingerprint_ID'].nunique(),
                'entries': entries
            })
    analytics['os_impact'] = os_impact

    # ─── Canvas Hash Matrix (dla porównań) ───
    canvas_matrix = []
    labels = (df['Osoba'] + ' / ' + df['Przegladarka'] + ' / ' + df['Konfiguracja']).tolist()
    canvas_hashes = df['Canvas2D_Hash'].tolist()
    for i, h1 in enumerate(canvas_hashes):
        for j, h2 in enumerate(canvas_hashes):
            if i < j:
                canvas_matrix.append({
                    'env1': labels[i],
                    'env2': labels[j],
                    'match': h1 == h2
                })
    analytics['canvas_hash_matrix'] = canvas_matrix

    # ─── Randomness test (Test1 vs Test2) ───
    randomness_tests = []
    test_envs = df[df['Konfiguracja'].str.contains('Test', na=False)]
    for osoba in test_envs['Osoba'].unique():
        for browser in test_envs[test_envs['Osoba'] == osoba]['Przegladarka'].unique():
            tests = test_envs[
                (test_envs['Osoba'] == osoba) &
                (test_envs['Przegladarka'] == browser)
            ].sort_values('Konfiguracja')
            if len(tests) >= 2:
                t1 = tests.iloc[0]
                t2 = tests.iloc[1]
                randomness_tests.append({
                    'person': osoba,
                    'browser': browser,
                    'test1_fingerprint': t1['Fingerprint_ID'],
                    'test2_fingerprint': t2['Fingerprint_ID'],
                    'fingerprint_changed': t1['Fingerprint_ID'] != t2['Fingerprint_ID'],
                    'test1_canvas': t1['Canvas2D_Hash'],
                    'test2_canvas': t2['Canvas2D_Hash'],
                    'canvas_changed': t1['Canvas2D_Hash'] != t2['Canvas2D_Hash'],
                    'test1_webgl': t1['WebGL_Hash'],
                    'test2_webgl': t2['WebGL_Hash'],
                    'webgl_changed': t1['WebGL_Hash'] != t2['WebGL_Hash'],
                })
    analytics['randomness_tests'] = randomness_tests

    # ─── Lies breakdown per browser ───
    lies_by_browser = {}
    for _, row in df.iterrows():
        browser = row['Przegladarka']
        config = row['Konfiguracja']
        key = f"{browser} ({config})"
        if row['Lies_Count'] > 0:
            lies_by_browser[key] = {
                'count': int(row['Lies_Count']),
                'lie_keys': row['Lie_Keys'],
                'trust_score': int(row['Trust_Score']),
                'person': row['Osoba'],
                'os': row['OS']
            }
    analytics['lies_breakdown'] = lies_by_browser

    # ─── Per-engine stats ───
    engine_stats = df.groupby('Engine').agg({
        'Trust_Score': ['mean', 'min', 'max', 'count'],
        'Lies_Count': 'sum',
        'Fingerprint_ID': 'nunique'
    }).to_dict()
    analytics['engine_summary'] = {}
    for engine in df['Engine'].unique():
        eng_data = df[df['Engine'] == engine]
        analytics['engine_summary'][engine] = {
            'count': len(eng_data),
            'avg_trust': round(eng_data['Trust_Score'].mean(), 1),
            'total_lies': int(eng_data['Lies_Count'].sum()),
            'unique_fps': int(eng_data['Fingerprint_ID'].nunique())
        }

    return analytics


def main():
    parser = argparse.ArgumentParser(
        description='🔍 CreepJS JSON Parser — Browser Fingerprinting Analysis'
    )
    parser.add_argument(
        '--input', '-i',
        default=os.path.join(os.path.dirname(__file__), '..', 'wyniki'),
        help='Ścieżka do folderu z plikami JSON (domyślnie: ../wyniki/)'
    )
    parser.add_argument(
        '--output', '-o',
        default=os.path.join(os.path.dirname(__file__), '..', 'docs', 'dashboard', 'data'),
        help='Ścieżka do folderu na output JSON (domyślnie: ../docs/dashboard/data/)'
    )
    parser.add_argument(
        '--csv',
        default=os.path.join(os.path.dirname(__file__), '..', 'docs', 'dashboard', 'data', 'raport_koncowy.csv'),
        help='Ścieżka do CSV (domyślnie: ../docs/dashboard/data/raport_koncowy.csv)'
    )
    args = parser.parse_args()

    input_dir = os.path.abspath(args.input)
    output_dir = os.path.abspath(args.output)
    csv_path = os.path.abspath(args.csv)

    print("=" * 60)
    print("🔍 CreepJS Parser — Browser Fingerprinting Analysis")
    print("=" * 60)
    print(f"📂 Input:  {input_dir}")
    print(f"📊 CSV:    {csv_path}")
    print(f"🌐 JSON:   {output_dir}")
    print()

    # Sprawdź czy folder istnieje
    if not os.path.isdir(input_dir):
        print(f"❌ Folder '{input_dir}' nie istnieje!")
        print("   Utwórz go i wrzuć pliki JSON z CreepJS.")
        sys.exit(1)

    # Zbierz pliki JSON rekursywnie
    json_files_paths = []
    for root, _, files in os.walk(input_dir):
        for f in files:
            if f.endswith('.json'):
                json_files_paths.append(os.path.join(root, f))

    if not json_files_paths:
        print(f"❌ Brak plików .json w '{input_dir}' i jego podfolderach!")
        print("   Wrzuć tam pliki JSONy wyeksportowane z CreepJS.")
        sys.exit(1)

    print(f"📁 Znaleziono {len(json_files_paths)} plików JSON:")
    for f in sorted(json_files_paths):
        print(f"   📄 {os.path.relpath(f, input_dir)}")
    print()

    # Parsuj każdy plik
    data_list = []
    warnings = []

    for filepath in sorted(json_files_paths):
        filename = os.path.basename(filepath)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Sprawdź czy to plik CreepJS
            if 'fingerprintId' not in data and 'trustScore' not in data:
                warnings.append(f"⚠️  {filename} — nie wygląda na plik CreepJS (brak fingerprintId)")
                continue

            row = extract_metrics(data, filename)
            data_list.append(row)

            # Sprawdź konwencję nazwy pliku
            meta = parse_filename(filename)
            if meta['OS'] == 'Nieznany':
                warnings.append(
                    f"⚠️  {filename} — nazwa nie pasuje do konwencji "
                    f"Osoba_OS_Przeglądarka_Konfiguracja.json"
                )

            trust = row['Trust_Score']
            lies = row['Lies_Count']
            emoji_trust = '🟢' if trust >= 80 else ('🟡' if trust >= 50 else '🔴')
            print(f"   ✅ {filename}")
            print(f"      {emoji_trust} Trust: {trust} ({row['Trust_Grade']}) | "
                  f"Lies: {lies} | Engine: {row['Engine']} | "
                  f"FP: {row['Fingerprint_ID_Short']}")

        except json.JSONDecodeError as e:
            warnings.append(f"❌ {filename} — błąd parsowania JSON: {e}")
        except Exception as e:
            warnings.append(f"❌ {filename} — nieoczekiwany błąd: {e}")

    print()

    if not data_list:
        print("❌ Nie udało się sparsować żadnego pliku!")
        sys.exit(1)

    # Wyświetl ostrzeżenia
    if warnings:
        print("⚠️  Ostrzeżenia:")
        for w in warnings:
            print(f"   {w}")
        print()

    # ─── Tworzenie DataFrame ───
    df = pd.DataFrame(data_list)

    # Kolumny do CSV (bez list i dużych pól)
    csv_columns = [
        'Osoba', 'OS', 'Przegladarka', 'Konfiguracja', 'Plik',
        'Fingerprint_ID', 'Trust_Score', 'Trust_Grade',
        'Lies_Count', 'Trash_Count', 'Errors_Count',
        'Headless_Rating', 'Stealth_Rating', 'Like_Headless_Rating',
        'Engine', 'Trust_Note',
        'Canvas2D_Hash', 'WebGL_Hash', 'Audio_Hash',
        'Fonts_Hash', 'Navigator_Hash', 'Screen_Hash',
        'Timezone_Hash', 'Worker_Hash', 'WebRTC_Hash', 'Status_Hash',
        'User_Agent', 'Platform', 'System', 'Resistance',
        'WebGL_Renderer', 'GPU_Compressed', 'GPU_Confidence', 'GPU_Grade',
        'Lie_Keys', 'Client_Rects_Lied',
        'Screen_Width', 'Screen_Height', 'Screen_Resolution',
        'Color_Depth', 'Touch_Support', 'Screen_Lied',
        'Device_Memory', 'Hardware_Concurrency', 'Language',
        'Max_Touch_Points', 'Do_Not_Track', 'Navigator_Lied',
        'Fonts_Count', 'Fonts_List',
        'Timezone_Zone', 'Timezone_Location', 'Timezone_Offset',
        'Prefers_Color_Scheme', 'Prefers_Reduced_Motion',
        'Device_Screen_CSS', 'Color_Gamut',
        'Audio_Sample_Sum', 'Audio_Unique_Samples', 'Audio_Noise',
        'WebGL_Extensions_Count', 'WebGL_Lied',
        'Exported_At'
    ]
    # Tylko kolumny, które istnieją
    csv_cols_present = [c for c in csv_columns if c in df.columns]

    # Zapisz CSV
    df[csv_cols_present].to_csv(csv_path, index=False, encoding='utf-8-sig')
    print(f"📊 CSV zapisany: {csv_path}")

    # ─── Tworzenie JSON dla dashboardu ───
    os.makedirs(output_dir, exist_ok=True)

    # Kolumny JSON per wiersz (wszystkie)
    json_columns = [
        'Osoba', 'OS', 'Przegladarka', 'Konfiguracja', 'Plik',
        'Fingerprint_ID', 'Fingerprint_ID_Short',
        'Trust_Score', 'Trust_Grade',
        'Lies_Count', 'Trash_Count', 'Errors_Count',
        'Headless_Rating', 'Stealth_Rating', 'Like_Headless_Rating',
        'Engine', 'Trust_Note',
        'Canvas2D_Hash', 'Canvas2D_Hash_Short',
        'WebGL_Hash', 'WebGL_Hash_Short',
        'Audio_Hash', 'Audio_Hash_Short',
        'Fonts_Hash', 'Navigator_Hash', 'Screen_Hash',
        'Timezone_Hash', 'Worker_Hash',
        'WebRTC_Hash', 'WebRTC_Hash_Short',
        'Status_Hash', 'Status_Hash_Short',
        'User_Agent', 'Platform', 'System', 'Resistance',
        'WebGL_Renderer', 'GPU_Compressed', 'GPU_Confidence', 'GPU_Grade',
        'Lie_Keys', 'Lie_Keys_List', 'Client_Rects_Lied', 'Lies_Details',
        'Screen_Width', 'Screen_Height', 'Screen_Resolution',
        'Color_Depth', 'Pixel_Depth', 'Touch_Support', 'Screen_Lied',
        'Device_Memory', 'Hardware_Concurrency', 'Language',
        'Max_Touch_Points', 'Do_Not_Track', 'Navigator_Lied', 'Bluetooth',
        'Fonts_Count', 'Fonts_List',
        'Timezone_Zone', 'Timezone_Location', 'Timezone_Offset', 'Timezone_Lied',
        'Prefers_Color_Scheme', 'Prefers_Reduced_Motion',
        'Device_Screen_CSS', 'Color_Gamut', 'Forced_Colors',
        'Audio_Sample_Sum', 'Audio_Unique_Samples', 'Audio_Noise', 'Audio_Lied',
        'Is_Chromium', 'WebDriver_On', 'Has_Headless_UA',
        'Resistance_Engine',
        'Worker_Platform', 'Worker_System', 'Worker_Device', 'Worker_GPU',
        'WebGL_Extensions_Count', 'WebGL_Lied',
        'Exported_At',
    ]
    json_cols_present = [c for c in json_columns if c in df.columns]

    # Konwertuj DataFrame do list of dicts
    records = df[json_cols_present].to_dict('records')

    # Napraw typy numpy
    for rec in records:
        for k, v in rec.items():
            if hasattr(v, 'item'):
                rec[k] = v.item()
            if isinstance(v, float) and (v != v):  # NaN check
                rec[k] = None

    # Oblicz analytics
    analytics = compute_dashboard_analytics(df, data_list)

    dashboard_data = {
        'meta': {
            'generated_at': datetime.now().isoformat(),
            'parser_version': '1.0.0',
            'total_files': len(json_files_paths),
            'parsed_files': len(data_list),
            'warnings': warnings,
        },
        'environments': records,
        'analytics': analytics,
    }

    import math
    def clean_nan(obj):
        if isinstance(obj, dict):
            return {k: clean_nan(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [clean_nan(i) for i in obj]
        elif pd.api.types.is_scalar(obj) and pd.isna(obj):
            return None
        elif isinstance(obj, float):
            if math.isnan(obj):
                return None
            return obj
        return obj
        
    dashboard_data = clean_nan(dashboard_data)

    json_path = os.path.join(output_dir, 'raport.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(dashboard_data, f, ensure_ascii=False, indent=2, allow_nan=False)

    print(f"🌐 Dashboard JSON zapisany: {json_path}")
    print()

    # ─── Podsumowanie ───
    print("=" * 60)
    print("📊 PODSUMOWANIE")
    print("=" * 60)
    print(f"  Środowiska:          {len(data_list)}")
    print(f"  Unikalne fingerprint: {df['Fingerprint_ID'].nunique()}")
    print(f"  Średni Trust Score:   {df['Trust_Score'].mean():.1f}")
    print(f"  Łączne lies:         {df['Lies_Count'].sum()}")
    print(f"  Silniki:             {', '.join(df['Engine'].unique())}")
    print(f"  Systemy:             {', '.join(df['OS'].unique())}")
    print(f"  Przeglądarki:        {', '.join(df['Przegladarka'].unique())}")
    print()

    # Trust Score ranking
    print("  🏆 Trust Score Ranking:")
    sorted_df = df.sort_values('Trust_Score', ascending=False)
    for _, row in sorted_df.iterrows():
        emoji = '🟢' if row['Trust_Score'] >= 80 else ('🟡' if row['Trust_Score'] >= 50 else '🔴')
        label = f"{row['Osoba']}/{row['Przegladarka']}/{row['Konfiguracja']}"
        print(f"     {emoji} {row['Trust_Score']:3.0f} ({row['Trust_Grade']}) — {label}")

    print()
    print("✅ Gotowe! Otwórz dashboard/index.html w przeglądarce.")
    print("=" * 60)


if __name__ == '__main__':
    main()
