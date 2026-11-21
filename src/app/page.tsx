import type { Metadata } from 'next';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: site.name,
  robots: { index: false, follow: true },
  alternates: { canonical: '/en/' },
};

/**
 * "/" has no server to negotiate the language, so it picks in the browser: the visitor's saved
 * choice first, then the browser's language, English by default. Without JavaScript it goes to /en/.
 */
const pickLanguage = `(function(){var l='en';try{var s=localStorage.getItem('ea-locale');if(s==='ar'||s==='en'){l=s;}else{var n=((navigator.languages&&navigator.languages[0])||navigator.language||'').toLowerCase();if(n.indexOf('ar')===0){l='ar';}}}catch(e){}location.replace('/'+l+'/'+location.search+location.hash);})();`;

export default function RootPage() {
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{ __html: pickLanguage }} />
        <noscript>
          <meta httpEquiv="refresh" content="0;url=/en/" />
        </noscript>
        <p>
          <a href="/en/">Escape Away in English</a>
          {' · '}
          <a href="/ar/" lang="ar" dir="rtl">
            Escape Away بالعربية
          </a>
        </p>
      </body>
    </html>
  );
}
