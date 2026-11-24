'use client';

import { ArrowRight, CalendarDays, MessageCircle, Phone, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { unitTypeLabels } from '@/lib/unit-types';
import { areaById } from '../catalog';
import { common, scoreLabel, scoreShort, sourceLabel, stageLabel, useCopy, useLang } from '../copy';
import { clock, count, day, num } from '../format';
import { useData, useDemo } from '../store';
import type { Lang, Lead, LeadScore, LeadStage } from '../types';
import { Badge, PageHead, type Tone } from '../ui/bits';

/** The plural forms format.ts's count() takes; '#' becomes the number. */
type Forms = { one: string; other: string; two?: string; few?: string; many?: string };

const copy = {
  en: {
    title: 'Leads',
    sub: 'Owners who want Escape Away to run their home: from the website form, Instagram and referrals.',
    board: 'Leads by stage',
    empty: 'No leads here.',
    callToday: 'Call today',
    followUpOn: (d: string) => `Follow up ${d}`,
    bedrooms: { one: '# bedroom', other: '# bedrooms' } as Forms,
    contact: 'Contact',
    phone: 'Phone',
    source: 'Source',
    received: 'Received',
    receivedAt: (date: string, time: string) => `${date}, ${time}`,
    followUp: 'Follow-up',
    home: 'The home',
    where: 'Where',
    kind: 'Kind of home',
    size: 'Bedrooms',
    studio: 'Studio',
    furniture: 'Furniture',
    furnished: 'Furnished',
    unfurnished: 'Not furnished',
    note: 'Note',
    signedLine: 'Contract signed. Next come the photoshoot, the listing and the calendar links.',
    lostLine: 'Closed as lost. Reopen it if the owner gets back in touch.',
    moveTo: (stage: string) => `Move to ${stage}`,
    markLost: 'Mark as lost',
    reopen: 'Reopen',
    whatsapp: 'Message on WhatsApp',
    whatsappToast: 'In the real system this opens the owner’s WhatsApp chat.',
    moved: (name: string, stage: string) => `${name} moved to ${stage}.`,
    lost: (name: string) => `${name} marked as lost. Reopen it any time from the Lost column.`,
    reopened: (name: string) => `${name} is back under New.`,
  },
  ar: {
    title: 'طلبات الملاك',
    sub: 'ملاك عايزين Escape Away تدير وحداتهم: من فورم الموقع وإنستجرام والترشيحات.',
    board: 'الطلبات حسب المرحلة',
    empty: 'مفيش طلبات هنا.',
    callToday: 'مكالمة النهاردة',
    followUpOn: (d: string) => `تواصل ${d}`,
    bedrooms: { one: 'غرفة نوم واحدة', two: 'غرفتين نوم', few: '# غرف نوم', many: '# غرفة نوم', other: '# غرفة نوم' } as Forms,
    contact: 'بيانات التواصل',
    phone: 'التليفون',
    source: 'المصدر',
    received: 'وصل',
    receivedAt: (date: string, time: string) => `${date}، الساعة ${time}`,
    followUp: 'التواصل الجاي',
    home: 'الوحدة',
    where: 'المكان',
    kind: 'نوع الوحدة',
    size: 'غرف النوم',
    studio: 'استوديو',
    furniture: 'الفرش',
    furnished: 'مفروشة',
    unfurnished: 'مش مفروشة',
    note: 'ملاحظة',
    signedLine: 'العقد اتمضى. الجاي: التصوير والإعلان وروابط التقويم.',
    lostLine: 'الطلب اتقفل. افتحه تاني لو المالك رجع كلّمنا.',
    moveTo: (stage: string) => `انقله لـ«${stage}»`,
    markLost: 'اقفله كـ«لم يكتمل»',
    reopen: 'افتحه تاني',
    whatsapp: 'رسالة واتساب',
    whatsappToast: 'في السيستم الحقيقي ده بيفتح شات المالك على واتساب.',
    moved: (name: string, stage: string) => `طلب ${name} اتنقل لـ«${stage}».`,
    lost: (name: string) => `طلب ${name} اتقفل كـ«لم يكتمل». تقدر تفتحه تاني من عمود «لم يكتمل».`,
    reopened: (name: string) => `طلب ${name} رجع لـ«جديد».`,
  },
};

const stages: LeadStage[] = ['new', 'contacted', 'visit', 'signed', 'lost'];
const nextStage: Partial<Record<LeadStage, LeadStage>> = { new: 'contacted', contacted: 'visit', visit: 'signed' };
const scoreTone: Record<LeadScore, Tone> = { hot: 'warn', warm: 'info', cool: 'done', nurture: 'done' };
const scoreRank: Record<LeadScore, number> = { hot: 0, warm: 1, cool: 2, nurture: 3 };

/** Who to call first: the nearest follow-up, then the hottest lead, then the newest. */
function byPriority(a: Lead, b: Lead) {
  const fa = a.followUp ?? '9999-12-31';
  const fb = b.followUp ?? '9999-12-31';
  if (fa !== fb) return fa < fb ? -1 : 1;
  return scoreRank[a.score] - scoreRank[b.score] || (a.createdAt < b.createdAt ? 1 : -1);
}

function homeLine(lang: Lang, lead: Lead) {
  const kind = unitTypeLabels[lead.type][lang];
  if (lead.type === 'studio' || lead.bedrooms === 0) return kind;
  return `${kind} · ${count(lang, lead.bedrooms, copy.en.bedrooms, copy.ar.bedrooms)}`;
}

function LeadCard({ lead, today, active, onOpen }: { lead: Lead; today: string; active: boolean; onOpen: () => void }) {
  const lang = useLang();
  const t = useCopy(copy);
  const due = lead.followUp ? lead.followUp <= today : false;
  return (
    <button type="button" className="sys-card" data-lead={lead.id} aria-haspopup="dialog" aria-expanded={active} onClick={onOpen}>
      <b>
        <bdi>{lead.name}</bdi>
      </b>
      <span className="meta">
        {lead.compound[lang]} · {areaById[lead.area].name[lang]}
      </span>
      <span className="meta">{homeLine(lang, lead)}</span>
      <span className="meta">
        <Badge tone={scoreTone[lead.score]}>{scoreShort[lead.score][lang]}</Badge>
        {lead.followUp ? (
          due ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--warn)', fontWeight: 'var(--weight-ui)' }}>
              <Phone size={16} strokeWidth={1.75} aria-hidden="true" />
              {t.callToday}
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
              {t.followUpOn(day(lang, lead.followUp))}
            </span>
          )
        ) : null}
      </span>
    </button>
  );
}

