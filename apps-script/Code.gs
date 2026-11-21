/**
 * Escape Away website forms, written into this Google Sheet.
 *
 * The website posts two kinds of form here (setup steps: apps-script/README.md):
 *   - "stay":  a request to book from a listing page   → the "Stay requests" tab
 *   - "owner": an owner's unit from the owner form     → the "Owner leads" tab, scored out of 100
 * Each new row can also email the team: set the Script property ALERT_EMAIL.
 *
 * Owner leads are scored on the three things the brief names (location demand, unit readiness,
 * timeline) and routed hot, warm, cool or nurture, following the inbound-lead-qualifier playbook, so
 * the team calls the best units first. The "Call next" tab lists open leads, best first.
 */

// ---------- Scoring. Change the points here, then run refreshScoringTab and rescoreOwnerLeads. ----------
const SCORING = {
  location: {
    max: 40,
    // Points for each area. Raise or lower an area as demand moves.
    areas: { cairo: 30, 'sheikh-zayed': 30, 'north-coast': 30, 'el-alamein': 30, gouna: 30, elsewhere: 0 },
    // Extra points for a compound where Escape Away already lists a home (the website checks its own list).
    knownCompound: 10,
  },
  readiness: { max: 30, points: { ready: 30, refresh: 20, finished: 15, 'not-handed-over': 5 } },
  timeline: { max: 30, points: { now: 30, soon: 20, later: 10, unsure: 5 } },
  // Highest band first. "hours" sets the Call by time; 0 leaves it empty.
  bands: [
    { min: 80, label: 'Hot', next: 'Call within 1 hour', hours: 1 },
    { min: 60, label: 'Warm', next: 'Call within 24 hours', hours: 24 },
    { min: 40, label: 'Cool', next: 'WhatsApp first, then call within 3 days', hours: 72 },
    { min: 0, label: 'Nurture', next: 'Keep in touch, no call yet', hours: 0 },
  ],
};

/** The website sends codes; the sheet shows words. */
const LABELS = {
  area: {
    cairo: 'Cairo',
    'sheikh-zayed': 'Sheikh Zayed',
    'north-coast': 'North Coast',
    'el-alamein': 'El Alamein',
    gouna: 'Gouna',
    elsewhere: 'Somewhere else',
  },
  type: { studio: 'Studio', apartment: 'Apartment', chalet: 'Chalet', villa: 'Villa' },
  state: {
    ready: 'Furnished, ready for guests',
    refresh: 'Furnished, needs a refresh',
    finished: 'Finished, not furnished',
    'not-handed-over': 'Not handed over yet',
  },
  availability: { now: 'Right away', soon: 'Within 3 months', later: 'Later', unsure: 'Not sure yet' },
  photos: { whatsapp: 'Sending on WhatsApp', link: 'Link given', none: 'None yet' },
};

const TABS = {
  stay: {
    name: 'Stay requests',
    headers: [
      'Received', 'Reference', 'Status', 'Days to check-in', 'Home code', 'Home', 'Check-in', 'Check-out', 'Nights',
      'Adults', 'Children', 'Infants', 'Name', 'WhatsApp', 'Email', 'Note', 'Language', 'Reply', 'Page',
    ],
    statuses: ['New', 'Replied', 'Payment link sent', 'Booked', 'Not available', 'No answer'],
  },
  owner: {
    name: 'Owner leads',
    headers: [
      'Received', 'Reference', 'Score', 'Priority', 'Next step', 'Call by', 'Status', 'Area', 'Compound',
      'Known compound', 'Type', 'Bedrooms', 'Size (m²)', 'Furnished', 'State', 'Available', 'Photos', 'Photo link',
      'Lives abroad', 'Name', 'WhatsApp', 'Email', 'Note', 'Language', 'Score details', 'Reply', 'Page',
    ],
    statuses: ['New', 'Called', 'Visit booked', 'Signed', 'Not a fit', 'No answer'],
  },
};
const CALL_NEXT = 'Call next';
const SCORING_TAB = 'Scoring';
const PRIORITY_COLOURS = { Hot: '#F6D5CC', Warm: '#F8E7C2', Cool: '#DCE6F2', Nurture: '#ECE6DC' };
const MAX_BODY = 20000;
const REF = /^EA-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;

