/**
 * CreepJS Dashboard — Interactive Browser Fingerprinting Analysis
 * ===============================================================
 * Pure Vanilla JS — no dependencies. Loads raport.json and renders
 * interactive visualizations for comparing fingerprinting data.
 */

// ─── State ───
let DATA = null;
let SORT_COLUMN = 'Trust_Score';
let SORT_DIR = 'desc';
let FILTERS = { osoba: 'all', os: 'all', browser: 'all', config: 'all' };

// ─── Bootstrap ───
document.addEventListener('DOMContentLoaded', () => {
  loadData();
});

async function loadData() {
  showLoading(true);
  try {
    const res = await fetch('data/raport.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
    render();
  } catch (err) {
    console.error('Failed to load data:', err);
    showError(err.message);
  }
}

function showLoading(show) {
  const el = document.getElementById('loading');
  if (el) el.style.display = show ? 'flex' : 'none';
}

function showError(msg) {
  showLoading(false);
  const main = document.getElementById('main-content');
  if (main) {
    main.innerHTML = `
      <div class="empty-state">
        <div class="icon">⚠️</div>
        <p>Nie udało się załadować danych</p>
        <p style="font-size: 0.85rem; margin-top: 8px; color: var(--text-muted);">${msg}</p>
        <p style="font-size: 0.85rem; margin-top: 16px;">
          Upewnij się, że uruchomiłeś parser:<br>
          <code style="color: var(--accent-cyan);">python parser/parse_creepjs.py</code>
        </p>
      </div>
    `;
  }
}

// ─── Main Render ───
function render() {
  showLoading(false);
  const envs = DATA.environments;
  const analytics = DATA.analytics;

  renderStats(envs, analytics);
  renderFilters(envs);
  renderTable(envs);
  renderTrustChart(envs);
  renderIncognito(analytics);
  renderLies(envs, analytics);
  renderHashMatrix(envs);
  renderOSImpact(analytics);
  renderRandomness(analytics);
  renderConclusions(envs, analytics);

  // Init animations on scroll
  initScrollAnimations();
}

// ─── Stats Cards ───
function renderStats(envs, analytics) {
  document.getElementById('stat-environments').textContent = analytics.total_environments;
  document.getElementById('stat-fingerprints').textContent = analytics.unique_fingerprints;
  document.getElementById('stat-trust').textContent = analytics.avg_trust_score;
  document.getElementById('stat-lies').textContent = analytics.total_lies;
}

// ─── Filters ───
function renderFilters(envs) {
  const fields = [
    { id: 'filter-osoba', key: 'Osoba' },
    { id: 'filter-os', key: 'OS' },
    { id: 'filter-browser', key: 'Przegladarka' },
    { id: 'filter-config', key: 'Konfiguracja' },
  ];

  fields.forEach(({ id, key }) => {
    const select = document.getElementById(id);
    if (!select) return;
    const values = [...new Set(envs.map(e => e[key]))].sort();
    select.innerHTML = `<option value="all">Wszystkie</option>` +
      values.map(v => `<option value="${v}">${v}</option>`).join('');
    select.addEventListener('change', () => {
      FILTERS[key.toLowerCase()] = select.value;
      applyFilters();
    });
  });
}

function applyFilters() {
  const envs = getFilteredEnvs();
  renderTable(envs);
  renderTrustChart(envs);
}

function getFilteredEnvs() {
  return DATA.environments.filter(e => {
    if (FILTERS.osoba !== 'all' && e.Osoba !== FILTERS.osoba) return false;
    if (FILTERS.os !== 'all' && e.OS !== FILTERS.os) return false;
    if (FILTERS.przegladarka !== 'all' && FILTERS.browser !== 'all' && e.Przegladarka !== FILTERS.browser) return false;
    if (FILTERS.konfiguracja !== 'all' && FILTERS.config !== 'all' && e.Konfiguracja !== FILTERS.config) return false;
    return true;
  });
}

// ─── Data Table ───
function renderTable(envs) {
  const sorted = [...envs].sort((a, b) => {
    let va = a[SORT_COLUMN], vb = b[SORT_COLUMN];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return SORT_DIR === 'asc' ? -1 : 1;
    if (va > vb) return SORT_DIR === 'asc' ? 1 : -1;
    return 0;
  });

  const tbody = document.getElementById('table-body');
  if (!tbody) return;

  tbody.innerHTML = sorted.map((env, idx) => {
    const trustClass = env.Trust_Score >= 80 ? 'high' : (env.Trust_Score >= 50 ? 'medium' : 'low');
    const engineClass = (env.Engine || '').toLowerCase();
    const liesClass = env.Lies_Count === 0 ? 'zero' : '';

    return `
      <tr data-idx="${idx}" onclick="toggleDetails(this)">
        <td><strong>${esc(env.Osoba)}</strong></td>
        <td><span class="badge badge-os">${esc(env.OS)}</span></td>
        <td>${esc(env.Przegladarka)}</td>
        <td>${esc(env.Konfiguracja)}</td>
        <td>
          <div class="trust-bar-container">
            <div class="trust-bar">
              <div class="trust-bar-fill ${trustClass}" style="width: ${env.Trust_Score}%"></div>
            </div>
            <span class="trust-score-text ${trustClass}">${env.Trust_Score}</span>
          </div>
        </td>
        <td><span class="badge badge-lies ${liesClass}">${env.Lies_Count}</span></td>
        <td><span class="badge badge-engine ${engineClass}">${esc(env.Engine)}</span></td>
        <td><code style="font-size: 0.75rem; color: var(--text-muted);">${esc(env.Fingerprint_ID_Short)}</code></td>
      </tr>
      <tr class="details-row">
        <td colspan="8">
          <div class="row-details" id="details-${idx}">
            ${renderRowDetails(env)}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Update sort indicators
  document.querySelectorAll('.data-table th[data-col]').forEach(th => {
    th.classList.toggle('sorted', th.dataset.col === SORT_COLUMN);
    const icon = th.querySelector('.sort-icon');
    if (icon) {
      icon.textContent = th.dataset.col === SORT_COLUMN
        ? (SORT_DIR === 'asc' ? '↑' : '↓')
        : '↕';
    }
  });
}

function renderRowDetails(env) {
  return `
    <div class="details-grid">
      <div class="detail-group">
        <div class="detail-group-title">🔐 Hashe Fingerprint</div>
        <div class="detail-row"><span class="detail-key">Full Fingerprint</span><span class="detail-value" title="${esc(env.Fingerprint_ID)}">${esc(env.Fingerprint_ID)}</span></div>
        <div class="detail-row"><span class="detail-key">Canvas 2D</span><span class="detail-value">${esc(trunc(env.Canvas2D_Hash, 24))}</span></div>
        <div class="detail-row"><span class="detail-key">WebGL</span><span class="detail-value">${esc(trunc(env.WebGL_Hash, 24))}</span></div>
        <div class="detail-row"><span class="detail-key">Audio</span><span class="detail-value">${esc(trunc(env.Audio_Hash, 24))}</span></div>
        <div class="detail-row"><span class="detail-key">Fonts</span><span class="detail-value">${esc(trunc(env.Fonts_Hash, 24))}</span></div>
        <div class="detail-row"><span class="detail-key">Navigator</span><span class="detail-value">${esc(trunc(env.Navigator_Hash, 24))}</span></div>
        <div class="detail-row"><span class="detail-key">Screen</span><span class="detail-value">${esc(trunc(env.Screen_Hash, 24))}</span></div>
      </div>

      <div class="detail-group">
        <div class="detail-group-title">💻 System</div>
        <div class="detail-row"><span class="detail-key">Platform</span><span class="detail-value">${esc(env.Platform)}</span></div>
        <div class="detail-row"><span class="detail-key">GPU</span><span class="detail-value">${esc(trunc(env.GPU_Compressed, 30))}</span></div>
        <div class="detail-row"><span class="detail-key">WebGL Renderer</span><span class="detail-value">${esc(trunc(env.WebGL_Renderer, 30))}</span></div>
        <div class="detail-row"><span class="detail-key">Screen</span><span class="detail-value">${env.Screen_Resolution}</span></div>
        <div class="detail-row"><span class="detail-key">RAM</span><span class="detail-value">${env.Device_Memory} GB</span></div>
        <div class="detail-row"><span class="detail-key">CPU Cores</span><span class="detail-value">${env.Hardware_Concurrency}</span></div>
        <div class="detail-row"><span class="detail-key">Touch</span><span class="detail-value">${env.Touch_Support ? '✅' : '❌'}</span></div>
      </div>

      <div class="detail-group">
        <div class="detail-group-title">🕵️ Trust & Lies</div>
        <div class="detail-row"><span class="detail-key">Trust Score</span><span class="detail-value">${env.Trust_Score} (${env.Trust_Grade})</span></div>
        <div class="detail-row"><span class="detail-key">Lies</span><span class="detail-value">${env.Lies_Count}</span></div>
        <div class="detail-row"><span class="detail-key">Lie APIs</span><span class="detail-value">${esc(env.Lie_Keys || 'Brak')}</span></div>
        <div class="detail-row"><span class="detail-key">Headless Rating</span><span class="detail-value">${env.Headless_Rating}</span></div>
        <div class="detail-row"><span class="detail-key">Stealth Rating</span><span class="detail-value">${env.Stealth_Rating}</span></div>
        <div class="detail-row"><span class="detail-key">Like Headless</span><span class="detail-value">${env.Like_Headless_Rating}</span></div>
        <div class="detail-row"><span class="detail-key">Engine</span><span class="detail-value">${esc(env.Engine)}</span></div>
      </div>

      <div class="detail-group">
        <div class="detail-group-title">🌐 Inne</div>
        <div class="detail-row"><span class="detail-key">Language</span><span class="detail-value">${esc(env.Language)}</span></div>
        <div class="detail-row"><span class="detail-key">Timezone</span><span class="detail-value">${esc(env.Timezone_Location)}</span></div>
        <div class="detail-row"><span class="detail-key">Fonts Count</span><span class="detail-value">${env.Fonts_Count}</span></div>
        <div class="detail-row"><span class="detail-key">Color Scheme</span><span class="detail-value">${esc(env.Prefers_Color_Scheme)}</span></div>
        <div class="detail-row"><span class="detail-key">Color Gamut</span><span class="detail-value">${esc(env.Color_Gamut)}</span></div>
        <div class="detail-row"><span class="detail-key">WebGL Ext.</span><span class="detail-value">${env.WebGL_Extensions_Count}</span></div>
        <div class="detail-row"><span class="detail-key">DNT</span><span class="detail-value">${env.Do_Not_Track === null ? 'null' : env.Do_Not_Track}</span></div>
      </div>
    </div>
  `;
}

function toggleDetails(tr) {
  const idx = tr.dataset.idx;
  const details = document.getElementById(`details-${idx}`);
  if (!details) return;

  const isVisible = details.classList.contains('visible');
  // Close all
  document.querySelectorAll('.row-details.visible').forEach(d => d.classList.remove('visible'));
  document.querySelectorAll('tr.expanded').forEach(t => t.classList.remove('expanded'));

  if (!isVisible) {
    details.classList.add('visible');
    tr.classList.add('expanded');
  }
}

function sortTable(column) {
  if (SORT_COLUMN === column) {
    SORT_DIR = SORT_DIR === 'asc' ? 'desc' : 'asc';
  } else {
    SORT_COLUMN = column;
    SORT_DIR = 'desc';
  }
  renderTable(getFilteredEnvs());
}

// ─── Trust Score Chart ───
function renderTrustChart(envs) {
  const container = document.getElementById('trust-chart');
  if (!container) return;

  const sorted = [...envs].sort((a, b) => b.Trust_Score - a.Trust_Score);

  container.innerHTML = sorted.map(env => {
    const trustClass = env.Trust_Score >= 80 ? 'high' : (env.Trust_Score >= 50 ? 'medium' : 'low');
    const label = `${env.Osoba} / ${env.Przegladarka}`;
    const sublabel = `${env.OS} · ${env.Konfiguracja}`;

    return `
      <div class="trust-chart-row">
        <div class="trust-chart-label">
          <div>${esc(label)}</div>
          <div style="font-size: 0.7rem; color: var(--text-muted);">${esc(sublabel)}</div>
        </div>
        <div class="trust-chart-bar">
          <div class="trust-chart-fill ${trustClass}" style="width: ${env.Trust_Score}%">
            ${env.Trust_Score >= 25 ? env.Trust_Grade : ''}
          </div>
        </div>
        <div class="trust-chart-score ${trustClass}">${env.Trust_Score}</div>
      </div>
    `;
  }).join('');
}

// ─── Incognito Comparison ───
function renderIncognito(analytics) {
  const container = document.getElementById('incognito-content');
  if (!container) return;

  const pairs = analytics.incognito_comparison || [];

  if (pairs.length === 0) {
    container.innerHTML = `
      <div class="no-data-message">
        <div class="icon">🕶️</div>
        <p>Brak par Normal vs Incognito w danych</p>
        <p style="font-size: 0.85rem; margin-top: 8px;">
          Dodaj pliki z konfiguracją "Incognito" (np. Kuba_Windows_Chrome_Incognito.json), 
          a parser automatycznie porówna je z wersjami "Czyste".
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = pairs.map(pair => {
    const allMatch = pair.fingerprints_match && pair.canvas_match && pair.webgl_match;

    return `
      <div class="comparison-cards">
        <div class="compare-card">
          <div class="compare-card-title">🌐 Normal</div>
          ${compareField('Fingerprint', trunc(pair.normal_fingerprint, 16), pair.fingerprints_match)}
          ${compareField('Canvas Hash', trunc(pair.normal_canvas, 16), pair.canvas_match)}
          ${compareField('WebGL Hash', trunc(pair.normal_webgl, 16), pair.webgl_match)}
          ${compareField('Trust Score', pair.normal_trust, true)}
        </div>
        <div class="vs-badge">VS</div>
        <div class="compare-card">
          <div class="compare-card-title">🕶️ Incognito</div>
          ${compareField('Fingerprint', trunc(pair.incognito_fingerprint, 16), pair.fingerprints_match)}
          ${compareField('Canvas Hash', trunc(pair.incognito_canvas, 16), pair.canvas_match)}
          ${compareField('WebGL Hash', trunc(pair.incognito_webgl, 16), pair.webgl_match)}
          ${compareField('Trust Score', pair.incognito_trust, true)}
        </div>
      </div>
      <div class="verdict-banner ${allMatch ? 'identical' : 'different'}">
        ${allMatch
          ? '⚠️ IDENTYCZNE — Incognito NIE chroni przed fingerprintingiem!'
          : '✅ Różne — pewne parametry się zmieniły'}
        <div class="verdict-subtitle">
          ${pair.person} · ${pair.browser} · ${pair.os}
        </div>
      </div>
    `;
  }).join('<div style="height: 32px;"></div>');
}

function compareField(label, value, isMatch) {
  return `
    <div class="compare-field">
      <span class="compare-field-key">${label}</span>
      <span class="compare-field-value ${isMatch ? 'match' : 'mismatch'}">${esc(String(value))}</span>
    </div>
  `;
}

// ─── Lies Analysis ───
function renderLies(envs, analytics) {
  const container = document.getElementById('lies-content');
  if (!container) return;

  const breakdown = analytics.lies_breakdown || {};
  const entries = Object.entries(breakdown);

  if (entries.length === 0) {
    // Show all environments with lies count = 0
    const noLiesEnvs = envs.filter(e => e.Lies_Count === 0);
    container.innerHTML = `
      <div class="no-data-message">
        <div class="icon">✅</div>
        <p>Żadna z przeglądarek nie została "przyłapana na kłamstwie"</p>
        <p style="font-size: 0.85rem; margin-top: 8px;">
          Wszystkie ${noLiesEnvs.length} środowisk przeszło test bez wykrytych modyfikacji API.
          Dodaj testy z rozszerzeniami (CanvasBlocker, Privacy Badger) aby zobaczyć wykryte kłamstwa.
        </p>
      </div>
    `;
    return;
  }

  // Also include environments with lies
  const envsWithLies = envs.filter(e => e.Lies_Count > 0);

  container.innerHTML = `
    <div class="lies-grid">
      ${envsWithLies.map(env => `
        <div class="lies-card">
          <div class="lies-card-header">
            <div>
              <div class="lies-card-title">${esc(env.Przegladarka)} (${esc(env.Konfiguracja)})</div>
              <div class="lies-card-detail">${esc(env.Osoba)} · ${esc(env.OS)}</div>
            </div>
            <div class="lies-card-count">${env.Lies_Count} ${env.Lies_Count === 1 ? 'lie' : 'lies'}</div>
          </div>
          <div class="lies-card-detail">
            <strong>Trust Score:</strong> 
            <span style="color: ${env.Trust_Score >= 80 ? 'var(--trust-high)' : (env.Trust_Score >= 50 ? 'var(--trust-medium)' : 'var(--trust-low)')}">
              ${env.Trust_Score} (${env.Trust_Grade})
            </span>
          </div>
          <div style="margin-top: 8px;">
            <strong style="font-size: 0.8rem; color: var(--text-secondary);">Wykryte kłamstwa API:</strong>
            <div>
              ${(env.Lie_Keys_List || []).map(k => `<span class="lies-card-api">${esc(k)}</span>`).join(' ')}
              ${(!env.Lie_Keys_List || env.Lie_Keys_List.length === 0) ? `<span class="lies-card-api">${esc(env.Lie_Keys)}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── Canvas Hash Comparison Matrix ───
function renderHashMatrix(envs) {
  const container = document.getElementById('hash-matrix-content');
  if (!container) return;

  if (envs.length < 2) {
    container.innerHTML = `
      <div class="no-data-message">
        <div class="icon">🎨</div>
        <p>Potrzeba co najmniej 2 środowisk do porównania</p>
      </div>
    `;
    return;
  }

  const labels = envs.map(e => `${e.Osoba}/${e.Przegladarka}/${e.Konfiguracja}`);
  const hashes = envs.map(e => e.Canvas2D_Hash);
  const n = envs.length;

  // Count matches/mismatches
  let matchCount = 0, totalPairs = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      totalPairs++;
      if (hashes[i] === hashes[j]) matchCount++;
    }
  }

  const gridSize = Math.min(n, 20); // cap for visual
  const cellSize = Math.max(24, Math.min(40, Math.floor(600 / gridSize)));

  container.innerHTML = `
    <div style="margin-bottom: 16px; display: flex; gap: 24px; align-items: center; flex-wrap: wrap;">
      <div style="font-size: 0.85rem; color: var(--text-secondary);">
        <span style="display: inline-block; width: 12px; height: 12px; background: var(--accent-cyan); border-radius: 3px; margin-right: 4px;"></span>
        Identyczne hashe (${matchCount} par)
      </div>
      <div style="font-size: 0.85rem; color: var(--text-secondary);">
        <span style="display: inline-block; width: 12px; height: 12px; background: rgba(148,163,184,0.1); border-radius: 3px; margin-right: 4px;"></span>
        Różne hashe (${totalPairs - matchCount} par)
      </div>
    </div>
    <div style="overflow-x: auto;">
      <div style="display: grid; grid-template-columns: 160px repeat(${n}, ${cellSize}px); gap: 2px; align-items: center;">
        <div></div>
        ${labels.map((l, i) => `
          <div style="font-size: 0.6rem; color: var(--text-muted); writing-mode: vertical-lr; text-orientation: mixed; height: 80px; overflow: hidden; transform: rotate(180deg);">
            ${esc(l)}
          </div>
        `).join('')}
        ${Array.from({length: n}, (_, i) => `
          <div style="font-size: 0.7rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${esc(labels[i])}
          </div>
          ${Array.from({length: n}, (_, j) => {
            const cls = i === j ? 'self' : (hashes[i] === hashes[j] ? 'match' : 'mismatch');
            return `
              <div class="hash-matrix-cell ${cls}" style="width:${cellSize}px;height:${cellSize}px;" 
                   title="${labels[i]} vs ${labels[j]}: ${cls === 'match' ? 'IDENTYCZNE' : (cls === 'self' ? 'TOŻSAME' : 'RÓŻNE')}">
              </div>
            `;
          }).join('')}
        `).join('')}
      </div>
    </div>
  `;
}

// ─── OS Impact ───
function renderOSImpact(analytics) {
  const container = document.getElementById('os-impact-content');
  if (!container) return;

  const impact = analytics.os_impact || [];

  if (impact.length === 0) {
    // Generate from data
    const envs = DATA.environments;
    const browsers = [...new Set(envs.map(e => e.Przegladarka))];
    const osGroups = [];

    browsers.forEach(browser => {
      const browserEnvs = envs.filter(e => e.Przegladarka === browser);
      const oses = [...new Set(browserEnvs.map(e => e.OS))];
      if (oses.length > 1) {
        osGroups.push({
          browser,
          os_count: oses.length,
          unique_fingerprints: new Set(browserEnvs.map(e => e.Fingerprint_ID)).size,
          entries: browserEnvs.map(e => ({
            OS: e.OS,
            Fingerprint_ID: e.Fingerprint_ID,
            Canvas2D_Hash: e.Canvas2D_Hash,
            Fonts_Hash: e.Fonts_Hash,
            Trust_Score: e.Trust_Score,
            Fonts_Count: e.Fonts_Count,
          }))
        });
      }
    });

    if (osGroups.length === 0) {
      container.innerHTML = `
        <div class="no-data-message">
          <div class="icon">💻</div>
          <p>Wszystkie testy wykonano na jednym systemie operacyjnym</p>
          <p style="font-size: 0.85rem; margin-top: 8px;">
            Aby zobaczyć wpływ OS na fingerprint, dodaj testy tej samej przeglądarki na różnych systemach.
          </p>
        </div>
      `;
      return;
    }

    renderOSCards(container, osGroups);
  } else {
    renderOSCards(container, impact);
  }
}

function renderOSCards(container, groups) {
  container.innerHTML = `
    <div class="os-impact-grid">
      ${groups.map(group => `
        <div class="os-card">
          <div class="os-card-header">
            <div>
              <div class="os-card-browser">🌐 ${esc(group.browser)}</div>
              <div class="os-card-stat">${group.os_count} systemów → ${group.unique_fingerprints} unikalnych fingerprints</div>
            </div>
          </div>
          ${group.entries.map(entry => `
            <div class="os-entry">
              <div class="os-entry-os">${esc(entry.OS)} ${entry.Trust_Score !== undefined ? `<span style="font-size: 0.75rem; color: var(--text-muted);">(Trust: ${entry.Trust_Score})</span>` : ''}</div>
              <div class="os-entry-hash">Canvas: ${esc(trunc(entry.Canvas2D_Hash, 20))}</div>
              <div class="os-entry-hash">Fonts: ${esc(trunc(entry.Fonts_Hash, 20))} (${entry.Fonts_Count || '?'} czcionek)</div>
              <div class="os-entry-hash">FP: ${esc(trunc(entry.Fingerprint_ID, 20))}</div>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

// ─── Randomness / Consistency Tests ───
function renderRandomness(analytics) {
  const container = document.getElementById('randomness-content');
  if (!container) return;

  const tests = analytics.randomness_tests || [];

  if (tests.length === 0) {
    container.innerHTML = `
      <div class="no-data-message">
        <div class="icon">🔄</div>
        <p>Brak testów spójności (Test1 vs Test2)</p>
        <p style="font-size: 0.85rem; margin-top: 8px;">
          Dodaj pliki z konfiguracją zawierającą słowo "Test1" oraz "Test2" dla danej przeglądarki, 
          aby sprawdzić, czy fingerprinting daje spójne wyniki pod różnymi obciążeniami, czasem czy sieciami.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = tests.map(test => {
    const isConsistent = !test.fingerprint_changed;
    const desc = isConsistent
      ? '✅ <strong>SPÓJNOŚĆ:</strong> Oba środowiska (np. z dwóch różnych prywatnych komputerów) zwróciły identyczny cyfrowy ślad! Przeglądarka skutecznie standaryzuje środowisko — chroniąc prawdziwe parametry sprzętu (np. przypadek Tails OS).'
      : '⚠️ <strong>BRAK SPÓJNOŚCI:</strong> Hash uległ zmianie pomiędzy Test1 a Test2! Sprzyja to detekcji: skrypty mogą odróżnić oba komputery lub sesje, bo wyciekaja unikalne unikalne detale urządzenia (Canvas, Hardware, Sieć).';

    return `
      <div class="comparison-cards" style="margin-bottom: 8px;">
        <div class="compare-card">
          <div class="compare-card-title">🧪 Test 1</div>
          ${compareField('Fingerprint', trunc(test.test1_fingerprint, 16), !test.fingerprint_changed)}
          ${compareField('Canvas Hash', trunc(test.test1_canvas, 16), !test.canvas_changed)}
          ${compareField('WebGL Hash', trunc(test.test1_webgl, 16), !test.webgl_changed)}
        </div>
        <div class="vs-badge">VS</div>
        <div class="compare-card">
          <div class="compare-card-title">🧪 Test 2</div>
          ${compareField('Fingerprint', trunc(test.test2_fingerprint, 16), !test.fingerprint_changed)}
          ${compareField('Canvas Hash', trunc(test.test2_canvas, 16), !test.canvas_changed)}
          ${compareField('WebGL Hash', trunc(test.test2_webgl, 16), !test.webgl_changed)}
        </div>
      </div>
      <div class="verdict-banner ${isConsistent ? 'different' : 'identical'}" style="margin-bottom: 32px">
        <div style="text-align: center; margin-bottom: 8px; font-size: 1.1rem; color: #fff;">
          <strong>${esc(test.person)} · ${esc(test.browser)}</strong>
        </div>
        <div style="font-size: 0.9rem; line-height: 1.4; opacity: 0.9;">
          ${desc}
        </div>
      </div>
    `;
  }).join('');
}

// ─── Conclusions ───
function renderConclusions(envs, analytics) {
  const container = document.getElementById('conclusions-content');
  if (!container) return;

  const conclusions = [];

  // Fingerprint uniqueness
  const fpRatio = analytics.unique_fingerprints / analytics.total_environments;
  if (fpRatio > 0.9) {
    conclusions.push({
      icon: '🎯',
      title: 'Wysoka unikalność',
      text: `${Math.round(fpRatio * 100)}% środowisk wygenerowało unikalny fingerprint. Browser fingerprinting jest niezwykle skutecznym narzędziem śledzenia.`
    });
  } else if (fpRatio > 0.5) {
    conclusions.push({
      icon: '📊',
      title: 'Częściowa unikalność',
      text: `${analytics.unique_fingerprints} z ${analytics.total_environments} środowisk ma unikalny fingerprint (${Math.round(fpRatio * 100)}%). Niektóre środowiska są rozróżnialne.`
    });
  }

  // Trust score analysis
  if (analytics.trust_low > 0) {
    conclusions.push({
      icon: '🛡️',
      title: 'Anti-fingerprinting działa',
      text: `${analytics.trust_low} środowisk ma Trust Score poniżej 50 — to oznacza, że mechanizmy obronne (Brave, Tor, rozszerzenia) skutecznie modyfikują dane, ale jednocześnie stają się "podejrzane" dla systemu śledzenia.`
    });
  }

  // Lies analysis
  if (analytics.total_lies > 0) {
    conclusions.push({
      icon: '🔍',
      title: 'Wykryte modyfikacje API',
      text: `CreepJS wykrył łącznie ${analytics.total_lies} "kłamstw" — modyfikacji natywnych API przez rozszerzenia lub sam przeglądarkę. To paradoks prywatności: ochrona = wykrywalność.`
    });
  }

  // Incognito
  const incognitoPairs = analytics.incognito_comparison || [];
  const allIdentical = incognitoPairs.every(p => p.fingerprints_match);
  if (incognitoPairs.length > 0 && allIdentical) {
    conclusions.push({
      icon: '🕶️',
      title: 'MIT: Incognito = anonimowość',
      text: `Tryb incognito NIE zmienia fingerprint przeglądarki. Wszystkie pary Normal/Incognito wykazały identyczne hashe. Incognito chroni jedynie historię i ciasteczka lokalne.`
    });
  }

  // Randomness / Consistency
  const randomnessTests = analytics.randomness_tests || [];
  if (randomnessTests.length > 0) {
    const consistentTests = randomnessTests.filter(t => !t.fingerprint_changed);
    const successRatio = consistentTests.length / randomnessTests.length;
    if (successRatio > 0) {
      conclusions.push({
        icon: '🔄',
        title: 'Sukces standaryzacji',
        text: `Testy spójności (Test 1 vs Test 2) wykazały, że ${consistentTests.length} na ${randomnessTests.length} podejść wygenerowało TE SAME dane fingerprint, mimo uruchomienia w innej konfiguracji/miejscu. Jest to dowód na wzorowe działanie mechanizmów anti-fingerprinting (np. Tor/Tails) byś przypominał tysiące innych uniwersalnych użytkowników.`
      });
    } else {
      conclusions.push({
        icon: '⚠️',
        title: 'Brak spójności czasowej (Randomness)',
        text: `Badanie różnych sesji tej samej przeglądarki wykazuje rzucającą się w oczy niestałość cyfrowego odcisku — identyfikator uległ zmianie pomiędzy sesjami, co obnaża wyciekające sprzętowe detale na różnych środowiskach.`
      });
    }
  }

  // Canvas uniqueness
  if (analytics.unique_canvas_hashes > 1) {
    conclusions.push({
      icon: '🎨',
      title: 'Canvas Fingerprinting',
      text: `Canvas 2D wygenerował ${analytics.unique_canvas_hashes} unikalnych hashy. Renderowanie Canvas zależy od GPU, sterowników i OS — co czyni go jednym z najsilniejszych wektorów fingerprintingu.`
    });
  }

  // Default conclusion
  if (conclusions.length === 0) {
    conclusions.push({
      icon: '📋',
      title: 'Analiza wstępna',
      text: `Załadowano ${analytics.total_environments} środowisk. Dodaj więcej plików JSON z różnych konfiguracji, aby zobaczyć pełną analizę porównawczą.`
    });
  }

  container.innerHTML = `
    <div class="conclusions-grid">
      ${conclusions.map(c => `
        <div class="conclusion-card">
          <div class="conclusion-icon">${c.icon}</div>
          <div class="conclusion-title">${esc(c.title)}</div>
          <div class="conclusion-text">${esc(c.text)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// ─── Scroll Animations ───
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.section').forEach(el => observer.observe(el));
}

// ─── Utilities ───
function esc(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function trunc(str, len) {
  if (!str) return 'Brak';
  return str.length > len ? str.substring(0, len) + '...' : str;
}
