'use client';

import '@/styles/system-finance.css';
import { Check, FileDown, Send } from 'lucide-react';
import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { common, nav, packageLabel, useCopy, useLang } from '../copy';
import { addMonths, monthOf } from '../dates';
import { count, day, homesCount, money, monthName, num, pct, stayRange } from '../format';
import { nightsOf } from '../ops';
import { statement } from '../select';
import { useData, useDemo } from '../store';
import type { Owner } from '../types';
import { ChannelChip, Code, Empty, PageHead } from '../ui/bits';
import { PayoutBadge, approvedToast, managedOwners, paidOn, payoutStatus, sentToast } from './payouts';

/** The word forms format.ts's count() takes for each language. */
type Forms = { one: string; other: string; two?: string; few?: string; many?: string };

const en = {
  sub: (owners: string, homes: string) => `Statements and payouts for ${owners} and their ${homes} · sample data`,
  ownerForms: { one: '# owner', other: '# owners' } as Forms,
  table: 'Owners and their payouts',
  owner: 'Owner',
  contract: 'Contract',
  estimate: (month: string) => `${month} payout (est.)`,
  lastPayout: (month: string) => `${month} payout`,
  commission: (share: string) => `${share} commission`,
  monthGroup: 'Statement month',
  payTo: { bank: 'Paid to a bank account', wallet: 'Paid to a mobile wallet' } as Record<Owner['payout'], string>,
  lines: (name: string, month: string) => `Stays for ${name} in ${month}`,
  stay: 'Stay',
  channel: 'Channel',
  nights: 'Nights',
  gross: 'Gross',
  fee: 'Channel fee',
  showAll: (n: string) => `Show all ${n} stays`,
  showFewer: 'Show fewer',
  none: (month: string) => `No stays in ${month}.`,
  noneHint: 'Every home still carries its monthly upkeep.',
  totalGross: 'Room revenue',
  totalFees: 'Channel fees',
  totalNet: 'Net room revenue',
  totalCommission: (share: string) => `Escape Away commission at ${share}`,
  totalUpkeep: 'Upkeep: supplies and small repairs',
  totalPayout: 'Payout',
  totalEstimate: 'Estimated payout',
  running: (month: string) => `${month} is still running, so these figures count the nights booked to the end of the month and can still change.`,
  crossing: (month: string) => `A stay that runs into another month counts only its nights in ${month}.`,
  shortfall: (month: string) => `Costs in ${month} came to more than its income, so there is nothing to pay out.`,
  approve: 'Approve statement',
  send: 'Send payout',
  pdf: 'Download PDF',
  pdfToast: 'In the real system this downloads the statement as a branded PDF.',
  paidLine: (date: string) => `Paid on ${date} via Paymob.`,
};