// ---------- The web app ----------

/** Opening the web app's address in a browser shows it's live. */
function doGet() {
  return reply_({ ok: true, service: 'Escape Away website forms' });
}

function doPost(e) {
  let data;
  try {
    const raw = e && e.postData ? String(e.postData.contents || '') : '';
    if (!raw || raw.length > MAX_BODY) return reply_({ ok: false, error: 'bad-request' });
    data = JSON.parse(raw);
  } catch (err) {
    return reply_({ ok: false, error: 'bad-request' });
  }
  if (!data || typeof data !== 'object') return reply_({ ok: false, error: 'bad-request' });

  const ref = REF.test(String(data.ref || '')) ? String(data.ref) : newRef_();
  // Only bots fill the hidden "company" field: answer as if all went well, and keep nothing.
  if (text_(data.company, 200)) return reply_({ ok: true, ref: ref });

  let entry;
  try {
    if (data.kind === 'stay') entry = stayEntry_(data, ref);
    else if (data.kind === 'owner') entry = ownerEntry_(data, ref);
    else return reply_({ ok: false, error: 'bad-request' });
  } catch (err) {
    return reply_({ ok: false, error: 'invalid', field: err.field || '' });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const sheet = tab_(data.kind);
    sheet.appendRow(entry.values);
    entry.finish(sheet, sheet.getLastRow());
    SpreadsheetApp.flush();
  } catch (err) {
    console.error(err);
    return reply_({ ok: false, error: 'busy' });
  } finally {
    try {
      lock.releaseLock();
    } catch (err) {
      /* the lock was never taken */
    }
  }

  // The row is saved even if the email can't go out.
  try {
    notify_(entry.alert);
  } catch (err) {
    console.error(err);
  }
  return reply_({ ok: true, ref: ref });
}

// ---------- Rows ----------

function stayEntry_(d, ref) {
  const code = text_(d.code, 20);
  if (!/^[A-Z0-9-]{3,20}$/.test(code)) throw invalid_('code');
  const home = need_(d.home, 'home', 120);
  const checkin = date_(d.checkin, 'checkin');
  const checkout = date_(d.checkout, 'checkout');
  const nights = Math.round((checkout.getTime() - checkin.getTime()) / 864e5);
  if (nights < 1 || nights > 365) throw invalid_('checkout');
  const adults = int_(d.adults, 0, 16, 'adults');
  const children = int_(d.children, 0, 16, 'children');
  const infants = int_(d.infants, 0, 6, 'infants');
  if (adults + children < 1) throw invalid_('adults');
  const name = need_(d.name, 'name', 80);
  const whatsapp = phone_(d.whatsapp);
  const email = email_(d.email, true);
  const note = text_(d.note, 600);
  const lang = lang_(d.lang);
  const page = page_(d.page);
  const headers = TABS.stay.headers;
  const col = (h) => headers.indexOf(h) + 1;

  const greeting =
    lang === 'ar'
      ? 'أهلاً ' + name + '، ده فريق Escape Away بخصوص طلبك (' + ref + ') لـ ' + home + '.'
      : 'Hello ' + name + ', this is Escape Away about your request (' + ref + ') for ' + home + '.';
  const reply = whatsappUrl_(whatsapp, greeting);

  const values = [
    new Date(), ref, 'New', '', code, cell_(home), checkin, checkout, nights, adults, children, infants,
    cell_(name), cell_('+' + whatsapp), cell_(email), cell_(note), lang === 'ar' ? 'Arabic' : 'English', '', cell_(page),
  ];

  return {
    values: values,
    finish: function (sheet, row) {
      const checkinCell = a1_(row, col('Check-in'));
      sheet.getRange(row, col('Days to check-in')).setFormula('=IF(' + checkinCell + '="","",' + checkinCell + '-TODAY())');
      sheet.getRange(row, col('Reply')).setFormula(hyperlink_(reply, 'Reply on WhatsApp'));
    },
    alert: {
      kind: 'stay',
      subject: 'Stay request ' + ref + ': ' + code + ', ' + day_(checkin) + ' to ' + day_(checkout) + ', ' + count_(adults + children, 'guest', 'guests'),
      body: [
        'New stay request ' + ref,
        '',
        'Home: ' + home + ' (' + code + ')',
        'Dates: ' + day_(checkin) + ' to ' + day_(checkout) + ', ' + count_(nights, 'night', 'nights'),
        'Guests: ' + count_(adults, 'adult', 'adults') + ', ' + count_(children, 'child', 'children') + ', ' + count_(infants, 'infant', 'infants'),
        'Name: ' + name,
        'WhatsApp: +' + whatsapp,
        'Email: ' + email,
        note ? 'Note: ' + note : null,
        'Language: ' + (lang === 'ar' ? 'Arabic' : 'English'),
        '',
        'Reply on WhatsApp: ' + reply,
      ],
    },
  };
}

