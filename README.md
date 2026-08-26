# Trust Gap (prototype)

An HCI research prototype on adaptive privacy explanations. It measures how confident participants are compared with how accurate they are, and whether their decisions match their stated comfort.

This is a thin slice: one flow, three data requests, LocalStorage only. A backend comes later.

## Run

- Open `index.html` in a browser. No server is needed.
- Chart.js loads from a CDN, so the chart needs an internet connection.
- Force a condition for testing: `index.html?condition=adaptive` or `index.html?condition=baseline`. Without the parameter, each new session is assigned at random.

## Test the logic

```
node tests/run-tests.js
```

Requires Node 16 or later. The tests cover the rules, the metrics and the CSV export.

## Structure

| File | Purpose |
| --- | --- |
| `js/content.js` | Fictional app text: questions, options, explanations. Edit wording here. |
| `js/rules.js` | Adaptive rules as data, plus thresholds. The first matching rule fires. |
| `js/metrics.js` | Calibration gap, preference alignment, row building, CSV. |
| `js/storage.js` | The only place data is saved. Replace this file's functions with a backend later. |
| `js/app.js` | Screens and flow. |
| `css/style.css` | Styling. |

## Flow

1. Profile: comfort with sharing location, contacts and health data (1 to 5).
2. For each request: a multiple-choice check and a confidence slider, then an explanation, then a decision.
3. Decision Mirror: confidence against correctness, and the calibration gap.

## Operational definitions

These are working definitions. Change them in `js/metrics.js` if your research question needs something else.

- **Calibration gap** = mean confidence (0 to 1) minus accuracy (0 to 1). Positive means overconfident.
- **Preference alignment**: a comfort score of 4 or 5 counts as "allow", 1 or 2 as "deny", and 3 as no preference. Only requests with a preference and a decision count.
- **Rules**: R1 wrong and confident (confidence at least 70) gives a full explanation. R2 wrong gives a full explanation. R3 right but unsure (confidence below 40) gives a full explanation. R4 is the default short explanation.
- **Baseline condition**: always the short explanation, with no rules.

## Data

- Stored in this browser only, under keys starting with `trustgap:v1:`.
- Export CSV: one row per data request, across all sessions in this browser.
- Export JSON: full sessions, including the event log.
- Clearing site data deletes everything. Export first.

## Known limits

- A page reload starts a new session. Partial sessions stay in storage, so check `completedAt` when analysing.
- Each request has one check item. Add more items in `content.js` if needed.
- The rules and thresholds are hypotheses until they are piloted.
- The scenario is fictional. Real participant data needs ethics approval.

## Next: backend

1. Keep the function signatures in `js/storage.js` (`save`, `load`, `loadAll`).
2. Point them at Supabase, Firebase or your own server.
3. Add a consent and ethics screen before any real study.
