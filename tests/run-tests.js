'use strict';
// Run with: node tests/run-tests.js
// Tests the pure logic (rules, metrics, CSV). The browser UI is not covered here.

const assert = require('node:assert/strict');
const TG = require('../js/rules.js');
require('../js/metrics.js');
require('../js/content.js');

const { rules, metrics: M, content } = TG;

// ----- Rules: order and boundaries -----
const pick = (correct, confidence) => rules.chooseDepth({ correct, confidence }).ruleId;

assert.equal(pick(false, 90), 'R1');
assert.equal(pick(false, 70), 'R1'); // high confidence is >= 70
assert.equal(pick(false, 69), 'R2');
assert.equal(pick(true, 39), 'R3'); // low confidence is < 40
assert.equal(pick(true, 40), 'R4');
assert.equal(pick(true, 85), 'R4');
assert.equal(rules.chooseDepth({ correct: false, confidence: 10 }).depth, 'full');
assert.equal(rules.chooseDepth({ correct: true, confidence: 85 }).depth, 'short');
assert.equal(rules.baselineDepth().depth, 'short');

// The last rule must always match, so every input gets a depth.
assert.ok(rules.RULES[rules.RULES.length - 1].test({ correct: true, confidence: 50 }));

// ----- Metrics -----
assert.equal(M.preferenceFor(5), 'allow');
assert.equal(M.preferenceFor(4), 'allow');
assert.equal(M.preferenceFor(3), null);
assert.equal(M.preferenceFor(2), 'deny');
assert.equal(M.preferenceFor(undefined), null);

// Mean confidence 0.7, accuracy 0.5, so the gap is +0.2.
const checks = [
  { correct: true, confidence: 80 },
  { correct: false, confidence: 60 },
];
assert.ok(Math.abs(M.calibrationGap(checks) - 0.2) < 1e-9);
assert.equal(M.calibrationGap([]), null);

// ----- Session rows, alignment and CSV -----
const session = {
  id: 's1',
  condition: 'adaptive',
  startedAt: '2026-11-27T00:00:00.000Z',
  profile: { location: 5, contacts: 2, health: 3 },
  checks: [
    { item: 'location', correct: true, confidence: 80 },
    { item: 'contacts', correct: false, confidence: 75 },
    { item: 'health', correct: true, confidence: 50 },
  ],
  rules: [
    { item: 'location', ruleId: 'R4', depth: 'short' },
    { item: 'contacts', ruleId: 'R1', depth: 'full' },
    { item: 'health', ruleId: 'R4', depth: 'short' },
  ],
  decisions: [
    { item: 'location', choice: 'allow' },
    { item: 'contacts', choice: 'allow' },
  ],
};

const rows = M.rowsFor(session);
assert.equal(rows[0].aligned, true); // comfort 5 means allow, and the decision was allow
assert.equal(rows[1].aligned, false); // comfort 2 means deny, but the decision was allow
assert.equal(rows[2].aligned, null); // neutral comfort and no decision
assert.deepEqual(M.alignment(rows), { aligned: 1, total: 2, rate: 0.5 });

const summary = M.summarize(session);
assert.equal(summary.rows.length, 3);
assert.equal(summary.accuracy, 2 / 3);

const csvLines = M.toCSV(rows).split('\n');
assert.equal(csvLines.length, rows.length + 1);
assert.equal(csvLines[0], M.COLUMNS.join(','));
assert.ok(M.toCSV([{ ...rows[0], session_id: 'a,"b"' }]).split('\n')[1].startsWith('"a,""b"""'));

// ----- Content sanity -----
for (const item of content.items) {
  assert.ok(item.correct >= 0 && item.correct < item.options.length, `bad correct index: ${item.id}`);
}

console.log('All Trust Gap tests passed.');