function ownerEntry_(d, ref) {
  const area = oneOf_(d.area, Object.keys(LABELS.area), 'area');
  const type = oneOf_(d.type, Object.keys(LABELS.type), 'type');
  const bedrooms = type === 'studio' ? 0 : int_(d.bedrooms, 1, 6, 'bedrooms');
  const furnished = d.furnished === true;
  const compound = text_(d.compound, 80);
  const known = d.compoundKnown === true && compound !== '';
  const size = d.size === null || d.size === undefined || d.size === '' ? '' : num_(d.size, 10, 5000, 'size');
  const state = oneOf_(d.state, Object.keys(LABELS.state), 'state');
  const availability = oneOf_(d.availability, Object.keys(LABELS.availability), 'availability');
  const photos = oneOf_(d.photos, Object.keys(LABELS.photos), 'photos', true);
  const photoLink = photos === 'link' ? link_(d.photosLink) : '';
  const name = need_(d.name, 'name', 80);
  const whatsapp = phone_(d.whatsapp);
  const email = email_(d.email, false);
  const abroad = d.abroad === true;
  const note = text_(d.note, 600);
  const lang = lang_(d.lang);
  const page = page_(d.page);
  const headers = TABS.owner.headers;
  const col = (h) => headers.indexOf(h) + 1;

  const s = score_({ area: area, known: known, state: state, availability: availability });
  const received = new Date();
  const callBy = s.band.hours ? new Date(received.getTime() + s.band.hours * 36e5) : '';
  const unit = LABELS.type[type] + (type === 'studio' ? '' : ', ' + (bedrooms >= 6 ? '6+ bedrooms' : count_(bedrooms, 'bedroom', 'bedrooms')));
  const where = (compound ? compound + ', ' : '') + LABELS.area[area];

  const greeting =
    lang === 'ar'
      ? 'أهلاً ' + name + '، ده فريق Escape Away بخصوص بيانات وحدتك (' + ref + ').'
      : 'Hello ' + name + ', this is Escape Away about the unit you sent us (' + ref + ').';
  const reply = whatsappUrl_(whatsapp, greeting);

  const values = [
    received, ref, s.total, s.band.label, s.band.next, callBy, 'New', LABELS.area[area], cell_(compound),
    known ? 'Yes' : 'No', LABELS.type[type], bedrooms, size, furnished ? 'Yes' : 'No', LABELS.state[state],
    LABELS.availability[availability], photos ? LABELS.photos[photos] : '', cell_(photoLink), abroad ? 'Yes' : 'No',
    cell_(name), cell_('+' + whatsapp), cell_(email), cell_(note), lang === 'ar' ? 'Arabic' : 'English', s.details, '',
    cell_(page),
  ];

  return {
    values: values,
    finish: function (sheet, row) {
      sheet.getRange(row, col('Reply')).setFormula(hyperlink_(reply, 'Reply on WhatsApp'));
    },
    alert: {
      kind: 'owner',
      subject: '[' + s.band.label + ' ' + s.total + '] Owner lead ' + ref + ': ' + unit + ', ' + LABELS.area[area],
      body: [
        s.band.label + ' owner lead ' + ref + ', ' + s.total + ' of 100. ' + s.band.next + '.',
        '',
        'Unit: ' + unit + (furnished ? ', furnished' : ', not furnished'),
        'Where: ' + where,
        size ? 'Size: ' + size + ' m²' : null,
        'State: ' + LABELS.state[state],
        'Available: ' + LABELS.availability[availability],
        photos ? 'Photos: ' + LABELS.photos[photos] + (photoLink ? ' ' + photoLink : '') : null,
        'Name: ' + name + (abroad ? ' (lives abroad)' : ''),
        'WhatsApp: +' + whatsapp,
        email ? 'Email: ' + email : null,
        note ? 'Note: ' + note : null,
        'Language: ' + (lang === 'ar' ? 'Arabic' : 'English'),
        '',
        'Score: ' + s.details,
        'Reply on WhatsApp: ' + reply,
      ],
    },
  };
}

