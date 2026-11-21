// Runs apps-script/Code.gs in Node against an in-memory spreadsheet, so the forms' sheet logic
// (validation, scoring, rows, alerts) can be tested without a Google account. Used by
// scripts/test-forms-script.mjs and scripts/form-sink.mjs. Only the Apps Script calls Code.gs makes
// are modelled; formatting calls are accepted and ignored.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const CODE = fileURLToPath(new URL('../apps-script/Code.gs', import.meta.url));

/** Any method returns the same object, so formatting chains (setFontWeight().setBackground()…) just work. */
function chain(target = {}) {
  const proxy = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (prop === 'then') return undefined;
      return () => proxy;
    },
  });
  return proxy;
}

class Sheet {
  constructor(name) {
    this.name = name;
    this.rows = [];
    this.formulas = new Map();
    this.id = Math.floor(Math.random() * 1e9);
    return chain(this);
  }
  appendRow(values) {
    // Like Sheets: a string starting with = is a formula, a leading apostrophe forces plain text.
    const row = this.rows.length + 1;
    this.rows.push(values.map((v, i) => this.store(row, i + 1, v)));
  }
  store(row, col, v) {
    if (typeof v === 'string' && v.startsWith('=')) {
      this.formulas.set(`${row},${col}`, v);
      return `(formula) ${v}`;
    }
    if (typeof v === 'string' && v.startsWith("'")) return v.slice(1);
    return v;
  }
  set(row, col, v) {
    while (this.rows.length < row) this.rows.push([]);
    const r = this.rows[row - 1];
    while (r.length < col) r.push('');
    r[col - 1] = this.store(row, col, v);
  }
  get(row, col) {
    return this.rows[row - 1]?.[col - 1] ?? '';
  }
  getLastRow() {
    return this.rows.length;
  }
  getMaxRows() {
    return 1000;
  }
  getSheetId() {
    return this.id;
  }
  clear() {
    this.rows = [];
    this.formulas.clear();
    return this;
  }
  getRange(a, b, c = 1, d = 1) {
    const sheet = this;
    const [row, col, rows, cols] = typeof a === 'string' ? [1, 1, 1, 1] : [a, b, c, d];
    return chain({
      setValues(values) {
        values.forEach((line, i) => line.forEach((v, j) => sheet.set(row + i, col + j, v)));
        return this;
      },
      setValue(v) {
        sheet.set(row, col, v);
        return this;
      },
      setFormula(f) {
        sheet.set(row, col, f);
        return this;
      },
      getValues() {
        return Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => sheet.get(row + i, col + j)));
      },
    });
  }
}

export function loadFormsScript({ alertEmail = 'team@example.com' } = {}) {
  const sheets = new Map();
  const mails = [];
  const spreadsheet = chain({
    getSheetByName: (name) => sheets.get(name) ?? null,
    insertSheet: (name) => {
      const s = new Sheet(name);
      sheets.set(name, s);
      return s;
    },
    getUrl: () => 'https://docs.google.com/spreadsheets/d/LOCAL-TEST/edit',
  });

  const context = vm.createContext({
    console,
    SpreadsheetApp: chain({
      getActiveSpreadsheet: () => spreadsheet,
      flush: () => undefined,
      newDataValidation: () => chain({ build: () => ({}) }),
      newConditionalFormatRule: () => chain({ build: () => ({}) }),
    }),
    LockService: { getScriptLock: () => ({ waitLock: () => undefined, releaseLock: () => undefined }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => (key === 'ALERT_EMAIL' ? alertEmail : null) }) },
    MailApp: { sendEmail: (message) => mails.push(message) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (content) => ({ content, setMimeType() { return this; }, getContent() { return this.content; } }),
    },
    Utilities: {
      formatDate: (date, _zone, _format) =>
        new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Cairo' }).format(date),
    },
    Session: { getScriptTimeZone: () => 'Africa/Cairo' },
  });
  vm.runInContext(readFileSync(CODE, 'utf8'), context, { filename: 'Code.gs' });

  /** Posts a payload (object or raw text) the way the web app receives it, and returns the JSON reply. */
  const post = (payload) => {
    const contents = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return JSON.parse(context.doPost({ postData: { contents, type: 'text/plain' } }).getContent());
  };

  /** A tab as an array of objects keyed by its header row. */
  const table = (name) => {
    const s = sheets.get(name);
    if (!s || !s.rows.length) return [];
    const [head, ...rows] = s.rows;
    return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
  };

  return { context, sheets, mails, post, table };
}