const ar: typeof en = {
  sub: (owners, homes) => `كشوف الحساب والتحويلات لـ ${owners} و${homes} · بيانات تجريبية`,
  ownerForms: { one: 'مالك واحد', two: 'مالكين', few: '# ملاك', many: '# مالك', other: '# مالك' },
  table: 'الملاك وتحويلاتهم',
  owner: 'المالك',
  contract: 'العقد',
  estimate: (month) => `تحويل ${month} (تقديري)`,
  lastPayout: (month) => `تحويل ${month}`,
  commission: (share) => `عمولة ${share}`,
  monthGroup: 'شهر الكشف',
  payTo: { bank: 'التحويل إلى حساب بنكي', wallet: 'التحويل إلى محفظة إلكترونية' },
  lines: (name, month) => `إقامات ${name} في ${month}`,
  stay: 'الإقامة',
  channel: 'القناة',
  nights: 'الليالي',
  gross: 'الإيراد',
  fee: 'عمولة القناة',
  showAll: (n) => `اعرض كل الإقامات (${n})`,
  showFewer: 'اعرض أقل',
  none: (month) => `لا توجد إقامات في ${month}.`,
  noneHint: 'تُحسب مصاريف الصيانة الشهرية على كل وحدة رغم ذلك.',
  totalGross: 'إيراد الإقامات',
  totalFees: 'عمولات القنوات',
  totalNet: 'صافي إيراد الإقامات',
  totalCommission: (share) => `عمولة Escape Away بنسبة ${share}`,
  totalUpkeep: 'الصيانة والمستلزمات',
  totalPayout: 'المبلغ المستحق للمالك',
  totalEstimate: 'المبلغ المتوقع للمالك',
  running: (month) => `شهر ${month} لم ينتهِ بعد، لذلك تشمل الأرقام الليالي المحجوزة حتى آخر الشهر وقد تتغير.`,
  crossing: (month) => `الإقامة الممتدة إلى شهر آخر تُحسب منها ليالي ${month} فقط.`,
  shortfall: (month) => `مصروفات ${month} تجاوزت إيراده، لذلك لا يوجد مبلغ للتحويل.`,
  approve: 'اعتماد كشف الحساب',
  send: 'تحويل المبلغ',
  pdf: 'تنزيل PDF',
  pdfToast: 'في السيستم الحقيقي ده بينزّل كشف الحساب كملف PDF بهوية Escape Away.',
  paidLine: (date) => `تم الدفع في ${date} عبر Paymob.`,
};

const copy = { en, ar };

/** How many stay lines a statement shows before "Show all". */
const LINES = 8;

/** A deduction in the totals: the minus, a no-break space, then the amount as money() writes it. */
const minus = (text: string) => `\u2212\u00a0${text}`;

/** Rows open from the keyboard too. */
function onRowKey(e: KeyboardEvent<HTMLTableRowElement>, open: () => void) {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    open();
  }
}

