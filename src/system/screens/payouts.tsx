'use client';

import '@/styles/system-finance.css';
import { Check, CheckCheck, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { nav, useCopy, useLang } from '../copy';
import { addMonths, monthOf } from '../dates';
import { compact, count, day, homesCount, money, monthName, num } from '../format';
import { statement } from '../select';
import { useData, useDemo, type Action } from '../store';
import type { DemoData, L10n, Owner, Payout } from '../types';
import { Badge, PageHead, Panel, type Tone } from '../ui/bits';

/** The word forms format.ts's count() takes for each language. */
type Forms = { one: string; other: string; two?: string; few?: string; many?: string };

export type PayoutStatus = Payout['status'];

/** Payout words both finance screens use: the Owners statement shows the same states and sends the same toasts. */
export const payoutCopy = {
  en: {
    status: { draft: 'Draft', approved: 'Approved', paid: 'Paid' } as Record<PayoutStatus, string>,
    method: { bank: 'Bank account', wallet: 'Mobile wallet' } as Record<Owner['payout'], string>,
    paidOn: (date: string) => `Paid on ${date}`,
    approvedToast: (name: string, month: string) => `${name}’s ${month} statement is approved and ready to send.`,
    sentToast: (amount: string, name: string, method: Owner['payout']) =>
      `${amount} sent via Paymob to ${name}’s ${method === 'bank' ? 'bank account' : 'mobile wallet'}.`,
  },
  ar: {
    status: { draft: 'مسودة', approved: 'معتمد', paid: 'مدفوع' } as Record<PayoutStatus, string>,
    method: { bank: 'حساب بنكي', wallet: 'محفظة إلكترونية' } as Record<Owner['payout'], string>,
    paidOn: (date: string) => `دُفع في ${date}`,
    approvedToast: (name: string, month: string) => `تم اعتماد كشف حساب ${name} عن ${month}، وأصبح جاهزًا للتحويل.`,
    sentToast: (amount: string, name: string, method: Owner['payout']) =>
      `تم تحويل ${amount} عبر Paymob إلى ${method === 'bank' ? `حساب ${name} البنكي` : `محفظة ${name} الإلكترونية`}.`,
  },
};

const en = {
  sub: 'What each owner receives, approved here and sent through Paymob · sample data',
  approveAll: 'Approve all drafts',
  monthGroup: 'Payout month',
  total: 'Total payouts, EGP',
  paid: 'Already paid, EGP',
  waiting: 'Waiting for approval, EGP',
  owners: 'Owners',
  ready: (amount: string) => `${amount} approved, ready to send`,
  paidOf: (n: string, total: string) => `${n} of ${total}`,
  draftForms: { one: '# draft', other: '# drafts' } as Forms,
  ownerForms: { one: '# owner', other: '# owners' } as Forms,
  statementForms: { one: '# statement', other: '# statements' } as Forms,
  table: (month: string) => `Owner payouts for ${month}`,
  owner: 'Owner',
  homes: 'Homes',
  payout: 'Net payout',
  method: 'Method',
  status: 'Status',
  next: 'Next step',
  approve: 'Approve',
  approveFor: (name: string) => `Approve ${name}’s statement`,
  pay: 'Pay',
  payFor: (name: string) => `Pay ${name}`,
  statementFor: (name: string) => `${name}’s statement`,
  running: (month: string) => `${month} is still running, so its payouts are estimates until the month closes.`,
  approvedAll: (statements: string, month: string) => `${statements} for ${month} approved. Each payout is ready to send.`,
};

const ar: typeof en = {
  sub: 'المبلغ المستحق لكل مالك: يُعتمد هنا ويُحوَّل عبر Paymob · بيانات تجريبية',
  approveAll: 'اعتماد كل المسودات',
  monthGroup: 'شهر التحويل',
  total: 'إجمالي التحويلات، ج.م',
  paid: 'تم دفعه، ج.م',
  waiting: 'في انتظار الاعتماد، ج.م',
  owners: 'الملاك',
  ready: (amount) => `${amount} معتمد وجاهز للتحويل`,
  paidOf: (n, total) => `${n} من ${total}`,
  draftForms: { one: 'مسودة واحدة', two: 'مسودتين', few: '# مسودات', many: '# مسودة', other: '# مسودة' },
  ownerForms: { one: 'مالك واحد', two: 'مالكين', few: '# ملاك', many: '# مالك', other: '# مالك' },
  statementForms: { one: 'كشف حساب واحد', two: 'كشفي حساب', few: '# كشوف حساب', many: '# كشف حساب', other: '# كشف حساب' },
  table: (month) => `تحويلات الملاك عن ${month}`,
  owner: 'المالك',
  homes: 'الوحدات',
  payout: 'صافي التحويل',
  method: 'طريقة التحويل',
  status: 'الحالة',
  next: 'الخطوة التالية',
  approve: 'اعتماد',
  approveFor: (name) => `اعتماد كشف حساب ${name}`,
  pay: 'تحويل',
  payFor: (name) => `تحويل مبلغ ${name}`,
  statementFor: (name) => `كشف حساب ${name}`,
  running: (month) => `شهر ${month} لم ينتهِ بعد، لذلك المبالغ تقديرية حتى يُقفل الشهر.`,
  approvedAll: (statements, month) => `تم اعتماد ${statements} عن ${month}، وكل تحويل أصبح جاهزًا للإرسال.`,
};

const copy = { en, ar };

/* ---------- Payout helpers, shared with the Owners screen ---------- */

export const payoutTone: Record<PayoutStatus, Tone> = { draft: 'done', approved: 'info', paid: 'ok' };

export function PayoutBadge({ status }: { status: PayoutStatus }) {
  const w = useCopy(payoutCopy);
  return <Badge tone={payoutTone[status]}>{w.status[status]}</Badge>;
}

export function payoutStatus(data: DemoData, ownerId: string, month: string): PayoutStatus | null {
  return data.payouts.find((p) => p.ownerId === ownerId && p.month === month)?.status ?? null;
}

/**
 * Owners with at least one home in the sample, with their home count. An owner with no home has no
 * statement and nothing to pay, so the finance screens leave them out.
 */
export function managedOwners(data: DemoData) {
  const homes = new Map<string, number>();
  for (const u of data.units) homes.set(u.ownerId, (homes.get(u.ownerId) ?? 0) + 1);
  return data.owners.filter((o) => homes.has(o.id)).map((owner) => ({ owner, homes: homes.get(owner.id) ?? 0 }));
}

/** When a paid payout went out: last month's on the 5th of this month (never later than today), others today. */
export function paidOn(today: string, month: string) {
  const current = monthOf(today);
  if (month !== addMonths(current, -1)) return today;
  const fifth = `${current}-05`;
  return fifth < today ? fifth : today;
}

export const approvedToast = (owner: Owner, month: string): L10n => ({
  en: payoutCopy.en.approvedToast(owner.name.en, monthName('en', month)),
  ar: payoutCopy.ar.approvedToast(owner.name.ar, monthName('ar', month)),
});

export const sentToast = (owner: Owner, amount: number): L10n => ({
  en: payoutCopy.en.sentToast(money('en', amount), owner.name.en, owner.payout),
  ar: payoutCopy.ar.sentToast(money('ar', amount), owner.name.ar, owner.payout),
});

/* ---------- The screen ---------- */

export function PayoutsScreen() {
  const lang = useLang();
  const t = useCopy(copy);
  const w = useCopy(payoutCopy);
  const data = useData();
  const { dispatch, toast } = useDemo();
  const thisMonth = monthOf(data.today);
  const lastMonth = addMonths(thisMonth, -1);
  const owners = useMemo(() => managedOwners(data), [data]);

  // Open on the month that still has work: last month while any of its payouts is unsent, then this one.
  const [month, setMonth] = useState(() =>
    owners.some(({ owner }) => {
      const status = payoutStatus(data, owner.id, lastMonth);
      return status === 'draft' || status === 'approved';
    })
      ? lastMonth
      : thisMonth,
  );

  const rows = useMemo(
    () =>
      owners.map(({ owner, homes }) => ({
        owner,
        homes,
        payout: statement(data, owner, month).payout,
        status: payoutStatus(data, owner.id, month),
      })),
    [owners, data, month],
  );

  type Row = (typeof rows)[number];
  const sum = (list: Row[]) => list.reduce((s, r) => s + r.payout, 0);
  const paid = rows.filter((r) => r.status === 'paid');
  const approved = rows.filter((r) => r.status === 'approved');
  const drafts = rows.filter((r) => r.status === 'draft');
  const homes = rows.reduce((s, r) => s + r.homes, 0);
  const paidDate = day(lang, paidOn(data.today, month), { day: 'numeric', month: 'short' });

  const approve = (r: Row) => {
    dispatch({ type: 'payout/status', ownerId: r.owner.id, month, status: 'approved' });
    toast(approvedToast(r.owner, month), 'success');
  };

  const pay = (r: Row) => {
    dispatch({ type: 'payout/status', ownerId: r.owner.id, month, status: 'paid' });
    toast(sentToast(r.owner, r.payout), 'success');
  };

  const approveAll = () => {
    if (!drafts.length) return;
    dispatch(...drafts.map((r): Action => ({ type: 'payout/status', ownerId: r.owner.id, month, status: 'approved' })));
    toast(
      {
        en: en.approvedAll(count('en', drafts.length, en.statementForms, ar.statementForms), monthName('en', month)),
        ar: ar.approvedAll(count('ar', drafts.length, en.statementForms, ar.statementForms), monthName('ar', month)),
      },
      'success',
    );
  };

  return (
    <>
      <PageHead
        title={nav.payouts[lang]}
        sub={t.sub}
        phase="wave2"
        actions={
          <button type="button" className="sys-btn sys-btn--primary" disabled={!drafts.length} onClick={approveAll}>
            <CheckCheck size={17} strokeWidth={1.75} aria-hidden="true" />
            {t.approveAll}
          </button>
        }
      />

      <div className="sys-toolbar">
        <div className="sys-segment" role="group" aria-label={t.monthGroup}>
          {[lastMonth, thisMonth].map((m) => (
            <button key={m} type="button" aria-pressed={month === m} onClick={() => setMonth(m)}>
              {monthName(lang, m, false)}
            </button>
          ))}
        </div>
      </div>

      <div className="sys-stack">
        <section className="sys-panel">
          <dl className="sys-figures">
            <div className="sys-figure">
              <dt>{t.total}</dt>
              <dd>{compact(lang, sum(rows))}</dd>
              {approved.length ? <span className="sys-delta sys-muted">{t.ready(compact(lang, sum(approved)))}</span> : null}
            </div>
            <div className="sys-figure">
              <dt>{t.paid}</dt>
              <dd>{compact(lang, sum(paid))}</dd>
              <span className="sys-delta sys-muted">{t.paidOf(num(lang, paid.length), count(lang, rows.length, en.ownerForms, ar.ownerForms))}</span>
            </div>
            <div className="sys-figure">
              <dt>{t.waiting}</dt>
              <dd>{compact(lang, sum(drafts))}</dd>
              <span className="sys-delta sys-muted">{count(lang, drafts.length, en.draftForms, ar.draftForms)}</span>
            </div>
            <div className="sys-figure">
              <dt>{t.owners}</dt>
              <dd>{num(lang, rows.length)}</dd>
              <span className="sys-delta sys-muted">{homesCount(lang, homes)}</span>
            </div>
          </dl>
        </section>

        <Panel title={monthName(lang, month)} flush>
          <div className="sys-table-wrap">
            <table className="sys-table fin-static" aria-label={t.table(monthName(lang, month))}>
              <thead>
                <tr>
                  <th scope="col">{t.owner}</th>
                  <th scope="col" className="end hide-narrow">
                    {t.homes}
                  </th>
                  <th scope="col" className="end">
                    {t.payout}
                  </th>
                  <th scope="col" className="hide-narrow">
                    {t.method}
                  </th>
                  <th scope="col" className="hide-narrow">
                    {t.status}
                  </th>
                  <th scope="col">{t.next}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const name = r.owner.name[lang];
                  return (
                    <tr key={r.owner.id}>
                      <td className="wrap">
                        <Link
                          href={{ pathname: '/admin/owners', query: { owner: r.owner.id, month } }}
                          className="fin-link"
                          aria-label={t.statementFor(name)}
                        >
                          {name}
                        </Link>
                      </td>
                      <td className="end hide-narrow">{num(lang, r.homes)}</td>
                      <td className="end">{money(lang, r.payout)}</td>
                      <td className="hide-narrow">{w.method[r.owner.payout]}</td>
                      <td className="hide-narrow">{r.status ? <PayoutBadge status={r.status} /> : null}</td>
                      <td>
                        {r.status === 'draft' ? (
                          <button type="button" className="sys-btn sys-btn--secondary sys-btn--small" aria-label={t.approveFor(name)} onClick={() => approve(r)}>
                            <Check size={16} strokeWidth={1.75} aria-hidden="true" />
                            {t.approve}
                          </button>
                        ) : r.status === 'approved' ? (
                          <button
                            type="button"
                            className="sys-btn sys-btn--secondary sys-btn--small"
                            aria-label={t.payFor(name)}
                            disabled={r.payout <= 0}
                            onClick={() => pay(r)}
                          >
                            <Send size={16} strokeWidth={1.75} aria-hidden="true" className="flip-rtl" />
                            {t.pay}
                          </button>
                        ) : r.status === 'paid' ? (
                          <span className="sys-muted sys-tiny">{w.paidOn(paidDate)}</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {month === thisMonth ? <p className="sys-muted sys-small">{t.running(monthName(lang, month, false))}</p> : null}
      </div>
    </>
  );
}
