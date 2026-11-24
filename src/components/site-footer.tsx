import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { destinations } from '@/lib/destinations';
import { site, whatsappLink } from '@/lib/site';
import { EaMark } from './ea-mark';
import { EmailText } from './email-text';
import { LanguageSwitch } from './language-switch';

const linkClass = 'link-underline inline-flex min-h-11 items-center no-underline';

export async function SiteFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  const nav = await getTranslations({ locale, namespace: 'nav' });
  const address = site.office.address[locale];

  return (
    <footer id="site-footer" className="site-footer ground-navy">
      {/* On phones the two link lists sit side by side, so the footer stays short. */}
      <div className="wrap grid grid-cols-2 gap-x-8 gap-y-12 py-16 md:grid-cols-12">
        <div className="col-span-2 grid content-start gap-5 md:col-span-4">
          <EaMark className="text-cream" />
          <p className="t-subtitle max-w-[18ch]">{t('line')}</p>
        </div>

        <nav aria-labelledby="footer-destinations" className="md:col-span-2">
          <h2 id="footer-destinations" className="t-label text-ice-text">
            {t('destinations')}
          </h2>
          <ul className="mt-3">
            {destinations.map((d) => (
              <li key={d.slug}>
                <Link href={`/destinations/${d.slug}`} className={linkClass}>
                  {d.name[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-company" className="md:col-span-2">
          <h2 id="footer-company" className="t-label text-ice-text">
            {t('company')}
          </h2>
          <ul className="mt-3">
            <li>
              <Link href="/owners" className={linkClass}>
                {t('owners')}
              </Link>
            </li>
            <li>
              <Link href="/contact" className={linkClass}>
                {t('contactPage')}
              </Link>
            </li>
          </ul>
          <h2 className="t-label mt-8 text-ice-text">{t('legal')}</h2>
          <ul className="mt-3">
            <li>
              <Link href="/terms" className={linkClass}>
                {t('terms')}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={linkClass}>
                {t('privacy')}
              </Link>
            </li>
            <li>
              <Link href="/cancellation" className={linkClass}>
                {t('cancellation')}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="col-span-2 md:col-span-4">
          <h2 className="t-label text-ice-text">{t('contact')}</h2>
          {/* Name, address and phone exactly as on the Google Business Profile and the contact page. */}
          <address className="mt-3 grid gap-1 not-italic">
            <span dir="ltr" className="justify-self-start">
              {site.legalName}
            </span>
            <span>{address.street}</span>
            <span>{address.locality}</span>
            <a href={site.phoneHref} dir="ltr" className={`${linkClass} justify-self-start tabular`}>
              {site.phone}
            </a>
            <a href={whatsappLink()} target="_blank" rel="noopener" className={`${linkClass} justify-self-start`}>
              {nav('whatsapp')}
            </a>
            <a href={`mailto:${site.email}`} dir="ltr" className={`${linkClass} justify-self-start break-words`}>
              <EmailText email={site.email} />
            </a>
            <a href={site.instagram} target="_blank" rel="noopener" dir="ltr" className={`${linkClass} justify-self-start`}>
              {site.instagramHandle}
            </a>
          </address>
        </div>
      </div>

      <div className="bg-navy-deep">
        <div className="wrap flex flex-wrap items-center gap-x-8 gap-y-2 py-4 text-[length:var(--text-label)] text-ice-text">
          {/* The company's Latin name and the year read left to right on both sides. */}
          <p className="tabular" dir="ltr">
            {t('rights', { year: String(new Date().getFullYear()) })}
          </p>
          <span className="me-auto" />
          <LanguageSwitch text={nav('switchTo')} className={linkClass} />
        </div>
      </div>
    </footer>
  );
}
