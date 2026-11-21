// Tests apps-script/Code.gs without Google: rows, scores and routing, alerts, and what it refuses.
// Run: npm run test:forms
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { loadFormsScript } from './forms-script-sandbox.mjs';

/** Dates made inside the sandbox come from its own realm, so instanceof can't see them. */
const isDate = (value) => Object.prototype.toString.call(value) === '[object Date]';

const { context, mails, post, table, sheets } = loadFormsScript();
context.setup();

const stay = {
  kind: 'stay',
  ref: 'EA-7K2QX',
  lang: 'en',
  page: 'https://escapeaway-demo.github.io/en/stays/marassi-sea-view-chalet/?in=2027-06-11&out=2027-06-14&adults=4',
  code: 'NC-MRS-014',
  home: 'Marassi Sea View Chalet',
  checkin: '2027-06-11',
  checkout: '2027-06-14',
  nights: 3,
  adults: 4,
  children: 1,
  infants: 0,
  name: 'Sara',
  whatsapp: '201001234567',
  email: 'sara@example.com',
  note: 'We arrive late.',
  company: '',
};
const owner = (over) => ({
  kind: 'owner',
  ref: 'EA-9PQRS',
  lang: 'ar',
  page: 'https://escapeaway-demo.github.io/ar/owners/',
  area: 'north-coast',
  areaName: 'الساحل الشمالي',
  compound: 'Marassi',
  compoundKnown: true,
  type: 'chalet',
  bedrooms: 2,
  furnished: true,
  size: 120,
  state: 'ready',
  availability: 'now',
  photos: 'whatsapp',
  photosLink: '',
  name: 'Omar',
  whatsapp: '971501234567',
  email: '',
  abroad: true,
  note: '',
  company: '',
  ...over,
});

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
};

check('setup makes the tabs', () => {
  for (const name of ['Stay requests', 'Owner leads', 'Call next', 'Scoring']) assert.ok(sheets.has(name), name);
  const formula = sheets.get('Call next').get(1, 1);
  assert.match(formula, /QUERY\('Owner leads'!A:AA, "select C, D, E, F, B, T, U, H, I, K, L, O, P, S, A where G = 'New' and C is not null order by C desc, A asc", 1\)/);
});

