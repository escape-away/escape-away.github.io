'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { formatNumber } from '@/lib/format';
import {
  LIMITS,
  draft,
  emailSuggestion,
  isEmail,
  newRef,
  normalizePhone,
  pageAddress,
  sendForm,
  track,
  westernDigits,
  type SendResult,
} from '@/lib/forms';
import { matchesAll, normalize } from '@/lib/normalize';
import { site, whatsappLink } from '@/lib/site';
import { ChoiceField, Honeypot, SelectField, TextArea, TextField } from '../forms/fields';
import { MinusIcon, PlusIcon } from '../explorer/icons';

type Kind = 'studio' | 'apartment' | 'chalet' | 'villa';
type Readiness = 'ready' | 'refresh' | 'finished' | 'not-handed-over';
type When = 'now' | 'soon' | 'later' | 'unsure';
type Photos = 'whatsapp' | 'link' | 'none';

type Answers = {
  area: string;
  type: Kind | '';
  bedrooms: number;
  furnished: 'yes' | 'no' | '';
  compound: string;
  size: string;
  state: Readiness | '';
  availability: When | '';
  photos: Photos | '';
  photosLink: string;
  name: string;
  whatsapp: string;
  email: string;
  abroad: 'no' | 'yes' | '';
  note: string;
};

type Key = keyof Answers;
type Errors = Partial<Record<Key, string>>;

const blank: Answers = {
  area: '',
  type: '',
  bedrooms: 2,
  furnished: '',
  compound: '',
  size: '',
  state: '',
  availability: '',
  photos: '',
  photosLink: '',
  name: '',
  whatsapp: '',
  email: '',
  abroad: '',
  note: '',
};

/** The answers each step asks for, in the order the fields appear (focus goes to the first error). */
const STEPS: Key[][] = [
  ['area', 'type', 'furnished'],
  ['compound', 'size', 'state', 'availability', 'photos', 'photosLink'],
  ['name', 'whatsapp', 'email', 'abroad', 'note'],
];
const DRAFT = 'ea-owner-form';
const MAX_BEDROOMS = 6;

/** label: the name in the page's language; en: the name the sheet keeps; match: both names, folded for matching. */
export type CompoundOption = { area: string; label: string; en: string; match: string[] };

/**
 * The owner flow from the brief: the estimator, then the unit form, then a thank-you screen with what
 * to have ready. Three short steps that start with the easy questions (where, what kind, furnished)
 * and end with contact details. The answers go to the "Owner leads" tab of the team's sheet, where
 * Apps Script scores them (location demand, unit readiness, timeline) and routes them hot, warm, cool
 * or nurture. Escape Away has no income figures to show yet, so the estimate comes from the team.
 */
