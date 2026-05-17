// app.js — UI controller

(function () {
  let lastResult = null;
  let lastCode   = '';

  // ── DOM refs ──
  const codeInput    = document.getElementById('code-input');
  const analyzeBtn   = document.getElementById('analyze-btn');
  const clearBtn     = document.getElementById('clear-btn');
  const fileInput    = document.getElementById('file-input');
  const lineCount    = document.getElementById('line-count');
  const gutter       = document.getElementById('gutter');
  const emptyState   = document.getElementById('empty-state');
  const resultsInner = document.getElementById('results-inner');
  const exportBtn    = document.getElementById('export-btn');

  // ── Gutter / line counter ──
  function updateGutter() {
    const lines = codeInput.value.split('\n').length;
    lineCount.textContent = `${lines} line${lines !== 1 ? 's' : ''}`;
    gutter.innerHTML = Array.from({ length: lines }, (_, i) =>
      `<span>${i + 1}</span>`).join('');
  }

  codeInput.addEventListener('input', updateGutter);
  updateGutter();

  // ── Sample chips ──
  document.querySelectorAll('.chip[data-sample]').forEach(chip => {
    chip.addEventListener('click', () => {
      codeInput.value = SAMPLES[chip.dataset.sample] || '';
      updateGutter();
    });
  });

  // ── File upload ──
  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      codeInput.value = ev.target.result;
      updateGutter();
    };
    reader.readAsText(file);
  });

  // ── Clear ──
  clearBtn.addEventListener('click', () => {
    codeInput.value = '';
    updateGutter();
    emptyState.style.display = '';
    resultsInner.style.display = 'none';
    lastResult = null;
  });

  // ── Analyze ──
  analyzeBtn.addEventListener('click', () => {
    const code = codeInput.value.trim();
    if (!code) { codeInput.focus(); return; }

    const label   = analyzeBtn.querySelector('.btn-label');
    const loading = analyzeBtn.querySelector('.btn-loading');
    analyzeBtn.disabled = true;
    label.style.display   = 'none';
    loading.style.display = '';

    setTimeout(() => {
      const result = analyzeCode(code);
      lastResult = result;
      lastCode   = code;
      renderResults(result, code);

      analyzeBtn.disabled      = false;
      label.style.display      = '';
      loading.style.display    = 'none';
    }, 900);
  });

  // ── Render ──
  function renderResults(r, code) {
    emptyState.style.display  = 'none';
    resultsInner.style.display = '';

    // Metrics
    document.getElementById('metrics-grid').innerHTML = [
      { label: 'Complexity', value: r.complexity, sub: r.complexityLabel, cls: r.complexityClass },
      { label: 'Coupling',   value: r.coupling,   sub: r.couplingLabel,   cls: r.couplingClass },
      { label: 'Effort',     value: r.effortPts + ' pts', sub: r.effortLabel, cls: r.effortPts > 7 ? 'warn' : 'ok' },
      { label: 'Lines',      value: r.lines,      sub: 'non-empty',       cls: '' }
    ].map(m => `
      <div class="metric-card ${m.cls}">
        <div class="metric-label">${m.label}</div>
        <div class="metric-value">${m.value}</div>
        <div class="metric-sub">${m.sub}</div>
      </div>`).join('');

    // Bars
    document.getElementById('bars-container').innerHTML = r.layers.map(l => `
      <div class="bar-item">
        <div class="bar-meta"><span>${l.label}</span><span>${l.pct}%</span></div>
        <div class="bar-track">
          <div class="bar-fill" style="width:0%;background:${l.color}" data-pct="${l.pct}"></div>
        </div>
      </div>`).join('');

    // Animate bars
    requestAnimationFrame(() => {
      document.querySelectorAll('.bar-fill[data-pct]').forEach(el => {
        el.style.width = el.dataset.pct + '%';
      });
    });

    // Issues
    document.getElementById('issues-container').innerHTML = r.issues.map(i => `
      <div class="issue-item">
        <span class="severity-badge ${i.sev === 'high' ? 'high' : i.sev === 'med' ? 'med' : 'low'}">
          ${i.sev === 'high' ? 'High' : i.sev === 'med' ? 'Medium' : 'Low'}
        </span>
        <span class="issue-text">${i.text}</span>
      </div>`).join('');

    // Recs
    document.getElementById('recs-container').innerHTML = r.recs.map((rec, i) => `
      <div class="rec-item">
        <div class="rec-num">${i + 1}</div>
        <div class="rec-text">${rec}</div>
      </div>`).join('');

    // Phase strip
    const phases = ['① Discover', '② Restructure', '③ Migrate'];
    document.getElementById('phase-strip').innerHTML = phases.map((p, i) => {
      const cls = i + 1 < r.phase ? 'done' : i + 1 === r.phase ? 'active' : 'todo';
      const label = cls === 'active' ? p + ' ← now' : p;
      return `<div class="phase-pill ${cls}">${label}</div>`;
    }).join('');

    // Graph
    setTimeout(() => renderDepGraph('dep-graph', r), 50);

    // Compare
    const { before, after } = generateComparison(code);
    document.getElementById('compare-before').textContent = before;
    document.getElementById('compare-after').textContent  = after;

    // Scroll into view
    resultsInner.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Tabs ──
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(tc => {
        tc.classList.toggle('hidden', !tc.id.endsWith(target));
      });
      if (target === 'graph' && lastResult) {
        setTimeout(() => renderDepGraph('dep-graph', lastResult), 30);
      }
    });
  });

  // ── Export ──
  exportBtn.addEventListener('click', () => {
    if (!lastResult) return;
    const r = lastResult;
    const lines = [
      '╔══════════════════════════════════════════════╗',
      '║   LEGACY BRIDGE — MODERNIZATION REPORT       ║',
      '╚══════════════════════════════════════════════╝',
      '',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      '── METRICS ─────────────────────────────────────',
      `Complexity     : ${r.complexity} / 100  (${r.complexityLabel})`,
      `Coupling       : ${r.coupling} / 100  (${r.couplingLabel})`,
      `Migration Effort: ${r.effortPts} points  (${r.effortLabel})`,
      `Lines of Code  : ${r.lines}`,
      '',
      '── LAYER BREAKDOWN ──────────────────────────────',
      ...r.layers.map(l => `${l.label.padEnd(22)}: ${l.pct}%`),
      '',
      '── ISSUES DETECTED ──────────────────────────────',
      ...r.issues.map(i => `[${i.sev.toUpperCase().padEnd(6)}] ${i.text}`),
      '',
      '── RECOMMENDATIONS ──────────────────────────────',
      ...r.recs.map((rec, i) => `${i + 1}. ${rec}`),
      '',
      '── MODERNIZATION PHASE ──────────────────────────',
      `Current phase: ${r.phase === 1 ? '① Discover' : r.phase === 2 ? '② Restructure' : '③ Migrate'}`,
      '',
      '─────────────────────────────────────────────────',
      'Legacy Bridge Technologies — legacybridge.tech',
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'legacybridge-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  });
})();