check('a stay request becomes a row with a reply link and an alert', () => {
  assert.deepEqual(post(stay), { ok: true, ref: 'EA-7K2QX' });
  const [row] = table('Stay requests');
  assert.equal(row.Reference, 'EA-7K2QX');
  assert.equal(row.Status, 'New');
  assert.equal(row['Home code'], 'NC-MRS-014');
  assert.equal(row.Nights, 3);
  assert.equal(row.Adults + row.Children, 5);
  assert.equal(row.WhatsApp, '+201001234567');
  assert.equal(row.Language, 'English');
  assert.ok(isDate(row['Check-in']) && isDate(row.Received));
  assert.match(row['Days to check-in'], /=IF\(G2="","",G2-TODAY\(\)\)/);
  assert.match(row.Reply, /=HYPERLINK\("https:\/\/wa\.me\/201001234567\?text=Hello%20Sara%2C/);
  assert.equal(mails.length, 1);
  assert.match(mails[0].subject, /^Stay request EA-7K2QX: NC-MRS-014, .+ to .+, 5 guests$/);
  assert.doesNotMatch(mails[0].body, /\n\n\n/);
  assert.match(mails[0].body, /Note: We arrive late\./);
});

const scored = [
  ['hot: known compound, ready, now', {}, 100, 'Hot'],
  ['warm: area only, needs a refresh, within 3 months', { area: 'sheikh-zayed', compound: '', compoundKnown: false, state: 'refresh', availability: 'soon' }, 70, 'Warm'],
  ['cool: area only, finished, later', { area: 'cairo', compound: 'Fifth Settlement', compoundKnown: false, furnished: false, state: 'finished', availability: 'later' }, 55, 'Cool'],
  ['nurture: elsewhere, not handed over, not sure', { area: 'elsewhere', compound: 'Ain Sokhna', compoundKnown: false, furnished: false, state: 'not-handed-over', availability: 'unsure' }, 10, 'Nurture'],
  ['a compound flag without a compound earns nothing', { compound: '', compoundKnown: true }, 90, 'Hot'],
];
for (const [name, over, total, priority] of scored) {
  check(`owner lead scored ${name}`, () => {
    const before = table('Owner leads').length;
    assert.equal(post(owner(over)).ok, true);
    const rows = table('Owner leads');
    assert.equal(rows.length, before + 1);
    const row = rows.at(-1);
    assert.equal(row.Score, total);
    assert.equal(row.Priority, priority);
    assert.equal(row['Call by'] === '', priority === 'Nurture');
    assert.match(row['Score details'], /^Location \d+\/40 .+ · Readiness \d+\/30 .+ · Timeline \d+\/30 .+$/);
  });
}

check('owner rows carry words, not codes, and an Arabic reply', () => {
  const row = table('Owner leads')[0];
  assert.equal(row.Area, 'North Coast');
  assert.equal(row.Type, 'Chalet');
  assert.equal(row.State, 'Furnished, ready for guests');
  assert.equal(row.Available, 'Right away');
  assert.equal(row['Lives abroad'], 'Yes');
  assert.equal(row.Language, 'Arabic');
  assert.match(row.Reply, /wa\.me\/971501234567\?text=%D8%A3%D9%87%D9%84%D8%A7%D9%8B/);
  const alert = mails.find((m) => m.subject.startsWith('[Hot 100]'));
  assert.ok(alert, 'hot lead alert');
  assert.match(alert.subject, /^\[Hot 100\] Owner lead EA-9PQRS: Chalet, 2 bedrooms, North Coast$/);
});

check('what a visitor types never runs as a formula', () => {
  post({ ...stay, ref: 'EA-AAAAA', name: '=HYPERLINK("https://example.com","click")', note: '+1 and @me' });
  const row = table('Stay requests').at(-1);
  assert.equal(row.Name, '=HYPERLINK("https://example.com","click")'); // stored as text, apostrophe-prefixed
  // The only formulas are the script's own two, and the name inside the reply link can't close its quotes.
  for (const formula of sheets.get('Stay requests').formulas.values()) {
    assert.match(formula, /^(=HYPERLINK\("https:\/\/wa\.me\/\d+\?text=[^"]*","Reply on WhatsApp"\)|=IF\(G\d+="","",G\d+-TODAY\(\)\))$/);
  }
  assert.equal(row.Note, '+1 and @me');
});

check('the hidden field drops a bot without saying so', () => {
  const before = table('Stay requests').length;
  const mailCount = mails.length;
  assert.equal(post({ ...stay, company: 'Acme' }).ok, true);
  assert.equal(table('Stay requests').length, before);
  assert.equal(mails.length, mailCount);
});

check('bad input is refused and names the field', () => {
  assert.deepEqual(post({ ...stay, whatsapp: '123' }), { ok: false, error: 'invalid', field: 'whatsapp' });
  assert.deepEqual(post({ ...stay, email: 'sara@' }), { ok: false, error: 'invalid', field: 'email' });
  assert.deepEqual(post({ ...stay, checkout: '2027-06-11' }), { ok: false, error: 'invalid', field: 'checkout' });
  assert.deepEqual(post({ ...stay, checkin: '2027-02-30' }), { ok: false, error: 'invalid', field: 'checkin' });
  assert.deepEqual(post({ ...stay, adults: 0, children: 0 }), { ok: false, error: 'invalid', field: 'adults' });
  assert.deepEqual(post(owner({ state: 'great' })), { ok: false, error: 'invalid', field: 'state' });
  assert.deepEqual(post(owner({ photos: 'link', photosLink: 'not a link' })), { ok: false, error: 'invalid', field: 'photosLink' });
  assert.deepEqual(post(owner({ size: 3 })), { ok: false, error: 'invalid', field: 'size' });
  assert.deepEqual(post({ kind: 'other' }), { ok: false, error: 'bad-request' });
  assert.deepEqual(post('not json'), { ok: false, error: 'bad-request' });
  assert.deepEqual(post('x'.repeat(20001)), { ok: false, error: 'bad-request' });
});

check('a missing or odd reference is replaced', () => {
  const reply = post({ ...stay, ref: 'drop table' });
  assert.equal(reply.ok, true);
  assert.match(reply.ref, /^EA-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/);
});

check('new points rescore the leads already in the sheet', () => {
  // SCORING is a top-level const in the script; a statement run in the same context can change it.
  vm.runInContext('SCORING.location.areas["north-coast"] = 20', context);
  const count = context.rescoreOwnerLeads();
  assert.equal(count, table('Owner leads').length);
  assert.equal(table('Owner leads')[0].Score, 90); // 20 + 10 + 30 + 30
  assert.equal(table('Owner leads')[0].Priority, 'Hot');
});

console.log(`\n${passed} checks passed. Stay requests: ${table('Stay requests').length}, owner leads: ${table('Owner leads').length}, emails: ${mails.length}.`);
