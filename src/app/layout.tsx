import type { ReactNode } from 'react';

/**
 * Pass-through root. Each locale's layout renders <html lang dir>, as next-intl's static-export
 * setup needs; the root redirect page and the global 404 render their own.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