export function OwnerForm({
  locale,
  areas,
  compounds,
  needsOnPage = false,
}: {
  locale: Locale;
  areas: { slug: string; name: string }[];
  /** Compounds where Escape Away already lists a home: suggestions while typing, and a scoring signal. */
  compounds: CompoundOption[];
  /** The page already shows what to have ready beside the form (/owners), so the thank-you skips it. */
  needsOnPage?: boolean;
}) {
  const t = useTranslations('ownerForm');
  const tf = useTranslations('forms');
  const tl = useTranslations('listing');
  const ts = useTranslations('search');
  const te = useTranslations('explorer');
  const id = useId();

  const [answers, setAnswers] = useState<Answers>(blank);
  const [company, setCompany] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [status, setStatus] = useState<'form' | 'sending' | SendResult>('form');
  const [reference, setReference] = useState('');

  const [restored, setRestored] = useState(false);

  const heading = useRef<HTMLHeadingElement>(null);
  const fields = useRef<Partial<Record<Key, HTMLElement | null>>>({});
  const moved = useRef(false);
  const started = useRef(false);

  const n = (v: number) => formatNumber(locale, v);
  const comma = locale === 'ar' ? '، ' : ', ';
  const sending = status === 'sending';
  const done = status === 'saved' || status === 'whatsapp' || status === 'failed';

  // Pick up where this tab left off; keep the answers as they change (never the hidden field).
  useEffect(() => {
    const saved = draft.load<{ answers: Answers; step: number }>(DRAFT);
    if (saved?.answers) setAnswers({ ...blank, ...saved.answers });
    if (typeof saved?.step === 'number') setStep(Math.min(Math.max(saved.step, 0), STEPS.length - 1));
    setRestored(true);
  }, []);
  useEffect(() => {
    if (restored && !done) draft.save(DRAFT, { answers, step });
  }, [restored, answers, step, done]);

  // A new step, or the thank-you screen, takes focus so it's read out (not when a reload restores it).
  useEffect(() => {
    if (moved.current) heading.current?.focus();
  }, [step, done]);

  /** Changes one answer. Takes a value or an updater, so quick repeated taps each count. */
  const set = <K extends Key>(key: K, value: Answers[K] | ((previous: Answers[K]) => Answers[K])) => {
    if (!started.current) {
      started.current = true;
      track('owner_form_start');
    }
    setAnswers((prev) => {
      const v = typeof value === 'function' ? (value as (previous: Answers[K]) => Answers[K])(prev[key]) : value;
      const next = { ...prev, [key]: v };
      // A furnished unit can't be "not handed over"; an empty one can't be "ready for guests".
      if (key === 'furnished') {
        const fits = v === 'yes' ? ['ready', 'refresh'] : ['finished', 'not-handed-over'];
        if (next.state && !fits.includes(next.state)) next.state = '';
      }
      if (key === 'photos' && v !== 'link') next.photosLink = '';
      return next;
    });
    if (key === 'email') setSuggestion(null);
  };

  // An error on show is checked again whenever the answers change, so it clears as soon as it's fixed.
  useEffect(() => {
    setErrors((shown) => {
      let changed = false;
      const next: Errors = { ...shown };
      for (const key of Object.keys(shown) as Key[]) {
        if (!shown[key]) continue;
        const now = check(key, answers);
        if (now !== shown[key]) {
          next[key] = now;
          changed = true;
        }
      }
      return changed ? next : shown;
    });
    // check() reads only the answers it's given and the messages, so the answers are the only dependency.
  }, [answers]);

  const sizeNumber = (raw: string) => Number(westernDigits(raw).replace(/[^\d.]/g, ''));
  /** "drive.google.com/…" works as typed: the https:// is added for the owner. */
  const fullLink = (raw: string) => (raw.trim() && !/^https?:\/\//i.test(raw.trim()) ? `https://${raw.trim()}` : raw.trim());
  /** A compound Escape Away lists in: "marassi" or "مراسي" becomes Marassi; "Marassi Marina 2" still counts. */
  const compoundMatch = () => {
    const typed = normalize(answers.compound);
    if (!typed) return { known: false, exact: null as CompoundOption | null };
    const exact = compounds.find((c) => c.match.includes(typed)) ?? null;
    return { known: Boolean(exact) || compounds.some((c) => c.match.some((m) => m && matchesAll(typed, m))), exact };
  };

  // ---------- Words ----------
  const areaName = answers.area === 'elsewhere' ? t('elsewhere') : (areas.find((a) => a.slug === answers.area)?.name ?? '');
  const kinds: Kind[] = ['studio', 'apartment', 'chalet', 'villa'];
  const states: Readiness[] = answers.furnished === 'no' ? ['finished', 'not-handed-over'] : ['ready', 'refresh'];
  const stateLabel: Record<Readiness, string> = {
    ready: t('stateReady'),
    refresh: t('stateRefresh'),
    finished: t('stateFinished'),
    'not-handed-over': t('stateNotHandedOver'),
  };
  const whenLabel: Record<When, string> = { now: t('now'), soon: t('soon'), later: t('later'), unsure: t('unsure') };
  const photosLabel: Record<Photos, string> = { whatsapp: t('photosWhatsapp'), link: t('photosLink'), none: t('photosNone') };
  const bedroomsText =
    answers.bedrooms >= MAX_BEDROOMS
      ? te('bedroomsAtLeast', { count: MAX_BEDROOMS, countText: n(MAX_BEDROOMS) })
      : tl('bedrooms', { count: answers.bedrooms, countText: n(answers.bedrooms) });
  const unitLine = [
    answers.type ? t(answers.type) : '',
    answers.type && answers.type !== 'studio' ? bedroomsText : '',
    answers.furnished === 'yes' ? t('furnishedText') : answers.furnished === 'no' ? t('notFurnishedText') : '',
  ]
    .filter(Boolean)
    .join(comma);
  const whereLine = [compoundMatch().exact?.label ?? answers.compound.trim(), areaName].filter(Boolean).join(comma);

  // The WhatsApp message: short once the sheet has it, everything when it doesn't.
  const lines =
    status === 'saved'
      ? [t('waHelloSaved'), t('waRef', { ref: reference }), t('waUnit', { unit: unitLine }), t('waWhere', { where: whereLine }), answers.photos === 'whatsapp' ? t('waPhotosHere') : '']
      : [
          t('waHello'),
          t('waUnit', { unit: unitLine }),
          t('waWhere', { where: whereLine }),
          answers.size.trim() ? t('waSize', { size: n(sizeNumber(answers.size)) }) : '',
          answers.state ? t('waState', { state: stateLabel[answers.state] }) : '',
          answers.availability ? t('waWhen', { when: whenLabel[answers.availability] }) : '',
          answers.photos === 'link' ? t('waPhotos', { photos: fullLink(answers.photosLink) }) : answers.photos === 'whatsapp' ? t('waPhotosHere') : '',
          t('waName', { name: answers.name.trim() }),
          answers.email.trim() ? t('waEmail', { email: answers.email.trim() }) : '',
          answers.abroad ? t('waLives', { where: answers.abroad === 'yes' ? t('abroadYes') : t('abroadNo') }) : '',
          answers.note.trim() ? t('waNote', { note: answers.note.trim() }) : '',
        ];
  const whatsapp = whatsappLink(lines.filter(Boolean).join('\n'), site.ownerWhatsapp);


  /** The error for one answer, or undefined when it's fine. */
  function check(key: Key, a: Answers): string | undefined {
    switch (key) {
      case 'area':
        return a.area ? undefined : t('errArea');
      case 'type':
        return a.type ? undefined : t('errType');
      case 'furnished':
        return a.furnished ? undefined : t('errFurnished');
      case 'size': {
        if (!a.size.trim()) return undefined;
        const v = sizeNumber(a.size);
        return v >= 10 && v <= 5000 ? undefined : t('errSize');
      }
      case 'state':
        return a.state ? undefined : t('errState');
      case 'availability':
        return a.availability ? undefined : t('errAvailability');
      case 'photosLink':
        return a.photos !== 'link' || /^(https?:\/\/)?[^\s/]+\.[^\s/]{2,}\S*$/i.test(a.photosLink.trim()) ? undefined : t('errLink');
      case 'name':
        return a.name.trim() ? undefined : tf('errName');
      case 'whatsapp':
        if (!a.whatsapp.trim()) return tf('errWhatsappEmpty');
        return normalizePhone(a.whatsapp) ? undefined : tf('errWhatsappBad');
      case 'email':
        return !a.email.trim() || isEmail(a.email) ? undefined : tf('errEmailBad');
      case 'abroad':
        return a.abroad ? undefined : t('errAbroad');
      default:
        return undefined;
    }
  }

  const leave = (key: Key) => () => {
    if (!String(answers[key]).trim()) return;
    setErrors((e) => ({ ...e, [key]: check(key, answers) }));
    if (key === 'email' && isEmail(answers.email)) setSuggestion(emailSuggestion(answers.email));
  };

  /** Checks the step; on an error, focuses the first field that needs fixing. */
  const stepIsValid = (index: number) => {
    const found: Errors = {};
    for (const key of STEPS[index]) {
      const error = check(key, answers);
      if (error) found[key] = error;
    }
    setErrors(found);
    const first = STEPS[index].find((key) => found[key]);
    if (first) fields.current[first]?.focus();
    return !first;
  };

  const go = (to: number) => {
    moved.current = true;
    setDirection(to > step ? 1 : -1);
    setStep(to);
    track('owner_form_step', { step: to + 1 });
  };


  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    if (!stepIsValid(step)) return;
    if (step < STEPS.length - 1) return go(step + 1);

    const ref = newRef();
    setReference(ref);
    moved.current = true;
    track('owner_form_send');
    if (company) return setStatus('saved'); // only a bot fills the hidden field
    setStatus('sending');
    const size = answers.size.trim() ? sizeNumber(answers.size) : null;
    const result = await sendForm({
      kind: 'owner',
      ref,
      lang: locale,
      page: pageAddress(),
      area: answers.area,
      areaName: areaName,
      compound: compoundMatch().exact?.en ?? answers.compound.trim(),
      compoundKnown: compoundMatch().known,
      type: answers.type,
      bedrooms: answers.type === 'studio' ? 0 : answers.bedrooms,
      furnished: answers.furnished === 'yes',
      size,
      state: answers.state,
      availability: answers.availability,
      photos: answers.photos,
      photosLink: answers.photos === 'link' ? fullLink(answers.photosLink) : '',
      name: answers.name.trim(),
      whatsapp: normalizePhone(answers.whatsapp),
      email: answers.email.trim(),
      abroad: answers.abroad === 'yes',
      note: answers.note.trim(),
      company,
    });
    setStatus(result);
    track('owner_form_result', { result });
    if (result === 'saved') draft.clear(DRAFT);
  };

  /** Another unit from the same owner: the contact details stay. */
  const another = () => {
    moved.current = true;
    setAnswers((a) => ({ ...blank, name: a.name, whatsapp: a.whatsapp, email: a.email, abroad: a.abroad }));
    setErrors({});
    setStatus('form');
    setDirection(1);
    setStep(0);
  };

  const register = (key: Key) => (el: HTMLElement | null) => {
    fields.current[key] = el;
  };
  const stepNames = [t('stepUnit'), t('stepDetails'), t('stepYou')];
  const noteLeft = LIMITS.note - answers.note.length;

  if (done) {
    return (
      <div className="owner-form" aria-labelledby={`${id}-done`} role="group">
        <div className="owner-done">
          <h3 ref={heading} id={`${id}-done`} className="t-subtitle" tabIndex={-1}>
            {status === 'saved' ? t('doneTitle', { name: answers.name.trim() }) : t('doneLastStep')}
          </h3>
          <p className="text-fg-muted">{status === 'saved' ? t('doneSaved') : status === 'whatsapp' ? t('doneWhatsapp') : t('doneFailed')}</p>
          <p>
            <a
              className="btn btn--on-navy"
              href={whatsapp}
              target="_blank"
              rel="noopener"
              onClick={() => {
                track('owner_form_whatsapp', { result: status });
                // Handed over on WhatsApp: the next visit starts a fresh form, not this one at step 3.
                draft.clear(DRAFT);
              }}
            >
              {status !== 'saved' ? t('sendWhatsapp') : answers.photos === 'whatsapp' ? t('sendPhotos') : t('continueWhatsapp')}
            </a>
          </p>
          {status === 'failed' ? (
            <button
              type="button"
              className="link-btn justify-self-start"
              onClick={() => {
                moved.current = true;
                setStatus('form');
              }}
            >
              {tf('tryAgain')}
            </button>
          ) : null}
          {needsOnPage ? null : (
            <div className="owner-done__ready">
              <h4 className="owner-done__title">{t('needTitle')}</h4>
              <NeedList />
            </div>
          )}
          {status === 'saved' ? <p className="t-small text-fg-muted tabular">{tf('reference', { ref: reference })}</p> : null}
          <button type="button" className="link-btn justify-self-start" onClick={another}>
            {t('another')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-form" aria-labelledby={`${id}-title`} role="group">
      <div className="owner-form__head">
        <h3 id={`${id}-title`} className="t-subtitle">
          {t('title')}
        </h3>
        <p className="text-fg-muted">{t('lead')}</p>
      </div>

      <div className="form-steps">
        <div className="form-steps__row">
          <h4 ref={heading} className="form-steps__title" tabIndex={-1}>
            {stepNames[step]}
            <span className="sr-only"> · {t('step', { current: n(step + 1), total: n(STEPS.length) })}</span>
          </h4>
          <p className="form-steps__count tabular" aria-hidden="true">
            {t('step', { current: n(step + 1), total: n(STEPS.length) })}
          </p>
        </div>
        <ol className="form-steps__bar" aria-hidden="true">
          {STEPS.map((_, i) => (
            <li key={i} data-on={i <= step || undefined} />
          ))}
        </ol>
      </div>

      <form className="owner-form__form" noValidate onSubmit={submit} aria-busy={sending || undefined}>
        <div key={step} className="form-step" data-dir={direction}>
          {step === 0 ? (
            <>
              <SelectField
                ref={register('area')}
                label={t('area')}
                name="area"
                value={answers.area}
                onChange={(e) => set('area', e.target.value)}
                error={errors.area}
                required
              >
                <option value="" disabled>
                  {t('chooseArea')}
                </option>
                {areas.map((a) => (
                  <option key={a.slug} value={a.slug}>
                    {a.name}
                  </option>
                ))}
                <option value="elsewhere">{t('elsewhere')}</option>
              </SelectField>

              <ChoiceField
                ref={register('type')}
                legend={t('type')}
                name={`${id}-type`}
                value={answers.type}
                onChange={(v) => set('type', v)}
                options={kinds.map((k) => ({ value: k, label: t(k) }))}
                error={errors.type}
              />

              {answers.type !== 'studio' ? (
                <div className="field">
                  <span className="field__label" id={`${id}-bedrooms`}>
                    {t('bedrooms')}
                  </span>
                  <div className="stepper__ctrl">
                    <button
                      type="button"
                      className="round round--dark pressable"
                      onClick={() => set('bedrooms', (b) => Math.max(1, b - 1))}
                      disabled={answers.bedrooms <= 1}
                      aria-label={ts('less', { what: t('bedrooms') })}
                    >
                      <MinusIcon />
                    </button>
                    <output className="stepper__value tabular" aria-labelledby={`${id}-bedrooms`} aria-live="polite">
                      {answers.bedrooms >= MAX_BEDROOMS ? `${n(MAX_BEDROOMS)}+` : n(answers.bedrooms)}
                    </output>
                    <button
                      type="button"
                      className="round round--dark pressable"
                      onClick={() => set('bedrooms', (b) => Math.min(MAX_BEDROOMS, b + 1))}
                      disabled={answers.bedrooms >= MAX_BEDROOMS}
                      aria-label={ts('more', { what: t('bedrooms') })}
                    >
                      <PlusIcon />
                    </button>
                  </div>
                </div>
              ) : null}

              <ChoiceField
                ref={register('furnished')}
                legend={t('furnished')}
                name={`${id}-furnished`}
                value={answers.furnished}
                onChange={(v) => set('furnished', v)}
                options={[
                  { value: 'yes', label: t('furnishedYes') },
                  { value: 'no', label: t('furnishedNo') },
                ]}
                error={errors.furnished}
              />
            </>
          ) : null}

          {step === 1 ? (
            <>
              <TextField
                ref={register('compound')}
                label={t('compound')}
                optional={tf('optional')}
                hint={t('compoundHint')}
                name="compound"
                autoComplete="off"
                list={`${id}-compounds`}
                maxLength={LIMITS.compound}
                value={answers.compound}
                onChange={(e) => set('compound', e.target.value)}
              />
              <datalist id={`${id}-compounds`}>
                {compounds
                  .filter((c) => !answers.area || c.area === answers.area)
                  .map((c) => (
                    <option key={`${c.area}-${c.label}`} value={c.label} />
                  ))}
              </datalist>

              <TextField
                ref={register('size')}
                label={t('size')}
                optional={tf('optional')}
                name="size"
                inputMode="numeric"
                autoComplete="off"
                dir="ltr"
                maxLength={6}
                className="field--short"
                value={answers.size}
                onChange={(e) => set('size', e.target.value)}
                onBlur={leave('size')}
                error={errors.size}
              />

              <ChoiceField
                ref={register('state')}
                legend={t('state')}
                name={`${id}-state`}
                value={answers.state}
                onChange={(v) => set('state', v)}
                options={states.map((s) => ({ value: s, label: stateLabel[s] }))}
                error={errors.state}
              />

              <ChoiceField
                ref={register('availability')}
                legend={t('availability')}
                name={`${id}-availability`}
                value={answers.availability}
                onChange={(v) => set('availability', v)}
                options={(['now', 'soon', 'later', 'unsure'] as When[]).map((w) => ({ value: w, label: whenLabel[w] }))}
                error={errors.availability}
              />

              <ChoiceField
                ref={register('photos')}
                legend={t('photos')}
                optional={tf('optional')}
                name={`${id}-photos`}
                value={answers.photos}
                onChange={(v) => set('photos', v)}
                options={(['whatsapp', 'link', 'none'] as Photos[]).map((p) => ({ value: p, label: photosLabel[p] }))}
              />
              {answers.photos === 'link' ? (
                <TextField
                  ref={register('photosLink')}
                  label={t('photosLinkLabel')}
                  hint={t('photosLinkHint')}
                  name="photos-link"
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  dir="ltr"
                  maxLength={LIMITS.link}
                  value={answers.photosLink}
                  onChange={(e) => set('photosLink', e.target.value)}
                  onBlur={leave('photosLink')}
                  error={errors.photosLink}
                  required
                />
              ) : null}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <TextField
                ref={register('name')}
                label={tf('name')}
                name="name"
                autoComplete="name"
                enterKeyHint="next"
                maxLength={LIMITS.name}
                value={answers.name}
                onChange={(e) => set('name', e.target.value)}
                onBlur={leave('name')}
                error={errors.name}
                required
              />
              <TextField
                ref={register('whatsapp')}
                label={tf('whatsapp')}
                hint={tf('whatsappHint')}
                name="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="next"
                dir="ltr"
                maxLength={24}
                value={answers.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
                onBlur={leave('whatsapp')}
                error={errors.whatsapp}
                required
              />
              <TextField
                ref={register('email')}
                label={tf('email')}
                optional={tf('optional')}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="next"
                dir="ltr"
                maxLength={LIMITS.email}
                value={answers.email}
                onChange={(e) => set('email', e.target.value)}
                onBlur={leave('email')}
                error={errors.email}
                after={
                  suggestion ? (
                    <p className="field__suggest">
                      {tf.rich('didYouMean', {
                        email: suggestion,
                        fix: (chunks) => (
                          <button
                            type="button"
                            className="link-btn"
                            dir="ltr"
                            onClick={() => {
                              set('email', suggestion);
                              fields.current.email?.focus();
                            }}
                          >
                            {chunks}
                          </button>
                        ),
                      })}
                    </p>
                  ) : null
                }
              />
              <ChoiceField
                ref={register('abroad')}
                legend={t('abroad')}
                name={`${id}-abroad`}
                value={answers.abroad}
                onChange={(v) => set('abroad', v)}
                options={[
                  { value: 'no', label: t('abroadNo') },
                  { value: 'yes', label: t('abroadYes') },
                ]}
                error={errors.abroad}
              />
              <TextArea
                label={tf('note')}
                optional={tf('optional')}
                name="note"
                rows={3}
                maxLength={LIMITS.note}
                placeholder={t('notePlaceholder')}
                value={answers.note}
                onChange={(e) => set('note', e.target.value)}
                hint={noteLeft < 100 ? tf('charactersLeft', { count: noteLeft, countText: n(noteLeft) }) : undefined}
              />
              <Honeypot label={tf('honeypot')} value={company} onChange={setCompany} />
            </>
          ) : null}
        </div>

        <div className="owner-form__actions">
          <button type="submit" className="btn btn--on-navy" aria-disabled={sending || undefined}>
            {sending ? tf('sending') : step < STEPS.length - 1 ? tf('continue') : t('submit')}
          </button>
          {step > 0 ? (
            <button type="button" className="link-btn" onClick={() => go(step - 1)}>
              {tf('back')}
            </button>
          ) : (
            <p className="t-small text-fg-muted">{t('time')}</p>
          )}
        </div>
        {step === STEPS.length - 1 ? (
          <p className="t-small text-fg-muted">{tf.rich('privacy', { link: (chunks) => <Link href="/privacy">{chunks}</Link> })}</p>
        ) : null}
      </form>
    </div>
  );
}

/** What the team asks for before a unit goes live. A draft list for Escape Away to confirm. */
export function NeedList() {
  const t = useTranslations('ownerForm');
  return (
    <ul className="dots owner-needs">
      <li>{t('need1')}</li>
      <li>{t('need2')}</li>
      <li>{t('need3')}</li>
      <li>{t('need4')}</li>
    </ul>
  );
}
