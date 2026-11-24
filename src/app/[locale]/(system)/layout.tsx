import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { SystemRoot } from '@/system/ui/overlays';
import '@/styles/system.css';

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

/** The system demo runs on sample data: search engines never list it, even on the live site. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** The Escape Away system: admin screens, the housekeeping app and the owner portal share one demo memory. */
export default async function SystemLayout({ children, params }: Props) {
  const { locale } = (await params) as { locale: Locale };
  setRequestLocale(locale);
  return <SystemRoot>{children}</SystemRoot>;
}
