(function (root) {
  'use strict';
  const TG = (root.TrustGap = root.TrustGap || {});

  // Working thresholds. They are hypotheses until piloted.
  // If you change them mid-study, record the change in your notes.
  const THRESHOLDS = { highConfidence: 70, lowConfidence: 40 };

  // Rules run top to bottom; the first whose test passes fires.
  // Put specific rules above general ones. The last rule must always match.
  const RULES = [
    {
      id: 'R1',
      flag: 'overconfident_error',
      depth: 'full',
      test: (x) => !x.correct && x.confidence >= THRESHOLDS.highConfidence,
      note: 'Wrong and confident: full explanation to correct the belief.',
    },
    {
      id: 'R2',
      flag: 'wrong_answer',
      depth: 'full',
      test: (x) => !x.correct,
      note: 'Wrong answer: full explanation.',
    },
    {
      id: 'R3',
      flag: 'unsure_but_correct',
      depth: 'full',
      test: (x) => x.correct && x.confidence < THRESHOLDS.lowConfidence,
      note: 'Right but unsure: full explanation to reinforce.',
    },
    {
      id: 'R4',
      flag: 'default',
      depth: 'short',
      test: () => true,
      note: 'Everything else: short explanation.',
    },
  ];

  // Input: { correct: boolean, confidence: number from 0 to 100 }
  function chooseDepth(input) {
    const rule = RULES.find((r) => r.test(input));
    return { ruleId: rule.id, flag: rule.flag, depth: rule.depth };
  }

  // Baseline condition: a fixed short explanation, with no rules applied.
  function baselineDepth() {
    return { ruleId: 'BASE', flag: 'fixed_baseline', depth: 'short' };
  }

  TG.rules = { RULES, THRESHOLDS, chooseDepth, baselineDepth };

  if (typeof module !== 'undefined' && module.exports) module.exports = TG;
})(typeof window !== 'undefined' ? window : globalThis);
