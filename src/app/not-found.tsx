import type { Metadata } from 'next';
import { fontVariables } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Page not found · Escape Away',
  description: 'This Escape Away page isn’t here. The link may be old, or the stay may no longer be listed.',
  robots: { index: false, follow: true },
};

/** The static export writes this as 404.html, which GitHub Pages serves for any unknown address. */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={fontVariables}>
      <body>
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
