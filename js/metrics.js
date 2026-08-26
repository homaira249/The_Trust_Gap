(function (root) {
  'use strict';
  const TG = (root.TrustGap = root.TrustGap || {});

  // Stated comfort on a 1 to 5 scale becomes a preference.
  // The middle score means no preference, and those requests are left out of alignment.
  function preferenceFor(score) {
    if (score >= 4) return 'allow';
    if (score <= 2) return 'deny';
    return null;
  }

  // Share of checks answered correctly, from 0 to 1.
  function accuracy(checks) {
    if (!checks.length) return null;
    return checks.filter((c) => c.correct).length / checks.length;
  }

  // Mean confidence, rescaled from 0 to 1.
  function meanConfidence(checks) {
    if (!checks.length) return null;
    return checks.reduce((sum, c) => sum + c.confidence, 0) / checks.length / 100;
  }

  // Calibration gap = mean confidence - accuracy.
  // Positive means more confident than accurate (overconfidence). Negative means underconfident.
  function calibrationGap(checks) {
    const acc = accuracy(checks);
    if (acc === null) return null;
    return meanConfidence(checks) - acc;
  }

  // One row per data request. Feeds the mirror, the CSV and the tests.
  function rowsFor(session) {
    return session.checks.map((check) => {
      const rule = session.rules.find((r) => r.item === check.item) || {};
      const decision = session.decisions.find((d) => d.item === check.item) || {};
      const preference = preferenceFor(session.profile[check.item]);
      const aligned = preference === null || !decision.choice ? null : decision.choice === preference;
      return {
        session_id: session.id,
        condition: session.condition,
        started_at: session.startedAt,
        item: check.item,
        correct: check.correct,
        confidence: check.confidence,
        rule_id: rule.ruleId ?? '',
        explanation_depth: rule.depth ?? '',
        decision: decision.choice ?? '',
        stated_preference: preference ?? '',
        aligned,
      };
    });
  }

  // Share of decisions that match stated comfort. Only rows with a preference and a decision count.
  function alignment(rows) {
    const scored = rows.filter((r) => r.aligned !== null);
    const aligned = scored.filter((r) => r.aligned).length;
    return { aligned, total: scored.length, rate: scored.length ? aligned / scored.length : null };
  }

  function summarize(session) {
    const rows = rowsFor(session);
    return {
      accuracy: accuracy(session.checks),
      meanConfidence: meanConfidence(session.checks),
      calibrationGap: calibrationGap(session.checks),
      alignment: alignment(rows),
      rows,
    };
  }

  const COLUMNS = [
    'session_id', 'condition', 'started_at', 'item', 'correct', 'confidence',
    'rule_id', 'explanation_depth', 'decision', 'stated_preference', 'aligned',
  ];

  function toCSV(rows) {
    const cell = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => cell(r[c])).join(','))].join('\n');
  }

  TG.metrics = {
    preferenceFor, accuracy, meanConfidence, calibrationGap,
    alignment, rowsFor, summarize, toCSV, COLUMNS,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TG;
})(typeof window !== 'undefined' ? window : globalThis);