export function OwnersScreen() {
  const lang = useLang();
  const t = useCopy(copy);
  const c = useCopy(common);
  const data = useData();
  const { dispatch, panel, setPanel, toast } = useDemo();
  const headingId = useId();
  const statementRef = useRef<HTMLElement>(null);
  const thisMonth = monthOf(data.today);
  const lastMonth = addMonths(thisMonth, -1);

  const owners = useMemo(() => managedOwners(data), [data]);
  const [ownerId, setOwnerId] = useState(() => (owners.some((o) => o.owner.id === 'nadia') ? 'nadia' : (owners[0]?.owner.id ?? '')));
  const [month, setMonth] = useState(thisMonth);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Payouts links here with ?owner=…&month=…; read it in the browser (the page is exported static).
  useLayoutEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const wanted = query.get('owner');
    if (wanted && owners.some((o) => o.owner.id === wanted)) setOwnerId(wanted);
    const wantedMonth = query.get('month');
    if (wantedMonth === lastMonth || wantedMonth === thisMonth) setMonth(wantedMonth);
    // Read once, when the screen opens.
  }, []);

  const rows = useMemo(
    () =>
      owners.map(({ owner, homes }) => ({
        owner,
        homes,
        estimate: statement(data, owner, thisMonth).payout,
        last: payoutStatus(data, owner.id, lastMonth),
      })),
    [owners, data, thisMonth, lastMonth],
  );

  const picked = owners.find((o) => o.owner.id === ownerId) ?? owners[0];
  const owner = picked?.owner;
  const s = useMemo(() => (owner ? statement(data, owner, month) : null), [data, owner, month]);
  const guests = useMemo(() => new Map(data.guests.map((g) => [g.id, g])), [data.guests]);

  if (!picked || !owner || !s) {
    return (
      <>
        <PageHead title={nav.owners[lang]} phase="wave2" />
        <Empty title={c.noResults} />
      </>
    );
  }

  const status = payoutStatus(data, owner.id, month);
  const key = `${owner.id}:${month}`;
  const all = expanded === key;
  const lines = all ? s.lines : s.lines.slice(0, LINES);
  const monthWord = monthName(lang, month, false);
  const crosses = s.lines.some((l) => l.nights < nightsOf(l.res));
  const shortfall = s.net - s.commission - s.upkeep < 0;
  const openId = panel?.kind === 'reservation' ? panel.id : null;

  const choose = (id: string) => {
    setOwnerId(id);
    // Stacked (below ~1100px) the statement sits under the list: bring its head into view when it is out of
    // sight. Side by side it is sticky, so its head is already showing and nothing moves.
    const el = statementRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top >= 0 && top < window.innerHeight * 0.5) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.requestAnimationFrame(() => el.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' }));
  };

  const approve = () => {
    dispatch({ type: 'payout/status', ownerId: owner.id, month, status: 'approved' });
    toast(approvedToast(owner, month), 'success');
  };

  const send = () => {
    dispatch({ type: 'payout/status', ownerId: owner.id, month, status: 'paid' });
    toast(sentToast(owner, s.payout), 'success');
  };

  const shortMonth = (m: string) => day(lang, `${m}-01`, { month: 'short' });

  return (
    <>
      <PageHead
        title={nav.owners[lang]}
        sub={t.sub(count(lang, owners.length, en.ownerForms, ar.ownerForms), homesCount(lang, data.units.length))}
        phase="wave2"
      />

      <div className="fin-split">
        <section className="sys-panel">
          <div className="sys-table-wrap">
            <table className="sys-table" aria-label={t.table}>
              <thead>
                <tr>
                  <th scope="col">{t.owner}</th>
                  <th scope="col" className="hide-narrow fin-split-hide">
                    {t.contract}
                  </th>
                  <th scope="col" className="end">
                    {t.estimate(shortMonth(thisMonth))}
                  </th>
                  <th scope="col" className="hide-narrow">
                    {t.lastPayout(shortMonth(lastMonth))}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.owner.id}
                    tabIndex={0}
                    aria-selected={r.owner.id === owner.id}
                    onClick={() => choose(r.owner.id)}
                    onKeyDown={(e) => onRowKey(e, () => choose(r.owner.id))}
                  >
                    <td>
                      <span className="who">
                        <b>{r.owner.name[lang]}</b>
                        <span>
                          {r.owner.livesIn[lang]} · {homesCount(lang, r.homes)}
                        </span>
                      </span>
                    </td>
                    <td className="hide-narrow fin-split-hide">
                      <span className="who">
                        <b>{packageLabel[r.owner.package][lang]}</b>
                        <span>{t.commission(pct(lang, r.owner.commission))}</span>
                      </span>
                    </td>
                    <td className="end">{money(lang, r.estimate)}</td>
                    <td className="hide-narrow">{r.last ? <PayoutBadge status={r.last} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section ref={statementRef} className="sys-panel fin-statement" aria-labelledby={headingId}>
          <header className="sys-panel__head">
            <h2 id={headingId} aria-live="polite">
              {owner.name[lang]}
            </h2>
            {status ? <PayoutBadge status={status} /> : null}
            <div className="sys-segment" role="group" aria-label={t.monthGroup}>
              {[lastMonth, thisMonth].map((m) => (
                <button key={m} type="button" aria-pressed={month === m} onClick={() => setMonth(m)}>
                  {monthName(lang, m, false)}
                </button>
              ))}
            </div>
          </header>

          <p className="sys-panel__body sys-muted sys-small">
            {owner.livesIn[lang]} · {homesCount(lang, picked.homes)} · {packageLabel[owner.package][lang]} · {t.commission(pct(lang, owner.commission))} ·{' '}
            {t.payTo[owner.payout]}
          </p>

          {s.lines.length ? (
            <div className="sys-table-wrap">
              <table className="sys-table" aria-label={t.lines(owner.name[lang], monthName(lang, month))}>
                <thead>
                  <tr>
                    <th scope="col">{t.stay}</th>
                    <th scope="col" className="hide-narrow fin-mid-hide">
                      {t.channel}
                    </th>
                    <th scope="col" className="end hide-narrow fin-mid-hide">
                      {t.nights}
                    </th>
                    <th scope="col" className="end">
                      {t.gross}
                    </th>
                    <th scope="col" className="end hide-narrow">
                      {t.fee}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const guest = l.res.guestId ? guests.get(l.res.guestId) : undefined;
                    const open = () => setPanel({ kind: 'reservation', id: l.res.id });
                    return (
                      <tr key={l.res.id} tabIndex={0} aria-selected={openId === l.res.id} onClick={open} onKeyDown={(e) => onRowKey(e, open)}>
                        <td>
                          <span className="who">
                            <b>{guest ? <bdi>{guest.name}</bdi> : <span className="sys-muted">{c.needsDetails}</span>}</b>
                            <span>
                              <Code>{l.res.unit}</Code> · <time>{stayRange(lang, l.res.checkIn, l.res.checkOut)}</time>
                            </span>
                          </span>
                        </td>
                        <td className="hide-narrow fin-mid-hide">
                          <ChannelChip channel={l.res.channel} />
                        </td>
                        <td className="end hide-narrow fin-mid-hide">{num(lang, l.nights)}</td>
                        <td className="end">{money(lang, l.gross)}</td>
                        <td className="end hide-narrow">{money(lang, l.fee)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title={t.none(monthWord)}>{t.noneHint}</Empty>
          )}

          {s.lines.length > LINES ? (
            <div className="sys-panel__foot">
              <button type="button" className="sys-btn sys-btn--quiet sys-btn--small" aria-expanded={all} onClick={() => setExpanded(all ? null : key)}>
                {all ? t.showFewer : t.showAll(num(lang, s.lines.length))}
              </button>
            </div>
          ) : null}

          <div className="sys-panel__body fin-totals">
            <div className="sys-statement">
              <dl className="sys-statement__total">
                <dt>{t.totalGross}</dt>
                <dd className="end">{money(lang, s.gross)}</dd>
                <dt>{t.totalFees}</dt>
                <dd className="end">{minus(money(lang, s.fees))}</dd>
                <dt>{t.totalNet}</dt>
                <dd className="end">{money(lang, s.net)}</dd>
                <dt>{t.totalCommission(pct(lang, owner.commission))}</dt>
                <dd className="end">{minus(money(lang, s.commission))}</dd>
                <dt>{t.totalUpkeep}</dt>
                <dd className="end">{minus(money(lang, s.upkeep))}</dd>
                <dt className="sum">{month === thisMonth ? t.totalEstimate : t.totalPayout}</dt>
                <dd className="sum end">{money(lang, s.payout)}</dd>
              </dl>
              {month === thisMonth || crosses || shortfall ? (
                <div className="sys-section sys-muted sys-tiny">
                  {shortfall ? <p>{t.shortfall(monthWord)}</p> : null}
                  {month === thisMonth ? <p>{t.running(monthWord)}</p> : null}
                  {crosses ? <p>{t.crossing(monthWord)}</p> : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="sys-panel__foot fin-actions">
            {status === 'draft' ? (
              <button type="button" className="sys-btn sys-btn--primary" onClick={approve}>
                <Check size={17} strokeWidth={1.75} aria-hidden="true" />
                {t.approve}
              </button>
            ) : null}
            {status === 'approved' ? (
              <button type="button" className="sys-btn sys-btn--primary" disabled={s.payout <= 0} onClick={send}>
                <Send size={17} strokeWidth={1.75} aria-hidden="true" className="flip-rtl" />
                {t.send}
              </button>
            ) : null}
            {status === 'paid' ? (
              <span className="sys-muted sys-small">{t.paidLine(day(lang, paidOn(data.today, month), { day: 'numeric', month: 'short' }))}</span>
            ) : null}
            <button type="button" className="sys-btn sys-btn--secondary" onClick={() => toast({ en: en.pdfToast, ar: ar.pdfToast }, 'info')}>
              <FileDown size={17} strokeWidth={1.75} aria-hidden="true" />
              {t.pdf}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
