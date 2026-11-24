// Arabic checks: search folding, place search against the real data, and the two message files
// kept in step (keys, placeholders, rich-text tags, Western digits, Arabic punctuation).
// Run: npm run test:arabic   (Node 22.18+ reads the TypeScript helper directly)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize, matchesAll } from '../src/lib/normalize.ts';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
let passed = 0;
const problems = [];
const check = (name, fn) => {
  try {
    fn();
    passed += 1;
  } catch (err) {
    problems.push(`${name}: ${err.message}`);
  }
};

// ---------- Folding: every common way of typing a name folds to the same text ----------
const same = [
  ['الساحل الشمالي', 'الساحل الشمالى', 'الساحل الشمالی', 'السَّاحِل الشَّمالي', 'الســاحل الشمالي', 'الساحل\u200cالشمالي'.replace('\u200c', ' ')],
  ['القاهرة', 'القاهره', 'القاهرة\u200e'],
  ['الجونة', 'الجونه', 'الجونـة'],
  ['أبراج العلمين', 'ابراج العلمين', 'إبراج العلمين', 'آبراج العلمين'],
  ['مراسي', 'مراسى', 'مراسی'],
  ['فيلا', 'ڤيلا', 'ڤیلا'],
  ['شاطئ', 'شاطي'],
  ['مسؤول', 'مسوول'],
  ['كمبوند', 'کمبوند'],
  ['مراسي 2', 'مراسي ٢', 'مراسي ۲'],
  ['Café', 'cafe', 'CAFÉ'],
];
for (const group of same) {
  check(`folds ${group[0]}`, () => {
    const folded = new Set(group.map(normalize));
    assert.equal(folded.size, 1, `got ${[...folded].join(' | ')}`);
  });
}

// ---------- Place search, built from the data the way src/lib/search-options.ts builds it ----------
// The search offers only the destinations the site shows; hidden ones wait until they have homes.
const destinations = read('data/destinations.json').destinations.filter((d) => !d.hidden);
const { units } = read('data/units.json');
const { compounds } = read('data/compounds.json');
const options = destinations.map((d) => ({ id: d.slug, keys: normalize([d.name.en, d.name.ar, ...d.aliases].join(' ')) }));
const seen = new Set();
for (const u of units) {
  if (seen.has(u.compound)) continue;
  seen.add(u.compound);
  const d = destinations.find((x) => x.slug === u.destination);
  options.push({ id: u.compound, keys: normalize([u.compound, compounds[u.compound]?.ar ?? '', d.name.en, d.name.ar].join(' ')) });
}
const find = (typed) => options.filter((o) => matchesAll(o.keys, normalize(typed))).map((o) => o.id);

const searches = [
  ['القاهره', 'cairo'],
  ['التجمع الخامس', 'cairo'],
  ['new cairo', 'cairo'],
  ['الجونه', 'gouna'],
  ['جونة', 'gouna'],
  ['El Gouna', 'gouna'],
  ['طابا', 'taba'],
  ['جنوب سينا', 'taba'],
  ['Taba', 'taba'],
  ['نويبع', 'taba'],
  ['سيناء', 'taba'],
  ['الاندلس', 'Al Andalus'],
  ['اندلس', 'Al Andalus'],
  ['andalus', 'Al Andalus'],
  ['ليك فيو', 'Lake View Residence'],
  ['مدينتى', 'Madinaty'],
  ['الرحاب', 'Al Rehab'],
  ['rehab', 'Al Rehab'],
  ['جي كريبس', 'G Cribs'],
  ['ليلى', 'Laila Camp'],
];
for (const [typed, expected] of searches) {
  check(`"${typed}" finds ${expected}`, () => {
    const found = find(typed);
    assert.ok(found.includes(expected), `found ${found.join(', ') || 'nothing'}`);
  });
}
check('a place that isn\'t there finds nothing', () => assert.deepEqual(find('الأقصر'), []));
check('a hidden destination isn\'t offered', () => assert.deepEqual(find('الساحل الشمالي'), []));

// ---------- The message files ----------
const en = read('src/messages/en.json');
const ar = read('src/messages/ar.json');
const flat = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') flat(v, `${prefix}${k}.`, out);
    else out[`${prefix}${k}`] = String(v);
  }
  return out;
};
const E = flat(en);
const A = flat(ar);

check('both languages have the same keys', () => {
  const onlyEn = Object.keys(E).filter((k) => !(k in A));
  const onlyAr = Object.keys(A).filter((k) => !(k in E));
  assert.deepEqual({ onlyEn, onlyAr }, { onlyEn: [], onlyAr: [] });
});

// Placeholders are lowerCamel ({name}, {count, plural…}); plural branches hold text ({Studio}), not placeholders.
const args = (s) => new Set([...s.matchAll(/\{\s*([a-z]\w*)\s*[,}]/g)].map((m) => m[1]));
const tags = (s) => [...new Set([...s.matchAll(/<(\w+)>/g)].map((m) => m[1]))].sort().join(',');
for (const key of Object.keys(E)) {
  if (!(key in A)) continue;
  check(`${key} keeps its placeholders`, () => {
    const a = args(A[key]);
    const e = args(E[key]);
    const missing = [...e].filter((x) => !a.has(x) && !x.endsWith('Text'));
    const extra = [...a].filter((x) => !e.has(x) && !x.endsWith('Text'));
    assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
    assert.equal(tags(A[key]), tags(E[key]), 'rich-text tags differ');
  });
}

// Arabic strings: Western digits by design, Arabic punctuation next to Arabic words.
const arabicStrings = (obj, where) => {
  const out = [];
  const walk = (v, path) => {
    if (typeof v === 'string') {
      if (/[\u0600-\u06ff]/.test(v)) out.push([`${where}${path}`, v]);
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(obj, '');
  return out;
};
const data = [
  ...arabicStrings(ar, 'ar.json:'),
  ...arabicStrings(read('data/destinations.json'), 'destinations.json:'),
  ...arabicStrings(read('data/units.json'), 'units.json:'),
  ...arabicStrings(read('data/images.json'), 'images.json:'),
  ...arabicStrings(read('data/compounds.json'), 'compounds.json:'),
];
for (const [where, text] of data) {
  check(`${where} uses Western digits`, () => assert.doesNotMatch(text, /[\u0660-\u0669\u06f0-\u06f9]/));
  check(`${where} uses Arabic punctuation`, () => {
    const plain = text.replace(/\u2066[^\u2069]*\u2069/g, ''); // Latin examples isolated on purpose (an email, +971)
    assert.doesNotMatch(plain, /[\u0600-\u06ff][\s)]*[,;?]/, 'a Latin comma, semicolon or question mark after Arabic');
  });
}

if (problems.length) {
  console.error(`${problems.length} problem(s), ${passed} checks passed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`test-arabic: ${passed} checks passed (folding, ${searches.length + 1} place searches, ${Object.keys(E).length} messages in both languages, ${data.length} Arabic strings).`);
