import type { Metadata } from 'next';
import { fontVariables } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Page not found · Escape Away',
  description: 'This Escape Away page isn’t here. The link may be old, or the stay may no longer be listed.',
  robots: { index: false, follow: true },
};

/**
 * The old WordPress site's addresses (escape-away.com before November 2026), sent on to the page that
 * replaced them, so saved links and search results still land somewhere useful. Anything else stays
 * on this page. Arabic slugs are matched after decoding.
 */
const oldSiteRedirect = `(function(){try{var p=decodeURIComponent(location.pathname).toLowerCase();var to=null;
if(/^\\/(property|properties|property-city|property-type|property-status|property-feature|search-properties|rentals-search|grid-layout|list-layout|half-map-layout|properties-[a-z0-9-]+)(\\/|$)/.test(p))to='/en/#stays';
else if(/^\\/(contact|contact_us|contact-us|اتصال)(\\/|$)/.test(p))to='/en/contact/';
else if(/^\\/(list-your-property|add-property|submit-property|owners?)(\\/|$)/.test(p))to='/en/owners/';
else if(/^\\/(privacy|privacy-policy)(\\/|$)/.test(p))to='/en/privacy/';
else if(/^\\/(terms|terms-and-conditions)(\\/|$)/.test(p))to='/en/terms/';
else if(/^\\/(about-us|about|home-3|blog|blog-page|blog-2|faqs|faqs-2)(\\/|$)/.test(p))to='/en/';
if(to)location.replace(to);}catch(e){}})();`;

/** The static export writes this as 404.html, which GitHub Pages serves for any unknown address. */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: oldSiteRedirect }} />
        <main className="wrap section-y grid gap-16">
          <section className="grid gap-6">
            <h1 className="t-title title-rule">This page isn&apos;t here</h1>
            <p className="t-lead text-fg-muted">The link may be old, or the stay may no longer be listed.</p>
            <p>
              <a className="btn btn--primary" href="/en/">
                Go to the homepage
              </a>
            </p>
          </section>
          <section lang="ar" dir="rtl" className="grid gap-6 border-t border-sand pt-12">
            <h2 className="t-title title-rule">الصفحة دي مش موجودة</h2>
            <p className="t-lead text-fg-muted">ممكن يكون الرابط قديم، أو الإقامة مبقتش معروضة.</p>
            <p>
              <a className="btn btn--primary" href="/ar/">
                ارجع للصفحة الرئيسية
              </a>
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}
