(function (root) {
  'use strict';
  const TG = (root.TrustGap = root.TrustGap || {});

  // This file is the only place that touches storage. To add a backend later,
  // replace save, load and loadAll with calls to your server and keep the same signatures.
  const SCHEMA_VERSION = 1;
  const PREFIX = 'trustgap:v' + SCHEMA_VERSION + ':';
  const INDEX_KEY = PREFIX + 'index';

  function readIndex() {
    try {
      return JSON.parse(localStorage.getItem(INDEX_KEY)) || [];
    } catch (err) {
      return [];
    }
  }

  function newId() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function newSession(condition) {
    return {
      id: newId(),
      schemaVersion: SCHEMA_VERSION,
      condition,            // 'adaptive' or 'baseline'
      startedAt: new Date().toISOString(),
      completedAt: null,
      profile: {},          // item id -> comfort score (1 to 5)
      checks: [],           // comprehension answer and confidence per item
      rules: [],            // rule that fired and explanation depth shown, per item
      decisions: [],        // 'allow' or 'deny', per item
      events: [],           // timestamped interaction log
    };
  }

  // Returns true on success. The caller should warn the participant on false.
  function save(session) {
    try {
      localStorage.setItem(PREFIX + 'session:' + session.id, JSON.stringify(session));
      const ids = readIndex();
      if (!ids.includes(session.id)) {
        ids.push(session.id);
        localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
      }
      return true;
    } catch (err) {
      console.error('Trust Gap: save failed', err);
      return false;
    }
  }

  function load(id) {
    try {
      return JSON.parse(localStorage.getItem(PREFIX + 'session:' + id));
    } catch (err) {
      return null;
    }
  }

  function loadAll() {
    return readIndex().map(load).filter(Boolean);
  }

  function clearAll() {
    readIndex().forEach((id) => localStorage.removeItem(PREFIX + 'session:' + id));
    localStorage.removeItem(INDEX_KEY);
  }

  TG.storage = { SCHEMA_VERSION, newSession, save, load, loadAll, clearAll };

  if (typeof module !== 'undefined' && module.exports) module.exports = TG;
})(typeof window !== 'undefined' ? window : globalThis);
