/* export.js – CreepJS JSON Data Export
 * Waits for CreepJS to finish AND for the FP ID to render in the DOM,
 * then enables the download button.
 * Collects metadata via a custom modal and triggers a JSON download.
 */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────
     1. Inject button + modal HTML + styles
  ─────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    /* ── Download Button ── */
    #creep-export-btn {
      position: fixed;
      top: 14px;
      right: 16px;
      z-index: 99999;
      padding: 10px 18px;
      background: linear-gradient(135deg, #6c47ff 0%, #3ecfcf 100%);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      font-family: 'Segoe UI', system-ui, sans-serif;
      letter-spacing: 0.04em;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(108,71,255,.45);
      transition: opacity .2s, transform .15s, box-shadow .2s;
      white-space: nowrap;
    }
    #creep-export-btn:hover:not(:disabled) {
      opacity: .92;
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(108,71,255,.6);
    }
    #creep-export-btn:active:not(:disabled) {
      transform: translateY(0);
    }
    #creep-export-btn:disabled {
      background: linear-gradient(135deg, #555 0%, #777 100%);
      cursor: not-allowed;
      opacity: .6;
      box-shadow: none;
    }

    /* ── Modal Overlay ── */
    #creep-export-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 100000;
      background: rgba(0,0,0,.65);
      backdrop-filter: blur(4px);
      align-items: center;
      justify-content: center;
    }
    #creep-export-overlay.active {
      display: flex;
    }
    #creep-export-modal {
      background: #1a1a2e;
      border: 1px solid rgba(108,71,255,.4);
      border-radius: 14px;
      padding: 32px 36px;
      width: min(460px, 92vw);
      box-shadow: 0 24px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(108,71,255,.15);
      color: #e0e0ff;
      font-family: 'Segoe UI', system-ui, sans-serif;
      animation: modal-in .22s ease;
    }
    @keyframes modal-in {
      from { opacity: 0; transform: translateY(-16px) scale(.97); }
      to   { opacity: 1; transform: none; }
    }
    #creep-export-modal h2 {
      margin: 0 0 6px;
      font-size: 18px;
      font-weight: 700;
      color: #fff;
    }
    #creep-export-modal p.subtitle {
      margin: 0 0 24px;
      font-size: 12px;
      color: #8888aa;
    }
    .creep-field {
      margin-bottom: 16px;
    }
    .creep-field label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #9999cc;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .creep-field input {
      width: 100%;
      box-sizing: border-box;
      padding: 9px 12px;
      border-radius: 7px;
      border: 1px solid rgba(108,71,255,.35);
      background: rgba(255,255,255,.05);
      color: #e0e0ff;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color .18s;
    }
    .creep-field input::placeholder { color: #555577; }
    .creep-field input:focus { border-color: #6c47ff; }
    .creep-modal-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 24px;
    }
    .creep-modal-actions button {
      padding: 9px 22px;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      border: none;
      transition: opacity .18s, transform .12s;
    }
    .creep-modal-actions button:active { transform: scale(.97); }
    #creep-modal-cancel {
      background: rgba(255,255,255,.07);
      color: #aaa;
    }
    #creep-modal-cancel:hover { opacity: .75; }
    #creep-modal-confirm {
      background: linear-gradient(135deg, #6c47ff 0%, #3ecfcf 100%);
      color: #fff;
      box-shadow: 0 3px 14px rgba(108,71,255,.4);
    }
    #creep-modal-confirm:hover { opacity: .88; }
  `;
  document.head.appendChild(style);

  /* ── Button ── */
  const btn = document.createElement('button');
  btn.id = 'creep-export-btn';
  btn.textContent = '⏳ Ładowanie danych…';
  btn.disabled = true;
  btn.title = 'Odczekaj na zakończenie fingerprintingu…';
  document.body.appendChild(btn);

  /* ── Modal ── */
  const overlay = document.createElement('div');
  overlay.id = 'creep-export-overlay';
  overlay.innerHTML = `
    <div id="creep-export-modal" role="dialog" aria-modal="true" aria-labelledby="creep-modal-title">
      <h2 id="creep-modal-title">📥 Eksport danych</h2>
      <p class="subtitle">Wypełnij poniższe pola – posłużą jako nazwa pliku.</p>

      <div class="creep-field">
        <label for="creep-input-osoba">Osoba</label>
        <input id="creep-input-osoba" type="text" placeholder="np. Piotr" autocomplete="off">
      </div>
      <div class="creep-field">
        <label for="creep-input-os">System operacyjny (OS)</label>
        <input id="creep-input-os" type="text" placeholder="np. macOS" autocomplete="off">
      </div>
      <div class="creep-field">
        <label for="creep-input-przegl">Przeglądarka</label>
        <input id="creep-input-przegl" type="text" placeholder="np. Safari" autocomplete="off">
      </div>
      <div class="creep-field">
        <label for="creep-input-konf">Konfiguracja</label>
        <input id="creep-input-konf" type="text" placeholder="np. Czyste" autocomplete="off">
      </div>

      <div class="creep-modal-actions">
        <button id="creep-modal-cancel">Anuluj</button>
        <button id="creep-modal-confirm">Pobierz JSON</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  /* ──────────────────────────────────────────────
     2. Wait for CreepJS to expose window.Fingerprint + window.Creep
        AND for the FP ID hash to be rendered in #creep-fingerprint
        (CreepJS renders it asynchronously with a setTimeout after
         setting window.Fingerprint, so we must wait for the DOM too)
  ─────────────────────────────────────────────── */
  function pollForFingerprint(maxWaitMs = 60000, intervalMs = 300) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const id = setInterval(() => {
        const fpReady   = window.Fingerprint && window.Creep;
        const fpIdInDom = getFpIdFromDom();  // non-null & not placeholder

        if (fpReady && fpIdInDom) {
          clearInterval(id);
          resolve({ fp: window.Fingerprint, creep: window.Creep, fpId: fpIdInDom });
        } else if (Date.now() - start > maxWaitMs) {
          clearInterval(id);
          // Timeout – resolve anyway with whatever we have
          resolve({
            fp: window.Fingerprint || null,
            creep: window.Creep || null,
            fpId: fpIdInDom || '(timeout – not rendered)',
          });
        }
      }, intervalMs);
    });
  }

  /* ──────────────────────────────────────────────
     3. Extract the FP ID from the DOM.
        CreepJS renders the hash character-by-character inside
        <span> elements with animations inside #creep-fingerprint.
        We strip all tags and extract just the hash after "FP ID:".
        Returns null if still showing "Computing…" placeholder.
  ─────────────────────────────────────────────── */
  function getFpIdFromDom() {
    // DIAGNOZA: skompilowany creep.js używa patch() który ZASTĘPUJE innerHTML
    // .fingerprint-header nowym <div class="ellipsis-all"> BEZ zachowania
    // id="creep-fingerprint". getElementById() zwraca więc NULL lub stary element!
    //
    // ROZWIĄZANIE: szukamy po klasie + zawartości tekstowej.
    // Priorytet 1: .fingerprint-header .ellipsis-all zawierające "FP ID:"
    // Priorytet 2: cały dokument – szukamy dowolnego elementu z "FP ID:"
    // W obu przypadkach wyciągamy hash przez textContent (nie innerText – pomija opacity:0!)

    function extractHash(el) {
      const text = (el.textContent || '').trim();
      const match = text.match(/FP\s+ID:\s*([0-9a-f]{10,})/i);
      return match ? match[1].trim() : null;
    }

    // Szukaj w nagłówku fingerprint
    const header = document.querySelector('.fingerprint-header');
    if (header) {
      const candidates = header.querySelectorAll('.ellipsis-all');
      for (const el of candidates) {
        const hash = extractHash(el);
        if (hash) return hash;
      }
      // Fallback: cały nagłówek
      const hash = extractHash(header);
      if (hash) return hash;
    }

    // Fallback: stary id (może istnieć w innych wersjach CreepJS)
    const byId = document.getElementById('creep-fingerprint');
    if (byId) {
      const hash = extractHash(byId);
      if (hash) return hash;
    }

    // Ostateczny fallback: skanuj cały dokument
    const allDivs = document.querySelectorAll('.ellipsis-all');
    for (const el of allDivs) {
      const hash = extractHash(el);
      if (hash) return hash;
    }

    return null;
  }

  /* ──────────────────────────────────────────────
     4. Extract the Trust Score (Lies count / detection summary)
        CreepJS does NOT expose trustScore on window.Fingerprint.
        We derive a human-readable summary from the fingerprint data:
        - count of detected lies
        - headless/stealth ratings
        - resistance engine
  ─────────────────────────────────────────────── */
  function deriveTrustSummary(fp) {
    if (!fp) return 'N/A';

    const liesCount    = fp.lies    ? (fp.lies.totalLies  || 0) : 0;
    const trashCount   = fp.trash   ? (fp.trash.trashBin  ? fp.trash.trashBin.length : 0) : 0;
    const errorsCount  = fp.capturedErrors ? (fp.capturedErrors.data ? fp.capturedErrors.data.length : 0) : 0;

    const headlessRating = fp.headless ? (fp.headless.headlessRating  || 0) : 0;
    const stealthRating  = fp.headless ? (fp.headless.stealthRating   || 0) : 0;
    const likeHeadless   = fp.headless ? (fp.headless.likeHeadlessRating || 0) : 0;

    const engine = fp.resistance ? (fp.resistance.engine || 'unknown') : 'unknown';

    // Compute a simple grade: start at 100, deduct per issue
    let score = 100;
    score -= liesCount    * 10;
    score -= trashCount   * 5;
    score -= errorsCount  * 2;
    score -= headlessRating * 3;
    score -= stealthRating  * 3;
    score -= Math.floor(likeHeadless / 5);
    score = Math.max(0, Math.min(100, score));

    let grade = 'A';
    if (score < 90) grade = 'B';
    if (score < 75) grade = 'C';
    if (score < 60) grade = 'D';
    if (score < 40) grade = 'F';

    return {
      score,
      grade,
      liesCount,
      trashCount,
      errorsCount,
      headlessRating,
      stealthRating,
      likeHeadlessRating: likeHeadless,
      engine,
      note: `${liesCount} lie(s) detected | engine: ${engine} | headless: ${headlessRating} | stealth: ${stealthRating}`,
    };
  }

  /* ──────────────────────────────────────────────
     5. Build the export payload
  ─────────────────────────────────────────────── */
  function buildExportData(fp, creep, fpId, meta) {
    const trustScore = deriveTrustSummary(fp);

    // Extract top-level hashes for easy cross-environment comparison
    const canvas2dHash  = fp && fp.canvas2d   ? fp.canvas2d['$hash']            : null;
    const webglHash     = fp && fp.canvasWebgl ? fp.canvasWebgl['$hash']         : null;
    const audioHash     = fp && fp.offlineAudioContext ? fp.offlineAudioContext['$hash'] : null;
    const fontsHash     = fp && fp.fonts       ? fp.fonts['$hash']               : null;
    const navigatorHash = fp && fp.navigator   ? fp.navigator['$hash']           : null;
    const screenHash    = fp && fp.screen      ? fp.screen['$hash']              : null;
    const timezoneHash  = fp && fp.timezone    ? fp.timezone['$hash']            : null;
    const workerHash    = fp && fp.workerScope ? fp.workerScope['$hash']         : null;

    // Quick-compare summary block (the most useful for cross-environment analysis)
    const summary = {
      fingerprintId:  fpId,
      canvas2dHash,
      webglHash,
      audioHash,
      fontsHash,
      navigatorHash,
      screenHash,
      timezoneHash,
      workerHash,
      webglRenderer:  fp && fp.workerScope ? fp.workerScope.webglRenderer : null,
      platform:       fp && fp.workerScope ? fp.workerScope.platform      : null,
      system:         fp && fp.workerScope ? fp.workerScope.system        : null,
      gpu:            fp && fp.workerScope ? fp.workerScope.gpu           : null,
      liesDetected:   trustScore.liesCount,
      lieKeys:        fp && fp.lies && fp.lies.data ? Object.keys(fp.lies.data) : [],
      clientRectsLied: fp && fp.clientRects ? fp.clientRects.lied        : null,
      resistance:     fp && fp.resistance  ? fp.resistance.engine        : null,
      fontsCount:     fp && fp.fonts && fp.fonts.fontFaceLoadFonts ? fp.fonts.fontFaceLoadFonts.length : 0,
      fontsList:      fp && fp.fonts && fp.fonts.fontFaceLoadFonts ? fp.fonts.fontFaceLoadFonts : [],
    };

    return {
      // ── Identity ──────────────────────────────
      fingerprintId: fpId,
      trustScore,

      // ── Environment metadata ──────────────────
      browserLabel:  meta
        ? `${meta.osoba} | ${meta.os} | ${meta.przegl} | ${meta.konf}`
        : null,
      userAgent: navigator.userAgent,

      // ── Quick-compare summary (top-level, easy grep) ──
      summary,

      // ── Legacy compatibility ──────────────────
      lies: {
        count:   trustScore.liesCount,
        details: fp ? fp.lies : null,
      },
      canvasHash: canvas2dHash,
      webglHash,

      // ── Full dump ────────────────────────────
      fullFingerprint: fp,
      stableCreep: creep,

      // ── Metadata ─────────────────────────────
      exportedAt: new Date().toISOString(),
      exportedBy: 'CreepJS Export Tool',
    };
  }

  /* ──────────────────────────────────────────────
     6. Trigger JSON download
  ─────────────────────────────────────────────── */
  function downloadJson(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ──────────────────────────────────────────────
     7. Wire up button + modal
  ─────────────────────────────────────────────── */
  let cachedFp    = null;
  let cachedCreep = null;
  let cachedFpId  = null;

  // Open modal on button click
  btn.addEventListener('click', () => {
    overlay.classList.add('active');
    document.getElementById('creep-input-osoba').focus();
  });

  // Close modal on overlay click (outside the dialog)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });

  // Cancel button
  document.getElementById('creep-modal-cancel').addEventListener('click', () => {
    overlay.classList.remove('active');
  });

  // Confirm button – build filename and download
  document.getElementById('creep-modal-confirm').addEventListener('click', () => {
    const osoba  = document.getElementById('creep-input-osoba').value.trim()  || 'Unknown';
    const os     = document.getElementById('creep-input-os').value.trim()     || 'Unknown';
    const przegl = document.getElementById('creep-input-przegl').value.trim() || 'Unknown';
    const konf   = document.getElementById('creep-input-konf').value.trim()   || 'Unknown';

    const filename = `${osoba}_${os}_${przegl}_${konf}.json`;
    const data = buildExportData(cachedFp, cachedCreep, cachedFpId, { osoba, os, przegl, konf });
    downloadJson(data, filename);
    overlay.classList.remove('active');
  });

  // Allow Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.classList.remove('active');
  });

  /* ──────────────────────────────────────────────
     8. Start polling – enable button only when BOTH
        window.Fingerprint/Creep AND the rendered FP ID hash are ready.
        This ensures fingerprintId is never "(not yet rendered)".
  ─────────────────────────────────────────────── */
  pollForFingerprint()
    .then(({ fp, creep, fpId }) => {
      cachedFp    = fp;
      cachedCreep = creep;
      cachedFpId  = fpId;
      btn.disabled = false;
      btn.textContent = '⬇️ POBIERZ DANE DO JSON';
      btn.title = `FP ID: ${fpId}`;
    })
    .catch((err) => {
      btn.textContent = '⚠️ Błąd – brak danych';
      btn.title = err.message;
      console.error('[CreepExport]', err);
    });

})();