/** Location demand (up to 40) + unit readiness (up to 30) + timeline (up to 30) = up to 100. */
function score_(a) {
  const L = SCORING.location;
  const location = Math.min(L.max, (L.areas[a.area] || 0) + (a.known ? L.knownCompound : 0));
  const readiness = SCORING.readiness.points[a.state] || 0;
  const timeline = SCORING.timeline.points[a.availability] || 0;
  const total = location + readiness + timeline;
  const band = SCORING.bands.filter((b) => total >= b.min)[0] || SCORING.bands[SCORING.bands.length - 1];
  const details =
    'Location ' + location + '/' + L.max + ' (' + (LABELS.area[a.area] || '?') + (a.known ? ', a compound we list in' : '') + ')' +
    ' · Readiness ' + readiness + '/' + SCORING.readiness.max + ' (' + (LABELS.state[a.state] || '?') + ')' +
    ' · Timeline ' + timeline + '/' + SCORING.timeline.max + ' (' + (LABELS.availability[a.availability] || '?') + ')';
  return { location: location, readiness: readiness, timeline: timeline, total: total, band: band, details: details };
}

// ---------- Run these from the editor ----------

/** Run once after pasting the script: makes the tabs, their dropdowns and colours, and the Call next view. */
function setup() {
  SpreadsheetApp.getActiveSpreadsheet().setSpreadsheetTimeZone('Africa/Cairo');
  Object.keys(TABS).forEach(setupTab_);
  setupCallNext_();
  refreshScoringTab();
}

/** Writes the Scoring tab from SCORING, so the team can see how a lead got its score. */
function refreshScoringTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SCORING_TAB) || ss.insertSheet(SCORING_TAB);
  sheet.clear();
  const rows = [['How owner leads are scored, out of 100', '', '']];
  rows.push(['', '', '']);
  rows.push(['Location demand', 'Points', 'Up to ' + SCORING.location.max]);
  Object.keys(SCORING.location.areas).forEach((k) => rows.push([LABELS.area[k], SCORING.location.areas[k], '']));
  rows.push(['In a compound where Escape Away lists a home', SCORING.location.knownCompound + ' extra', '']);
  rows.push(['', '', '']);
  rows.push(['Unit readiness', 'Points', 'Up to ' + SCORING.readiness.max]);
  Object.keys(SCORING.readiness.points).forEach((k) => rows.push([LABELS.state[k], SCORING.readiness.points[k], '']));
  rows.push(['', '', '']);
  rows.push(['Timeline: first guests', 'Points', 'Up to ' + SCORING.timeline.max]);
  Object.keys(SCORING.timeline.points).forEach((k) => rows.push([LABELS.availability[k], SCORING.timeline.points[k], '']));
  rows.push(['', '', '']);
  rows.push(['Priority', 'From', 'Next step']);
  SCORING.bands.forEach((b) => rows.push([b.label, b.min, b.next]));
  rows.push(['', '', '']);
  rows.push(['To change the points, edit SCORING at the top of Code.gs, then run refreshScoringTab and rescoreOwnerLeads.', '', '']);
  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  sheet.getRange(1, 1).setFontWeight('bold').setFontSize(13);
  return sheet;
}