/** The lead's side panel: the same markup as the system's other side panels (ui/panels.tsx). */
function LeadDrawer({ lead, today, onClose }: { lead: Lead; today: string; onClose: () => void }) {
  const lang = useLang();
  const t = useCopy(copy);
  const c = useCopy(common);
  const { dispatch, toast } = useDemo();
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  useEffect(() => {
    heading.current?.focus();
  }, [lead.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const next = nextStage[lead.stage];
  const open = lead.stage !== 'signed' && lead.stage !== 'lost';
  const due = lead.followUp ? lead.followUp <= today : false;

  const moveTo = (stage: LeadStage) => {
    dispatch({ type: 'lead/stage', id: lead.id, stage });
    toast({ en: copy.en.moved(lead.name, stageLabel[stage].en), ar: copy.ar.moved(lead.name, stageLabel[stage].ar) }, 'success');
  };
  const markLost = () => {
    dispatch({ type: 'lead/stage', id: lead.id, stage: 'lost' });
    toast({ en: copy.en.lost(lead.name), ar: copy.ar.lost(lead.name) }, 'info');
  };
  const reopen = () => {
    dispatch({ type: 'lead/stage', id: lead.id, stage: 'new' });
    toast({ en: copy.en.reopened(lead.name), ar: copy.ar.reopened(lead.name) }, 'success');
  };

  return (
    <aside className="sys-drawer" role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <header className="sys-drawer__head">
        <div style={{ display: 'grid', gap: 4, minInlineSize: 0 }}>
          <h2 id={titleId} ref={heading} tabIndex={-1}>
            <bdi>{lead.name}</bdi>
          </h2>
          <div className="sys-muted sys-small">
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <Badge plain>{stageLabel[lead.stage][lang]}</Badge>
              <Badge tone={scoreTone[lead.score]}>{scoreShort[lead.score][lang]}</Badge>
            </span>
          </div>
        </div>
        <button type="button" className="sys-btn sys-btn--quiet sys-btn--icon" aria-label={c.close} onClick={onClose}>
          <X size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </header>

      <div className="sys-drawer__body">
        {open ? (
          <div className="sys-note" data-tone={lead.score === 'hot' ? 'warn' : lead.score === 'warm' ? 'info' : undefined}>
            <p>
              <b>{scoreLabel[lead.score][lang]}</b>
            </p>
          </div>
        ) : (
          <div className="sys-note" data-tone={lead.stage === 'signed' ? 'info' : undefined}>
            <p>{lead.stage === 'signed' ? t.signedLine : t.lostLine}</p>
          </div>
        )}

        <section className="sys-section">
          <h3>{t.contact}</h3>
          <dl className="sys-dl">
            <dt>{t.phone}</dt>
            <dd>
              <span className="ltr">{lead.phone}</span>
            </dd>
            <dt>{t.source}</dt>
            <dd>{sourceLabel[lead.source][lang]}</dd>
            <dt>{t.received}</dt>
            <dd>{t.receivedAt(day(lang, lead.createdAt.slice(0, 10)), clock(lang, lead.createdAt))}</dd>
            {lead.followUp ? (
              <>
                <dt>{t.followUp}</dt>
                <dd>{due ? <Badge tone="warn">{t.callToday}</Badge> : day(lang, lead.followUp)}</dd>
              </>
            ) : null}
          </dl>
        </section>

        <section className="sys-section">
          <h3>{t.home}</h3>
          <dl className="sys-dl">
            <dt>{t.where}</dt>
            <dd>
              {lead.compound[lang]} · {areaById[lead.area].name[lang]}
            </dd>
            <dt>{t.kind}</dt>
            <dd>{unitTypeLabels[lead.type][lang]}</dd>
            <dt>{t.size}</dt>
            <dd>{lead.type === 'studio' || lead.bedrooms === 0 ? t.studio : count(lang, lead.bedrooms, copy.en.bedrooms, copy.ar.bedrooms)}</dd>
            <dt>{t.furniture}</dt>
            <dd>{lead.furnished ? t.furnished : t.unfurnished}</dd>
          </dl>
        </section>

        {lead.note ? (
          <section className="sys-section">
            <h3>{t.note}</h3>
            <div className="sys-note">
              <p>{lead.note[lang]}</p>
            </div>
          </section>
        ) : null}
      </div>

      <footer className="sys-drawer__foot">
        {next ? (
          <button type="button" className="sys-btn sys-btn--primary" onClick={() => moveTo(next)}>
            {t.moveTo(stageLabel[next][lang])}
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" className="flip-rtl" />
          </button>
        ) : null}
        <button type="button" className="sys-btn sys-btn--secondary" onClick={() => toast({ en: copy.en.whatsappToast, ar: copy.ar.whatsappToast }, 'info')}>
          <MessageCircle size={16} strokeWidth={1.75} aria-hidden="true" />
          {t.whatsapp}
        </button>
        {open ? (
          <button type="button" className="sys-btn sys-btn--quiet push" onClick={markLost}>
            {t.markLost}
          </button>
        ) : null}
        {lead.stage === 'lost' ? (
          <button type="button" className="sys-btn sys-btn--quiet push" onClick={reopen}>
            <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
            {t.reopen}
          </button>
        ) : null}
      </footer>
    </aside>
  );
}

export function LeadsScreen() {
  const lang = useLang();
  const t = useCopy(copy);
  const data = useData();
  const { panel, setPanel } = useDemo();
  const [openId, setOpenId] = useState<string | null>(null);
  const refocus = useRef<string | null>(null);

  const lanes = useMemo(
    () => stages.map((stage) => ({ stage, leads: data.leads.filter((l) => l.stage === stage).sort(byPriority) })),
    [data.leads],
  );
  const open = openId ? (data.leads.find((l) => l.id === openId) ?? null) : null;

  // The system's own side panel (a booking, a unit) and this one never sit on top of each other.
  useEffect(() => {
    if (panel) setOpenId(null);
  }, [panel]);

  const close = useCallback(() => {
    refocus.current = openId;
    setOpenId(null);
  }, [openId]);

  // Once the panel is gone, back to the card that opened it, wherever its lane is now.
  useEffect(() => {
    if (openId || !refocus.current) return;
    document.querySelector<HTMLElement>(`[data-lead="${refocus.current}"]`)?.focus();
    refocus.current = null;
  }, [openId]);

  return (
    <>
      <PageHead title={t.title} sub={t.sub} phase="wave2" />

      <div className="sys-board" role="group" aria-label={t.board}>
        {lanes.map(({ stage, leads }) => (
          <section key={stage} className="sys-lane" aria-labelledby={`lane-${stage}`}>
            <header>
              <h2 id={`lane-${stage}`}>{stageLabel[stage][lang]}</h2>
              <span>{num(lang, leads.length)}</span>
            </header>
            {leads.length ? (
              leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  today={data.today}
                  active={openId === lead.id}
                  onOpen={() => {
                    setPanel(null);
                    setOpenId(lead.id);
                  }}
                />
              ))
            ) : (
              <p className="sys-muted sys-tiny" style={{ paddingInline: 'var(--space-2)' }}>
                {t.empty}
              </p>
            )}
          </section>
        ))}
      </div>

      {open ? <LeadDrawer key={open.id} lead={open} today={data.today} onClose={close} /> : null}
    </>
  );
}
