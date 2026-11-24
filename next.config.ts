import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Two deploy targets, one codebase:
 * - "export" (default): static files in out/ for the GitHub Pages demo (user site, no basePath).
 * - "node": a normal Next.js server for GoDaddy Node.js Hosting after approval.
 *   `npm run build:node` builds it and `npm start` serves it on process.env.PORT.
 */
const lifecycle = process.env.npm_lifecycle_event ?? '';
const target =
  process.env.BUILD_TARGET ?? (lifecycle === 'build:node' || lifecycle === 'start' ? 'node' : 'export');

const nextConfig: NextConfig = {
  output: target === 'export' ? 'export' : undefined,
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  // No floating Next.js badge in development: the demo is presented from the dev server too, and the
  // badge covered the system's "Reset the demo" button.
  devIndicators: false,
  images: {
    // Photos are pre-resized at build by scripts/images.mjs into public/img/<slot>/<width>.webp.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    deviceSizes: [480, 640, 768, 1080, 1440, 1920],
    imageSizes: [320],
  },
};

export default withNextIntl(nextConfig);
