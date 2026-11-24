import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { formatNumber } from '@/lib/format';
import { ownerFormOptions } from '@/lib/owner-options';
import { OwnerForm } from '../owner/owner-form';
import { Packages } from '../owner/packages';
import { Photo } from '../photo';
import { SectionTitle } from '../section-title';

const journey = [
  { key: 'design', photo: 'owner-design' },
  { key: 'style', photo: 'owner-style' },
  { key: 'manage', photo: 'owner-prepare' },
] as const;

/**
 * Act 3, the turn: the page shifts from cream to navy as the owner section arrives (the scroll scene
 * fades out a cream veil laid over the section's own navy; without it the section is simply navy).
 * Journey in arches, the two packages, and the owner form, which opens with the estimator.
 */
export async function OwnerAct({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'ownerAct' });

  return (
    <section id="owners" data-turn className="turn ground-navy owner" aria-labelledby="owner-title">
      <div className="turn__veil" data-turn-veil aria-hidden="true" />
      <div className="wrap owner__inner">
        <div className="owner__intro" data-turn-reveal>
          <SectionTitle id="owner-title" light={t('titleLight')} bold={t('titleBold')} />
          <p className="t-lead text-fg-muted">{t('lead')}</p>
        </div>

        <ol className="journey">
          {journey.map((step, i) => (
            <li key={step.key} className="journey__step">
              <span className="arch journey__photo">
                <Photo slot={step.photo} locale={locale} sizes="(max-width: 768px) 120vw, 56vw" />
              </span>
              <span className="journey__num tabular" aria-hidden="true">
                {formatNumber(locale, i + 1)}
              </span>
              <h3 className="journey__name">{t(step.key)}</h3>
              <p className="text-fg-muted">{t(`${step.key}Text`)}</p>
            </li>
          ))}
        </ol>

        <div className="owner__split">
          <Packages locale={locale}>
            <p>
              <Link href="/owners" className="btn btn--ghost-dark">
                {t('cta')}
              </Link>
            </p>
          </Packages>
          <OwnerForm locale={locale} {...ownerFormOptions(locale)} />
        </div>
      </div>
    </section>
  );
}