/** Scores every owner lead again with the current SCORING (after the points change). */
function rescoreOwnerLeads() {
  const t = TABS.owner;
  const sheet = tab_('owner');
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const at = (h) => t.headers.indexOf(h);
  const rows = sheet.getRange(2, 1, last - 1, t.headers.length).getValues();
  const code = (labels, value) => Object.keys(labels).filter((k) => labels[k] === value)[0] || '';
  const scores = [];
  const details = [];
  rows.forEach((r) => {
    const s = score_({
      area: code(LABELS.area, r[at('Area')]),
      known: r[at('Known compound')] === 'Yes',
      state: code(LABELS.state, r[at('State')]),
      availability: code(LABELS.availability, r[at('Available')]),
    });
    const received = r[at('Received')] instanceof Date ? r[at('Received')] : new Date();
    scores.push([s.total, s.band.label, s.band.next, s.band.hours ? new Date(received.getTime() + s.band.hours * 36e5) : '']);
    details.push([s.details]);
  });
  sheet.getRange(2, at('Score') + 1, scores.length, 4).setValues(scores);
  sheet.getRange(2, at('Score details') + 1, details.length, 1).setValues(details);
  return scores.length;
}

// ---------- Helpers ----------

function tab_(kind) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TABS[kind].name) || setupTab_(kind);
}

function setupTab_(kind) {
  const t = TABS[kind];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(t.name) || ss.insertSheet(t.name);
  const col = (h) => t.headers.indexOf(h) + 1;
  sheet.getRange(1, 1, 1, t.headers.length).setValues([t.headers]).setFontWeight('bold').setBackground('#F4ECDF').setFontColor('#3B2D21');
  sheet.setFrozenRows(1);
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet
    .getRange(2, col('Status'), rows, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(t.statuses, true).setAllowInvalid(true).build());
  sheet.getRange(2, col('Received'), rows, 1).setNumberFormat('d mmm yyyy, h:mm am/pm');
  if (kind === 'stay') {
    sheet.getRange(2, col('Check-in'), rows, 2).setNumberFormat('ddd d mmm yyyy');
    sheet.getRange(2, col('Days to check-in'), rows, 1).setNumberFormat('0');
  } else {
    sheet.getRange(2, col('Call by'), rows, 1).setNumberFormat('ddd d mmm, h:mm am/pm');
    sheet.setConditionalFormatRules(priorityRules_(sheet.getRange(2, col('Priority'), rows, 1)));
  }
  return sheet;
}

/** A live view of the owner leads still marked New, best score first. */
function setupCallNext_() {
  const t = TABS.owner;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CALL_NEXT) || ss.insertSheet(CALL_NEXT);
  sheet.clear();
  const letter = (h) => letter_(t.headers.indexOf(h) + 1);
  const pick = ['Score', 'Priority', 'Next step', 'Call by', 'Reference', 'Name', 'WhatsApp', 'Area', 'Compound', 'Type', 'Bedrooms', 'State', 'Available', 'Lives abroad', 'Received'];
  const query =
    'select ' + pick.map(letter).join(', ') +
    " where " + letter('Status') + " = 'New' and " + letter('Score') + ' is not null' +
    ' order by ' + letter('Score') + ' desc, ' + letter('Received') + ' asc';
  sheet.getRange(1, 1).setFormula("=QUERY('" + t.name + "'!A:" + letter_(t.headers.length) + ', "' + query + '", 1)');
  sheet.setFrozenRows(1);
  sheet.getRange(2, 4, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('ddd d mmm, h:mm am/pm');
  sheet.setConditionalFormatRules(priorityRules_(sheet.getRange(2, 2, Math.max(sheet.getMaxRows() - 1, 1), 1)));
  return sheet;
}

