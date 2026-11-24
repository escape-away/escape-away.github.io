import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { formatNumber } from '@/lib/format';
import { ownerFormOptions } from '@/lib/owner-options';
import { ogImage, pageMetadata } from '@/lib/seo';
import { site, whatsappLink } from '@/lib/site';
import { NeedList, OwnerForm } from '@/components/owner/owner-form';
import { Packages } from '@/components/owner/packages';
import { Photo } from '@/components/photo';
import { SectionTitle } from '@/components/section-title';

type Props = { params: Promise<{ locale: Locale }> };

const journey = ['property', 'design', 'photography', 'listing', 'bookings', 'guestExperience', 'operations', 'reporting'] as const;

/** Design, Style, Manage, as on the homepage, with a different styled room so no photo repeats here. */
const how = [
  { key: 'design', photo: 'owner-design' },
  { key: 'style', photo: 'unit-NC-MRS-014-02' },
  { key: 'manage', photo: 'owner-prepare' },
] as const;

const ownerQuestions = [6, 7] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'owners' });
  return pageMetadata({
    locale,
    path: '/owners',
    title: t('metaTitle'),
    description: t('description'),
    image: ogImage('owner-design', locale),
  });
}

/**
 * The owner page, for Instagram ads and WhatsApp links. The promise beside a finished home, the three
 * real figures and what the owner needs to know before they start (a minute, phone photos, a video
 * call from abroad); then how a unit becomes a home, the eight-step journey from the company profile,
 * the two packages, what the team asks for, the form, and the questions owners ask.
 */
export default async function OwnersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'owners' });
  const tf = await getTranslations({ locale, namespace: 'ownerForm' });
  const tAct = await getTranslations({ locale, namespace: 'ownerAct' });
  const tTrust = await getTranslations({ locale, namespace: 'trust' });
  const tFaq = await getTranslations({ locale, namespace: 'faq' });
  const tMeta = await getTranslations({ locale, namespace: 'meta' });

  return (
    <div className="ground-navy">
      <section className="wrap owners-hero">
        <div className="owners-hero__text">
          <h1 className="t-hero max-w-[16ch]">
            {t('h1Light')} <strong>{t('h1Bold')}</strong>
          </h1>
          <p className="t-lead text-fg-muted">{t('lead')}</p>
          <p className="owners-hero__numbers">{tTrust.rich('numbers', { b: (chunks) => <strong>{chunks}</strong> })}</p>
          <p className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href="#list-your-unit" className="btn btn--on-navy">
              {t('ctaEstimate')}
            </a>
            <a href={whatsappLink(t('whatsappText'), site.ownerWhatsapp)} target="_blank" rel="noopener" className="link-btn">
              {t('cta')}
            </a>
          </p>
          <p className="owners-hero__note text-fg-muted">{t('reassure')}</p>
        </div>
        <span className="arch owners-hero__photo">
          <Photo slot="interior-01" locale={locale} sizes="(max-width: 47.99rem) 92vw, 40vw" eager />
        </span>
      </section>

      <section aria-labelledby="how-title" className="wrap pb-[var(--space-section)]">
        <SectionTitle id="how-title" light={t('howLight')} bold={t('howBold')} />
        <ol className="journey mt-12">
          {how.map((step, i) => (
            <li key={step.key} className="journey__step">
              <span className="arch journey__photo">
                <Photo slot={step.photo} locale={locale} sizes="(max-width: 768px) 120vw, 56vw" />
              </span>
              <span className="journey__num tabular" aria-hidden="true">
                {formatNumber(locale, i + 1)}
              </span>
              <h3 className="journey__name">{tAct(step.key)}</h3>
              <p className="text-fg-muted">{tAct(`${step.key}Text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="journey-title" className="wrap pb-[var(--space-section)]">
        <h2 id="journey-title" className="t-title title-rule">
          {t('journeyTitle')}
        </h2>
        <ol className="owners-steps">
          {journey.map((step, i) => (
            <li key={step} className="owners-steps__step">
              <span className="owners-steps__num tabular" aria-hidden="true">
                {formatNumber(locale, i + 1)}
              </span>
              <span className="owners-steps__name">{t(`steps.${step}`)}</span>
              <span className="owners-steps__text text-fg-muted">{t(`stepsText.${step}`)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="list-your-unit" aria-labelledby="list-title" className="wrap pb-[var(--space-section)]">
        <div className="owner__split">
          <div className="owners-intro">
            <div className="grid gap-5">
              <h2 id="list-title" className="t-title title-rule">
                {t('listTitle')}
              </h2>
              <p className="t-lead text-fg-muted">{t('listLead')}</p>
            </div>
            <Packages locale={locale} />
            <div className="grid gap-4">
              <h3 className="t-subtitle">{tf('needTitle')}</h3>
              <NeedList />
            </div>
          </div>
          <OwnerForm locale={locale} {...ownerFormOptions(locale)} needsOnPage />
        </div>
      </section>

      <section aria-labelledby="owner-faq-title" className="wrap pb-[var(--space-section)]">
        <h2 id="owner-faq-title" className="t-title title-rule">
          {t('faqTitle')}
        </h2>
        <dl className="faq__list owners-faq">
          <div>
            <dt>{tFaq('q0')}</dt>
            <dd className="text-fg-muted">{tMeta('about')}</dd>
          </div>
          {ownerQuestions.map((n) => (
            <div key={n}>
              <dt>{tFaq(`q${n}`)}</dt>
              <dd className="text-fg-muted">{tFaq(`a${n}`)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
