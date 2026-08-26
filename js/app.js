(function () {
  'use strict';
  const TG = window.TrustGap;
  const { app, items } = TG.content;
  const root = document.getElementById('app');

  let session = null;
  let position = { screen: 'welcome', index: 0 };
  let chart = null;

  // ---------- state ----------

  function persist() {
    if (!TG.storage.save(session)) {
      alert('This browser could not save your data. Export it before closing the page.');
    }
  }

  function log(type, data = {}) {
    session.events.push({ t: new Date().toISOString(), type, ...data });
    persist();
  }

  // Insert or replace the record for one item, so a repeated submit does not duplicate answers.
  function upsert(list, record) {
    const i = list.findIndex((x) => x.item === record.item);
    if (i >= 0) list[i] = record;
    else list.push(record);
  }

  function go(screen, index = 0) {
    position = { screen, index };
    render();
  }

  function render() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
    const views = {
      welcome: viewWelcome,
      profile: viewProfile,
      check: viewCheck,
      explain: viewExplain,
      decide: viewDecide,
      mirror: viewMirror,
    };
    views[position.screen](position.index);
    log('screen_shown', { screen: position.screen, index: position.index });
  }

  function start() {
    // ?condition=adaptive or ?condition=baseline forces a condition for testing.
    // Without it, each new session is assigned at random.
    const requested = new URLSearchParams(location.search).get('condition');
    const condition = ['adaptive', 'baseline'].includes(requested)
      ? requested
      : (Math.random() < 0.5 ? 'adaptive' : 'baseline');
    session = TG.storage.newSession(condition);
    go('welcome');
  }

  // ---------- screens ----------

  function viewWelcome() {
    root.innerHTML = `
      <section class="card">
        <p class="eyebrow">Trust Gap · prototype</p>
        <h1>What would you share, and why?</h1>
        <p>You will set your sharing preferences, then review three data requests from a fictional app, ${app}. Each request has a short check, an explanation and a decision. At the end you will see how your confidence compared with your accuracy.</p>
        <p class="note">The scenario is fictional. Everything is stored only in this browser.</p>
        <div class="actions"><button class="primary" id="begin">Begin</button></div>
      </section>`;
    root.querySelector('#begin').onclick = () => go('profile');
  }

  function viewProfile() {
    const questions = items.map((item) => `
      <fieldset class="likert">
        <legend>I am comfortable letting apps access my ${item.label}.</legend>
        <div class="scale">
          ${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="${item.id}" value="${n}"><span>${n}</span></label>`).join('')}
        </div>
      </fieldset>`).join('');

    root.innerHTML = `
      <section class="card">
        <p class="eyebrow">Profile</p>
        <h2>Your sharing preferences</h2>
        <p class="hint">1 means very uncomfortable, 5 means very comfortable.</p>
        <form id="profile">
          ${questions}
          <div class="actions"><button class="primary" type="submit" disabled>Continue</button></div>
        </form>
      </section>`;

    const form = root.querySelector('#profile');
    const submit = form.querySelector('button[type="submit"]');

    form.addEventListener('change', () => {
      submit.disabled = !items.every((item) => form.querySelector(`input[name="${item.id}"]:checked`));
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      session.profile = Object.fromEntries(items.map((item) => [
        item.id,
        Number(form.querySelector(`input[name="${item.id}"]:checked`).value),
      ]));
      persist();
      go('check', 0);
    });
  }

  function viewCheck(index) {
    const item = items[index];
    root.innerHTML = `
      <section class="card">
        <p class="eyebrow">Request ${index + 1} of ${items.length} · ${item.label}</p>
        <h2>Quick check</h2>
        <p class="question">${item.question}</p>
        <form id="check">
          ${item.options.map((opt, i) => `
            <label class="option"><input type="radio" name="answer" value="${i}"><span>${opt}</span></label>`).join('')}
          <div class="confidence">
            <label for="confidence">How confident are you in your answer? <output id="confOut">–</output> / 100</label>
            <input id="confidence" type="range" min="0" max="100" value="50">
          </div>
          <div class="actions"><button class="primary" type="submit" disabled>Submit</button></div>
        </form>
      </section>`;

    const form = root.querySelector('#check');
    const slider = form.querySelector('#confidence');
    const out = form.querySelector('#confOut');
    const submit = form.querySelector('button[type="submit"]');

    // Confidence counts only after the slider has been moved, so a default 50 is never recorded by accident.
    let touched = false;
    const refresh = () => {
      submit.disabled = !(touched && form.querySelector('input[name="answer"]:checked'));
    };
    slider.addEventListener('input', () => {
      touched = true;
      out.textContent = slider.value;
      refresh();
    });
    form.addEventListener('change', refresh);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const choice = Number(form.querySelector('input[name="answer"]:checked').value);
      const check = {
        item: item.id,
        choice,
        correct: choice === item.correct,
        confidence: Number(slider.value),
        answeredAt: new Date().toISOString(),
      };
      const rule = session.condition === 'adaptive'
        ? TG.rules.chooseDepth(check)
        : TG.rules.baselineDepth();

      upsert(session.checks, check);
      upsert(session.rules, { item: item.id, ...rule });
      log('check_submitted', {
        item: item.id,
        correct: check.correct,
        confidence: check.confidence,
        ruleId: rule.ruleId,
        depth: rule.depth,
      });
      go('explain', index);
    });
  }

  function viewExplain(index) {
    const item = items[index];
    const rule = session.rules.find((r) => r.item === item.id);
    const text = rule.depth === 'full' ? item.full : item.short;
    const shownAt = performance.now();

    root.innerHTML = `
      <section class="card">
        <p class="eyebrow">Request ${index + 1} of ${items.length} · ${item.label}</p>
        <h2>How ${app} uses your ${item.label}</h2>
        <p class="explain ${rule.depth}">${text}</p>
        <div class="actions"><button class="primary" id="next">Continue</button></div>
      </section>`;

    root.querySelector('#next').onclick = () => {
      log('explanation_seen', {
        item: item.id,
        depth: rule.depth,
        dwellMs: Math.round(performance.now() - shownAt),
      });
      go('decide', index);
    };
  }

  function viewDecide(index) {
    const item = items[index];
    root.innerHTML = `
      <section class="card">
        <p class="eyebrow">Request ${index + 1} of ${items.length} · ${item.label}</p>
        <h2>Allow ${app} to access your ${item.label}?</h2>
        <div class="actions">
          <button class="primary" data-choice="allow">Allow</button>
          <button class="secondary" data-choice="deny">Don't allow</button>
        </div>
      </section>`;

    root.querySelectorAll('[data-choice]').forEach((btn) => {
      btn.onclick = () => {
        const choice = btn.dataset.choice;
        upsert(session.decisions, { item: item.id, choice, decidedAt: new Date().toISOString() });
        log('decision', { item: item.id, choice });
        if (index + 1 < items.length) go('check', index + 1);
        else go('mirror');
      };
    });
  }

  function viewMirror() {
    const s = TG.metrics.summarize(session);
    session.completedAt = session.completedAt || new Date().toISOString();
    persist();

    const gap = s.calibrationGap === null
      ? '–'
      : `${s.calibrationGap > 0 ? '+' : ''}${Math.round(s.calibrationGap * 100)} pts`;
    const acc = s.accuracy === null ? '–' : `${Math.round(s.accuracy * 100)}%`;
    const align = s.alignment.total ? `${s.alignment.aligned} of ${s.alignment.total}` : '–';
    const saved = TG.storage.loadAll().length;

    root.innerHTML = `
      <section class="card">
        <p class="eyebrow">Decision Mirror</p>
        <h2>Confidence against accuracy</h2>
        <div class="stats">
          <div><span>Calibration gap</span><strong>${gap}</strong><small>Positive means more confident than accurate.</small></div>
          <div><span>Accuracy</span><strong>${acc}</strong><small>Correct answers in the quick checks.</small></div>
          <div><span>Decisions matching comfort</span><strong>${align}</strong><small>Only requests with a clear comfort level count.</small></div>
        </div>
        <div class="chart-wrap"><canvas id="chart" role="img" aria-label="Confidence and correctness for each data request"></canvas></div>
        <div class="actions">
          <button class="secondary" id="csv">Export CSV</button>
          <button class="secondary" id="json">Export JSON</button>
          <button class="secondary" id="clear">Delete local data</button>
          <button class="primary" id="again">New session</button>
        </div>
        <p class="note">This browser holds ${saved} saved session${saved === 1 ? '' : 's'}.</p>
      </section>`;

    drawChart(root.querySelector('#chart'), s.rows);

    root.querySelector('#csv').onclick = () => {
      const rows = TG.storage.loadAll().flatMap((sess) => TG.metrics.rowsFor(sess));
      download('trust-gap-sessions.csv', TG.metrics.toCSV(rows), 'text/csv');
    };
    root.querySelector('#json').onclick = () => {
      download('trust-gap-sessions.json', JSON.stringify(TG.storage.loadAll(), null, 2), 'application/json');
    };
    root.querySelector('#clear').onclick = () => {
      const count = TG.storage.loadAll().length;
      if (confirm(`Delete ${count} saved session${count === 1 ? '' : 's'} from this browser? This cannot be undone.`)) {
        TG.storage.clearAll();
        start();
      }
    };
    root.querySelector('#again').onclick = () => start();
  }

  // ---------- helpers ----------

  function drawChart(canvas, rows) {
    if (typeof Chart === 'undefined') {
      canvas.replaceWith(Object.assign(document.createElement('p'), {
        className: 'note',
        textContent: 'The chart could not load, because Chart.js needs an internet connection. The numbers above are still correct.',
      }));
      return;
    }
    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: rows.map((r) => items.find((i) => i.id === r.item).label),
        datasets: [
          { label: 'Confidence', data: rows.map((r) => r.confidence), backgroundColor: '#b8a58a' },
          { label: 'Correct (100) or incorrect (0)', data: rows.map((r) => (r.correct ? 100 : 0)), backgroundColor: '#2f4a4a' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: 0, max: 100, title: { display: true, text: 'Points out of 100' } } },
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  function download(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  start();
})();
