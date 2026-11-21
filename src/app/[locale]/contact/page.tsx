import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { localePath, ogImage, pageMetadata } from '@/lib/seo';
import { site, whatsappLink } from '@/lib/site';
import { contactStructuredData, jsonLd } from '@/lib/structured-data';
import { EmailText } from '@/components/email-text';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });
  return pageMetadata({
    locale,
    path: '/contact',
    title: t('contact.metaTitle'),
    description: t('contact.description'),
    absolute: true,
    image: ogImage('hero-01', locale),
  });
}

/**
 * The Katameya office's page: the company's name, address and phone exactly as the company profile
 * and the Google Business Profile give them, the other ways to reach the team, and the office in
 * structured data. Until the Google profile exists, the map link shows Katameya Dunes itself.
 */
export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal' });
  const tMeta = await getTranslations({ locale, namespace: 'meta' });
  const address = site.office.address[locale];
  const mapUrl = site.office.profileUrl || site.office.areaMapUrl;

  const rows = [
    { label: t('contact.company'), value: site.legalName, ltr: true },
    { label: t('contact.office'), value: `${address.street}${locale === 'ar' ? '، ' : ', '}${address.locality}` },
    { label: t('contact.phone'), value: site.phone, href: site.phoneHref, ltr: true },
    { label: t('contact.whatsapp'), value: site.phone, href: whatsappLink(), ltr: true, external: true },
    { label: t('contact.email'), value: <EmailText email={site.email} />, href: `mailto:${site.email}`, ltr: true },
    { label: t('contact.instagram'), value: site.instagramHandle, href: site.instagram, ltr: true, external: true },
    { label: t('contact.support'), value: t('contact.supportValue') },
  ];

  const data = contactStructuredData(locale, {
    title: t('contact.metaTitle'),
    description: t('contact.description'),
    about: tMeta('about'),
  });

  return (
    <section className="wrap section-y grid gap-10">
      <div className="grid gap-6">
        <h1 className="t-title title-rule">{t('contact.title')}</h1>
        <p className="t-lead">{t('contact.lead')}</p>
      </div>
      <dl className="grid max-w-3xl gap-x-10 gap-y-5 sm:grid-cols-[12rem_1fr]">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="t-label text-fg-muted sm:pt-1">{row.label}</dt>
            <dd className="m-0">
              {row.href ? (
                <a
                  href={row.href}
                  dir={row.ltr ? 'ltr' : undefined}
                  className="link-inline tabular inline-flex min-h-11 items-center"
                  {...(row.external ? { target: '_blank', rel: 'noopener' } : {})}
                >
                  {row.value}
                </a>
              ) : (
                <span dir={row.ltr ? 'ltr' : undefined}>{row.value}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <a href={mapUrl} target="_blank" rel="noopener" className="link-inline">
          {site.office.profileUrl ? t('contact.mapProfile') : t('contact.mapArea')}
        </a>
        <span>
          {t.rich('contact.owners', {
            link: (chunks) => (
              <a href={`${localePath(locale, '/owners')}#list-your-unit`} className="link-inline">
                {chunks}
              </a>
            ),
          })}
        </span>
      </p>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
    </section>
  );
}