function priorityRules_(range) {
  return Object.keys(PRIORITY_COLOURS).map((label) =>
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(label).setBackground(PRIORITY_COLOURS[label]).setRanges([range]).build(),
  );
}

function notify_(alert) {
  const to = PropertiesService.getScriptProperties().getProperty('ALERT_EMAIL');
  if (!to || !alert) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TABS[alert.kind].name);
  const link = ss.getUrl() + (sheet ? '#gid=' + sheet.getSheetId() : '');
  // null marks a line with nothing to say (an empty note); '' is a blank line between parts.
  const body = alert.body.filter((line) => line !== null).concat(['Open the sheet: ' + link]);
  MailApp.sendEmail({ to: to, subject: alert.subject, body: body.join('\n'), name: 'Escape Away website' });
}

function reply_(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON);
}

function newRef_() {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let ref = 'EA-';
  for (let i = 0; i < 5; i++) ref += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  return ref;
}

function invalid_(field) {
  const err = new Error('invalid');
  err.field = field;
  return err;
}

/** Plain text: no control characters, trimmed, cut to a length. */
function text_(value, max) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

function need_(value, field, max) {
  const v = text_(value, max);
  if (!v) throw invalid_(field);
  return v;
}

function oneOf_(value, allowed, field, optional) {
  const v = text_(value, 40);
  if (optional && !v) return '';
  if (allowed.indexOf(v) === -1) throw invalid_(field);
  return v;
}

function int_(value, min, max, field) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw invalid_(field);
  return n;
}

function num_(value, min, max, field) {
  const n = Number(value);
  if (!isFinite(n) || n < min || n > max) throw invalid_(field);
  return Math.round(n);
}

function date_(value, field) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!m) throw invalid_(field);
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) throw invalid_(field);
  return d;
}

function phone_(value) {
  const v = String(value || '').replace(/\D/g, '');
  if (v.length < 8 || v.length > 15 || v.charAt(0) === '0') throw invalid_('whatsapp');
  return v;
}

function email_(value, required) {
  const v = text_(value, 120);
  if (!v) {
    if (required) throw invalid_('email');
    return '';
  }
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/.test(v)) throw invalid_('email');
  return v;
}

function link_(value) {
  const v = text_(value, 300);
  if (!/^https?:\/\/\S+\.\S+$/i.test(v)) throw invalid_('photosLink');
  return v;
}

function lang_(value) {
  return value === 'ar' ? 'ar' : 'en';
}

function page_(value) {
  const v = text_(value, 300);
  return /^https?:\/\//i.test(v) ? v : '';
}

/** Text a visitor typed never runs as a formula: a leading = + - @ keeps it as plain text. */
function cell_(value) {
  const v = String(value);
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function whatsappUrl_(digits, text) {
  return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
}

/** The address is built from digits and encodeURIComponent output, so it holds no quote to break out of. */
function hyperlink_(url, label) {
  return '=HYPERLINK("' + url.replace(/"/g, '%22') + '","' + label.replace(/"/g, '""') + '")';
}

function letter_(column) {
  let s = '';
  for (let n = column; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function a1_(row, column) {
  return letter_(column) + row;
}

function count_(n, one, many) {
  return n + ' ' + (n === 1 ? one : many);
}

function day_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'EEE d MMM yyyy');
}
