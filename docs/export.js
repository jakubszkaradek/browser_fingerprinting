/* export.js – CreepJS JSON Data Export
 * Waits for CreepJS to finish (window.Fingerprint is set), then enables the download button.
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
  btn.textContent = '⏳ POBIERZ DANE DO JSON';
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
     2. Wait for CreepJS to expose window.Fingerprint
  ─────────────────────────────────────────────── */
  function pollForFingerprint(maxWaitMs = 60000, intervalMs = 300) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const id = setInterval(() => {
        if (window.Fingerprint && window.Creep) {
          clearInterval(id);
          resolve({ fp: window.Fingerprint, creep: window.Creep });
        } else if (Date.now() - start > maxWaitMs) {
          clearInterval(id);
          reject(new Error('Fingerprint data not available after timeout.'));
        }
      }, intervalMs);
    });
  }

  /* ──────────────────────────────────────────────
     3. Extract the FP ID from the DOM
     (CreepJS renders it as text inside #creep-fingerprint)
  ─────────────────────────────────────────────── */
  function getFpIdFromDom() {
    const el = document.getElementById('creep-fingerprint');
    if (!el) return null;
    const text = el.innerText || el.textContent || '';
    // Format: "FP ID: <hash>"
    const match = text.match(/FP ID:\s*(.+)/);
    return match ? match[1].trim() : null;
  }

  /* ──────────────────────────────────────────────
     4. Build the export payload
  ─────────────────────────────────────────────── */
  function buildExportData(fp, creep) {
    const fpIdFromDom = getFpIdFromDom();

    // Attempt to extract the trust score from the DOM header text
    // CreepJS does not expose it on window.Fingerprint; it renders it in #creep-fingerprint
    // Fall back to a note if unavailable.
    const trustScoreEl = document.querySelector('.grade-circle, [class*="trust"], [id*="trust"]');
    const trustScore = trustScoreEl
      ? (trustScoreEl.innerText || trustScoreEl.textContent || '').trim()
      : 'N/A – see page UI';

    return {
      // ── Key metrics (top-level) ──────────────────
      fingerprintId: fpIdFromDom || '(not yet rendered)',
      trustScore: trustScore,
      userAgent: navigator.userAgent,

      lies: {
        count: fp.lies ? Object.keys(fp.lies).filter(k => k !== '$hash').length : 0,
        details: fp.lies || null,
      },

      canvasHash: (fp.canvas2d || {}).$hash || null,
      webglHash:  (fp.canvasWebgl || {}).$hash || null,

      // ── Full dump ──────────────────────────────
      fullFingerprint: fp,
      stableCreep: creep,

      // ── Metadata ──────────────────────────────
      exportedAt: new Date().toISOString(),
      exportedBy: 'CreepJS Export Tool',
    };
  }

  /* ──────────────────────────────────────────────
     5. Trigger JSON download
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
     6. Wire up button + modal
  ─────────────────────────────────────────────── */
  let cachedFp   = null;
  let cachedCreep = null;

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
    const data = buildExportData(cachedFp, cachedCreep);
    downloadJson(data, filename);
    overlay.classList.remove('active');
  });

  // Allow Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.classList.remove('active');
  });

  /* ──────────────────────────────────────────────
     7. Start polling – enable button when ready
  ─────────────────────────────────────────────── */
  pollForFingerprint()
    .then(({ fp, creep }) => {
      cachedFp    = fp;
      cachedCreep = creep;
      btn.disabled = false;
      btn.textContent = '⬇️ POBIERZ DANE DO JSON';
      btn.title = 'Kliknij, aby pobrać dane fingerprintu jako JSON';
    })
    .catch((err) => {
      btn.textContent = '⚠️ Błąd – brak danych';
      btn.title = err.message;
      console.error('[CreepExport]', err);
    });

})();
