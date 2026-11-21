'use client';

import { useEffect, useId, useImperativeHandle, useRef, useState, type ChangeEvent, type FormEvent, type Ref } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { calendarFormat, fromISO, nightsBetween } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { LIMITS, emailSuggestion, isEmail, newRef, normalizePhone, pageAddress, sendForm, track, type SendResult } from '@/lib/forms';
import { lenis } from '@/lib/search-state';
import { site, whatsappLink } from '@/lib/site';
import { CloseIcon } from '../explorer/icons';
import { Honeypot, TextArea, TextField } from '../forms/fields';

export type RequestDialogHandle = { open: (opener: HTMLElement | null) => void };

type Props = {
  ref?: Ref<RequestDialogHandle>;
  code: string;
  /** The home's name in the page's language. */
  home: string;
  capacity: number;
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  infants: number;
  /** The guests as the request card words them ("4 guests, 1 infant"). */
  guestsText: string;
  /** The WhatsApp message up to the question: the home, its code, the dates and the guests. */
  messageStart: string;
  /** Closes this and opens the dates and guests where they live: the card's calendar, or the phone sheet. */
  onChange: () => void;
};

type Values = { name: string; whatsapp: string; email: string; note: string; company: string };
type FieldKey = 'name' | 'whatsapp' | 'email';
type Errors = Partial<Record<FieldKey | 'guests', string>>;
type Status = 'form' | 'sending' | SendResult;

/**
 * The short request form in front of WhatsApp (the brief's "Request to book, step by step"): the home,
 * dates and guests are already filled in from the page, so the guest only adds a name, a WhatsApp
 * number, an email and, if they like, a note. On sending, the request goes to the team's sheet; then
 * "Continue on WhatsApp" opens a message that's already written. If the sheet can't be reached, the
 * WhatsApp message carries everything instead. A centred panel from laptops up, a sheet on phones.
 */
export function RequestDialog({ ref, code, home, capacity, checkin, checkout, adults, children, infants, guestsText, messageStart, onChange }: Props) {
  const t = useTranslations('request');
  const tf = useTranslations('forms');
  const tl = useTranslations('listing');
  const ts = useTranslations('search');
  const locale = useLocale() as Locale;
  const id = useId();

  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const skipRestore = useRef(false);
  const changeButton = useRef<HTMLButtonElement>(null);
  const nameField = useRef<HTMLInputElement>(null);
  const whatsappField = useRef<HTMLInputElement>(null);
  const emailField = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<Values>({ name: '', whatsapp: '', email: '', note: '', company: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('form');
  const [reference, setReference] = useState('');

  const party = adults + children;
  const nights = checkin && checkout ? nightsBetween(checkin, checkout) : 0;
  const sending = status === 'sending';
  const finished = status === 'saved' || status === 'whatsapp' || status === 'failed';

  useImperativeHandle(
    ref,
    () => ({
      open(from) {
        const d = dialog.current;
        if (!d || d.open) return;
        opener.current = from;
        // A request that went through starts a new one; contact details stay, so nothing is typed twice.
        if (status === 'saved' || !reference) setReference(newRef());
        if (finished) setStatus('form');
        d.showModal();
        lenis()?.stop();
        track('request_open', { code });
        // Laptops go straight to the first field. Phones land on the title, so the keyboard doesn't hide the summary.
        requestAnimationFrame(() => {
          if (window.matchMedia('(min-width: 64rem)').matches) nameField.current?.focus();
          else heading.current?.focus();
        });
      },
    }),
    [status, reference, finished, code],
  );

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onClose = () => {
      lenis()?.start();
      if (skipRestore.current) skipRestore.current = false;
      else opener.current?.focus();
    };
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, []);

  // The result replaces the form; its title takes focus so it's read out.
  useEffect(() => {
    if (finished) heading.current?.focus();
  }, [finished]);

  const validate = (v: Values): Errors => {
    const found: Errors = {};
    if (!party) found.guests = t('noGuests');
    if (!v.name.trim()) found.name = tf('errName');
    if (!v.whatsapp.trim()) found.whatsapp = tf('errWhatsappEmpty');
    else if (!normalizePhone(v.whatsapp)) found.whatsapp = tf('errWhatsappBad');
    if (!v.email.trim()) found.email = tf('errEmailEmpty');
    else if (!isEmail(v.email)) found.email = tf('errEmailBad');
    return found;
  };

  // Errors show when a filled field is left, or on sending; once showing, they clear as soon as the value is right.
  const update = (key: keyof Values) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...values, [key]: event.target.value };
    setValues(next);
    if (key === 'email') setSuggestion(null);
    if (key !== 'note' && key !== 'company' && errors[key]) setErrors((prev) => ({ ...prev, [key]: validate(next)[key] }));
  };
  const leave = (key: FieldKey) => () => {
    if (!values[key].trim()) return;
    setErrors((prev) => ({ ...prev, [key]: validate(values)[key] }));
    if (key === 'email' && isEmail(values.email)) setSuggestion(emailSuggestion(values.email));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    const found = validate(values);
    setErrors(found);
    if (found.guests) return changeButton.current?.focus();
    const first = (['name', 'whatsapp', 'email'] as const).find((key) => found[key]);
    if (first) return { name: nameField, whatsapp: whatsappField, email: emailField }[first].current?.focus();

    track('request_send', { code });
    if (values.company) return setStatus('saved'); // only a bot fills the hidden field: thank it, keep nothing
    setStatus('sending');
    const result = await sendForm({
      kind: 'stay',
      ref: reference,
      lang: locale,
      page: pageAddress(),
      code,
      home,
      checkin,
      checkout,
      nights,
      adults,
      children,
      infants,
      name: values.name.trim(),
      whatsapp: normalizePhone(values.whatsapp),
      email: values.email.trim(),
      note: values.note.trim(),
      company: values.company,
    });
    setStatus(result);
    track('request_result', { code, result });
  };

  const close = () => dialog.current?.close();
  const change = () => {
    skipRestore.current = true;
    close();
    onChange();
  };

  // ---------- What the page says ----------
  const longDate = (iso: string) =>
    calendarFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(fromISO(iso));
  const dates =
    checkin && checkout
      ? `${longDate(checkin)} – ${longDate(checkout)} · ${ts('nights', { count: nights, countText: formatNumber(locale, nights) })}`
      : '';

  // The WhatsApp message: the request itself, then its reference once saved, or everything typed if it wasn't.
  const lines = [`${messageStart}. ${tl('requestAsk')}`];
  if (status === 'saved') lines.push(t('waRef', { ref: reference }));
  else {
    if (values.name.trim()) lines.push(t('waName', { name: values.name.trim() }));
    if (values.email.trim()) lines.push(t('waEmail', { email: values.email.trim() }));
    if (values.note.trim()) lines.push(t('waNote', { note: values.note.trim() }));
  }
  const whatsapp = whatsappLink(lines.join('\n'));

  const title = status === 'saved' ? t('savedTitle') : status === 'whatsapp' ? t('whatsappTitle') : status === 'failed' ? t('failedTitle') : t('title');
  const promise = site.replyPromise[locale];
  const noteLeft = LIMITS.note - values.note.length;

  const head = (
    <div className="sheet__head">
      <h2 ref={heading} id={`${id}-title`} className="sheet__title" tabIndex={-1}>
        {title}
      </h2>
      <button type="button" className="sheet__close" aria-label={tl('closeSheet')} title={tl('closeSheet')} onClick={close}>
        <CloseIcon />
      </button>
    </div>
  );

  return (
    <dialog
      ref={dialog}
      className="sheet sheet--panel request-dialog"
      aria-labelledby={`${id}-title`}
      data-lenis-prevent
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {finished ? (
        <div className="sheet__inner">
          {head}
          <div className="sheet__body request-done">
            <p>{status === 'saved' ? t('savedText') : status === 'whatsapp' ? t('whatsappText') : t('failedText')}</p>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener"
              className="btn btn--primary"
              onClick={() => track('request_whatsapp', { code, result: status })}
            >
              {status === 'saved' ? t('continueWhatsapp') : t('sendWhatsapp')}
            </a>
            {status === 'saved' ? <p className="request__note tabular">{tf('reference', { ref: reference })}</p> : null}
            {status === 'failed' ? (
              <button type="button" className="link-btn request-done__retry" onClick={() => setStatus('form')}>
                {tf('tryAgain')}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <form className="sheet__inner" noValidate onSubmit={submit} aria-busy={sending || undefined}>
          {head}
          <div className="sheet__body request-form">
            <div className="request-summary" role="group" aria-label={t('summary')} data-invalid={errors.guests ? '' : undefined}>
              <p className="request-summary__home">
                {home}{' '}
                <span className="request-summary__code tabular" dir="ltr">
                  {code}
                </span>
              </p>
              {dates ? <p className="tabular">{dates}</p> : null}
              <p className="tabular">{party ? guestsText : t('noGuestsYet')}</p>
              {party > capacity ? (
                <p className="request__warn">{tl('capacity', { count: capacity, countText: formatNumber(locale, capacity) })}</p>
              ) : null}
              {errors.guests ? (
                <p id={`${id}-guests-error`} className="field__error">
                  {errors.guests}
                </p>
              ) : null}
              <button
                ref={changeButton}
                type="button"
                className="link-btn request-summary__change"
                onClick={change}
                aria-describedby={errors.guests ? `${id}-guests-error` : undefined}
              >
                {t('change')}
              </button>
            </div>

            <TextField
              ref={nameField}
              label={tf('name')}
              name="name"
              autoComplete="name"
              enterKeyHint="next"
              maxLength={LIMITS.name}
              value={values.name}
              onChange={update('name')}
              onBlur={leave('name')}
              error={errors.name}
              required
            />
            <TextField
              ref={whatsappField}
              label={tf('whatsapp')}
              hint={tf('whatsappHint')}
              name="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="next"
              dir="ltr"
              maxLength={24}
              value={values.whatsapp}
              onChange={update('whatsapp')}
              onBlur={leave('whatsapp')}
              error={errors.whatsapp}
              required
            />
            <TextField
              ref={emailField}
              label={tf('email')}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="next"
              dir="ltr"
              maxLength={LIMITS.email}
              value={values.email}
              onChange={update('email')}
              onBlur={leave('email')}
              error={errors.email}
              required
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
                            setValues((v) => ({ ...v, email: suggestion }));
                            setSuggestion(null);
                            emailField.current?.focus();
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
            <TextArea
              label={tf('note')}
              optional={tf('optional')}
              name="note"
              rows={3}
              maxLength={LIMITS.note}
              placeholder={t('notePlaceholder')}
              value={values.note}
              onChange={update('note')}
              hint={noteLeft < 100 ? tf('charactersLeft', { count: noteLeft, countText: formatNumber(locale, noteLeft) }) : undefined}
            />
            <Honeypot label={tf('honeypot')} value={values.company} onChange={(company) => setValues((v) => ({ ...v, company }))} />
            <p className="request__note">{tf.rich('privacy', { link: (chunks) => <Link href="/privacy">{chunks}</Link> })}</p>
          </div>
          <div className="sheet__foot">
            <button type="submit" className="btn btn--primary" aria-disabled={sending || undefined}>
              {sending ? tf('sending') : t('send')}
            </button>
            {promise ? <p className="request__note request__promise">{promise}</p> : null}
            <p className="request__note">{tl('noPayYet')}</p>
          </div>
        </form>
      )}
    </dialog>
  );
}
